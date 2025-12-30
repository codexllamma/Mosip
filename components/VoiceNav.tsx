"use client";

import { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";

interface VoiceNavProps {
  onNavigate: (view: string) => void;
}

export default function VoiceNav({ onNavigate }: VoiceNavProps) {
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isStartedRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    
    // KEY CHANGE 1: Enable continuous listening
    recognition.continuous = true; 
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      // Get the last result index to handle continuous stream
      const lastIndex = event.results.length - 1;
      const text = event.results[lastIndex][0].transcript.toLowerCase();
      console.log("Voice Command Heard:", text);

      if (text.includes("dashboard") || text.includes("home")) {
        onNavigate("dashboard");
      } 
      else if (role == "EXPORTER" && (text.includes("batch") || text.includes("submission") || text.includes("upload"))) {
        onNavigate("batch-submission");
      } 
      else if (role == "QA_AGENCY" && (text.includes("inspection") || text.includes("request"))) {
        onNavigate("inspection-requests");
      } 
      else if (text.includes("passport") || text.includes("credential")) {
        onNavigate("digital-passports");
      } 
      else if (text.includes("verify") || text.includes("inji")) {
        onNavigate("inji-verify");
      } 
      else if (role == "ADMIN" &&(text.includes("audit") || text.includes("log") || text.includes("history"))) {
        onNavigate("audit-logs");
      }
    };

    recognition.onerror = (err: any) => {
      // Ignore 'aborted' error if we manually stopped it
      if (err.error === 'aborted') return;
      console.error("Speech Recognition Error:", err.error);
    };

    recognition.onend = () => {
      // KEY CHANGE 2: Auto-restart if the user hasn't explicitly turned it off
      // The browser often stops recognition after long silence or network hiccups
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

    // Cleanup on unmount
    return () => {
      isEnabledRef.current = false;
      recognition.stop();
    };
  }, [onNavigate]);

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