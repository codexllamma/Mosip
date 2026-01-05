"use client";

import React from "react";
import { CheckCircle2, Circle, Lock, ShieldCheck, Loader2, Users, Clock } from "lucide-react";

interface ConsensusTrackerProps {
  status: string;        
  totalAgencies: number; 
  completedCount: number; 
}

export default function ConsensusTracker({ status, totalAgencies = 3, completedCount }: ConsensusTrackerProps) {
  
  // 1. Determine Global State
  const isCertified = status === "CERTIFIED" || status === "APPROVED";
  
  // 2. Force Consensus Mode if more than 1 agency OR if we have multiple completed inspections
  const isConsensusMode = totalAgencies > 1 || completedCount > 1;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 transition-all duration-500">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-600" />
        {isConsensusMode ? "Golden Consensus Protocol" : "Quality Assurance Lifecycle"}
      </h3>

      <div className="relative flex flex-col gap-8">
        {/* Vertical Connecting Line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100" />

        {/* STAGE 1: ASSIGNMENT */}
        <div className="relative flex items-start gap-4">
          <div className="z-10 bg-emerald-100 p-1 rounded-full border-2 border-emerald-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Agencies Assigned</h4>
            <p className="text-sm text-slate-500">
                {isConsensusMode 
                    ? "System selected 3 random accredited agencies." 
                    : "Assigned to primary QA partner."}
            </p>
          </div>
        </div>

        {/* STAGE 2: INSPECTION / CONSENSUS ROUND */}
        <div className="relative flex items-start gap-4">
          {/* Main Stage Icon */}
          <div className={`z-10 p-1 rounded-full border-2 transition-colors duration-300 
            ${isCertified 
                ? 'bg-emerald-100 border-emerald-500' 
                : 'bg-blue-50 border-blue-500 animate-pulse'}`}>
            {isCertified ? (
              <Users className="w-6 h-6 text-emerald-600" />
            ) : (
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            )}
          </div>
          
          <div className="w-full">
            <h4 className="font-semibold text-slate-900">
              {isConsensusMode ? "Independent Reviews" : "Inspection In Progress"}
            </h4>
            
            {/* PROGRESS BAR / SLOTS */}
            <div className={`grid gap-3 mt-3 ${isConsensusMode ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {Array.from({ length: Math.max(totalAgencies, 3) }).map((_, i) => {
                
                // LOGIC: Slot is DONE if index < count OR if the whole batch is Certified
                const isDone = i < completedCount || isCertified;
                
                // LOGIC: Slot is ACTIVE (Pulsing) if it is the next one in line
                const isActive = !isCertified && i === completedCount;

                return (
                  <div 
                    key={i} 
                    className={`
                        relative flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all duration-500
                        ${isDone 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm scale-100" 
                            : isActive
                                ? "bg-white border-blue-400 text-blue-600 shadow-md ring-2 ring-blue-100 scale-105" // Active Pulse
                                : "bg-slate-50 border-slate-100 text-slate-300 border-dashed"
                        }
                    `}
                  >
                    {isDone ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 mb-1" />
                        <span className="text-xs font-bold">Agency {i + 1}</span>
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Verified</span>
                      </>
                    ) : isActive ? (
                      <>
                        <Loader2 className="w-5 h-5 mb-1 animate-spin" />
                        <span className="text-xs font-bold">Agency {i + 1}</span>
                        <span className="text-[10px]">Reviewing...</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 mb-1" />
                        <span className="text-xs font-medium">Agency {i + 1}</span>
                        <span className="text-[10px]">Pending</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            
            {!isCertified && (
                <p className="text-xs text-slate-400 mt-2 text-right animate-pulse">
                   Waiting for Agency {completedCount + 1}...
                </p>
            )}
          </div>
        </div>

        {/* STAGE 3: GOLDEN PASSPORT */}
        <div className="relative flex items-start gap-4">
          <div className={`z-10 p-1 rounded-full border-2 transition-colors duration-500 
            ${isCertified 
                ? 'bg-amber-100 border-amber-500' 
                : 'bg-slate-50 border-slate-200'}`}>
            {isCertified ? (
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            ) : (
              <Lock className="w-6 h-6 text-slate-300" />
            )}
          </div>
          
          <div>
            <h4 className={`font-semibold transition-colors duration-500 ${isCertified ? 'text-amber-700' : 'text-slate-400'}`}>
              Golden Passport Generated
            </h4>
            {isCertified ? (
              <div className="mt-1 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Consensus Reached.
                  </p>
                  <p className="text-xs text-slate-500">Verifiable Credential issued on blockchain.</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1">
                Locked until 3/3 inspections pass.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}