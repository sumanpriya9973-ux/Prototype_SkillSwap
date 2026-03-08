import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

interface ChatPreview {
  chatId: string;
  otherUser: {
    uid: string;
    name: string;
    skillHave: string;
  };
}

export default function ChatList() {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'chats'), where('participants', 'array-contains', user.uid));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      try {
        const chatPreviews: ChatPreview[] = [];
        for (const chatDoc of querySnapshot.docs) {
          const data = chatDoc.data();
          const otherUid = data.participants.find((id: string) => id !== user.uid);
          if (otherUid) {
            const userDoc = await getDoc(doc(db, 'users', otherUid));
            if (userDoc.exists()) {
              chatPreviews.push({
                chatId: chatDoc.id,
                otherUser: {
                  uid: otherUid,
                  name: userDoc.data().name,
                  skillHave: userDoc.data().skillHave
                }
              });
            }
          }
        }
        setChats(chatPreviews);
      } catch (error) {
        console.error("Error fetching chats:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-4xl font-medium tracking-tight mb-10">Your Messages</h2>
      
      <div className="space-y-4">
        {chats.length === 0 ? (
          <div className="text-center py-20 bg-white/[0.03] border border-white/5 rounded-[2.5rem]">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50 text-lg">No active chats yet.</p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="mt-6 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-medium transition-colors cursor-pointer"
            >
              Explore Profiles
            </button>
          </div>
        ) : (
          chats.map((chat) => (
            <div 
              key={chat.chatId}
              onClick={() => navigate(`/chat/${chat.otherUser.uid}`)}
              className="p-6 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.06] transition-colors cursor-pointer flex items-center justify-between group"
            >
              <div>
                <h3 className="text-xl font-medium tracking-tight mb-1">{chat.otherUser.name}</h3>
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                  {chat.otherUser.skillHave}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-black transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
