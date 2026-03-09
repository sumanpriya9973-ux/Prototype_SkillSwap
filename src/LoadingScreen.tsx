import React from 'react';
import { Globe } from 'lucide-react';

export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div className="absolute w-32 h-32 bg-white/5 rounded-full blur-xl animate-pulse" />
        {/* Rotating Earth Icon */}
        <Globe className="w-16 h-16 text-white/80 animate-[spin_3s_linear_infinite]" strokeWidth={1.5} />
      </div>
      <p className="mt-6 text-white/40 tracking-widest text-sm uppercase font-medium animate-pulse">
        Connecting
      </p>
    </div>
  );
}
