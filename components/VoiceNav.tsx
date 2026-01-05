"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, AlertCircle, X } from "lucide-react";
import { useVoiceNav } from "@/contexts/VoiceContext";
import { useRole } from "@/contexts/RoleContext";

export default function VoiceNav() {
  const { role } = useRole();
  const { navigateTo, setFormField, currentView, voiceLang, formData} = useVoiceNav();

  const [isListening, setIsListening] = useState(false);
  const [showAuthError, setShowAuthError] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);
  const pendingRestartRef = useRef(false);

  // Refs for latest values (avoid stale closures)
  const navRef = useRef(navigateTo);
  const roleRef = useRef(role);
  const viewRef = useRef(currentView);
  const setFormRef = useRef(setFormField);
  const voiceLangRef = useRef(voiceLang);
  const formDataRef = useRef(formData);

  // Keep refs updated
  useEffect(() => {
    navRef.current = navigateTo;
    roleRef.current = role;
    viewRef.current = currentView;
    setFormRef.current = setFormField;
    voiceLangRef.current = voiceLang;
    formDataRef.current = formData;
  }, [navigateTo, role, currentView, setFormField, voiceLang, formData]);

  // Handle language change (STOP only, restart happens in onend)
  useEffect(() => {
    if (!recognitionRef.current) return;

    // If mic is OFF → just update language
    if (!isEnabledRef.current) {
      recognitionRef.current.lang = voiceLang;
      return;
    }

    // If mic is ON → restart safely
    pendingRestartRef.current = true;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.error("Stop failed:", e);
    }
  }, [voiceLang]);

  // Init SpeechRecognition ONCE
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = voiceLangRef.current;

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const text = event.results[lastIndex][0].transcript.toLowerCase();
        console.log("Voice Command Heard:", text);

        const currentRole = roleRef.current;
        const navigate = navRef.current;
        const activeView = viewRef.current;
        const updateField = setFormRef.current;
        const currentData = formDataRef.current || {}; // Access latest data

        // --- Navigation ---
        if (text.includes("audit") || text.includes("log")) {
          if (currentRole !== "ADMIN") {
            setShowAuthError(true);
            setTimeout(() => setShowAuthError(false), 3000);
          } else navigate("audit-logs");
        } else if (
          text.includes("dashboard") ||
          text.includes("home") ||
          text.includes("डैशबोर्ड") ||
          text.includes("panel")
        )
          navigate("dashboard");
        else if (
          (text.includes("batch") ||
            text.includes("submission") ||
            text.includes("बैच") ||
            text.includes("सबमिशन") ||
            text.includes("lotes")) &&
          !(
            text.includes("make") ||
            text.includes("create") ||
            text.includes("new") ||
            text.includes("form") ||
            text.includes("नए")
          )
        ) {
          if (currentRole === "EXPORTER") navigate("batch-submission");
          else {
            setShowAuthError(true);
            setTimeout(() => setShowAuthError(false), 3000);
          }
        } else if (
          text.includes("make") ||
          text.includes("create") ||
          text.includes("new") ||
          text.includes("form") ||
          text.includes("नया") ||
          text.includes("nuevo")
        ) {
          if (currentRole === "EXPORTER") navigate("form");
          else {
            setShowAuthError(true);
            setTimeout(() => setShowAuthError(false), 3000);
          }
        } else if ( text.includes("passports") || text.includes("passport") || text.includes("digital") || text.includes("पासपोर्ट") || text.includes("pasaportes") ) navigate("digital-passports");
        else if (text.includes("inji") || text.includes("verify")) navigate("inji-verify");

        // --- Form Autofill ---
        if (activeView === "form") {
          
          const isChecked = text.includes("check") || text.includes("yes") || text.includes("enable") || text.includes("select");
          const isUnchecked = text.includes("uncheck") || text.includes("no") || text.includes("disable") || text.includes("remove");
          
          // Helper to toggle array values
          const toggleArrayValue = (value: string) => {
             const currentTests = Array.isArray(currentData.tests) ? [...currentData.tests] : [];
             if (isChecked && !currentTests.includes(value)) {
                updateField("tests", [...currentTests, value]);
             } else if (isUnchecked && currentTests.includes(value)) {
                updateField("tests", currentTests.filter((t: string) => t !== value));
             }
          };

          if (text.includes("crop") || text.includes("type")) {
            if (text.includes("rice")) {
              updateField("cropType", "Basmati Rice");
            }
          } else if (text.includes("destination") || text.includes("country")) {
            const val = text.split(/to |is /).pop();
            if (val) updateField("destinationCountry", capitalizeWords(val));
          } else if (text.includes("location") || text.includes("farm")) {
            const val = text.split(/to |is /).pop();
            if (val) updateField("location", capitalizeWords(val));
          } else if (text.includes("pin code") || text.includes("zip")) {
            const digits = text.match(/\d+/)?.[0];
            if (digits) updateField("pincode", digits);
          } else if (text.includes("quantity") || text.includes("amount")) {
            const digits = text.match(/\d+/)?.[0];
            if (digits) updateField("quantity", digits);
          } 
          
          // --- TESTS (Mapped to match BatchSubmission.tsx Strings) ---
          else if (text.includes("organic") || text.includes("certified")) {
            toggleArrayValue("Organic Certified");
          }
          else if (text.includes("moisture") || text.includes("percentage")) {
            toggleArrayValue("Moisture Content");
          }
          else if (text.includes("pesticide") || text.includes("residue")) {
            toggleArrayValue("Pesticide Residue");
          }
          else if (text.includes("aflatoxin") || text.includes("levels")) {
            toggleArrayValue("Aflatoxin Level");
          }
          else if (text.includes("heavy") || text.includes("metals")) {
            toggleArrayValue("Heavy Metals");
          }
          else if (text.includes("grade") || text.includes("quality")) {
            toggleArrayValue("Grade A Quality");
          }
          
          // --- PASSPORT TYPE (Boolean) ---
          else if (text.includes("golden") || text.includes("regular")) {
            if (text.includes("regular")) {
              console.log("Voice Command: Setting Passport Type to Regular");
              updateField("golden", false); // Matches BatchSubmission interface
            } 
            else if (text.includes("golden")) {
              console.log("Voice Command: Setting Passport Type to Golden");
              updateField("golden", true); // Matches BatchSubmission interface
            }
          }
        }
      };

      recognition.onend = () => {
        // Use ref to handle restarts
        if (recognitionRef.current) {
          recognitionRef.current.lang = voiceLangRef.current;
        }

        if (isEnabledRef.current) {
          try {
            recognitionRef.current?.start();
            console.log("Voice recognition automatically restarted.");
          } catch (e) {
            // Ignore if already started
            console.warn("Recognition restart ignored: already active.");
          }
        } else {
          setIsListening(false);
          console.log("Voice recognition stopped by user.");
        }
      };

      // Assign to ref
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleMic = () => {
    if (isEnabledRef.current) {
      // TURN OFF
      isEnabledRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch(e) { console.log("Stop error ignored"); }
      setIsListening(false);
    } else {
      // TURN ON
      isEnabledRef.current = true;
      try {
        // Fix: Wrapped in Try/Catch to prevent "InvalidStateError"
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Start error (likely already running):", e);
        // If it was already running, we just ensure visual state matches
        setIsListening(true); 
      }
    }
  };

  const capitalizeWords = (str: string) =>
    str.replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="flex items-center gap-3">
      {showAuthError && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-white border-l-4 border-red-500 shadow-xl rounded-lg p-4 flex items-center gap-4">
            <AlertCircle className="text-red-600" size={20} />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-black">Access Denied</h4>
              <p className="text-xs text-slate-500">You are not authorized.</p>
            </div>
            <button onClick={() => setShowAuthError(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <button
        onClick={toggleMic}
        className={`p-2.5 rounded-full border transition ${
          isListening
            ? "bg-emerald-500 text-white"
            : "bg-white text-slate-400 hover:border-emerald-500"
        }`}
      >
        {isListening ? <Mic size={18} /> : <MicOff size={18} />}
      </button>
    </div>
  );
}