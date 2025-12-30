'use client';

import { useState, useRef, useEffect } from 'react';
import { 
    Upload, X, FileText, Image as ImageIcon, 
    Plus, Calendar, MapPin, ArrowRight, 
    ArrowLeft, CheckCircle2, Package, Clock, ShieldCheck, Globe, Loader2
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';

// --- Types ---
interface FormData {
    cropType: string;
    quantity: string;
    unit: string;
    location: string;
    pincode: string;
    harvestDate: string;
    destinationCountry: string;
}

interface DetailItemProps {
    icon: React.ReactNode; 
    label: string;
    value: string;
}

interface Batch {
    id: string;
    cropType: string;
    quantity: string;
    unit: string;
    date: string; // Harvest Date
    status: 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CERTIFIED'; // Matching Prisma Enum
    destination: string; // destinationCountry
    location: string;
    pincode: string;
    labReports: string[]; 
    farmPhotos: string[];
}

// --- Component ---
export function BatchSubmission() {
    const { userEmail } = useRole();
    
    // DATA STATE
    const [batches, setBatches] = useState<Batch[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);

    // VIEW STATE: 'list' | 'form' | 'success' | 'detail'
    const [view, setView] = useState<'list' | 'form' | 'success' | 'detail'>('list');
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

    // REFS for file inputs
    const labInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // FORM STATE
    const [formData, setFormData] = useState<FormData>({
        cropType: '',
        quantity: '',
        unit: 'kg',
        location: '',
        pincode: '',
        harvestDate: '',
        destinationCountry: '',
    });

    const [labReports, setLabReports] = useState<File[]>([]);
    const [farmPhotos, setFarmPhotos] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // CONSTANTS
    const cropTypes = ['Basmati Rice', 'Jasmine Rice', 'Wheat', 'Alphonso Mangoes', 'Turmeric', 'Black Pepper', 'Cardamom', 'Tea', 'Coffee'];
    const units = ['kg', 'tonnes', 'quintal', 'lbs', 'boxes'];
    const countries = ['United Arab Emirates', 'United States', 'United Kingdom', 'Saudi Arabia', 'Singapore', 'Germany', 'France', 'Japan'];

    // --- EFFECT: Fetch Batches on Load ---
    useEffect(() => {
        async function fetchBatches() {
            setDataLoading(true);
            setApiError(null);
            try {
                // Assuming this API route fetches batches for the CURRENTLY AUTHENTICATED EXPORTER
                const response = await fetch('/api/batches'); 
                
                if (!response.ok) {
                    throw new Error("Failed to fetch batches from API.");
                }
                
                const data = await response.json();
                
                // --- MAPPING API Data to Component Data Structure ---
                const mappedBatches: Batch[] = data.map((b: any) => ({
                    id: b.id,
                    cropType: b.cropType,
                    quantity: b.quantity,
                    unit: b.unit,
                    date: new Date(b.harvestDate).toISOString().split('T')[0],
                    status: b.status as Batch['status'],
                    destination: b.destinationCountry,
                    location: b.location,
                    pincode: b.pinCode.toString(),
                    labReports: b.tests || [], // Assuming 'tests' field contains lab report names/IDs
                    farmPhotos: [], // Assuming photo data isn't exposed or not yet implemented
                }));
                
                setBatches(mappedBatches);

            } catch (error) {
                console.error("Batch Fetch Error:", error);
                setApiError("Could not load your batches. Please check the network connection.");
            } finally {
                setDataLoading(false);
            }
        }
        fetchBatches();
    }, []); // Run only once on mount

    // --- Handlers ---
    const handleInputChange = (field: keyof FormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'lab' | 'photo') => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            type === 'lab' 
                ? setLabReports(prev => [...prev, ...newFiles])
                : setFarmPhotos(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (type: 'lab' | 'photo', index: number) => {
        type === 'lab'
            ? setLabReports(prev => prev.filter((_, i) => i !== index))
            : setFarmPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const triggerLabUpload = () => labInputRef.current?.click();
    const triggerPhotoUpload = () => photoInputRef.current?.click();

    const openBatchDetail = (batch: Batch) => {
        setSelectedBatch(batch);
        setView('detail');
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);

        try {
            // --- API Call: Submit New Batch ---
            const submissionData = {
                ...formData,
                quantity: parseFloat(formData.quantity),
                pincode: parseInt(formData.pincode, 10),
                // This array should contain the names/IDs of the quality tests required for the QA Agency
                tests: labReports.map(f => f.name.replace(/\.[^/.]+$/, "")), // Example: use filename without extension
            };

            const response = await fetch('/api/batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to create new batch.");
            }
            
            const newBatchData = await response.json();
            
            // Re-fetch the entire list to ensure the UI is updated with the real database data
            // (In a production app, you'd insert newBatchData directly into the state)
            const freshListResponse = await fetch('/api/batches');
            const freshData = await freshListResponse.json();
            
            const newlyCreatedBatch: Batch = {
                 id: newBatchData.id,
                 cropType: newBatchData.cropType,
                 quantity: newBatchData.quantity.toString(),
                 unit: newBatchData.unit,
                 date: new Date(newBatchData.harvestDate).toISOString().split('T')[0],
                 status: newBatchData.status as Batch['status'],
                 destination: newBatchData.destinationCountry,
                 location: newBatchData.location,
                 pincode: newBatchData.pinCode.toString(),
                 labReports: newBatchData.tests || [],
                 farmPhotos: [], 
            };
            
            setBatches(freshData.map((b: any) => ({
                id: b.id,
                cropType: b.cropType,
                quantity: b.quantity.toString(),
                unit: b.unit,
                date: new Date(b.harvestDate).toISOString().split('T')[0],
                status: b.status as Batch['status'],
                destination: b.destinationCountry,
                location: b.location,
                pincode: b.pinCode.toString(),
                labReports: b.tests || [], 
                farmPhotos: [], 
            })));
            
            setSelectedBatch(newlyCreatedBatch);
            setView('success');
            
            // Reset Form for next time
            setFormData({ cropType: '', quantity: '', unit: 'kg', location: '', pincode: '', harvestDate: '', destinationCountry: '' });
            setLabReports([]);
            setFarmPhotos([]);

        } catch (error: any) {
            console.error("Submission Error:", error);
            setApiError(error.message || "Failed to submit batch.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
            case 'CERTIFIED':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'REJECTED':
                return 'bg-rose-100 text-rose-800 border-rose-200';
            case 'IN_PROGRESS':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    // --- Render Logic ---

    // 1. DASHBOARD LIST
    if (view === 'list') {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Batches</h1>
                        <p className="text-slate-500 text-sm">Monitor the status of your exports in the supply chain.</p>
                    </div>
                    <button 
                        onClick={() => setView('form')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                        disabled={dataLoading}
                    >
                        <Plus className="w-5 h-5" />
                        New Batch
                    </button>
                </div>

                {apiError && (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg text-rose-700 text-sm font-medium">
                        {apiError}
                    </div>
                )}

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {dataLoading ? (
                        <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
                            Loading Batches...
                        </div>
                    ) : batches.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <Package className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="font-semibold">No batches submitted yet.</p>
                            <p className="text-sm">Use the "New Batch" button to start your first export.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Batch ID</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Crop</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Destination</th>
                                    <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {batches.map((batch) => (
                                    <tr 
                                        key={batch.id} 
                                        onClick={() => openBatchDetail(batch)}
                                        className="hover:bg-emerald-50/50 cursor-pointer transition-colors group"
                                    >
                                        <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-emerald-700">{batch.id}</td>
                                        <td className="px-6 py-4 text-slate-600">{batch.cropType} <span className="text-slate-400 text-xs ml-1">({batch.quantity} {batch.unit})</span></td>
                                        <td className="px-6 py-4 text-slate-600">{batch.destination}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(batch.status)}`}>
                                                {batch.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    // 2. BATCH DETAIL VIEW (Using selectedBatch)
    if (view === 'detail' && selectedBatch) {
        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                <button onClick={() => setView('list')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to My Batches
                </button>

                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Batch Identity</span>
                            <h2 className="text-2xl font-bold text-slate-900">{selectedBatch.id}</h2>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(selectedBatch.status)}`}>
                            {selectedBatch.status.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-6">
                            <DetailItem icon={<Package className="w-4 h-4" />} label="Crop Type" value={selectedBatch.cropType} />
                            <DetailItem icon={<Clock className="w-4 h-4" />} label="Quantity" value={`${selectedBatch.quantity} ${selectedBatch.unit}`} />
                            <DetailItem icon={<Calendar className="w-4 h-4" />} label="Harvest Date" value={selectedBatch.date} />
                        </div>
                        <div className="space-y-6">
                            <DetailItem icon={<MapPin className="w-4 h-4" />} label="Origin Location" value={selectedBatch.location} />
                            <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Pincode/Zip" value={selectedBatch.pincode} />
                            <DetailItem icon={<Globe className="w-4 h-4" />} label="Target Market" value={selectedBatch.destination} />
                        </div>
                        <div className="space-y-6 md:col-span-1">
                            <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Required Tests</h3>
                            <ul className="space-y-2 text-sm">
                                {selectedBatch.labReports.map((testName, i) => (
                                    <li key={i} className="flex items-center gap-2 text-slate-600">
                                        <FileText className="w-4 h-4 text-emerald-500" /> 
                                        {testName} 
                                        <span className="text-xs text-slate-400"> (Pending QA)</span>
                                    </li>
                                ))}
                                {selectedBatch.labReports.length === 0 && (
                                    <li className="text-slate-400 italic text-sm">No quality tests specified.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 3. SUCCESS VIEW (Using selectedBatch)
    if (view === 'success' && selectedBatch) {
        return (
            <div className="max-w-2xl mx-auto pt-8 animate-in zoom-in-95 duration-300">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-emerald-600 p-8 text-center text-white">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold">Batch Submitted!</h2>
                        <p className="text-emerald-100 mt-2">Batch **{selectedBatch.id}** is now queued for matching with a QA Agency.</p>
                    </div>
                    
                    <div className="p-8 space-y-6">
                        <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Batch Details Submitted</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <DetailItem icon={<Package className="w-4 h-4" />} label="Crop Type" value={selectedBatch.cropType} />
                            <DetailItem icon={<Clock className="w-4 h-4" />} label="Quantity" value={`${selectedBatch.quantity} ${selectedBatch.unit}`} />
                            <DetailItem icon={<Calendar className="w-4 h-4" />} label="Harvest Date" value={selectedBatch.date} />
                            <DetailItem icon={<Globe className="w-4 h-4" />} label="Target Market" value={selectedBatch.destination} />
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-600">
                             <span className="font-semibold text-slate-900 block mb-1">Tests Requested:</span>
                             <ul className="list-disc list-inside space-y-1">
                                 {selectedBatch.labReports.map((test, i) => (
                                     <li key={i}>{test}</li>
                                 ))}
                             </ul>
                        </div>

                        <button 
                            onClick={() => setView('list')}
                            className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to My Batches Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 4. FORM VIEW (Keep form logic as is)
    if (view === 'form') {
        return (
            <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300">
                
                {/* HIDDEN INPUTS */}
                <input type="file" ref={labInputRef} onChange={(e) => handleFileSelect(e, 'lab')} className="hidden" accept=".pdf,.doc,.docx" multiple />
                <input type="file" ref={photoInputRef} onChange={(e) => handleFileSelect(e, 'photo')} className="hidden" accept="image/*" multiple />

                {/* Header with Back Button */}
                <div className="mb-6 flex items-center gap-4">
                    <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><ArrowLeft className="w-6 h-6" /></button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">New Batch Submission</h1>
                        <p className="text-sm text-slate-500">Enter crop details and upload required documentation</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        
                        {/* SECTION 1: Product Information */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Product Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Crop Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Crop Type <span className="text-rose-500">*</span></label>
                                    <select required value={formData.cropType} onChange={(e) => handleInputChange('cropType', e.target.value)} 
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-600 font-medium">
                                        <option value="" className="text-slate-400">Select crop type</option>
                                        {cropTypes.map(crop => <option key={crop} value={crop} className="text-slate-600">{crop}</option>)}
                                    </select>
                                </div>

                                {/* Destination */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Destination Country <span className="text-rose-500">*</span></label>
                                    <select required value={formData.destinationCountry} onChange={(e) => handleInputChange('destinationCountry', e.target.value)} 
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-slate-600 font-medium">
                                        <option value="" className="text-slate-400">Select destination</option>
                                        {countries.map(country => <option key={country} value={country} className="text-slate-600">{country}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Logistics & Quantity */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Logistics & Quantity</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Location & Pincode Row */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Farm Location <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g., Green Valley Farms, Punjab" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} 
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode/Zip <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g. 110001" value={formData.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)} 
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>

                                {/* Harvest Date */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Harvest Date <span className="text-rose-500">*</span></label>
                                    <input type="date" required value={formData.harvestDate} onChange={(e) => handleInputChange('harvestDate', e.target.value)} 
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-slate-600 font-medium outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>

                                {/* Quantity & Unit (Split Inputs) */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity <span className="text-rose-500">*</span></label>
                                    <div className="flex gap-3">
                                        <input type="number" required placeholder="e.g. 5000" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} 
                                            className="text-slate-600 flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <select value={formData.unit} onChange={(e) => handleInputChange('unit', e.target.value)} 
                                            className="text-slate-600 w-32 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 font-medium">
                                            {units.map(u => <option key={u} value={u} className="text-slate-600">{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: Documentation */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Documentation</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Lab Reports Area */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Lab Reports (PDF) - *Determines Required Tests*</label>
                                    <div onClick={triggerLabUpload} className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer bg-slate-50/50">
                                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-700">Click to upload files for tests</p>
                                        <p className="text-xs text-slate-500 mt-1">PDF, DOC (Files uploaded determine the tests needed)</p>
                                    </div>
                                    {labReports.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {labReports.map((file, index) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                                                    <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                                                    <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                                                    <button type="button" onClick={() => removeFile('lab', index)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Farm Photos Area */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Farm Photos (JPG/PNG)</label>
                                    <div onClick={triggerPhotoUpload} className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer bg-slate-50/50">
                                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-700">Click to upload field photos</p>
                                        <p className="text-xs text-slate-500 mt-1">JPG, PNG (max 5MB)</p>
                                    </div>
                                    {farmPhotos.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            {farmPhotos.map((file, index) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                                                    <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                                    <span className="text-sm text-slate-700 flex-1 truncate">{file.name}</span>
                                                    <button type="button" onClick={() => removeFile('photo', index)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                            <button type="button" onClick={() => setView('list')} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSubmitting ? 'Submitting...' : 'Submit Batch'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
}

// Sub-component for Details (Restored the original design for full content)
function DetailItem({ icon, label, value }: DetailItemProps) {
    return (
        <div className="flex gap-3">
            <div className="mt-1 text-emerald-600">{icon}</div> 
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-slate-700 font-semibold">{value || 'N/A'}</p>
            </div>
        </div>
    );
}