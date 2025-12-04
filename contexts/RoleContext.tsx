"use client";

import { createContext, useContext, useState, ReactNode } from 'react';
import type { UserRole } from '../types';

interface RoleContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  userName: string;
  userEmail: string; // Added this so we can send the correct email to the API
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('exporter');

  // Map roles to the REAL users we seeded in Supabase
  const getUserDetails = (currentRole: UserRole) => {
    switch (currentRole) {
      case 'exporter':
        return {
          name: 'BharatExports', // Matches seeded DB Name
          email: 'contact@bharatexports.com' // Matches seeded DB Email
        };
      case 'qa_agency':
        return {
          name: 'FoodSafety India', // Matches seeded DB Name
          email: 'inspector@foodsafety.gov.in' // Matches seeded DB Email
        };
      case 'importer':
        return {
          name: 'Global Foods Import Corp',
          email: 'importer@globalfoods.com'
        };
      default:
        return { name: 'Guest', email: '' };
    }
  };

  const { name: userName, email: userEmail } = getUserDetails(role);

  return (
    <RoleContext.Provider value={{ role, setRole, userName, userEmail }}>
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