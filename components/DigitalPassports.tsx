import { useState, useEffect } from 'react';
import { Download, CheckCircle, ExternalLink, AlertCircle, Eye, X, Calendar, Package } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DigitalPassports() {
  const [certificates, setCertificates] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/passports')
      .then(res => res.json())
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

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
        <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
          <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Certificates Yet</h3>
          <p className="text-gray-500">Certificates will appear here once batches are inspected and approved.</p>
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
        <div className="text-sm text-gray-500">
          {certificates.length} {certificates.length === 1 ? 'certificate' : 'certificates'}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((cert) => {
          const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date();
          const quality = cert.credential_data?.credentialSubject?.quality || {};
          
          return (
            <div
              key={cert.id}
              className="bg-white border-2 border-emerald-100 rounded-xl overflow-hidden hover:shadow-lg transition-all"
            >
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <CheckCircle size={100} />
                </div>
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                    isExpired 
                      ? 'bg-red-100 text-red-800 border-red-200' 
                      : 'bg-white/20 text-white border-white/30'
                  }`}>
                    {isExpired ? 'Expired' : 'Verified'}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold">{cert.crop_type}</h3>
                <p className="text-emerald-100 text-sm mt-1 font-mono">#{cert.batch_number}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Exporter</p>
                      <p className="text-sm font-semibold text-gray-900">{cert.exporter_name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Issued</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(cert.issued_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="text-gray-500">Quality Grade</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Grade {quality.grade || 'A'}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedCert(cert);
                      setShowModal(true);
                    }}
                    className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
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

      {/* Modal */}
      {showModal && selectedCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="bg-gray-900 text-white p-6 sticky top-0 z-10 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Digital Product Passport</h2>
                <p className="text-gray-400 text-sm mt-1">Verifiable Credential (W3C)</p>
              </div>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* QR Code & Core Info */}
              <div className="flex gap-6 items-start">
                <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
                  {selectedCert.verification_url ? (
                    <QRCodeSVG value={selectedCert.verification_url} size={120} />
                  ) : (
                    <div className="w-[120px] h-[120px] bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      No QR
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Batch ID</p>
                    <p className="text-sm font-bold text-gray-900">{selectedCert.batch_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Product</p>
                    <p className="text-sm font-bold text-gray-900">{selectedCert.crop_type}</p>
                  </div>
                  {selectedCert.verification_url && (
                    <a
                      href={selectedCert.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Verify with Inji
                    </a>
                  )}
                </div>
              </div>

              {/* Quality Metrics */}
              {(() => {
                const q = selectedCert.credential_data?.credentialSubject?.quality || {};
                return (
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">Quality Data</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Moisture</span>
                        <span className="font-semibold">{q.moisture || 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Pesticide</span>
                        <span className="font-semibold">{q.pesticide || 'N/A'} ppm</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Grade</span>
                        <span className="font-semibold text-emerald-600">Grade {q.grade || 'A'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-200 pb-2">
                        <span className="text-gray-600 text-sm">Organic</span>
                        <span className="font-semibold">{q.organic ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Batch Details */}
              {selectedCert.batch_details && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-sm font-bold text-blue-900 uppercase mb-4">Batch Info</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600">Origin</p>
                      <p className="text-blue-900 font-medium">{selectedCert.batch_details.location}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Destination</p>
                      <p className="text-blue-900 font-medium">{selectedCert.batch_details.destination}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Quantity</p>
                      <p className="text-blue-900 font-medium">
                        {selectedCert.batch_details.quantity} {selectedCert.batch_details.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-600">Status</p>
                      <p className="text-blue-900 font-medium uppercase">{selectedCert.batch_details.status}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Issuer Info */}
              <div className="text-center">
                <p className="text-xs text-gray-400">
                  Cryptographically signed by {selectedCert.credential_data?.issuer?.name || 'QA Authority'}
                </p>
                {selectedCert.issuer_did && (
                  <p className="text-xs text-gray-400 font-mono mt-1">{selectedCert.issuer_did}</p>
                )}
              </div>

              {/* Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-xs text-amber-800">
                  <strong>⚠️ Important:</strong> This certificate is cryptographically signed. 
                  To verify authenticity, use Inji Verify. This portal displays metadata only.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}