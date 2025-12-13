import { useEffect, useState } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import type { Batch } from '../types';

interface InspectionFormData {
  moistureLevel: string;
  pesticideContent: string;
  organicStatus: boolean;
  qualityGrade: string;
  notes: string;
}

export function InspectionRequests() {
  const { userName } = useRole();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState<InspectionFormData>({
    moistureLevel: '',
    pesticideContent: '',
    organicStatus: false,
    qualityGrade: '',
    notes: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

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

  // --- 1. FETCH BATCHES FROM API ---
  async function loadBatches() {
    try {
      const response = await fetch('/api/inspections/pending');
      if (!response.ok) throw new Error('Failed to fetch batches');
      
      const data = await response.json();
      setBatches(data);
      setFilteredBatches(data);
    } catch (error) {
      console.error("Error loading batches:", error);
    }
  }

  function openInspectionModal(batch: Batch) {
    setSelectedBatch(batch);
    setShowModal(true);
    setFormData({
      moistureLevel: '',
      pesticideContent: '',
      organicStatus: false,
      qualityGrade: '',
      notes: '',
    });
  }

  function closeModal() {
    setShowModal(false);
    setSelectedBatch(null);
  }

  // --- 2. SUBMIT INSPECTION TO API ---
  async function handleSubmitInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch) return;

    setIsSubmitting(true);

    try {
      // Call the "Approve & Issue VC" API
      const response = await fetch('/api/inspections/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batchId: selectedBatch.id,
          inspectorName: userName,
          moisture: formData.moistureLevel,
          pesticide: formData.pesticideContent,
          organic: formData.organicStatus,
          grade: formData.qualityGrade,
          notes: formData.notes
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Inspection failed');
      }

      // Success! Refresh the list to remove the approved batch
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
    const styles = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      in_progress: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    // Handle case-insensitivity
    const key = status.toLowerCase() as keyof typeof styles;
    return styles[key] || styles.pending;
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Inspection Requests</h1>
          <p className="text-sm text-slate-600 mt-1">Review and record quality inspection results</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by batch ID, exporter, or crop type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-slate-600 placeholder:text-slate-300 w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Batch ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Exporter
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Crop Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Date Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900">{batch.batch_number}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{batch.exporter_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{batch.crop_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{(batch.quantity_kg / 1000).toFixed(1)}t</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-slate-700">{formatDate(batch.submitted_at)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(batch.status)}`}>
                      {batch.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => openInspectionModal(batch)}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                    >
                      Record Results
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredBatches.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No pending inspection requests</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Record Inspection Results</h2>
                <p className="text-sm text-slate-600 mt-1">Batch: {selectedBatch.batch_number}</p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection} className="p-6 space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Exporter:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedBatch.exporter_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Crop:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedBatch.crop_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Quantity:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedBatch.quantity_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Location:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedBatch.location}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Moisture Level (%) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.moistureLevel}
                    onChange={(e) => setFormData(prev => ({ ...prev, moistureLevel: e.target.value }))}
                    placeholder="e.g., 12.5"
                    className="text-slate-600 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Pesticide Content (ppm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.pesticideContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, pesticideContent: e.target.value }))}
                    placeholder="e.g., 0.15"
                    className="text-slate-600 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quality Grade <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.qualityGrade}
                  onChange={(e) => setFormData(prev => ({ ...prev, qualityGrade: e.target.value }))}
                  className="text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select grade</option>
                  <option value="A">Grade A - Premium Quality</option>
                  <option value="B">Grade B - Standard Quality</option>
                  <option value="C">Grade C - Basic Quality</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.organicStatus}
                    onChange={(e) => setFormData(prev => ({ ...prev, organicStatus: e.target.checked }))}
                    className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Organic Certified</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter any additional observations or remarks..."
                  rows={4}
                  className="text-slate-500 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Issuing...' : 'Issue Verifiable Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}