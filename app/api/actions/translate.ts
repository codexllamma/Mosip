// app/actions/translate.ts
'use server'
import { translate } from 'google-translate-api-x';

export async function translateToEnglish(text: string) {
  try {
    const res = await translate(text, { to: 'en'});
    return res.text;
  } catch (e) {
    console.error("Translation Tunnel Error:", e);
    return text; // Fallback to original text if tunnel fails
  }
}