import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, Map as MapIcon, MessageSquare, LogOut, Coins, Bell, Menu, Settings, Info, HelpCircle, Users, CalendarClock } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from './AuthContext';
import NotificationManager from './NotificationManager';
import CoinStore from './CoinStore';

export default function Layout() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [isCoinStoreOpen, setIsCoinStoreOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      setShowNotificationBanner(true);
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setShowNotificationBanner(false);
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/20 relative overflow-hidden">
      <NotificationManager />
      {/* Background Glow */}
      <div className="fixed top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-white/[0.08] to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Notification Banner */}
      {showNotificationBanner && (
        <div className="fixed top-20 left-0 w-full bg-emerald-500/10 border-b border-emerald-500/20 z-30 flex items-center justify-center px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-3 text-emerald-400 text-sm font-medium">
            <Bell className="w-4 h-4" />
            <span>Enable notifications to get alerts for new messages and calls.</span>
            <button 
              onClick={requestNotificationPermission}
              className="ml-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              Enable
            </button>
            <button 
              onClick={() => setShowNotificationBanner(false)}
              className="ml-1 text-emerald-400/50 hover:text-emerald-400 px-2 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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
            <button 
              onClick={() => setIsCoinStoreOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/20 mr-2 hover:bg-yellow-500/20 transition-colors cursor-pointer"
            >
              <Coins className="w-4 h-4" />
              <span className="text-sm font-bold">{profile?.coins ?? 50}</span>
            </button>

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
            <Link to="/profile" className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5 flex items-center justify-center overflow-hidden">
              <span className="hidden sm:block text-sm font-medium">Profile</span>
              {profile?.photoURL && !profile.photoURL.startsWith('http') && !profile.photoURL.startsWith('data:') ? (
                <span className="text-lg leading-none sm:hidden">{profile.photoURL}</span>
              ) : (
                <User className="w-5 h-5 sm:hidden" />
              )}
            </Link>
            
            <div className="w-px h-6 bg-white/10 mx-2"></div>
            
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/5 cursor-pointer"
                title="Menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 py-2">
                  <Link 
                    to="/match" 
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    Match
                  </Link>
                  <Link 
                    to="/scheduled-swaps" 
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <CalendarClock className="w-4 h-4" />
                    Scheduled Swaps
                  </Link>
                  <Link 
                    to="/settings"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <Link 
                    to="/how-it-works"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <HelpCircle className="w-4 h-4" />
                    How It Works
                  </Link>
                  <Link 
                    to="/about"
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Info className="w-4 h-4" />
                    About Us
                  </Link>
                  <div className="h-px bg-white/10 my-1"></div>
                  <button 
                    onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-24 px-6 max-w-7xl mx-auto relative z-10">
        <Outlet />
      </main>

      {isCoinStoreOpen && <CoinStore onClose={() => setIsCoinStoreOpen(false)} />}
    </div>
  );
}
