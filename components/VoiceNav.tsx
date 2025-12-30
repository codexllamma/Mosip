"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useVoiceNav } from "@/contexts/VoiceContext";

export default function VoiceNav() {
  const { role } = useRole();
  const { navigateTo } = useVoiceNav();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);

  // We use refs for navigation and role so the useEffect doesn't 
  // need to restart every time the page changes.
  const navigateRef = useRef(navigateTo);
  const roleRef = useRef(role);

  useEffect(() => {
    navigateRef.current = navigateTo;
    roleRef.current = role;
  }, [navigateTo, role]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      console.log("Voice System: Active");
    };

    recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const text = event.results[lastIndex][0].transcript.toLowerCase();
      
      console.log("Voice Command Heard:", text);

      // Use the Ref version of navigate to avoid effect re-runs
      const nav = navigateRef.current;
      const currentRole = roleRef.current;

      if (text.includes("take") || text.includes("show") || text.includes("go to")) {
        if (text.includes("dashboard") || text.includes("home")) {
          nav("dashboard");
        } 
        else if (currentRole === "EXPORTER" && (text.includes("batch") || text.includes("submission"))) {
          nav("batch-submission");
        } 
        else if (currentRole === "QA_AGENCY" && (text.includes("inspection"))) {
          nav("inspection-requests");
        } 
        else if (text.includes("passport") || text.includes("credential")) {
          nav("digital-passports");
        } 
        else if (text.includes("verify") || text.includes("inji")) {
          nav("inji-verify");
        } 
        else if (currentRole === "ADMIN" && (text.includes("audit") || text.includes("log"))) {
          nav("audit-logs");
        }
      }
      else if (role == "EXPORTER" &&(text.includes("create") || text.includes("make") || text.includes("new"))) {
        nav("form"); 
      }
      else if (text.includes("view list") || text.includes("show list") || text.includes("back")) {
        nav("list");
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === "aborted") return;
      
      // 'no-speech' is the most common reason the mic stops. 
      // We catch it here so onend() can handle the restart.
      if (err.error === "no-speech") {
        return; 
      }
      console.error("Speech Recognition Error:", err.error);
    };
    
    recognition.onend = () => {
      // CRITICAL: Restart logic
      if (isEnabledRef.current) {
        console.log("Restarting Recognition...");
        try {
          recognition.start();
        } catch (e) {
          // If it's already starting, this catch prevents a crash
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isEnabledRef.current = false;
      recognition.stop();
    };
  }, []); // Empty dependency array ensures the mic instance is stable

  const toggleMic = () => {
    if (isEnabledRef.current) {
      isEnabledRef.current = false;
      recognitionRef.current?.stop();
    } else {
      isEnabledRef.current = true;
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      {isListening && (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}

      <button
        onClick={toggleMic}
        type="button"
        className={`p-2.5 rounded-full transition-all duration-300 border ${
          isListening
            ? "bg-emerald-500 text-white border-emerald-600 shadow-lg scale-110"
            : "bg-white text-slate-500 border-slate-200 hover:border-emerald-500 hover:text-emerald-600"
        }`}
        title={isListening ? "Listening Continuously..." : "Enable Voice Control"}
      >
        {isListening ? <Mic size={18} strokeWidth={3} /> : <MicOff size={18} />}
      </button>
    </div>
  );
}