import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import LandingPage from './components/LandingPage';

import Overview from './pages/Overview';
import Operations from './pages/Operations';
import Intelligence from './pages/Intelligence';
import Simulation from './pages/Simulation';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';

function Loading() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f7f7f9] dark:bg-[#242424]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  );
}

function AppRoutes() {
  const { currentUser } = useAuth();
  
  if (currentUser === undefined) {
    return <Loading />;
  }
  
  return (
    <Routes>
      <Route path="/" element={
        currentUser ? <Navigate to="/overview" replace /> : <LandingPage />
      } />
      <Route path="/overview" element={
        currentUser ? <Layout><Overview /></Layout> : <Navigate to="/" replace />
      } />
      <Route path="/operations" element={
        currentUser ? <Layout><Operations /></Layout> : <Navigate to="/" replace />
      } />
      <Route path="/intelligence" element={
        currentUser ? <Layout><Intelligence /></Layout> : <Navigate to="/" replace />
      } />
      <Route path="/simulation" element={
        currentUser ? <Layout><Simulation /></Layout> : <Navigate to="/" replace />
      } />
      <Route path="/analytics" element={
        currentUser ? <Layout><Analytics /></Layout> : <Navigate to="/" replace />
      } />
      <Route path="/profile" element={
        currentUser ? <Layout><Profile /></Layout> : <Navigate to="/" replace />
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="h-screen w-screen bg-[#f7f7f9] dark:bg-[#242424]">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </div>
  );
}