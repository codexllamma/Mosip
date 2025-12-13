// app/verify/[certId]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { 
    CheckCircle, XCircle, Loader2, Package, Calendar, ShieldCheck, FileText, 
    ExternalLink, Globe, Droplet, Leaf, Gauge, MapPin, Hash, Microscope 
} from 'lucide-react';

// --- Data Structure ALIGNED with the API output ---
interface QualityMetrics {
    moisture: string | null;
    pesticide_residue: string | null;
    organic: boolean | null;
    grade: string | null;
    heavy_metals: string | null;
    iso_code: string | null;
    inspection_date: string | null;
    inspector: {
        name: string | null;
        organization: string | null;
    } | null;
    notes: string | null;
}

interface VerificationData {
    status: 'VALID' | 'EXPIRED' | 'REVOKED' | 'ERROR';
    is_expired: boolean;
    certificate_id: string;
    product: {
        type: string;
        batch_number: string;
        origin: string | null;
        destination: string | null;
        quantity: number | null;
        unit: string;
        harvest_date: string | null;
    };
    issued_at: string;
    expires_at: string;
    issuer: {
        name: string;
        did: string | null;
    };
    holder: {
        name: string;
        organization: string | null;
    };
    quality_metrics: QualityMetrics | null;
    verification_urls: {
        inji_verify: string | null;
    };
    signature: {
        value: string | null;
    };
    warnings: string[];
}

interface VerifyPageProps {
    params: {
        certId: string;
    };
}

// Helper component for displaying single details
const DetailItem = ({ icon: Icon, label, value, className = '' }: { icon: any, label: string, value: string | number | null | undefined, className?: string }) => {
    const displayValue = value === null || value === undefined ? 'N/A' : String(value);
    return (
        <div className={`p-3 border rounded-lg bg-gray-50 flex items-center gap-3 ${className}`}>
            <Icon className="w-5 h-5 text-teal-600 shrink-0" />
            <div>
                <span className="text-xs font-semibold text-gray-500 uppercase block">{label}</span>
                <span className="text-sm font-bold text-gray-800">{displayValue}</span>
            </div>
        </div>
    );
};

// Main Component
export default function VerifyPage({ params }: VerifyPageProps) {
    const { certId } = params;
    const [data, setData] = useState<VerificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchVerificationData() {
            try {
                // Fetching from the API route you defined
                const response = await fetch(`/api/verify/${certId}`);
                const result = await response.json();

                if (!response.ok || result.status === 'NOT_FOUND' || result.status === 'ERROR') {
                    setError(result.message || 'Verification data could not be retrieved.');
                } else {
                    setData(result as VerificationData);
                }
            } catch (err) {
                console.error(err);
                setError('Failed to connect to the verification server.');
            } finally {
                setLoading(false);
            }
        }
        fetchVerificationData();
    }, [certId]);

    // --- Loading/Error States ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="ml-4 text-gray-600">Verifying Certificate...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-8">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-3xl font-bold text-red-800">Verification Failed</h1>
                <p className="mt-2 text-lg text-red-600 max-w-md text-center">{error}</p>
                <p className="mt-4 text-sm text-red-400">Certificate ID: {certId}</p>
            </div>
        );
    }

    // --- Data Rendering ---
    const isVerified = data.status === 'VALID' && !data.is_expired;
    const statusColor = isVerified ? 'bg-emerald-600' : 'bg-red-600';
    const statusText = data.status.replace('_', ' ');

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto shadow-2xl rounded-2xl overflow-hidden bg-white border border-gray-200">
                
                {/* Header Section */}
                <div className={`p-8 text-white ${statusColor} flex justify-between items-center`}>
                    <div className="flex items-center gap-4">
                        {isVerified ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                        <div>
                            <span className="text-sm font-semibold uppercase opacity-80">Digital Export Certificate</span>
                            <h1 className="text-3xl font-extrabold">{data.product.type} Batch</h1>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-bold block">{data.certificate_id.slice(0, 8)}...</span>
                        <span className="text-xs font-medium uppercase">{statusText}</span>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    
                    {/* 1. Core Parties */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-6">
                        <DetailItem icon={Package} label="Batch Number" value={data.product.batch_number} />
                        <DetailItem icon={ShieldCheck} label="Exporter (Holder)" value={data.holder.organization || data.holder.name} />
                        <DetailItem icon={FileText} label="Issuing Authority" value={data.issuer.name} />
                    </section>

                    {/* 2. Logistics and Validity */}
                    <section>
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Logistics & Validity</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <DetailItem icon={Globe} label="Quantity" value={`${data.product.quantity} ${data.product.unit}`} />
                            <DetailItem icon={MapPin} label="Origin" value={data.product.origin} />
                            <DetailItem icon={Calendar} label="Issue Date" value={new Date(data.issued_at).toLocaleDateString()} />
                            <DetailItem icon={Calendar} label="Expiry Date" value={new Date(data.expires_at).toLocaleDateString()} />
                        </div>
                    </section>
                    
                    {/* 3. Quality Metrics */}
                    {data.quality_metrics && (
                        <section>
                            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                                <Microscope className="w-6 h-6 text-indigo-600"/> Verified Quality Parameters
                            </h2>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <DetailItem icon={Gauge} label="Grade" value={data.quality_metrics.grade} />
                                <DetailItem icon={Droplet} label="Moisture Content" value={data.quality_metrics.moisture} />
                                <DetailItem icon={XCircle} label="Pesticide Residue" value={data.quality_metrics.pesticide_residue} />
                                <DetailItem icon={Leaf} label="Organic Status" value={data.quality_metrics.organic ? 'Certified' : 'No'} />
                                <DetailItem icon={Hash} label="Heavy Metals" value={data.quality_metrics.heavy_metals} />
                                <DetailItem icon={ShieldCheck} label="ISO Code" value={data.quality_metrics.iso_code} />
                            </div>
                            <div className="mt-4 p-3 bg-gray-50 border rounded-lg">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Inspector Notes</p>
                                <p className="text-sm text-gray-800 mt-1">{data.quality_metrics.notes || 'No specific notes provided.'}</p>
                            </div>
                        </section>
                    )}

                    {/* 4. Cryptographic Proof (VC) */}
                    <section className="pt-4 border-t border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Cryptographic Proof</h2>
                        <div className="space-y-3 p-4 bg-teal-50 rounded-lg border border-teal-200">
                            <p className="text-sm font-medium text-teal-800 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-teal-600" />
                                This certificate is digitally signed and anchored using the W3C Verifiable Credential standard.
                            </p>
                            
                            <div className="text-xs text-gray-600 space-y-1 p-2 bg-white rounded-md">
                                <p className="truncate"><strong>Issuer DID:</strong> {data.issuer.did || 'N/A'}</p>
                                <p className="truncate"><strong>Signature:</strong> {data.signature.value ? data.signature.value.slice(0, 80) + '...' : 'N/A'}</p>
                            </div>
                            
                            {data.verification_urls.inji_verify && (
                                <a 
                                    href={data.verification_urls.inji_verify} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-800 mt-2"
                                >
                                    Verify Signature on Inji Platform
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    </section>
                    
                    {/* 5. Warnings */}
                    {data.warnings.length > 0 && (
                        <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
                            <h3 className="font-bold">Important Warnings:</h3>
                            <ul className="list-disc list-inside text-sm mt-1 space-y-0.5">
                                {data.warnings.map((w, i) => (
                                    <li key={i}>{w}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}