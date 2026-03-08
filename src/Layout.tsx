import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, Map as MapIcon, MessageSquare, LogOut, Coins } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';

export default function Layout() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 relative overflow-hidden">
      {/* Background Glow */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-white/[0.08] to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Navbar */}
      <nav className="fixed top-0 w-full border-b border-white/5 bg-[#050505]/80 backdrop-blur-2xl z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight hidden sm:block">SkillSwap</span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 mr-2">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-bold">{profile?.coins ?? 50}</span>
            </div>

            <Link to="/dashboard" className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <span className="hidden sm:block text-sm font-medium">Explore</span>
              <Sparkles className="w-5 h-5 sm:hidden" />
            </Link>
            <Link to="/map" className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <span className="hidden sm:block text-sm font-medium">Map</span>
              <MapIcon className="w-5 h-5 sm:hidden" />
            </Link>
            <Link to="/chat" className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <span className="hidden sm:block text-sm font-medium">Chat</span>
              <MessageSquare className="w-5 h-5 sm:hidden" />
            </Link>
            <Link to="/profile" className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <span className="hidden sm:block text-sm font-medium">Profile</span>
              <User className="w-5 h-5 sm:hidden" />
            </Link>
            
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            
            <button 
              onClick={handleLogout}
              className="p-2 text-white/50 hover:text-red-400 transition-colors rounded-full hover:bg-white/5 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 max-w-7xl mx-auto relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
