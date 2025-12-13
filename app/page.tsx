'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoleProvider } from "@/contexts/RoleContext";
import { Layout } from "@/components/Layout";

// Import all application views
import { Dashboard } from '@/components/Dashboard';
import { BatchSubmission } from '@/components/BatchSubmission';
import { InspectionRequests } from '@/components/InspectionRequests';
import DigitalPassports from '@/components/DigitalPassports';
import { AuditLogs } from '@/components/AuditLogs';
import InjiVerify from '@/components/InjiVerify';

/**
 * Main application entry point responsible for:
 * 1. Client-side authentication check using localStorage ('mock_role').
 * 2. Managing the current view state ('dashboard', 'batch-submission', etc.).
 * 3. Forcing RoleProvider re-render after a state change (like login/logout).
 */
export default function App() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Key to force re-mounting the RoleProvider and Layout, ensuring fresh context data is fetched.
  const [layoutKey, setLayoutKey] = useState(0); 

  // --- Authentication Check (Runs on mount/navigation) ---
  useEffect(() => {
    const checkAuth = () => {
      const storedRole = localStorage.getItem('mock_role');
      
      if (storedRole) {
        // User is logged in
        setIsAuthenticated(true);
        setIsLoading(false);
        // Increment key to force RoleProvider to load the new role immediately
        setLayoutKey(prev => prev + 1); 
        
        // --- Smart Redirect to default role view ---
        const defaultView = 
          storedRole === 'QA_AGENCY' ? 'inspection-requests' :
          storedRole === 'IMPORTER' ? 'digital-passports' :
          storedRole === 'ADMIN' ? 'audit-logs' : 
          'dashboard';
        
        setCurrentView(defaultView);

      } else {
        // User is NOT logged in -> Redirect to /login
        // Using window.location.href here to avoid conflicts with router state during auth flow
        if (window.location.pathname !== '/login') {
            window.location.href = '/login'; 
        }
      }
    };
    
    // Slight delay to allow next-auth session establishment before checking
    const timer = setTimeout(checkAuth, 100); 

    return () => clearTimeout(timer);
  }, []); 

  // --- Logout Handler ---
  const handleLogout = () => {
    localStorage.removeItem('mock_role');
    setIsAuthenticated(false);
    // Force a full page redirect to /login to clear all client-side state
    window.location.href = '/login';
  };

  // 1. Loading State
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        {/* Simple Loading Spinner */}
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Render View Logic
  function renderView() {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'batch-submission':
        return <BatchSubmission />;
      case 'inspection-requests':
        return <InspectionRequests />;
      case 'digital-passports':
        return <DigitalPassports />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'inji-verify':
        return <InjiVerify />;
      default:
        return <Dashboard />;
    }
  }

  // 3. Render Application Layout
  return (
    // Key forces the provider to re-mount and read the latest 'mock_role' from localStorage
    <RoleProvider key={layoutKey}> 
      <Layout 
        currentView={currentView} 
        onNavigate={setCurrentView}
        onLogout={handleLogout}
      >
        {renderView()}
      </Layout>
    </RoleProvider>
  );
}