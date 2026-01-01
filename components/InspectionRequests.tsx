'use client';

import { useEffect, useState } from 'react';
import { Search, FileText, X } from 'lucide-react';
import { useRole } from '../contexts/RoleContext';
import type { Batch } from '../types';
import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl'; // 👇 Added

interface InspectionFormData {
  moistureLevel: string;
  pesticideContent: string;
  organicStatus: boolean;
  qualityGrade: string;
  notes: string;
}

export function InspectionRequests() {
  const { userName } = useRole();
  const t = useTranslations('Inspections'); // 👇 Initialize
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { data: session } = useSession();
    
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
  }, [session]);

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

  async function loadBatches() {
    if (!session?.user?.email) return;
    try {
      const response = await fetch(`/api/inspections/pending?email=${session.user.email}`);
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
      moistureLevel: '', pesticideContent: '', organicStatus: false, qualityGrade: '', notes: '',
    });
  }

  function closeModal() {
    setShowModal(false);
    setSelectedBatch(null);
  }

  async function handleSubmitInspection(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBatch) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inspections/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      if (!response.ok) throw new Error('Inspection failed');
      await loadBatches();
      closeModal();
    } catch (error: any) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function getStatusBadge(status: string) {
    const s = status.toLowerCase();
    if (s.includes('pending')) return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  function formatDate(dateString: string) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{t('title')}</h1>
          <p className="text-sm text-slate-600 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-slate-600 w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('table.id')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('table.exporter')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('table.crop')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('table.qty')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('table.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase">{t('table.status')}</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase">{t('table.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBatches.map((batch) => (
                <tr key={batch.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{batch.batch_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{batch.exporter_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{batch.crop_type}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{(batch.quantity_kg / 1000).toFixed(1)}t</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{formatDate(batch.submitted_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(batch.status)}`}>
                      {batch.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openInspectionModal(batch)} className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
                      {t('table.record')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBatches.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">{t('empty')}</p>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">{t('modal.title')}</h2>
              <button onClick={closeModal}><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmitInspection} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('modal.moisture')}</label>
                  <input type="number" step="0.1" required value={formData.moistureLevel} onChange={(e) => setFormData(p => ({ ...p, moistureLevel: e.target.value }))} className="w-full px-4 py-2 border rounded-lg outline-none text-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('modal.pesticide')}</label>
                  <input type="number" step="0.01" required value={formData.pesticideContent} onChange={(e) => setFormData(p => ({ ...p, pesticideContent: e.target.value }))} className="w-full px-4 py-2 border rounded-lg outline-none text-slate-700" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">{t('modal.grade')}</label>
                <select required value={formData.qualityGrade} onChange={(e) => setFormData(p => ({ ...p, qualityGrade: e.target.value }))} className="w-full px-4 py-2 border rounded-lg text-slate-700 outline-none">
                  <option value="">Select grade</option>
                  <option value="A">Grade A</option>
                  <option value="B">Grade B</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.organicStatus} onChange={(e) => setFormData(p => ({ ...p, organicStatus: e.target.checked }))} className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{t('modal.organic')}</span>
              </label>
              <textarea value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder={t('modal.notes_placeholder')} rows={4} className="w-full px-4 py-2 border rounded-lg text-slate-700 outline-none" />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-6 py-2 border rounded-lg text-slate-700">{t('modal.cancel')}</button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50">
                  {isSubmitting ? t('modal.issuing') : t('modal.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}