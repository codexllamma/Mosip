'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Globe, Lock, Sprout, ArrowRight } from 'lucide-react';
import { RoleProvider } from "@/contexts/RoleContext";
import { Layout } from "@/components/Layout";
import { Dashboard } from '@/components/Dashboard';
import { BatchSubmission } from '@/components/BatchSubmission';
import { InspectionRequests } from '@/components/InspectionRequests';
import { DigitalPassports } from '@/components/DigitalPassports';
import { AuditLogs } from '@/components/AuditLogs';

// --- 1. THE LOGIN COMPONENT (Landing View) ---
function LoginView({ onLogin }: { onLogin: (role: string) => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100">
        
        {/* Header */}
        <div className="bg-emerald-600 p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Sprout className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AgriExport</h1>
          <p className="text-emerald-50 text-sm">Secure Quality Assurance Portal</p>
        </div>

        {/* Demo Login Grid */}
        <div className="p-8">
          <p className="text-center text-slate-500 text-sm mb-6 font-medium uppercase tracking-wider">Select Role to Login</p>
          
          <div className="grid gap-3">
            <button 
              onClick={() => onLogin('EXPORTER')}
              className="group flex items-center p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200"
            >
              <div className="bg-emerald-100 p-2 rounded-lg group-hover:bg-emerald-200 transition-colors">
                <Globe className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-semibold text-slate-800">Exporter</h3>
                <p className="text-xs text-slate-500">Submit batches & track shipments</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => onLogin('QA_AGENCY')}
              className="group flex items-center p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200"
            >
              <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                <ShieldCheck className="w-5 h-5 text-blue-700" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-semibold text-slate-800">QA Agency</h3>
                <p className="text-xs text-slate-500">Inspect goods & issue certificates</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => onLogin('IMPORTER')}
              className="group flex items-center p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200"
            >
              <div className="bg-purple-100 p-2 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Users className="w-5 h-5 text-purple-700" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-semibold text-slate-800">Importer</h3>
                <p className="text-xs text-slate-500">Verify & view purchase history</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => onLogin('ADMIN')}
              className="group flex items-center p-4 rounded-xl border border-slate-200 hover:border-slate-500 hover:bg-slate-50 transition-all duration-200"
            >
              <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-slate-200 transition-colors">
                <Lock className="w-5 h-5 text-slate-700" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-semibold text-slate-800">Admin</h3>
                <p className="text-xs text-slate-500">Manage users & system config</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">AgriExport v1.0 • Hackathon Build</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 2. THE MAIN APP SHELL ---
export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check login status on load
  useEffect(() => {
    const checkAuth = () => {
      const storedRole = localStorage.getItem('mock_role');
      if (storedRole) {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (role: string) => {
    // Save role and switch to App View
    localStorage.setItem('mock_role', role);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('mock_role');
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Not Logged In -> Show Login View
  if (!isAuthenticated) {
    return <LoginView onLogin={handleLogin} />;
  }

  // 3. Logged In -> Show Dashboard (With Role Context)
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