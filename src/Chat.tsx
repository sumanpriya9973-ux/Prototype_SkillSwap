import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { db, storage } from './firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { Send, Video, ArrowLeft, Paperclip, X, Download, Image as ImageIcon, Play, Clock } from 'lucide-react';
import VideoCall from './VideoCall';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaPath?: string;
  expiresAt?: number;
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
  
  // Media sharing state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [viewerMedia, setViewerMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);

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
  }, [user, uid, navigate]);

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

  // Cleanup expired media (10 minutes)
  useEffect(() => {
    if (!chatId || messages.length === 0) return;

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      messages.forEach(async (msg) => {
        if (msg.expiresAt && msg.expiresAt < now) {
          try {
            // Delete from storage
            if (msg.mediaPath) {
              const mediaRef = ref(storage, msg.mediaPath);
              await deleteObject(mediaRef).catch(e => console.log("Storage delete error (might already be deleted):", e));
            }
            // Delete from firestore
            await deleteDoc(doc(db, 'chats', chatId, 'messages', msg.id));
          } catch (error) {
            console.error("Error deleting expired media:", error);
          }
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(cleanupInterval);
  }, [messages, chatId]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !chatId || !user) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      alert('Only images and videos are supported.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const path = `chat-media/${chatId}/${fileName}`;
    const storageRef = ref(storage, path);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setIsUploading(false);
        alert("Failed to upload file.");
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        
        await addDoc(collection(db, 'chats', chatId, 'messages'), {
          text: '',
          senderId: user.uid,
          timestamp: Date.now(),
          mediaUrl: downloadURL,
          mediaType: isImage ? 'image' : 'video',
          mediaPath: path,
          expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes from now
        });
        
        setIsUploading(false);
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    );
  };

  const handleDownload = async (url: string, type: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `skillswap-media-${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      window.open(url, '_blank');
    }
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
    <div className="max-w-4xl mx-auto h-[calc(100dvh-12rem)] sm:h-[calc(100vh-12rem)] flex flex-col bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden relative">
      {/* Media Viewer Modal */}
      {viewerMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <button 
            onClick={() => setViewerMedia(null)}
            className="absolute top-6 right-6 p-3 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer z-50"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center">
            {viewerMedia.type === 'image' ? (
              <img src={viewerMedia.url} alt="Viewed media" className="max-w-full max-h-[80vh] object-contain rounded-lg" />
            ) : (
              <video src={viewerMedia.url} controls autoPlay className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
            )}
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <button
              onClick={() => handleDownload(viewerMedia.url, viewerMedia.type)}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform cursor-pointer shadow-xl shadow-white/10"
            >
              <Download className="w-5 h-5" />
              Download {viewerMedia.type === 'image' ? 'Image' : 'Video'}
            </button>
          </div>
        </div>
      )}

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
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h3 className="text-xl font-medium tracking-tight">{otherUser?.name || 'Connecting...'}</h3>
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
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => {
          const isExpired = msg.expiresAt && msg.expiresAt < Date.now();
          if (isExpired) return null; // Hide expired messages immediately

          const isMe = msg.senderId === user?.uid;
          const isLink = msg.text.includes('https://meet.jit.si/');
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 ${isMe ? 'bg-white text-black rounded-tr-sm' : 'bg-white/10 text-white rounded-tl-sm'}`}>
                {msg.mediaUrl ? (
                  <div className="flex flex-col gap-2">
                    <div 
                      className="relative rounded-lg overflow-hidden cursor-pointer group"
                      onClick={() => setViewerMedia({ url: msg.mediaUrl!, type: msg.mediaType! })}
                    >
                      {msg.mediaType === 'image' ? (
                        <img src={msg.mediaUrl} alt="Shared media" className="max-w-full sm:max-w-[280px] max-h-[280px] object-cover rounded-lg" />
                      ) : (
                        <div className="relative">
                          <video src={msg.mediaUrl} className="max-w-full sm:max-w-[280px] max-h-[280px] object-cover rounded-lg" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <Play className="w-12 h-12 text-white opacity-90" />
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {Math.max(0, Math.ceil((msg.expiresAt! - Date.now()) / 60000))}m left
                      </div>
                    </div>
                    {msg.text && <p className="mt-1">{msg.text}</p>}
                  </div>
                ) : isLink ? (
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

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="px-6 py-2 bg-[#0a0a0a] border-t border-white/5 shrink-0">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Uploading media...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-[#0a0a0a] shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*,video/*" 
            className="hidden" 
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-[#111] border border-white/10 rounded-full px-6 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-white/40 transition-colors"
          />
          
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shrink-0"
          >
            <Send className="w-5 h-5 ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
