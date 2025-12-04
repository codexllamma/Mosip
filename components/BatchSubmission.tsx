import { useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRole } from '../contexts/RoleContext';

interface FormData {
  cropType: string;
  destinationCountry: string;
  harvestDate: string;
  location: string;
  quantityKg: string;
}

export function BatchSubmission() {
  const { userName } = useRole();
  const [formData, setFormData] = useState<FormData>({
    cropType: '',
    destinationCountry: '',
    harvestDate: '',
    location: '',
    quantityKg: '',
  });
  const [labReports, setLabReports] = useState<string[]>([]);
  const [farmPhotos, setFarmPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const cropTypes = [
    'Basmati Rice',
    'Jasmine Rice',
    'Wheat',
    'Alphonso Mangoes',
    'Turmeric',
    'Black Pepper',
    'Cardamom',
    'Tea',
    'Coffee',
  ];

  const countries = [
    'United Arab Emirates',
    'United States',
    'United Kingdom',
    'Saudi Arabia',
    'Singapore',
    'Germany',
    'France',
    'Japan',
  ];

  const { userEmail } = useRole();
  function handleInputChange(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  function handleFileUpload(type: 'lab' | 'photo') {
    const mockFiles = type === 'lab'
      ? ['lab-report-pesticide-analysis.pdf', 'lab-report-moisture-content.pdf']
      : ['farm-photo-harvest.jpg', 'farm-photo-storage.jpg'];

    if (type === 'lab') {
      setLabReports(prev => [...prev, ...mockFiles.slice(0, 1)]);
    } else {
      setFarmPhotos(prev => [...prev, ...mockFiles.slice(0, 1)]);
    }
  }

  function removeFile(type: 'lab' | 'photo', index: number) {
    if (type === 'lab') {
      setLabReports(prev => prev.filter((_, i) => i !== index));
    } else {
      setFarmPhotos(prev => prev.filter((_, i) => i !== index));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // CALL YOUR NEW NEXT.JS API ROUTE
      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // ... existing fields ...
          exporterEmail: userEmail // Pass the real email from context
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit batch');
      }

      // Success UI updates
      setShowSuccess(true);
      setFormData({
        cropType: '',
        destinationCountry: '',
        harvestDate: '',
        location: '',
        quantityKg: '',
      });
      setLabReports([]);
      setFarmPhotos([]);
      
      // Auto-hide success message
      setTimeout(() => setShowSuccess(false), 5000);

    } catch (error) {
      console.error("Submission Error:", error);
      alert("Failed to submit batch. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {showSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-emerald-900">Batch submitted successfully!</h3>
            <p className="text-sm text-emerald-700 mt-1">Your batch has been submitted for QA inspection.</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-semibold text-slate-900">Submit New Batch</h1>
          <p className="text-sm text-slate-600 mt-1">Enter crop details and upload required documentation</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Product Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Crop Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.cropType}
                  onChange={(e) => handleInputChange('cropType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select crop type</option>
                  {cropTypes.map(crop => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Destination Country <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.destinationCountry}
                  onChange={(e) => handleInputChange('destinationCountry', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select destination</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Logistics Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Harvest Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.harvestDate}
                  onChange={(e) => handleInputChange('harvestDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Punjab, India"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantity (kg) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g., 5000"
                  value={formData.quantityKg}
                  onChange={(e) => handleInputChange('quantityKg', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Documentation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lab Reports</label>
                <div
                  onClick={() => handleFileUpload('lab')}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click to upload</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOC (max 10MB)</p>
                </div>
                {labReports.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {labReports.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{file}</span>
                        <button
                          type="button"
                          onClick={() => removeFile('lab', index)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Farm Photos</label>
                <div
                  onClick={() => handleFileUpload('photo')}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-700">Click to upload</p>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG (max 5MB)</p>
                </div>
                {farmPhotos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {farmPhotos.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                        <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{file}</span>
                        <button
                          type="button"
                          onClick={() => removeFile('photo', index)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
            <button
              type="button"
              className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Batch for Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
