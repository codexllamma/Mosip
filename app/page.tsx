'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // <--- Needed for redirection
import { RoleProvider } from "@/contexts/RoleContext";
import { Layout } from "@/components/Layout";
import { Dashboard } from '@/components/Dashboard';
import { BatchSubmission } from '@/components/BatchSubmission';
import { InspectionRequests } from '@/components/InspectionRequests';
import DigitalPassports from '@/components/DigitalPassports';
import { AuditLogs } from '@/components/AuditLogs';
import InjiVerify from '@/components/InjiVerify';

export default function App() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check login status on load
  useEffect(() => {
    const checkAuth = () => {
      const storedRole = localStorage.getItem('mock_role');
      
      if (storedRole) {
        // User is logged in -> Show Dashboard
        setIsAuthenticated(true);
        setIsLoading(false);
      } else {
        // User is NOT logged in -> Send to /login
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('mock_role');
    setIsAuthenticated(false);
    // Redirect to login page immediately upon logout
    router.push('/login');
  };

  // 1. Loading State (Show this while checking auth or redirecting)
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
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

  // 3. Render Dashboard (Only happens if isAuthenticated is true)
  return (
    <RoleProvider>
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