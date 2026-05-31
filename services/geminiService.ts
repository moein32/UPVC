/// <reference types="vite/client" />
import { GoogleGenAI } from "@google/genai";
import { WindowConfig } from "../types";

/**
 * Generates optimization suggestions for UPVC window configurations using Gemini AI.
 * Follows the latest SDK standards for performance and compatibility.
 */
export const getOptimizationSuggestions = async (config: WindowConfig, brandName: string): Promise<string> => {
  try {
    // ------------------------------------------------------------------------
    // دریافت API Key از متغیرهای محیطی Vercel مبتی بر VITE_GOOGLE_API_KEY
    // ------------------------------------------------------------------------
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!apiKey) {
      console.warn("API Key is missing! Ensure VITE_GOOGLE_API_KEY is set in Vercel.");
      return "هوش مصنوعی NexWin فعال نیست. لطفاً متغیر VITE_GOOGLE_API_KEY را در پنل Vercel اضافه کنید.";
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      به عنوان یک مهندس ساختمان متخصص در پنجره های UPVC در سیستم NexWin عمل کن.
      این پیکربندی پنجره را تحلیل کن:
      - ابعاد: ${config.width}mm در ${config.height}mm
      - نوع بازشو: ${config.type}
      - پروفیل: ${brandName}
      - شناسه شیشه: ${config.glassId}

      لطفاً ۲ پیشنهاد کوتاه و لیست‌وار ارائه بده:
      ۱. یک پیشنهاد برای کاهش هزینه (مهندسی ارزش).
      ۲. یک پیشنهاد برای بهبود عایق‌بندی حرارتی (صرفه‌جویی انرژی).
      پاسخ را کاملاً به زبان فارسی و صمیمانه بنویس.
    `;

    // Using the recommended gemini-3-flash-preview model and generateContent pattern
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "پیشنهادی یافت نشد.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "هوش مصنوعی NexWin در حال حاضر در دسترس نیست. لطفا تنظیمات API_KEY را در پنل Vercel بررسی کنید.";
  }
};