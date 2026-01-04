"use client";
import { useEffect, useState, useRef } from "react";
import { Languages, ChevronDown, Check } from "lucide-react";
import { useVoiceNav } from "@/contexts/VoiceContext";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const VOICE_LANG_MAP: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  mr: "mr-IN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

const LANGUAGES = [
  { label: "English", code: "en" },
  { label: "Hindi (हिंदी)", code: "hi" },
  { label: "Marathi (मराठी)", code: "mr" },
  { label: "Spanish (Español)", code: "es" },
  { label: "French (Français)", code: "fr" },
  { label: "German (Deutsch)", code: "de" },
  { label: "Tamil (தமிழ்)", code: "ta"},
];

const GoogleTranslate = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState("en");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { setVoiceLang } = useVoiceNav();

  // 1. Handle Cookies
  useEffect(() => {
    if (typeof document !== "undefined") {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; googtrans=`);
      if (parts.length === 2) {
        const langCode = parts.pop()?.split(";").shift();
        if (langCode) {
           const target = langCode.substring(langCode.length - 2);
           setCurrentLang(target);
        }
      }
    }
  }, []);

  // 2. Initialize Script
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: LANGUAGES.map((l) => l.code).join(","),
            autoDisplay: false,
            // layout: Vertical usually generates less UI clutter than the default banner
            layout: window.google.translate.TranslateElement.InlineLayout.VERTICAL, 
          },
          "google_translate_element"
        );
      }
    };

    const scriptId = "google-translate-script";
    if (!document.getElementById(scriptId)) {
      const addScript = document.createElement("script");
      addScript.id = scriptId;
      addScript.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      addScript.async = true;
      document.body.appendChild(addScript);
    } else if (window.google && window.google.translate) {
      window.googleTranslateElementInit();
    }
  }, []);

  // 3. Change Language Helper
  const changeLanguage = (langCode: string) => {
    const googleSelect = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (googleSelect) {
      googleSelect.value = langCode;
      googleSelect.dispatchEvent(new Event("change", { bubbles: true }));
      setCurrentLang(langCode);
      setVoiceLang(VOICE_LANG_MAP[langCode] || "en-US");
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-10000" ref={wrapperRef}>
      {/* Custom Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 border ${
          isOpen
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-white border-transparent hover:bg-slate-100 text-slate-600"
        }`}
      >
        <Languages className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:block">
          {LANGUAGES.find((l) => l.code === currentLang)?.label.split(" ")[0] || "English"}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Custom Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                currentLang === lang.code
                  ? "text-emerald-600 font-medium bg-emerald-50/50"
                  : "text-slate-600"
              }`}
            >
              {lang.label}
              {currentLang === lang.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}

      {/* THE ACTUAL GOOGLE WIDGET CONTAINER */}
      <div 
        id="google_translate_element" 
        className="absolute top-0 left-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
        style={{ visibility: 'hidden' }}
      ></div>

      {/* FORCEFUL CSS OVERRIDES */}
      <style>{`
        /* 1. Hide the Google Loading Spinner / Icon */
        .VIpgJd-ZVi9od-aZ2wEe-OiiCO, 
        .VIpgJd-ZVi9od-aZ2wEe-OiiCO-ti6hGc {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }

        /* 2. Hide the Top Banner Iframe (Aggressive) */
        iframe.goog-te-banner-frame {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
        }
        
        .goog-te-banner-frame {
            display: none !important;
        }
        
        /* 3. Reset Body Position (Prevent the top push) */
        body {
            top: 0px !important;
            margin-top: 0px !important;
            position: static !important;
        }

        /* 4. Hide the Google widget container */
        .goog-te-gadget {
            visibility: hidden !important;
            position: absolute !important;
            top: -9999px !important;
            height: 0 !important;
            overflow: hidden !important;
        }

        /* 5. Hide Tooltips and Popups */
        .goog-tooltip, 
        #goog-gt-tt, 
        .goog-te-balloon-frame {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* 6. Remove text highlight style */
        .goog-text-highlight {
            background-color: transparent !important;
            border: none !important; 
            box-shadow: none !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleTranslate;