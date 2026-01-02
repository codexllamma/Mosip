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
           // Cookie format is usually /auto/en or /en/es
           // We just want the last 2 chars
           const target = langCode.substring(langCode.length - 2);
           setCurrentLang(target);
        }
      }
    }
  }, []);

  
  // 2. The DOM Assassin (Removes the iframe banner AFTER translation is ready)
  useEffect(() => {
    // Add global styles to hide the banner
    const styleId = 'google-translate-banner-hide';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        body {
          top: 0 !important;
          position: static !important;
        }
        .goog-te-banner-frame {
          display: none !important;
          visibility: hidden !important;
        }
        iframe.goog-te-banner-frame {
          display: none !important;
        }
        iframe.skiptranslate {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);


  // 3. Initialize Script
  useEffect(() => {
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: LANGUAGES.map((l) => l.code).join(","),
            autoDisplay: false,
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

  // 4. Change Language Helper
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
    <div className="relative z-50" ref={wrapperRef}>
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

      {/* THE ACTUAL GOOGLE WIDGET CONTAINER 
         We hide it with visibility: hidden to keep it in DOM but invisible.
         We position it absolutely to prevent layout shift.
      */}
      <div 
        id="google_translate_element" 
        className="absolute top-0 left-0 w-px h-px overflow-hidden opacity-0 pointer-events-none"
        style={{ visibility: 'hidden' }}
      ></div>

      {/* FORCEFUL CSS OVERRIDES */}
      <style>{`
        /* Hide the top banner iframe */
        .goog-te-banner-frame {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
        }
        
        /* Prevent body shift */
        body {
            top: 0px !important;
            position: static !important;
        }

        /* Hide the Google widget container if it tries to show */
        .goog-te-gadget {
            display: none !important;
            height: 0 !important;
            overflow: hidden !important;
        }

        /* Hide the tooltips */
        .goog-tooltip {
            display: none !important;
        }
        .goog-tooltip:hover {
            display: none !important;
        }
        
        /* Hide the 'Original Text' popup */
        #goog-gt-tt {
            display: none !important;
            visibility: hidden !important;
        }
        
        /* Remove the highlight on translated text */
        .goog-text-highlight {
            background-color: transparent !important;
            border: none !important; 
            box-shadow: none !important;
        }

        /* Hide the "Powered by Google" branding */
        .goog-logo-link {
            display: none !important;
        }
        .goog-te-gadget {
            color: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleTranslate;