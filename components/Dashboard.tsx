import { useEffect, useState } from 'react';
import { Package, ClipboardCheck, ShieldCheck, Clock, TrendingUp } from 'lucide-react';

interface DashboardData {
  stats: {
    batchesSubmitted: number;
    pendingInspections: number;
    passportsIssued: number;
    avgApprovalTime: string;
  };
  cropVolumes: { cropType: string; volume: number }[];
  recentActivity: { id: string; description: string; time: string; status: string }[];
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // --- CALL THE API INSTEAD OF SUPABASE DIRECTLY ---
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error("Failed to fetch dashboard data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Dashboard Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-red-500">Error loading dashboard data.</div>;

  const { stats, cropVolumes, recentActivity } = data;
  const maxVolume = Math.max(...cropVolumes.map(c => c.volume), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-slate-900">Dashboard</h1>
        <div className="text-sm text-slate-500">
          Live System Data
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Batches Submitted</p>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.batchesSubmitted}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span>Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Pending Inspections</p>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.pendingInspections}</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Awaiting QA review
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Passports Issued</p>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.passportsIssued}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Verifiable Credentials
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Avg. Approval</p>
              <p className="text-3xl font-semibold text-slate-900 mt-2">{stats.avgApprovalTime}</p>
            </div>
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-600" />
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-500">
            Target: 24h
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Export Volume by Crop</h2>
          <div className="space-y-4">
            {cropVolumes.map((crop) => (
              <div key={crop.cropType}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{crop.cropType}</span>
                  <span className="text-sm text-slate-600">{(crop.volume).toFixed(0)} kg</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(crop.volume / maxVolume) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {cropVolumes.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No data available yet.</p>
            )}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    activity.status === 'success' ? 'bg-emerald-600' : 
                    activity.status === 'warning' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-900 font-medium">{activity.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No recent activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}