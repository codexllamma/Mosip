"use client";

import { useState, useEffect } from 'react';
import { CheckCircle, ExternalLink, AlertCircle, Eye, X, Calendar, Package } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslations } from 'next-intl';

interface PassportData {
  id: string; batch_number: string; crop_type: string; exporter_name: string;
  issued_at: string; expires_at: string; verification_url: string | null;
  issuer_did: string | null;
  credential_data: {
    issuer: { name: string };
    credentialSubject: { quality: { grade: string; moisture: string; pesticide: string; organic: boolean; }; };
  };
  batch_details: { location: string; destination: string; quantity: number; unit: string; status: string; };
}

export default function DigitalPassports() {
  const t = useTranslations('DigitalPassports');
  const [certificates, setCertificates] = useState<PassportData[]>([]);
  const [selectedCert, setSelectedCert] = useState<PassportData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/passports')
      .then(res => { if (!res.ok) throw new Error("Failed to fetch data"); return res.json(); })
      .then(data => { setCertificates(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h2 className="text-lg font-semibold text-red-900">{t('error_title')}</h2>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    </div>
  );

  if (certificates.length === 0) return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('title')}</h1>
      <div className="bg-white border border-gray-200 rounded-lg p-16 text-center shadow-sm">
        <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('empty_title')}</h3>
        <p className="text-gray-500 max-w-md mx-auto">{t('empty_subtitle')}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
          <span className="text-emerald-800 font-medium">
            {t('active_count', { count: certificates.length })}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((cert) => {
          const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date();
          const quality = cert.credential_data?.credentialSubject?.quality || {};
          
          return (
            <div key={cert.id} className="bg-white border-2 border-emerald-50 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm ${isExpired ? 'bg-red-500/20' : 'bg-emerald-400/20'}`}>
                    {isExpired ? t('status_expired') : t('status_verified')}
                  </span>
                </div>
                <h3 className="text-xl font-bold">{cert.crop_type}</h3>
                <p className="text-emerald-100 text-sm mt-1 font-mono opacity-80">#{cert.batch_number}</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">{t('label_exporter')}</p>
                      <p className="text-sm font-semibold text-gray-900">{cert.exporter_name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase">{t('label_issued')}</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(cert.issued_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="text-gray-500">{t('label_grade')}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Grade {quality.grade || 'A'}
                    </span>
                  </div>
                  <button onClick={() => { setSelectedCert(cert); setShowModal(true); }} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" /> {t('btn_view')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && selectedCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gray-900 text-white p-6 sticky top-0 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">{t('modal.title')}</h2>
                <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>{t('modal.standard')}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="bg-white p-3 border rounded-xl mx-auto sm:mx-0">
                  {selectedCert.verification_url ? <QRCodeSVG value={selectedCert.verification_url} size={140} /> : <div className="w-[140px] h-[140px] bg-gray-100 flex items-center justify-center text-xs text-gray-400">{t('modal.no_qr')}</div>}
                </div>
                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">{t('modal.label_batch')}</p>
                      <p className="text-base font-bold text-gray-900">{selectedCert.batch_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold">{t('modal.label_product')}</p>
                      <p className="text-base font-bold text-gray-900">{selectedCert.crop_type}</p>
                    </div>
                  </div>
                  {selectedCert.verification_url && (
                    <a href={selectedCert.verification_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline">
                      <ExternalLink className="w-4 h-4" /> {t('modal.verify_link')}
                    </a>
                  )}
                </div>
              </div>

              {(() => {
                const q = selectedCert.credential_data?.credentialSubject?.quality || {};
                return (
                  <div className="bg-gray-50 rounded-xl p-6 border">
                    <h3 className="text-sm font-bold text-gray-800 uppercase mb-4">{t('modal.section_quality')}</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600 text-sm">{t('modal.moisture')}</span>
                        <span className="font-semibold text-gray-900">{q.moisture || '0'}%</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600 text-sm">{t('modal.pesticide')}</span>
                        <span className="font-semibold text-gray-900">{q.pesticide || '0'} ppm</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600 text-sm">{t('modal.grade')}</span>
                        <span className="font-bold text-emerald-600">Grade {q.grade || 'A'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-gray-600 text-sm">{t('modal.organic')}</span>
                        <span className="font-semibold text-emerald-600">{q.organic ? t('modal.organic_yes') : t('modal.organic_no')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedCert.batch_details && (
                <div className="bg-blue-50/50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-sm font-bold text-blue-900 uppercase mb-4">{t('modal.section_logistics')}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">{t('modal.origin')}</p>
                      <p className="text-blue-900 font-semibold">{selectedCert.batch_details.location}</p>
                    </div>
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">{t('modal.destination')}</p>
                      <p className="text-blue-900 font-semibold">{selectedCert.batch_details.destination}</p>
                    </div>
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">{t('modal.quantity')}</p>
                      <p className="text-blue-900 font-semibold">{selectedCert.batch_details.quantity} {selectedCert.batch_details.unit}</p>
                    </div>
                    <div>
                      <p className="text-blue-500 font-medium text-xs mb-1">{t('modal.status')}</p>
                      <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">{selectedCert.batch_details.status}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-center pt-4 border-t">
                <p className="text-xs text-gray-400">
                  {t('modal.signed_by')} <span className="font-medium text-gray-600">{selectedCert.credential_data?.issuer?.name || 'QA Authority'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}