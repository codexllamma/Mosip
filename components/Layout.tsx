import { ReactNode } from 'react';
import { LayoutDashboard, Upload, ClipboardCheck, ShieldCheck, FileText, Menu, X } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { role, setRole, userName } = useRole();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'batch-submission', label: 'Batch Submission', icon: Upload, roles: ['exporter'] },
    { id: 'inspection-requests', label: 'Inspection Requests', icon: ClipboardCheck, roles: ['qa_agency'] },
    { id: 'digital-passports', label: 'Digital Passports (VCs)', icon: ShieldCheck },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
  ];

  const visibleNavItems = navItems.filter(
    item => !item.roles || item.roles.includes(role)
  );

  const roleLabels = {
    exporter: 'Exporter',
    qa_agency: 'QA Agency',
    importer: 'Importer',
  };

  const breadcrumbs = currentView
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside
        className={`fixed left-0 top-0 h-full bg-white border-r border-slate-200 transition-all duration-300 ease-in-out z-20 ${
          isSidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-900">AgriExport</span>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-slate-600 hover:text-slate-900 transition-colors"
              >
                {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <nav className="text-sm text-slate-600">
                <span className="text-slate-400">Home</span>
                <span className="mx-2">/</span>
                <span className="text-slate-900 font-medium">{breadcrumbs}</span>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as typeof role)}
                  className="appearance-none bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="exporter">View as: Exporter</option>
                  <option value="qa_agency">View as: QA Agency</option>
                  <option value="importer">View as: Importer</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900">{userName}</div>
                  <div className="text-xs text-slate-500">{roleLabels[role]}</div>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                  <span className="text-emerald-700 font-semibold text-sm">
                    {userName.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
