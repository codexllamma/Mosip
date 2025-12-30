"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RoleContextType {
  role: string;
  setRole: (role: string) => void;
  userName: string;
  userEmail: string;
  isLoading: boolean; // Added helper to know when auth is ready
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  // FIX: Initialize state by reading localStorage immediately (if in browser)
  const [role, setRoleState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mock_role') || '';
    }
    return '';
  });

  const [isLoading, setIsLoading] = useState(true);

  // 1. Sync with LocalStorage on Mount (to handle hydration matching)
  useEffect(() => {
    const storedRole = localStorage.getItem('mock_role');
    if (storedRole) {
      setRoleState(storedRole);
    }
    setIsLoading(false);
  }, []);

  // 2. Wrapper to update both State and Storage
  const setRole = (newRole: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mock_role', newRole);
    }
    setRoleState(newRole);
  };

  // 3. Map Roles to Seeded DB Users
  const getUserDetails = (currentRole: string) => {
    // Helper: Normalize case to ensure matching works
    const r = currentRole?.toUpperCase() || '';
    
    switch (r) {
      case 'EXPORTER': 
        return { name: 'BharatExports', email: 'contact@bharatexports.com' };
      case 'QA_AGENCY': 
        return { name: 'FoodSafety India', email: 'inspector@foodsafety.gov.in' };
      case 'IMPORTER': 
        return { name: 'Global Foods Import Corp', email: 'importer@globalfoods.com' };
      case 'ADMIN':
        return { name: 'System Admin', email: 'admin@agriexport.gov.in' };
      default:
        return { name: '', email: '' };
    }
  };

  const { name: userName, email: userEmail } = getUserDetails(role);

  return (
    <RoleContext.Provider value={{ role, setRole, userName, userEmail, isLoading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}