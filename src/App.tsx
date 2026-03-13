import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LandingPage from './LandingPage';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Profile from './Profile';
import UserProfileView from './UserProfileView';
import Match from './Match';
import Chat from './Chat';
import ChatList from './ChatList';
import MapView from './Map';
import LoadingScreen from './LoadingScreen';
import HowItWorks from './HowItWorks';
import Settings from './Settings';
import ScheduledSwaps from './ScheduledSwaps';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:uid" element={<UserProfileView />} />
            <Route path="/match" element={<Match />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:uid" element={<Chat />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/scheduled-swaps" element={<ScheduledSwaps />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
