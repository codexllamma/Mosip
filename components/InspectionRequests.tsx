import { useEffect, useState } from 'react';
import { Search, FileText, X, Loader2, TestTube } from 'lucide-react'; // Added Loader2, TestTube
import { useRole } from '../contexts/RoleContext';
import type { Batch } from '../types';
import { useSession } from "next-auth/react";

// --- 1. Dynamic Test Configuration ---
// This is the "Source of Truth" for your form. 
// In the future, you can replace this array with data fetched from the QA Profile API.
const TEST_CONFIG = [
    { id: 'moisture', label: 'Moisture Content', type: 'number', unit: '%', placeholder: 'e.g. 12.5' },
    { id: 'pesticide', label: 'Pesticide Residue', type: 'number', unit: 'ppm', placeholder: 'e.g. 0.05' },
    { id: 'heavyMetals', label: 'Heavy Metals', type: 'number', unit: 'ppm', placeholder: 'e.g. 0.02' },
    { id: 'aflatoxin', label: 'Aflatoxin Level', type: 'number', unit: 'ppb', placeholder: 'e.g. 2.0' },
    { id: 'grade', label: 'Quality Grade', type: 'select', options: ['A', 'B', 'C'] },
    { id: 'organic', label: 'Organic Certified', type: 'checkbox' },
];

interface InspectionFormData {
  moisture: string;
  pesticide: string;
  heavyMetals: string;
  aflatoxin: string;
  grade: string;
  organic: boolean;
  notes: string;
  [key: string]: any; // Allow for dynamic access
}

export function InspectionRequests() {
  const { userName } = useRole();
  const { data: session } = useSession();

  // Data State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // View State
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // <--- New Loading State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState<InspectionFormData>({
    moisture: '',
    pesticide: '',
    heavyMetals: '',
    aflatoxin: '',
    grade: '',
    organic: false,
    notes: '',
  });

  useEffect(() => {
    loadBatches();
  }, [session?.user?.email]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = batches.filter(batch =>
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.exporter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.crop_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBatches(filtered);
    } else {
      setFilteredBatches(batches);
    }
  }, [searchTerm, batches]);

  // --- FETCH BATCHES ---
  async function loadBatches() {
    if (!session?.user?.email) return;
    
    setIsLoading(true); // Start Loading
    try {
      const response = await fetch(`/api/inspections/pending?email=${session.user.email}`);
      if (!response.ok) throw new Error('Failed to fetch batches');
      
      const data = await response.json();
      setBatches(data);
      setFilteredBatches(data);
    } catch (error) {
      console.error("Error loading batches:", error);
    } finally {
      setIsLoading(false); // Stop Loading
    }
  }

  function openInspectionModal(batch: Batch) {
    setSelectedBatch(batch);
    setShowModal(true);
    // Reset form
    setFormData({
      moisture: '',
      pesticide: '',
      heavyMetals: '',
      aflatoxin: '',
      grade: '',
      organic: false,
      notes: '',
    });
  }

  function closeModal() {
    setShowModal(false);
    setSelectedBatch(null);
  }

  // --- SUBMIT INSPECTION ---
  async function handleSubmitInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/inspections/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          inspectorEmail: session?.user?.email,
          inspectorName: userName,
          
          // Map dynamic fields to API payload
          moisture: formData.moisture,
          pesticide: formData.pesticide,
          organic: formData.organic,
          grade: formData.grade,
          
          // Pass extra fields (Backend should handle or store in 'metadata' if schema allows)
          heavyMetals: formData.heavyMetals,
          aflatoxin: formData.aflatoxin,
          
          notes: formData.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Inspection failed');
      }

      await loadBatches();
      closeModal();
      alert("Inspection Recorded & Credential Issued Successfully!");

    } catch (error: any) {
      console.error("Submission error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      in_progress: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return styles[status.toLowerCase()] || styles.pending;
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  // --- RENDER HELPERS ---
  const renderInput = (field: typeof TEST_CONFIG[0]) => {
    // 1. Checkbox Render
    if (field.type === 'checkbox') {
      return (
        <label key={field.id} className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            checked={!!formData[field.id]}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.checked }))}
            className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
          />
          <span className="font-medium text-slate-700">{field.label}</span>
        </label>
      );
    }

    // 2. Select Render
    if (field.type === 'select') {
      return (
        <div key={field.id}>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {field.label} <span className="text-rose-500">*</span>
          </label>
          <select
            required
            value={formData[field.id]}
            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
            className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">Select Option</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    // 3. Standard Input Render (Number/Text)
    return (
      <div key={field.id}>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {field.label} {field.unit && <span className="text-slate-400 font-normal">({field.unit})</span>} <span className="text-rose-500">*</span>
        </label>
        <input
          type={field.type}
          step={field.type === 'number' ? "0.01" : undefined}
          required
          placeholder={field.placeholder}
          value={formData[field.id]}
          onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Inspection Requests</h1>
          <p className="text-sm text-slate-600 mt-1">Review and record quality inspection results</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg shadow-sm min-h-[400px]">
        {/* Search Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by batch ID, exporter, or crop type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="overflow-x-auto">
          {isLoading ? (
            // LOADING STATE
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
                <p className="font-medium">Loading your inspections...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            // EMPTY STATE
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No pending inspection requests found.</p>
              <p className="text-sm text-slate-400">New assignments will appear here automatically.</p>
            </div>
          ) : (
            // TABLE STATE
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Batch ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Exporter</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Crop</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBatches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">{batch.batch_number}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{batch.exporter_name}</td>
                    <td className="px-6 py-4 text-slate-600">{batch.crop_type}</td>
                    <td className="px-6 py-4 text-slate-600">{(batch.quantity_kg / 1000).toFixed(1)}t</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(batch.submitted_at)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(batch.status)}`}>
                        {batch.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openInspectionModal(batch)}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                      >
                        Record Results
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* --- MODAL --- */}
      {showModal && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <TestTube className="w-5 h-5 text-emerald-600" />
                    Record Inspection Results
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">Batch: <span className="font-mono text-slate-700">{selectedBatch.batch_number}</span></p>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-6">
              <form id="inspection-form" onSubmit={handleSubmitInspection} className="space-y-6">
                
                {/* Batch Context Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="block text-xs text-slate-500 uppercase tracking-wide font-bold">Exporter</span>
                     <span className="text-slate-900 font-medium">{selectedBatch.exporter_name}</span>
                   </div>
                   <div>
                     <span className="block text-xs text-slate-500 uppercase tracking-wide font-bold">Crop Type</span>
                     <span className="text-slate-900 font-medium">{selectedBatch.crop_type}</span>
                   </div>
                   <div>
                     <span className="block text-xs text-slate-500 uppercase tracking-wide font-bold">Location</span>
                     <span className="text-slate-900 font-medium">{selectedBatch.location}</span>
                   </div>
                   <div>
                     <span className="block text-xs text-slate-500 uppercase tracking-wide font-bold">Quantity</span>
                     <span className="text-slate-900 font-medium">{selectedBatch.quantity_kg} kg</span>
                   </div>
                </div>

                {/* DYNAMIC FORM FIELDS */}
                <div className="space-y-6">
                    <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Required Tests</h3>
                    
                    {/* Render Fields based on TEST_CONFIG */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {TEST_CONFIG.map((field) => renderInput(field))}
                    </div>

                    {/* Notes Field (Always present) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Additional Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Enter any additional observations..."
                            rows={3}
                            className="text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                        />
                    </div>
                </div>

              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="inspection-form"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Issuing Credential...' : 'Approve & Issue VC'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}