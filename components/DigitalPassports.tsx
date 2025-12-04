import { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle, Calendar, Package, Eye, X } from 'lucide-react';
// Note: We use 'qrcode.react' component on frontend usually, but if you want to display the generated PNG from backend:
import { QRCodeSVG } from 'qrcode.react'; 

// Define local interface for API response shape
interface PassportWithBatch {
  id: string;
  batch_number: string;
  crop_type: string;
  exporter_name: string;
  verification_url: string;
  issued_at: string;
  // The JSON blob from the VC
  credential_data: {
    issuer?: { name: string };
    credentialSubject: {
      quality: {
        moisture: string;
        pesticide: string;
        grade: string;
        organic: boolean;
      };
      // ... any other fields
    };
  };
}

export function DigitalPassports() {
  const [passports, setPassports] = useState<PassportWithBatch[]>([]);
  const [selectedPassport, setSelectedPassport] = useState<PassportWithBatch | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPassports();
  }, []);

  async function loadPassports() {
    try {
      // --- CALL THE API ---
      const response = await fetch('/api/passports');
      if (!response.ok) throw new Error("Failed to fetch passports");
      
      const data = await response.json();
      
      // Transform API data if needed, or use as is
      setPassports(data);
    } catch (err) {
      console.error("Error loading passports:", err);
    }
  }

  function openPassportModal(passport: PassportWithBatch) {
    setSelectedPassport(passport);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setSelectedPassport(null);
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-slate-900">Digital Product Passports</h1>
        <p className="text-sm text-slate-600 mt-1">Verifiable credentials for approved export batches</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {passports.map((passport) => {
          // Extract nested data for easier access
          const subject = passport.credential_data?.credentialSubject || {};
          const quality = subject.quality || {};

          return (
            <div
              key={passport.id}
              className="bg-white border-2 border-emerald-100 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              {/* Card Header */}
              <div className="bg-linear-to-br from-emerald-600 to-emerald-700 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck size={100} />
                </div>
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </div>
                <h3 className="text-xl font-bold relative z-10">{passport.crop_type}</h3>
                <p className="text-emerald-100 text-sm mt-1 relative z-10 font-mono">#{passport.batch_number}</p>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Exporter</p>
                      <p className="text-sm font-semibold text-slate-900">{passport.exporter_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Issued</p>
                      <p className="text-sm font-medium text-slate-900">{formatDate(passport.issued_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                   <div className="flex justify-between items-center text-sm mb-4">
                      <span className="text-slate-500">Quality Grade</span>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Grade {quality.grade || 'A'}
                      </span>
                   </div>
                   
                   <button
                    onClick={() => openPassportModal(passport)}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Passport
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {passports.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Passports Issued Yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto">
            Once batches are inspected and approved by the QA Agency, their digital passports will appear here.
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedPassport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 sticky top-0 z-10 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Digital Product Passport</h2>
                <p className="text-slate-400 text-sm mt-1">Verifiable Credential (W3C Standard)</p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* 1. Core Identity */}
              <div className="flex gap-6 items-start">
                 <div className="bg-white p-2 border border-slate-200 rounded-lg shadow-sm">
                    {/* Display Actual QR Code pointing to verification URL */}
                    <QRCodeSVG value={selectedPassport.verification_url} size={120} level="M" />
                 </div>
                 <div className="flex-1 space-y-4">
                    <div>
                       <p className="text-xs text-slate-500 uppercase font-semibold">Verification URL</p>
                       <p className="text-xs text-blue-600 break-all font-mono bg-blue-50 p-2 rounded mt-1">
                         {selectedPassport.verification_url}
                       </p>
                    </div>
                    <div className="flex gap-4">
                       <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">Batch ID</p>
                          <p className="text-sm font-bold text-slate-900">{selectedPassport.batch_number}</p>
                       </div>
                       <div>
                          <p className="text-xs text-slate-500 uppercase font-semibold">Crop</p>
                          <p className="text-sm font-bold text-slate-900">{selectedPassport.crop_type}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* 2. Quality Data */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Inspection Data</h3>
                 <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    {(() => {
                       const q = selectedPassport.credential_data?.credentialSubject?.quality || {};
                       return (
                         <>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                             <span className="text-slate-600 text-sm">Moisture Level</span>
                             <span className="font-semibold text-slate-900">{q.moisture || 'N/A'}%</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                             <span className="text-slate-600 text-sm">Pesticide Residue</span>
                             <span className="font-semibold text-slate-900">{q.pesticide || 'N/A'} ppm</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                             <span className="text-slate-600 text-sm">Quality Grade</span>
                             <span className="font-semibold text-emerald-600">Grade {q.grade || 'A'}</span>
                           </div>
                           <div className="flex justify-between border-b border-slate-200 pb-2">
                             <span className="text-slate-600 text-sm">Organic Status</span>
                             <span className="font-semibold text-slate-900">{q.organic ? 'Certified' : 'No'}</span>
                           </div>
                         </>
                       );
                    })()}
                 </div>
              </div>

              {/* 3. Footer */}
              <div className="text-center">
                 <p className="text-xs text-slate-400">
                   Cryptographically signed by {selectedPassport.credential_data?.issuer?.name || 'National QA Authority'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}