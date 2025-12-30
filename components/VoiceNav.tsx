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
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      isStartedRef.current = true;
    };

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript.toLowerCase();
      console.log("Voice Command Heard:", text);

      // Mapping voice keywords to your App's currentView state
      if (text.includes("dashboard") || text.includes("home")) {
        onNavigate("dashboard");
      } 
      else if (text.includes("batch") || text.includes("submission") || text.includes("upload")) {
        onNavigate("batch-submission");
      } 
      else if (text.includes("inspection") || text.includes("request")) {
        onNavigate("inspection-requests");
      } 
      else if (text.includes("passport") || text.includes("credential")) {
        onNavigate("digital-passports");
      } 
      else if (text.includes("verify") || text.includes("inji")) {
        onNavigate("inji-verify");
      } 
      else if (text.includes("audit") || text.includes("log") || text.includes("history")) {
        onNavigate("audit-logs");
      }
    };

    recognition.onerror = (err: any) => {
      console.error("Speech Recognition Error:", err.error);
      setIsListening(false);
      isStartedRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartedRef.current = false;
    };

    recognitionRef.current = recognition;
  }, [onNavigate]);

  const toggleMic = () => {
    if (isStartedRef.current) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Visual indicator shown only when listening */}
      {isListening && (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
      
      <button
        onClick={toggleMic}
        type="button"
        className={`p-2.5 rounded-full transition-all duration-300 border ${
          isListening 
            ? "bg-red-500 text-white border-red-600 shadow-lg scale-110" 
            : "bg-white text-slate-500 border-slate-200 hover:border-emerald-500 hover:text-emerald-600 hover:shadow-sm"
        }`}
        title={isListening ? "Listening..." : "Voice Navigation"}
      >
        <Mic size={18} strokeWidth={isListening ? 3 : 2} />
      </button>
    </div>
  );
}