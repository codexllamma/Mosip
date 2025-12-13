import { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';

interface FormData {
  cropType: string;
  quantity: string;
  unit: string;
  location: string;
  harvestDate: string;
  destinationCountry: string;
}

export function BatchSubmission() {
  const { userEmail } = useRole();
  
  // REFS: Connects the UI buttons to the hidden file inputs
  const labInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // STATE: Form Fields
  const [formData, setFormData] = useState<FormData>({
    cropType: '',
    quantity: '',
    unit: 'kg', // Default unit
    location: '',
    harvestDate: '',
    destinationCountry: '',
  });

  // STATE: Files (Storing real File objects now)
  const [labReports, setLabReports] = useState<File[]>([]);
  const [farmPhotos, setFarmPhotos] = useState<File[]>([]);
  
  // STATE: UI Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // DROPDOWN DATA
  const cropTypes = ['Basmati Rice', 'Jasmine Rice', 'Wheat', 'Alphonso Mangoes', 'Turmeric', 'Black Pepper', 'Cardamom', 'Tea', 'Coffee'];
  const units = ['kg', 'tonnes', 'quintal', 'lbs', 'boxes'];
  const countries = ['United Arab Emirates', 'United States', 'United Kingdom', 'Saudi Arabia', 'Singapore', 'Germany', 'France', 'Japan'];
  
  
  // HANDLERS
  function handleInputChange(field: keyof FormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  // Handle actual file selection from the hidden inputs
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: 'lab' | 'photo') {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      if (type === 'lab') {
        setLabReports(prev => [...prev, ...newFiles]);
      } else {
        setFarmPhotos(prev => [...prev, ...newFiles]);
      }
    }
  }

  function removeFile(type: 'lab' | 'photo', index: number) {
    if (type === 'lab') {
      setLabReports(prev => prev.filter((_, i) => i !== index));
    } else {
      setFarmPhotos(prev => prev.filter((_, i) => i !== index));
    }
  }

  // Triggers to open the file dialog
  const triggerLabUpload = () => labInputRef.current?.click();
  const triggerPhotoUpload = () => photoInputRef.current?.click();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // HACKATHON MODE: Skip actual upload.
      // We just take the file names so the DB shows 'something' was uploaded.
      const mockLabUrls = labReports.map(file => `mock_url/${file.name}`);
      const mockPhotoUrls = farmPhotos.map(file => `mock_url/${file.name}`);

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropType: formData.cropType,
          destinationCountry: formData.destinationCountry,
          harvestDate: formData.harvestDate,
          location: formData.location,
          quantity: formData.quantity,
          unit: formData.unit,
          exporterEmail: userEmail,
          // Sending filenames instead of real URLs
          labReports: mockLabUrls,
          farmPhotos: mockPhotoUrls,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit batch');
      }

      // Success UI
      setShowSuccess(true);
      
      // Reset Form
      setFormData({
        cropType: '',
        quantity: '',
        unit: 'kg',
        location: '',
        harvestDate: '',
        destinationCountry: '',
      });
      setLabReports([]);
      setFarmPhotos([]);
      
      setTimeout(() => setShowSuccess(false), 5000);

    } catch (error: any) {
      console.error("Submission Error:", error);
      alert(error.message || "Failed to submit batch.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      {/* HIDDEN INPUTS */}
      <input 
        type="file" 
        ref={labInputRef} 
        onChange={(e) => handleFileSelect(e, 'lab')} 
        className="hidden" 
        accept=".pdf,.doc,.docx"
        multiple 
      />
      <input 
        type="file" 
        ref={photoInputRef} 
        onChange={(e) => handleFileSelect(e, 'photo')} 
        className="hidden" 
        accept="image/*"
        multiple 
      />

      {/* SUCCESS MESSAGE */}
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
          
          {/* SECTION 1: Product Information */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Product Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Crop Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Crop Type <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.cropType}
                  onChange={(e) => handleInputChange('cropType', e.target.value)}
                  className="text-slate-600 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select crop type</option>
                  {cropTypes.map(crop => (
                    <option key={crop} value={crop}>{crop}</option>
                  ))}
                </select>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Destination Country <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.destinationCountry}
                  onChange={(e) => handleInputChange('destinationCountry', e.target.value)}
                  className="text-slate-600 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                >
                  <option value="">Select destination</option>
                  {countries.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Logistics & Quantity */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Logistics & Quantity</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Farm Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Green Valley Farms, Punjab, India"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="text-slate-600 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Harvest Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Harvest Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.harvestDate}
                  onChange={(e) => handleInputChange('harvestDate', e.target.value)}
                  className="text-slate-600 w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Quantity & Unit (Split Inputs) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    className="text-slate-600 flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  <select
                    value={formData.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="text-slate-600 w-32 px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-slate-50"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Documentation */}
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-900">Documentation</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Lab Reports Area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Lab Reports (PDF)</label>
                <div
                  onClick={triggerLabUpload}
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
                        <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                        <button type="button" onClick={() => removeFile('lab', index)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Farm Photos Area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Farm Photos (JPG/PNG)</label>
                <div
                  onClick={triggerPhotoUpload}
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
                        <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                        <button type="button" onClick={() => removeFile('photo', index)} className="text-slate-400 hover:text-slate-600">
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