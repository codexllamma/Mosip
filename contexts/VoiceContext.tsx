"use client";

import React, { createContext, useContext, useState } from 'react';

// Define the valid views for your application
type AppView = 'dashboard' | 'batch-submission' | 'inspection-requests' | 'digital-passports' | 'inji-verify' | 'audit-logs' | 'list' | 'form' | 'success' | 'detail';

interface VoiceContextType {
  currentView: AppView;
  navigateTo: (view: any) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');

  const navigateTo = (view: AppView) => {
    console.log("Context navigating to:", view);
    setCurrentView(view);
  };

  return (
    <VoiceContext.Provider value={{ currentView, navigateTo }}>
      {children}
    </VoiceContext.Provider>
  );
}

export const useVoiceNav = () => {
  const context = useContext(VoiceContext);
  if (!context) throw new Error("useVoiceNav must be used within a VoiceProvider");
  return context;
};