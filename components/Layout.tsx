"use client";

import { ReactNode, useState } from 'react';
import { 
  LayoutDashboard, 
  Upload, 
  ClipboardCheck, 
  ShieldCheck, 
  FileText, 
  Menu, 
  X,
  LogOut, 
  User,
  ScanLine 
} from 'lucide-react';
import { useRole } from "@/contexts/RoleContext";
import { useVoiceNav } from "@/contexts/VoiceContext"; 
import VoiceNav from './VoiceNav';

interface LayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function Layout({ children, onLogout }: LayoutProps) {
  const { role, userName } = useRole();
  const { currentView, navigateTo } = useVoiceNav(); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['EXPORTER', 'QA_AGENCY', 'IMPORTER', 'ADMIN'] },
    { id: 'batch-submission', label: 'Batch Submission', icon: Upload, roles: ['EXPORTER'] },
    { id: 'inspection-requests', label: 'Inspection Requests', icon: ClipboardCheck, roles: ['QA_AGENCY'] },
    { id: 'digital-passports', label: 'Digital Passports (VCs)', icon: ShieldCheck, roles: ['EXPORTER', 'QA_AGENCY', 'IMPORTER'] },
    { id: 'inji-verify', label: 'Inji Verify', icon: ScanLine, roles: ['IMPORTER', 'QA_AGENCY', 'ADMIN','EXPORTER'] }, 
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText, roles: ['ADMIN'] },
  ];

  const visibleNavItems = navItems.filter(
    item => !item.roles || item.roles.includes(role || '')
  );

  const breadcrumbs = currentView
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside
        className={`fixed left-0 top-0 h-full bg-emerald-900 text-white transition-all duration-300 ease-in-out z-20 flex flex-col ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="p-6 border-b border-emerald-800 flex items-center justify-between h-20">
          <div className={`flex items-center gap-3 ${!isSidebarOpen && 'justify-center w-full'}`}>
            <div className="min-w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-emerald-900 font-bold text-xl">A</span>
            </div>
            {isSidebarOpen && <span className="font-semibold text-lg">AgriExport</span>}
          </div>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id || (item.id === 'batch-submission' && (currentView === 'form' || currentView === 'list'));
            
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'text-emerald-100 hover:bg-emerald-800 hover:text-white'
                } ${!isSidebarOpen && 'justify-center'}`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <Icon className="w-5 h-5 min-w-[20px]" />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-800">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-emerald-100 hover:bg-emerald-800 hover:text-white transition-colors ${
              !isSidebarOpen && 'justify-center'
            }`}
            title="Log Out"
          >
            <LogOut className="w-5 h-5 min-w-[20px]" />
            {isSidebarOpen && <span>Log Out</span>}
          </button>
        </div>
      </aside>

      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        }`}
      >
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 h-16">
          <div className="px-6 h-full flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-slate-500 hover:text-emerald-600 transition-colors p-1 rounded-md hover:bg-slate-100"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <nav className="hidden md:flex text-sm text-slate-600 items-center">
                <span className="text-slate-400 hover:text-slate-600 transition-colors">Home</span>
                <span className="mx-2 text-slate-300">/</span>
                <span className="text-slate-900 font-medium">{breadcrumbs}</span>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <VoiceNav />
              
              {/* [UPDATED] CLICKABLE USER PROFILE */}
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <button 
                  onClick={() => navigateTo('profile')} 
                  className="flex items-center gap-3 group hover:bg-slate-50 p-1 rounded-lg transition-colors text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {userName || 'User'}
                    </div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-semibold">
                        {role?.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="w-9 h-9 bg-emerald-100 group-hover:bg-emerald-200 rounded-full flex items-center justify-center border border-emerald-200 transition-colors">
                    <User className="w-5 h-5 text-emerald-700" />
                  </div>
                </button>
              </div>

            </div>
          </div>
        </header>

        <main className="p-6 flex-1 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}