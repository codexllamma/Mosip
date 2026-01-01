'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { RoleProvider } from "@/contexts/RoleContext";
import { Layout } from "@/components/Layout";

// Import all application views
import { Dashboard } from '@/components/Dashboard';
import { BatchSubmission } from '@/components/BatchSubmission';
import { InspectionRequests } from '@/components/InspectionRequests';
import DigitalPassports from '@/components/DigitalPassports';
import { AuditLogs } from '@/components/AuditLogs';
import InjiVerify from '@/components/InjiVerify';
import { Profile } from '@/components/Profile'; // [NEW] Import Profile Component
import { VoiceProvider, useVoiceNav } from '@/contexts/VoiceContext';

// --- SUB-COMPONENT: View Router ---
function AppContent({ handleLogout }: { handleLogout: () => void }) {
  const { currentView } = useVoiceNav(); 

  function renderView() {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'batch-submission':
      case 'form': 
      case 'list': return <BatchSubmission />;
      case 'inspection-requests': return <InspectionRequests />;
      case 'digital-passports': return <DigitalPassports />;
      case 'audit-logs': return <AuditLogs />;
      case 'inji-verify': return <InjiVerify />;
      case 'profile': return <Profile />;
      
      default: return <Dashboard />;
    }
  }

  return (
    <Layout onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
}

// --- SUB-COMPONENT: Auth Checker ---
function AuthenticatedApp() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') return null;

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <RoleProvider>
      <VoiceProvider>
        <AppContent handleLogout={handleLogout} />
      </VoiceProvider>
    </RoleProvider>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AuthenticatedApp />
    </SessionProvider>
  );
}