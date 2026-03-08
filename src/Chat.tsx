import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { Send, Video, ArrowLeft } from 'lucide-react';
import VideoCall from './VideoCall';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

export default function Chat() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);

  useEffect(() => {
    if (!user || !uid) return;

    // Fetch other user details
    const fetchOtherUser = async () => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setOtherUser(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching other user:", error);
      }
    };
    fetchOtherUser();

    // Create a deterministic chat ID so both users always use the exact same document
    const generatedChatId = user.uid > uid ? `${user.uid}_${uid}` : `${uid}_${user.uid}`;
    setChatId(generatedChatId);

    // Ensure the chat document exists so it shows up in the ChatList
    const ensureChatExists = async () => {
      try {
        const chatRef = doc(db, 'chats', generatedChatId);
        const chatSnap = await getDoc(chatRef);
        if (!chatSnap.exists()) {
          // Check if user has enough coins
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          const userData = userDocSnap.data();
          
          if (!userData || (userData.coins ?? 50) < 10) {
            alert("You need 10 Swap Coins to start a new chat!");
            navigate('/dashboard');
            return;
          }

          // Deduct 10 coins
          await setDoc(userDocRef, { coins: (userData.coins ?? 50) - 10 }, { merge: true });

          // Create chat
          await setDoc(chatRef, {
            participants: [user.uid, uid],
            createdAt: Date.now()
          });
        }
      } catch (error) {
        console.error("Error ensuring chat exists:", error);
      }
    };

    ensureChatExists();
  }, [user, uid]);

  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
      scrollToBottom();
    }, (error) => {
      console.error("Error listening to messages:", error);
    });

    const callDoc = doc(db, 'chats', chatId, 'call', 'current');
    const unsubscribeCall = onSnapshot(callDoc, (snapshot) => {
      if (snapshot.exists()) {
        setActiveCall(snapshot.data());
      } else {
        setActiveCall(null);
        setIsInCall(false);
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeCall();
    };
  }, [chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !user) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      text: newMessage,
      senderId: user.uid,
      timestamp: Date.now()
    });

    setNewMessage('');
  };

  const handleVideoCall = () => {
    if (!chatId) return;
    setIsInCall(true);
  };

  if (!uid) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-white/50 text-xl">Select a user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden relative">
      {isInCall && chatId && user && (
        <VideoCall 
          chatId={chatId} 
          userId={user.uid} 
          isInitiator={activeCall?.callerId === user.uid || !activeCall} 
          onEndCall={() => setIsInCall(false)} 
        />
      )}

      {/* Incoming Call Banner */}
      {activeCall && !isInCall && activeCall.callerId !== user?.uid && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 p-4 flex items-center justify-between z-40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-medium">{otherUser?.name} is calling you...</p>
            </div>
          </div>
          <button 
            onClick={() => setIsInCall(true)}
            className="bg-emerald-500 text-white px-6 py-2 rounded-full font-medium hover:bg-emerald-600 transition-colors cursor-pointer"
          >
            Join Call
          </button>
        </div>
      )}

      {/* Chat Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h3 className="text-xl font-medium tracking-tight">{otherUser?.name || 'Loading...'}</h3>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
              {otherUser?.skillHave}
            </p>
          </div>
        </div>
        <button 
          onClick={handleVideoCall}
          disabled={isInCall}
          className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
        >
          <Video className="w-4 h-4" />
          <span className="hidden sm:inline">Video Call</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          const isLink = msg.text.includes('https://meet.jit.si/');
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${isMe ? 'bg-white text-black rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                {isLink ? (
                  <div>
                    <span className="mr-2">🎥</span>
                    <a href={msg.text.split(' ').pop()} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-emerald-500 transition-colors">
                      Join Video Call
                    </a>
                  </div>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-[#0a0a0a]">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#111] border border-white/10 rounded-full px-6 py-4 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shrink-0"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
