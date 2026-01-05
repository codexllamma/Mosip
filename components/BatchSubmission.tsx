'use client';

import { useState, useRef, useEffect, Fragment } from 'react';
import { 
    Upload, X, Image as ImageIcon, Plus, Calendar, MapPin, 
    ArrowLeft, CheckCircle2, Package, Clock, ShieldCheck, 
    FlaskConical, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import { useVoiceNav } from '@/contexts/VoiceContext'; 
import { translateToEnglish } from '@/app/api/actions/translate';
import ConsensusTracker from '@/components/ConsensusTracker'; 

// --- Types ---
interface FormData {
    cropType: string;
    quantity: string;
    unit: string;
    location: string;
    pincode: string;
    harvestDate: string;
    destinationCountry: string;
    tests: string[];
    golden:boolean;
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
    date: string; 
    status: 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CERTIFIED' | 'WAITING_CONSENSUS'; 
    destination: string; 
    location: string;
    pincode: string;
    labReports: string[]; 
    farmPhotos: string[];
    golden: true | false; 
    inspectionsCompleted: number; 
}

// --- Component ---
export function BatchSubmission() {
    const { userEmail } = useRole();
    const { currentView, navigateTo, formData, setFormField } = useVoiceNav(); 

    // DATA STATE
    const [batches, setBatches] = useState<Batch[]>([]);
    const [dataLoading, setDataLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);

    // VIEW STATE
    const [view, setView] = useState<'list' | 'form' | 'success'>('list');
    
    // EXPANSION STATE
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // CONSTANTS
    const units = ['kg', 'tonnes', 'quintal', 'lbs', 'boxes'];
    const availableTests = ['Moisture Content', 'Pesticide Residue', 'Organic Certified', 'Heavy Metals', 'Grade A Quality', 'Aflatoxin Level'];

    // --- EFFECT: Listen for Voice Navigation commands ---
    useEffect(() => {
        if (currentView === 'form') {
            setView('form');
        } else if (currentView === 'list' || currentView === 'batch-submission') {
            setView('list');
        }
    }, [currentView]);

    const handleSetView = (newView: 'list' | 'form' | 'success') => {
        setView(newView);
        if (newView === 'form' || newView === 'list') {
            navigateTo(newView);
        }
    };

    // Toggle Expansion
    const toggleBatchExpand = (id: string) => {
        if (expandedBatchId === id) {
            setExpandedBatchId(null); 
        } else {
            setExpandedBatchId(id); 
        }
    };

    // REFS
    const labInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // FILE STATE
    const [labReports, setLabReports] = useState<File[]>([]);
    const [farmPhotos, setFarmPhotos] = useState<File[]>([]);

    // --- EFFECT: Fetch Batches on Load ---
    useEffect(() => {
        async function fetchBatches() {
            setDataLoading(true);
            setApiError(null);
            try {
                const response = await fetch('/api/batches'); 
                if (!response.ok) throw new Error("Failed to fetch batches from API.");
                const data = await response.json();
                
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
                    labReports: b.tests || [], 
                    farmPhotos: [],
                    // Map new fields
                    golden: b.golden || false, 
                    inspectionsCompleted: b.inspections ? b.inspections.filter((i:any) => i.status === 'COMPLETED').length : 0
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
    }, []);

    // --- Handlers ---
    const handleInputChange = (field: keyof FormData, value: any) => {
        setFormField(field, value);
    };

    const toggleTest = (test: string) => {
        const currentTests = formData.tests || [];
        const newTests = currentTests.includes(test)
            ? currentTests.filter((t : string)  => t !== test)
            : [...currentTests, test];
        setFormField('tests', newTests);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED':
            case 'CERTIFIED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'PENDING_APPROVAL': 
            case 'WAITING_CONSENSUS': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'REJECTED': return 'bg-rose-100 text-rose-800 border-rose-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsSubmitting(true);
        setApiError(null);

       try {
        const translatedCrop = await translateToEnglish(formData.cropType);
        const translatedLocation = await translateToEnglish(formData.location);
        const translatedCountry = await translateToEnglish(formData.destinationCountry);

        const submissionData = {
            ...formData,
            cropType: translatedCrop,       
            location: translatedLocation,   
            destinationCountry: translatedCountry, 
            quantity: parseFloat(formData.quantity),
            tests: formData.tests || [] 
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
            
            // Hard reload to refresh state and fetch new data
            window.location.reload(); 

        } catch (error: any) {
            setApiError(error.message || "Failed to submit batch.");
            setIsSubmitting(false);
        }
    }

    // --- Render Logic ---

    // 1. LIST VIEW (With Expandable Rows & Consensus Tracker)
    if (view === 'list') {
        return (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">My Batches</h1>
                        <p className="text-slate-500 text-sm">Monitor the status of your exports in the supply chain.</p>
                    </div>
                    <button 
                        onClick={() => handleSetView('form')}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                        disabled={dataLoading}
                    >
                        <Plus className="w-5 h-5" />
                        New Batch
                    </button>
                </div>
                
                {/* List Body */}
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
                                    <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {batches.map((batch) => (
                                    <Fragment key={batch.id}>
                                        {/* Main Row */}
                                        <tr 
                                            onClick={() => toggleBatchExpand(batch.id)}
                                            className={`
                                                cursor-pointer transition-colors group border-b border-slate-100
                                                ${expandedBatchId === batch.id ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}
                                            `}
                                        >
                                            <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-emerald-700">{batch.id.substring(0,8)}...</td>
                                            <td className="px-6 py-4 text-slate-600">{batch.cropType} <span className="text-slate-400 text-xs ml-1">({batch.quantity} {batch.unit})</span></td>
                                            <td className="px-6 py-4 text-slate-600">{batch.destination}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(batch.status)}`}>
                                                    {batch.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-400">
                                                {expandedBatchId === batch.id ? <ChevronUp className="w-5 h-5 ml-auto" /> : <ChevronDown className="w-5 h-5 ml-auto" />}
                                            </td>
                                        </tr>

                                        {/* Expanded Detail Row */}
                                        {expandedBatchId === batch.id && (
                                            <tr className="bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                                                <td colSpan={5} className="p-0">
                                                    <div className="p-6 md:p-8 border-b border-slate-200 shadow-inner">
                                                        
                                                        <div className="flex flex-col lg:flex-row gap-8">
                                                            
                                                            {/* LEFT: Details */}
                                                            <div className="flex-1 space-y-6">
                                                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Batch Details</h3>
                                                                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                                                                    <DetailItem icon={<Calendar className="w-4 h-4" />} label="Harvest Date" value={batch.date} />
                                                                    <DetailItem icon={<MapPin className="w-4 h-4" />} label="Origin" value={batch.location} />
                                                                    <DetailItem icon={<ShieldCheck className="w-4 h-4" />} label="Pincode" value={batch.pincode} />
                                                                    <DetailItem icon={<FlaskConical className="w-4 h-4" />} label="Req Tests" value={batch.labReports.join(', ') || 'Standard'} />
                                                                </div>
                                                            </div>

                                                            {/* RIGHT: Consensus Tracker */}
                                                            <div className="flex-1 lg:max-w-md border-l border-slate-200 pl-0 lg:pl-8 pt-6 lg:pt-0">
                                                                <ConsensusTracker status={batch.status} 
                                                                totalAgencies={3}     
                                                                completedCount={batch.inspectionsCompleted}
                                                                />
                                                            </div>
                                                        </div>

                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    // 2. SUCCESS VIEW
    if (view === 'success') {
        return (
            <div className="max-w-2xl mx-auto pt-8 animate-in zoom-in-95 duration-300">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-emerald-600 p-8 text-center text-white">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold">Batch Submitted!</h2>
                        <p className="text-emerald-100 mt-2">Your batch is now queued for matching.</p>
                    </div>
                    <div className="p-8 space-y-6 text-center">
                        <p className="text-slate-600">The inspection process will begin shortly. You can track progress in your dashboard.</p>
                        <button 
                            onClick={() => window.location.reload()}
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

    // 3. FORM VIEW (Complete)
    if (view === 'form') {
        return (
            <div className="max-w-4xl mx-auto animate-in slide-in-from-right-4 duration-300">
                <input type="file" ref={labInputRef} onChange={(e) => handleFileSelect(e, 'lab')} className="hidden" accept=".pdf,.doc,.docx" multiple />
                <input type="file" ref={photoInputRef} onChange={(e) => handleFileSelect(e, 'photo')} className="hidden" accept="image/*" multiple />

                <div className="mb-6 flex items-center gap-4">
                    <button onClick={() => handleSetView('list')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">New Batch Submission</h1>
                        <p className="text-sm text-slate-500">Enter crop details and upload required documentation</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        {/* 1. Product Details */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Product Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Crop Type <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g. Basmati Rice" value={formData.cropType} onChange={(e) => handleInputChange('cropType', e.target.value)} 
                                            className="notranslate text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Destination Country <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g. Germany" value={formData.destinationCountry} onChange={(e) => handleInputChange('destinationCountry', e.target.value)} 
                                            className="notranslate text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                            </div>
                        </div>

                        {/* 2. Logistics */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Logistics & Quantity</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Farm Location <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g., Green Valley Farms, Punjab" value={formData.location} onChange={(e) => handleInputChange('location', e.target.value)} 
                                            className="notranslate text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode/Zip <span className="text-rose-500">*</span></label>
                                        <input type="text" required placeholder="e.g. 110001" value={formData.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)} 
                                            className="notranslate text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Harvest Date <span className="text-rose-500">*</span></label>
                                    <input type="date" required value={formData.harvestDate} onChange={(e) => handleInputChange('harvestDate', e.target.value)} 
                                            className="notranslate text-slate-700 w-full px-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Quantity <span className="text-rose-500">*</span></label>
                                    <div className="flex gap-3">
                                        <input type="number" required placeholder="e.g. 5000" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} 
                                            className="notranslate text-slate-700 flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                                        <select value={formData.unit} onChange={(e) => handleInputChange('unit', e.target.value)} 
                                            className="text-slate-700 w-32 px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 font-medium">
                                            {units.map(u => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Type of Passport <span className="text-rose-500">*</span>
                                    </label>

                                    <div className="flex gap-6 mt-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="passport"
                                            checked={!formData.golden}
                                            onChange={() => handleInputChange('golden', false)}
                                            className="w-4 h-4 text-emerald-600"
                                        />
                                        <span className="text-slate-700 font-medium">Regular</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="passport"
                                            checked={formData.golden}
                                            onChange={() => handleInputChange('golden', true)}
                                            className="w-4 h-4 text-emerald-600"
                                        />
                                        <span className="text-slate-700 font-medium">Golden</span>
                                        </label>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* 3. Required Tests */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                                <FlaskConical className="w-5 h-5 text-emerald-600" /> Required Inspections
                            </h2>
                            <p className="text-sm text-slate-500">Select all tests required for this batch. This information is used to match you with a certified QA Agency.</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {availableTests.map((test) => (
                                    <label key={test} className={`
                                        flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                        ${(formData.tests || []).includes(test) 
                                            ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                                            : 'bg-white border-slate-200 hover:bg-slate-50'}
                                    `}>
                                        <input 
                                            type="checkbox" 
                                            className="notranslate w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                            checked={(formData.tests || []).includes(test)}
                                            onChange={() => toggleTest(test)}
                                        />
                                        <span className="text-sm font-medium text-slate-700">{test}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 4. Documentation */}
                        <div className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-2">Documentation</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Lab Reports (Optional PDF)</label>
                                    <div onClick={triggerLabUpload} className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer bg-slate-50/50 transition-colors">
                                        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-700">Upload existing reports</p>
                                    </div>
                                    {/* File List */}
                                    {labReports.map((file, i) => (
                                        <div key={i} className="flex justify-between text-xs mt-2 bg-slate-100 p-2 rounded">
                                            <span>{file.name}</span>
                                            <button type="button" onClick={() => removeFile('lab', i)}><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Farm Photos (Optional)</label>
                                    <div onClick={triggerPhotoUpload} className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer bg-slate-50/50 transition-colors">
                                        <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-700">Upload field photos</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
                            <button type="button" onClick={() => handleSetView('list')} className="px-6 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" disabled={isSubmitting} className="notranslate px-8 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isSubmitting ? 'Processing...' : 'Submit Batch'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return null;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
    return (
        <div className="flex gap-3">
            <div className="mt-1 text-emerald-600">{icon}</div> 
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <p className="text-slate-700 font-semibold text-sm">{value || 'N/A'}</p>
            </div>
        </div>
    );
}