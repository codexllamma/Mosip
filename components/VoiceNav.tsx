"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, X } from "lucide-react";
import { useVoiceNav } from "@/contexts/VoiceContext"; 
import { useRole } from "@/contexts/RoleContext";

export default function VoiceNav() {
  const { role } = useRole();
  const { navigateTo, setFormField, currentView } = useVoiceNav(); // Get these at top level
  
  const [isListening, setIsListening] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);

  // 1. Create Refs to hold the LATEST values for the listener to access safely
  const navRef = useRef(navigateTo);
  const roleRef = useRef(role);
  const viewRef = useRef(currentView);
  const setFormRef = useRef(setFormField);

  // 2. Keep Refs updated whenever React state changes
  useEffect(() => {
    navRef.current = navigateTo;
    roleRef.current = role;
    viewRef.current = currentView;
    setFormRef.current = setFormField;
  }, [navigateTo, role, currentView, setFormField]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; 
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const text = event.results[lastIndex][0].transcript.toLowerCase();
        console.log("Voice Command Heard:", text);

        // 3. ACCESS THE REFS (Not hooks or direct state)
        const currentRole = roleRef.current;
        const navigate = navRef.current;
        const activeView = viewRef.current; 
        const updateField = setFormRef.current; 

        // --- Navigation Logic ---
        if (text.includes("audit") || text.includes("log")) {
          if (currentRole !== "ADMIN") {
            setShowAuthError(true);
            setTimeout(() => setShowAuthError(false), 3000);
          } else {
            navigate("audit-logs");
          }
        } 
        else if (text.includes("dashboard") || text.includes("home")) {
          navigate("dashboard");
        } 
        else if (text.includes("batch") || text.includes("submission")) {
          if (currentRole === "EXPORTER") navigate("batch-submission");
          else { setShowAuthError(true); setTimeout(() => setShowAuthError(false), 3000); }
        } 
        else if (text.includes("make") || text.includes("create") || text.includes("new") || text.includes("form")) {
          if (currentRole === "EXPORTER") navigate("form");
          else { setShowAuthError(true); setTimeout(() => setShowAuthError(false), 3000); }
        }

        // --- Form Autofill Logic (Only works if activeView is 'form') ---
        if (activeView === "form") {
            // Regex to match "crop to Basmati" or "crop is Basmati"
            if (text.includes("crop") || text.includes("type")) {
                const val = text.split(/to |is /).pop(); 
                console.log("Val: ", val);
                val.trim();
                if(val.includes("rice")) updateField("cropType", "Basmati Rice")
            } 
            else if (text.includes("destination") || text.includes("country")) {
                const val = text.split(/to |is /).pop();
                if (val) updateField("destinationCountry", capitalizeWords(val.trim()));
            }
            else if (text.includes("location") || text.includes("farm")) {
                const val = text.split(/to |is /).pop();
                console.log("Val: ", val);
                if (val) updateField("location", capitalizeWords(val.trim()));
            }
            else if (text.includes("pincode") || text.includes("zip")) {
                const digits = text.match(/\d+/)?.[0];
                if (digits) updateField("pincode", digits);
            }
            else if (text.includes("quantity") || text.includes("amount")) {
                const digits = text.match(/\d+/)?.[0];
                if (digits) updateField("quantity", digits);
            }
        }
      };

      recognition.onend = () => {
        if (isEnabledRef.current) {
          try { recognition.start(); } catch (e) { console.error("Restart failed:", e); }
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []); 

  // Helper to match dropdown casing (e.g., "basmati rice" -> "Basmati Rice")
  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (l: string) => l.toUpperCase());
  };

  const toggleMic = () => {
    if (isEnabledRef.current) {
      isEnabledRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      isEnabledRef.current = true;
      try { recognitionRef.current?.start(); } catch (e) { console.error("Start error:", e); }
    }
  };

  return (
    <div className="flex items-center gap-3">
      {showAuthError && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in duration-300">
          <div className="bg-white border-l-4 border-red-500 shadow-2xl rounded-lg p-4 flex items-center gap-4 min-w-[300px]">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="text-red-600" size={20} />
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">Access Denied</h4>
                <p className="text-xs text-slate-500">You are not authorized.</p>
            </div>
            <button onClick={() => setShowAuthError(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="relative flex items-center">
        {isListening && (
          <span className="absolute -left-3 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
        <button
          onClick={toggleMic}
          className={`p-2.5 rounded-full transition-all border ${
            isListening 
              ? "bg-emerald-500 text-white border-emerald-600 shadow-lg" 
              : "bg-white text-slate-400 border-slate-200 hover:border-emerald-500"
          }`}
        >
          {isListening ? <Mic size={18} strokeWidth={3} /> : <MicOff size={18} />}
        </button>
      </div>
    </div>
  );
}