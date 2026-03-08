import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';

export default function NotificationManager() {
  const { user } = useAuth();
  const activeChatListeners = useRef<Set<string>>(new Set());
  const unsubscribeFunctions = useRef<Map<string, () => void>>(new Map());
  const notifiedMessages = useRef<Set<string>>(new Set());
  const notifiedCalls = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    const unsubscribeChats = onSnapshot(q, (querySnapshot) => {
      querySnapshot.docs.forEach((chatDoc) => {
        const chatId = chatDoc.id;
        
        // If we are already listening to this chat, skip
        if (activeChatListeners.current.has(chatId)) return;
        
        activeChatListeners.current.add(chatId);
        const data = chatDoc.data();
        const otherUid = data.participants.find((id: string) => id !== user.uid);

        if (!otherUid) return;

        // Listen for new messages
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), limit(1));
        
        const unsubMessages = onSnapshot(messagesQuery, async (msgSnapshot) => {
          msgSnapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const msgData = change.doc.data();
              const msgId = change.doc.id;

              // Only notify if the message is from the other user and we haven't notified yet
              if (msgData.senderId !== user.uid && !notifiedMessages.current.has(msgId)) {
                notifiedMessages.current.add(msgId);
                
                // Don't notify for old messages (e.g., loaded on initial mount)
                // We check if the message is newer than 5 seconds ago
                if (Date.now() - msgData.timestamp < 5000) {
                  const userDoc = await getDoc(doc(db, 'users', otherUid));
                  const senderName = userDoc.exists() ? userDoc.data().name : 'Someone';
                  
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`New message from ${senderName}`, {
                      body: msgData.text.includes('https://meet.jit.si/') ? '🎥 Video Call Link' : msgData.text,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
            }
          });
        });
        
        // Listen for incoming calls
        const callDocRef = doc(db, 'chats', chatId, 'call', 'current');
        const unsubCall = onSnapshot(callDocRef, async (callSnapshot) => {
          if (callSnapshot.exists()) {
            const callData = callSnapshot.data();
            // Use timestamp to uniquely identify the call attempt if available, otherwise fallback to callerId
            const callId = `${chatId}_${callData.timestamp || callData.callerId}`; 
            
            if (callData.callerId !== user.uid && !notifiedCalls.current.has(callId)) {
              notifiedCalls.current.add(callId);
              
              // Only notify if the call was initiated recently (within 10 seconds)
              if (!callData.timestamp || Date.now() - callData.timestamp < 10000) {
                const userDoc = await getDoc(doc(db, 'users', otherUid));
                const callerName = userDoc.exists() ? userDoc.data().name : 'Someone';
                
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(`Incoming Video Call`, {
                    body: `${callerName} is calling you.`,
                    icon: '/favicon.ico'
                  });
                }
              }
            }
          }
        });

        unsubscribeFunctions.current.set(`${chatId}_messages`, unsubMessages);
        unsubscribeFunctions.current.set(`${chatId}_call`, unsubCall);
      });
    });

    return () => {
      unsubscribeChats();
      unsubscribeFunctions.current.forEach(unsub => unsub());
      unsubscribeFunctions.current.clear();
      activeChatListeners.current.clear();
    };
  }, [user]);

  return null;
}
