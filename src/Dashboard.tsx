import React, { useState, useEffect } from 'react';
import { Search, Mail, MessageCircle, ArrowRight, Video, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  uid: string;
  name: string;
  contact: string;
  contactType: 'email' | 'whatsapp';
  skillHave: string;
  skillWant: string;
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfiles = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'users'), where('uid', '!=', user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedProfiles: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          fetchedProfiles.push(doc.data() as UserProfile);
        });
        setProfiles(fetchedProfiles);
      } catch (error) {
        console.error("Error fetching profiles:", error);
      }
    };

    fetchProfiles();
  }, [user]);

  const filteredProfiles = profiles.filter(p => 
    (p.skillHave?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (p.skillWant?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (p.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const handleChat = (profile: UserProfile) => {
    navigate(`/chat/${profile.uid}`);
  };

  const handleProfile = (profile: UserProfile) => {
    navigate(`/profile/${profile.uid}`);
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-20 max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-white/30" />
        <input
          type="text"
          className="w-full bg-white/5 border border-white/10 rounded-full py-5 pl-16 pr-8 text-lg text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all"
          placeholder="Search for skills, people, or roles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProfiles.map((profile) => (
            <motion.div
              key={profile.uid}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="group relative p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500 flex flex-col"
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-3xl font-medium tracking-tight mb-2">{profile.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/40 uppercase tracking-widest font-semibold">
                    {profile.contactType === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageCircle className="w-3.5 h-3.5" />}
                    {profile.contactType}
                  </div>
                </div>
                <button 
                  onClick={() => handleChat(profile)}
                  className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:bg-white group-hover:text-black transition-colors duration-500 shrink-0 cursor-pointer"
                  title="Message"
                >
                  <MessageCircle className="w-6 h-6 transition-transform duration-500" />
                </button>
              </div>

              <div className="space-y-8 flex-grow">
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Can Teach</div>
                  <div className="inline-flex items-center px-5 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm font-medium">
                    {profile.skillHave || 'Not specified'}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-3">Wants to Learn</div>
                    <div className="inline-flex items-center px-5 py-2.5 rounded-full border border-white/20 text-white/70 text-sm font-medium">
                      {profile.skillWant || 'Not specified'}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleProfile(profile)}
                    className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-white hover:text-black transition-colors duration-500 shrink-0 cursor-pointer"
                    title="View Profile"
                  >
                    <User className="w-6 h-6 transition-transform duration-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredProfiles.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-2xl font-medium tracking-tight mb-2">No profiles found</h3>
            <p className="text-white/40">Try adjusting your search terms.</p>
          </div>
        )}
      </div>
    </div>
  );
}
