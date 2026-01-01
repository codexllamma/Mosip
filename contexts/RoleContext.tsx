"use client";

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from "next-auth/react";

interface RoleContextType {
  role: string | null;
  setRole: (role: string) => void; // Kept for backward compatibility, but mostly unused now
  userName: string | null;
  userEmail: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  // 1. Fetch real session data from NextAuth
  const { data: session, status } = useSession();

  // 2. Extract real values
  // These come from your DB via the logic in app/api/auth/[...nextauth]/route.ts
  const role = session?.user?.role || null;
  const userName = session?.user?.name || null;
  const userEmail = session?.user?.email || null;
  
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  // 3. Optional: Allow manual override (only if strictly necessary for dev testing)
  // For production, this function is a no-op because the session drives the state.
  const setRole = (newRole: string) => {
    console.warn("setRole called: Roles are now managed by the active Session.");
  };

  return (
    <RoleContext.Provider value={{ 
      role, 
      setRole, 
      userName, 
      userEmail, 
      isLoading, 
      isAuthenticated 
    }}>
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