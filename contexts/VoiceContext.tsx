"use client";

import React, { createContext, useContext, useState } from 'react';

type AppView = 'dashboard' | 'batch-submission' | 'inspection-requests' | 'digital-passports' | 'inji-verify' | 'audit-logs' | 'list' | 'form' | 'success' | 'detail';

interface VoiceContextType {
  currentView: AppView;
  navigateTo: (view: any) => void;
  // New: Global Form State
  formData: any;
  setFormField: (field: string, value: any) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  
  // Shared form state
  const [formData, setFormData] = useState({
    cropType: '',
    quantity: '',
    unit: 'kg',
    location: '',
    pincode: '',
    harvestDate: '',
    destinationCountry: '',
  });

  const setFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
  };

  return (
    <VoiceContext.Provider value={{ currentView, navigateTo, formData, setFormField }}>
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoiceNav = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error("useVoiceNav must be used within a VoiceProvider");
  return context;
};