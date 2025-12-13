import { useEffect, useState } from 'react';
import { FileText, Filter } from 'lucide-react';
import type { AuditLog } from '../types';

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterType, filterRole, logs]);

  async function loadLogs() {
    try {
      // --- CHANGED: Fetch from API instead of Supabase direct ---
      const response = await fetch('/api/audit-logs');
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      const data = await response.json();
      
      if (data) {
        setLogs(data);
        setFilteredLogs(data);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...logs];

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.entity_type === filterType);
    }

    if (filterRole !== 'all') {
      // Note: The API might return generic roles depending on your seed data logic,
      // but filtering logic remains valid if data exists.
      filtered = filtered.filter(log => log.actor_role === filterRole);
    }

    setFilteredLogs(filtered);
  }

  function getActionBadge(action: string) {
    const badges: Record<string, string> = {
      created: 'bg-slate-100 text-slate-700',
      updated: 'bg-slate-100 text-slate-700',
      approved: 'bg-emerald-100 text-emerald-700',
      rejected: 'bg-rose-100 text-rose-700',
      inspection_completed: 'bg-emerald-100 text-emerald-700',
      credential_issued: 'bg-emerald-100 text-emerald-700',
      CREATED_BATCH: 'bg-blue-100 text-blue-800',       // Matches backend enum style
      INSPECTION_COMPLETED: 'bg-purple-100 text-purple-800',
      ISSUED_CREDENTIAL: 'bg-emerald-100 text-emerald-800',
    };
    // Handle both snake_case (old) and UPPER_CASE (backend) formats
    return badges[action] || badges[action.toUpperCase()] || 'bg-slate-100 text-slate-700';
  }

  function formatAction(action: string): string {
    return action
      .split(/_| /) // Split by underscore or space
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  function formatDateTime(timestamp: string) {
    if (!timestamp) return { date: '-', time: '-' };
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  function getDescription(log: AuditLog): string {
    const details = log.details as { batchNumber?: string; cropType?: string; grade?: string; crop?: string };
    const batchNumber = details.batchNumber || 'Unknown';
    // Handle crop type from either 'crop' or 'cropType' property depending on how API mapped it
    const cropType = details.cropType || details.crop || '';

    // Normalize action string for comparison
    const actionUpper = log.action.toUpperCase();

    if (actionUpper.includes('CREATED')) {
       return `New ${cropType} batch #${batchNumber} submitted`;
    }
    if (actionUpper.includes('INSPECTION')) {
       return `Inspection completed for batch #${batchNumber}`;
    }
    if (actionUpper.includes('CREDENTIAL') || actionUpper.includes('ISSUED')) {
       return `Digital passport issued for batch #${batchNumber}`;
    }
    if (actionUpper.includes('APPROVED')) {
       return `Batch #${batchNumber} approved`;
    }
    
    return `${formatAction(log.action)} - ${log.entity_type} ${log.entity_id.slice(0, 8)}`;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-600 mt-1">Complete history of all system activities</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-slate-600 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="BATCH">Batches</option>
              <option value="INSPECTION">Inspections</option>
              <option value="CERTIFICATE">Credentials</option>
            </select>

            <div className="ml-auto text-sm text-slate-600">
              Showing {filteredLogs.length} of {logs.length} entries
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map((log) => {
                const dateTime = formatDateTime(log.created_at);
                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{dateTime.date}</div>
                        <div className="text-xs text-slate-500">{dateTime.time}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{log.actor_name || 'System'}</div>
                        <div className="text-xs text-slate-500 capitalize">{log.actor_role?.replace('_', ' ') || 'User'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{getDescription(log)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-slate-600 capitalize">{log.entity_type}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No audit logs found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}