"use client";
import { useEffect, useState } from "react";

// --- Types ---
declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

const GoogleTranslate = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Define the initialization function
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,es,fr,de,zh-CN",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element"
        );
      }
    };

    // 2. Check if script is already present (e.g., from a previous render)
    const scriptId = "google-translate-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      // If script exists, the global callback might not trigger again.
      // We manually ensure the init function runs if google is ready.
      if (window.google && window.google.translate) {
        window.googleTranslateElementInit();
      }
    } else {
      // 3. Inject script if it doesn't exist
      const addScript = document.createElement("script");
      addScript.id = scriptId;
      addScript.src =
        "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      addScript.async = true;
      document.body.appendChild(addScript);
    }
  }, []);

  // Avoid hydration mismatch by rendering null until client-side
  if (!mounted) return null;

  return (
    <div className="google-translate-container my-4">
      {/* Visual cue to debug if the script fails */}
      <div id="google_translate_element" style={{ minHeight: '40px' }}></div>
    </div>
  );
};

export default GoogleTranslate;