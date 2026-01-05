"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react'; 
import { CheckCircle, ExternalLink, AlertCircle, Eye, X, Calendar, Package, Trash2 } from 'lucide-react'; 
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface PassportData {
  id: string;
  batch_number: string;
  crop_type: string;
  exporter_name: string;
  qa_agency_name: string; 
  issued_at: string;
  expires_at: string;
  verification_url: string | null;
  issuer_did: string | null;
  credential_data: {
    issuer: { name: string };
    credentialSubject: {
      quality: {
        grade: string;
        moisture: string;
        pesticide: string;
        organic: boolean;
      };
    };
  };
  batch_details: {
    location: string;
    destination: string;
    quantity: number;
    unit: string;
    status: string;
    passportType?: string; 
  };
}

export default function DigitalPassports() {
  const { data: session } = useSession();
  
  const [certificates, setCertificates] = useState<PassportData[]>([]);
  const [selectedCert, setSelectedCert] = useState<PassportData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/passports')
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch data");
        return res.json();
      })
      .then(data => {
        setCertificates(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load certificates:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  async function handleRevoke(certId: string, e: React.MouseEvent) {
    e.stopPropagation(); 

    if (!confirm("⚠️ PERMANENT ACTION REQUIRED\n\nAre you sure you want to revoke this passport? This will invalidate the credential and reject the batch.\n\nThis action cannot be undone.")) {
      return;
    }

    setRevokingId(certId);

    try {
      const response = await fetch(`/api/passports/${certId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to revoke passport");
      }

      setCertificates(prev => prev.filter(c => c.id !== certId));
      if (selectedCert?.id === certId) setShowModal(false);
      alert("Passport revoked successfully.");

    } catch (err: any) {
      alert(err.message);
    } finally {
      setRevokingId(null);
    }
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading digital passports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Error</h2>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Digital Product Passports</h1>
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center shadow-sm">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Passports Issued Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Digital passports are automatically generated when a batch is certified by a QA Agency.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Digital Product Passports</h1>
          <p className="text-gray-600 mt-1">Verifiable credentials for approved export batches</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
          <span className="text-emerald-800 font-medium">
            {certificates.length} Active {certificates.length === 1 ? 'Passport' : 'Passports'}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((cert) => {
          const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date();
          const quality = cert.credential_data?.credentialSubject?.quality || {};
          
          // --- UPDATED GOLDEN LOGIC ---
          const agencyName = cert.qa_agency_name || cert.credential_data?.issuer?.name || '';
          const isGolden = 
            agencyName.toLowerCase().includes('(aggregated)') || 
            cert.batch_details?.passportType === 'Golden';
          
          // Dynamic Colors
          const headerGradient = isGolden 
            ? 'bg-gradient-to-br from-amber-400 to-amber-600' // Fixed Tailwind 'bg-linear' typo to 'bg-gradient'
            : 'bg-gradient-to-br from-emerald-600 to-emerald-800'; 
            
          const accentColor = isGolden ? 'text-amber-600' : 'text-emerald-600';
          const borderColor = isGolden ? 'border-amber-200' : 'border-emerald-50';

          return (
            <div
              key={cert.id}
              className={`bg-white border-2 ${borderColor} rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group relative flex flex-col`}
            >
              {/* HEADER SECTION */}
              <div className={`${headerGradient} p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                  <CheckCircle size={120} />
                </div>
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                  
                  {/* --- FIXED ICON CONTAINER LOGIC --- */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm transition-colors ${
                      isGolden 
                          ? 'bg-white text-amber-600 shadow-sm' 
                          : 'bg-white/20 text-white'             
                  }`}>
                    <CheckCircle className="w-6 h-6" /> 
                  </div>

                  <span className={`px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm ${
                    isExpired 
                      ? 'bg-red-500/20 text-white border-red-500/30' 
                      : 'bg-white/20 text-white border-white/30'
                  }`}>
                    {isExpired ? 'Expired' : (isGolden ? 'Golden Standard' : 'Verified')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold relative z-10">{cert.crop_type}</h3>
                <p className="text-white/80 text-sm mt-1 font-mono relative z-10">#{cert.batch_number}</p>
              </div>

              {/* BODY SECTION */}
              <div className="p-6 space-y-4 flex-1">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Exporter</p>
                      <p className="text-sm font-semibold text-gray-900">{cert.exporter_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Issued Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(cert.issued_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-auto">
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="text-gray-500">Quality Grade</span>
                    <span className={`font-bold ${accentColor} bg-opacity-10 px-2 py-0.5 rounded border ${borderColor}`}>
                      Grade {quality.grade || 'A'}
                    </span>
                  </div>
                  
                  {/* ACTION BUTTONS */}
                  <div className="space-y-2">
                    <button
                        onClick={() => {
                        setSelectedCert(cert);
                        setShowModal(true);
                        }}
                        className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                        <Eye className="w-4 h-4" />
                        View Passport
                    </button>

                    {session?.user?.role === 'QA_AGENCY' && (
                        <button
                        onClick={(e) => handleRevoke(cert.id, e)}
                        disabled={revokingId === cert.id}
                        className="w-full py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                        >
                        {revokingId === cert.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                            <Trash2 className="w-4 h-4" />
                            Revoke Passport
                            </>
                        )}
                        </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && selectedCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            {(() => {
                 // --- UPDATED GOLDEN LOGIC FOR MODAL ---
                 const agencyName = selectedCert.qa_agency_name || selectedCert.credential_data?.issuer?.name || '';
                 const isGoldenModal = 
                    agencyName.toLowerCase().includes('(aggregated)') || 
                    selectedCert.batch_details?.passportType === 'Golden';

                 return (
                    <div className={`
                        ${isGoldenModal ? 'bg-amber-500' : 'bg-gray-900'} 
                        text-white p-6 sticky top-0 z-10 flex justify-between items-start
                    `}>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {/* Modal Icon Logic */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                isGoldenModal ? 'bg-white text-amber-600' : ''
                            }`}>
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            Digital Product Passport
                        </h2>
                        <p className="text-white/80 text-sm mt-1 flex items-center gap-2 pl-10">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        Verifiable Credential (W3C Standard)
                        </p>
                    </div>
                    <button 
                        onClick={() => setShowModal(false)} 
                        className="text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    </div>
                 );
            })()}

            <div className="p-8 space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-sm mx-auto sm:mx-0">
                  {selectedCert.verification_url ? (
                    <QRCodeSVG value={selectedCert.verification_url} size={140} />
                  ) : (
                    <div className="w-[140px] h-[140px] bg-gray-100 flex items-center justify-center text-xs text-gray-400 rounded-lg">
                      No QR Data
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Batch ID</p>
                      <p className="text-base font-bold text-gray-900">{selectedCert.batch_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Product</p>
                      <p className="text-base font-bold text-gray-900">{selectedCert.crop_type}</p>
                    </div>
                  </div>
                  
                  {selectedCert.verification_url && (
                    <Link 
                        href={`/verify/${selectedCert.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline decoration-blue-200 underline-offset-4"
                    >
                        <ExternalLink className="w-4 h-4" /> View Verification Page
                    </Link>
                  )}
                </div>
              </div>

              {(() => {
                const q = selectedCert.credential_data?.credentialSubject?.quality || {};
                return (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-4 tracking-wide">Quality Inspection Data</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Moisture Content</span>
                        <span className="font-semibold text-gray-900">{q.moisture || '0'}%</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Pesticide Residue</span>
                        <span className="font-semibold text-gray-900">{q.pesticide || '0'} ppm</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Quality Grade</span>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 rounded">Grade {q.grade || 'A'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Organic Certified</span>
                        <span className={`font-semibold ${q.organic ? 'text-emerald-600' : 'text-gray-900'}`}>
                          {q.organic ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedCert.batch_details && (
                <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 uppercase mb-4 tracking-wide">Logistics & Origin</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">Origin Location</p>
                      <p className="text-blue-900 font-semibold">{selectedCert.batch_details.location}</p>
                    </div>
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">Destination</p>
                      <p className="text-blue-900 font-semibold">{selectedCert.batch_details.destination}</p>
                    </div>
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">Quantity</p>
                      <p className="text-blue-900 font-semibold">
                        {selectedCert.batch_details.quantity} {selectedCert.batch_details.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">Current Status</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">
                        {selectedCert.batch_details.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Cryptographically signed by <span className="font-medium text-gray-600">{selectedCert.qa_agency_name || selectedCert.credential_data?.issuer?.name || 'QA Authority'}</span>
                </p>
                {selectedCert.issuer_did && (
                  <p className="text-[10px] text-gray-300 font-mono mt-1 break-all px-8">{selectedCert.issuer_did}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}