"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Using string to prevent type import errors, but matches your UserRole enum
interface RoleContextType {
  role: string;
  setRole: (role: string) => void;
  userName: string;
  userEmail: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  // Default to empty so we don't auto-login incorrectly
  const [role, setRoleState] = useState<string>('');

  // 1. Sync with LocalStorage on Mount (Persist Login)
  useEffect(() => {
    const storedRole = localStorage.getItem('mock_role');
    if (storedRole) {
      setRoleState(storedRole);
    }
  }, []);

  // 2. Wrapper to update both State and Storage
  const setRole = (newRole: string) => {
    localStorage.setItem('mock_role', newRole);
    setRoleState(newRole);
  };

  // 3. Map Roles (UPPERCASE) to Seeded DB Users
  const getUserDetails = (currentRole: string) => {
    switch (currentRole) {
      case 'EXPORTER': // Uppercase to match DB/Login
        return {
          name: 'BharatExports', 
          email: 'contact@bharatexports.com'
        };
      case 'QA_AGENCY': // Uppercase to match DB/Login
        return {
          name: 'FoodSafety India', 
          email: 'inspector@foodsafety.gov.in'
        };
      case 'IMPORTER': // Uppercase to match DB/Login
        return {
          name: 'Global Foods Import Corp',
          email: 'importer@globalfoods.com'
        };
      case 'ADMIN':
        return {
          name: 'System Admin',
          email: 'admin@agriexport.gov.in'
        };
      default:
        return { name: '', email: '' };
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