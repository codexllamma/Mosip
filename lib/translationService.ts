/**
 * Translation Service
 * Connects to local LibreTranslate instance with fail-safes.
 */

const LIBRE_URL = 'http://localhost:5000/translate';

export async function translateText(text: string, targetLang: string): Promise<string> {
  // 1. Skip if English or text is empty
  if (targetLang === 'en' || !text || text.trim() === "") return text;

  // 2. Setup a Timeout (3 seconds) to prevent the Dashboard from hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(LIBRE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: "en",
        target: targetLang,
        format: "text"
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Translation API responded with ${response.status}. Using fallback.`);
      return text;
    }

    const data = await response.json();
    return data.translatedText || text;

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error("Translation Service Timeout: LibreTranslate took too long.");
    } else {
      console.error("Translation Service Unreachable: Ensure Docker is running at port 5000.");
    }
    // Safety Fallback: Always return the original English text so the app doesn't crash
    return text;
  }
}

/**
 * Batch Translation
 * Translates an array of strings in one single API call for better performance.
 */
export async function translateBatch(texts: string[], targetLang: string): Promise<string[]> {
  if (targetLang === 'en' || texts.length === 0) return texts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s for batches

  try {
    const response = await fetch(LIBRE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: texts,
        source: "en",
        target: targetLang,
        format: "text"
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    
    if (Array.isArray(data.translatedText)) {
      return data.translatedText;
    }
    
    // If API returns a single string instead of array
    return [data.translatedText || texts[0]];

  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Batch Translation Failed. Using English fallbacks.");
    return texts;
  }
}