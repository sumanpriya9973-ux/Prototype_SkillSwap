import React, { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Video, PhoneOff } from 'lucide-react';

export default function NotificationManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const activeChatListeners = useRef<Set<string>>(new Set());
  const unsubscribeFunctions = useRef<Map<string, () => void>>(new Map());
  const notifiedMessages = useRef<Set<string>>(new Set());
  const notifiedCalls = useRef<Set<string>>(new Set());
  
  const [incomingCall, setIncomingCall] = useState<{chatId: string, callerName: string, callId: string} | null>(null);

  useEffect(() => {
    if (!user) return;

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
            
            if (callData.callerId !== user.uid) {
              // Only notify if the call was initiated recently (within 30 seconds)
              if (!callData.timestamp || Date.now() - callData.timestamp < 30000) {
                const userDoc = await getDoc(doc(db, 'users', otherUid));
                const callerName = userDoc.exists() ? userDoc.data().name : 'Someone';
                
                // Show in-app notification if we are not already in that specific chat room
                if (!location.pathname.includes(`/chat/${otherUid}`)) {
                  setIncomingCall({ chatId, callerName, callId });
                }

                if (!notifiedCalls.current.has(callId)) {
                  notifiedCalls.current.add(callId);
                  if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification(`Incoming Video Call`, {
                      body: `${callerName} is calling you.`,
                      icon: '/favicon.ico'
                    });
                  }
                }
              }
            }
          } else {
            // Call ended or rejected
            setIncomingCall(prev => prev?.chatId === chatId ? null : prev);
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
  }, [user, location.pathname]);

  if (!incomingCall) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
      <div className="bg-[#1a1a1a] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 w-full max-w-md mx-auto pointer-events-auto">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse shrink-0">
          <Video className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{incomingCall.callerName}</h4>
          <p className="text-white/60 text-sm truncate">Incoming video call...</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => setIncomingCall(null)}
            className="w-10 h-10 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-full flex items-center justify-center transition-colors"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              setIncomingCall(null);
              // We need to navigate to the chat room. The chat room URL is /chat/:uid
              // But we only have chatId here. The chatId is `${uid1}_${uid2}`.
              // We can extract the other user's uid from the chatId.
              const otherUid = incomingCall.chatId.replace(user?.uid || '', '').replace('_', '');
              navigate(`/chat/${otherUid}`);
            }}
            className="w-10 h-10 bg-emerald-500 text-white hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
