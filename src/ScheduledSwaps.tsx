import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { CalendarClock, Video, MapPin, Phone, MessageSquare, ArrowLeft, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduledSwap {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  createdBy?: string;
  swapType: string;
  scheduleDay: string;
  scheduleHour: string;
  scheduleMinute: string;
  status: string;
  createdAt: any;
}

export default function ScheduledSwaps() {
  const [swaps, setSwaps] = useState<ScheduledSwap[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSwapId, setStartingSwapId] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSwaps = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'scheduled_swaps'),
          where('participants', 'array-contains', user.uid)
        );
        const snapshot = await getDocs(q);
        const fetchedSwaps: ScheduledSwap[] = [];
        snapshot.forEach((doc) => {
          fetchedSwaps.push({ id: doc.id, ...doc.data() } as ScheduledSwap);
        });
        
        // Sort manually by createdAt to avoid needing a composite index
        fetchedSwaps.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        setSwaps(fetchedSwaps);
      } catch (error) {
        console.error("Error fetching scheduled swaps:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSwaps();
  }, [user]);

  const handleStartSwap = async (swap: ScheduledSwap, otherUserId: string) => {
    if (!user) return;
    setStartingSwapId(swap.id);
    
    try {
      // Create a chat ID (consistent with how it's done in ChatList/Chat)
      const chatId = [user.uid, otherUserId].sort().join('_');
      
      // Send a notification message in the chat
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: `🚀 I'm ready to start our scheduled ${swap.swapType} swap! Let's go!`,
        senderId: user.uid,
        timestamp: Date.now(),
        createdAt: serverTimestamp()
      });
      
      // Navigate to the chat
      navigate(`/chat/${otherUserId}`);
    } catch (error) {
      console.error("Error starting swap:", error);
      alert("Failed to start swap. Please try again.");
    } finally {
      setStartingSwapId(null);
    }
  };

  const getSwapIcon = (type: string) => {
    switch (type) {
      case 'Video Call': return <Video className="w-5 h-5" />;
      case 'Voice Call': return <Phone className="w-5 h-5" />;
      case 'Chat': return <MessageSquare className="w-5 h-5" />;
      case 'In-person':
      default: return <MapPin className="w-5 h-5" />;
    }
  };

  const getDayName = (dayCode: string) => {
    const map: Record<string, string> = {
      'M': 'Monday',
      'T': 'Tuesday',
      'W': 'Wednesday',
      'Th': 'Thursday',
      'F': 'Friday',
      'Sa': 'Saturday',
      'S': 'Sunday'
    };
    return map[dayCode] || dayCode;
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Swaps</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
        </div>
      ) : swaps.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-3xl">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-xl font-medium mb-2">No scheduled swaps</h3>
          <p className="text-white/40">You haven't scheduled any skill swaps yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {swaps.map((swap) => {
            const otherUserId = swap.participants.find(id => id !== user?.uid);
            const otherUserName = otherUserId ? swap.participantNames[otherUserId] : 'Unknown User';

            return (
              <div key={swap.id} className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0">
                    {getSwapIcon(swap.swapType)}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">Swap with {otherUserName}</h3>
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-medium text-white/70">
                        {swap.swapType}
                      </span>
                      <span>•</span>
                      <span>{getDayName(swap.scheduleDay)} at {swap.scheduleHour}:{swap.scheduleMinute}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button 
                    onClick={() => otherUserId && handleStartSwap(swap, otherUserId)}
                    disabled={swap.createdBy === user?.uid || startingSwapId === swap.id}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors text-center ${
                      swap.createdBy === user?.uid 
                        ? 'bg-white/5 text-white/30 cursor-not-allowed' 
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                    }`}
                    title={swap.createdBy === user?.uid ? "Only the receiver can start the swap" : "Start Swap"}
                  >
                    <Play className="w-4 h-4" />
                    {startingSwapId === swap.id ? 'Starting...' : 'Start Swap'}
                  </button>
                  <button 
                    onClick={() => navigate(`/chat/${otherUserId}`)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors text-center"
                  >
                    Message
                  </button>
                  <button 
                    onClick={() => navigate(`/profile/${otherUserId}`)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white text-black hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors text-center"
                  >
                    Profile
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
