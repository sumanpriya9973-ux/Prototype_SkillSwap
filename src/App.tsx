import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LandingPage from './LandingPage';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Chat from './Chat';
import ChatList from './ChatList';
import MapView from './Map';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:uid" element={<Chat />} />
            <Route path="/map" element={<MapView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
