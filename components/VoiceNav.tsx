"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useVoiceNav } from "@/contexts/VoiceContext"; // Import the context hook

export default function VoiceNav() {
  const { role } = useRole();
  const { navigateTo } = useVoiceNav(); // Use context instead of props
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isEnabledRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || (window as any).webkitRecognition;

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
    };

    recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const text = event.results[lastIndex][0].transcript.toLowerCase();
      
      console.log("Voice Command Heard:", text);

      // --- NAVIGATION LOGIC ---
      if (text.includes("take") || text.includes("show") || text.includes("go to")) {
        if (text.includes("dashboard") || text.includes("home")) {
          navigateTo("dashboard");
        } 
        else if (role === "EXPORTER" && (text.includes("batch") || text.includes("submission") || text.includes("upload"))) {
          navigateTo("batch-submission");
        } 
        else if (role === "QA_AGENCY" && (text.includes("inspection") || text.includes("request"))) {
          navigateTo("inspection-requests");
        } 
        else if (text.includes("passport") || text.includes("credential")) {
          navigateTo("digital-passports");
        } 
        else if (text.includes("verify") || text.includes("inji")) {
          navigateTo("inji-verify");
        } 
        else if (role === "ADMIN" && (text.includes("audit") || text.includes("log") || text.includes("history"))) {
          navigateTo("audit-logs");
        }
      }

      // --- ACTION LOGIC (Internal Component State) ---
      else if (text.includes("create") || text.includes("make") || text.includes("new")) {
        // If they say "Create new", we ensure they are on the page AND show the form
        navigateTo("form"); 
      }
      
      else if (text.includes("view list") || text.includes("show list") || text.includes("back to list")) {
        navigateTo("list");
      }
    };

    recognition.onerror = (err: any) => {
      if (err.error === "aborted") return;
      console.error("Speech Recognition Error:", err.error);
    };

    recognition.onend = () => {
      if (isEnabledRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.error("Restart failed:", e);
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
  }, [role, navigateTo]); // Added dependencies

  const toggleMic = () => {
    if (isEnabledRef.current) {
      isEnabledRef.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
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