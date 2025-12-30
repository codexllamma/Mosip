'use client';

import { useEffect, useState } from 'react';
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
import { VoiceProvider, useVoiceNav } from '@/contexts/VoiceContext';

/**
 * We create a wrapper component because "useVoiceNav" 
 * can only be used INSIDE a <VoiceProvider>.
 */
function AppContent({ handleLogout }: { handleLogout: () => void }) {
  const { currentView } = useVoiceNav(); // Pull state from Context

  function renderView() {
    // Check for both the main page ID and sub-views like 'form' or 'list'
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'batch-submission':
      case 'form': // Voice command "create new"
      case 'list': // Voice command "show list"
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

  return (
    /* Removed currentView and onNavigate props as Layout now gets them from Context */
    <Layout onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutKey, setLayoutKey] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const storedRole = localStorage.getItem('mock_role');
      if (storedRole) {
        setIsAuthenticated(true);
        setIsLoading(false);
        setLayoutKey(prev => prev + 1);
      } else {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    };
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mock_role');
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <RoleProvider key={layoutKey}>
      <VoiceProvider>
        {/* We use a sub-component so we can call useVoiceNav() */}
        <AppContent handleLogout={handleLogout} />
      </VoiceProvider>
    </RoleProvider>
  );
}