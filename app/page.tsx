'use client';

import { useState, useEffect } from 'react';
import { RoleProvider } from "@/contexts/RoleContext";
import { Layout } from "@/components/Layout";
import { Dashboard } from '@/components/Dashboard';
import { BatchSubmission } from '@/components/BatchSubmission';
import { InspectionRequests } from '@/components/InspectionRequests';
import { DigitalPassports } from '@/components/DigitalPassports';
import { AuditLogs } from '@/components/AuditLogs';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initialize() {
      //await seedDatabase();
      setIsInitialized(true);
    }
    initialize();
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-700 font-medium">Loading AgriExport System...</p>
        </div>
      </div>
    );
  }

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
      default:
        return <Dashboard />;
    }
  }

  return (
    <RoleProvider>

      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {renderView()}
      </Layout>
    </RoleProvider>
    
  );
}

export default App;


