import { GoogleGenAI } from "@google/genai";
import { WindowConfig } from "../types";

// استفاده از import.meta.env به جای process.env برای رفع خطای Vercel
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenAI(apiKey);

export const getOptimizationSuggestions = async (config: WindowConfig, brandName: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      به عنوان یک مهندس ساختمان متخصص در پنجره های UPVC در سیستم NexWin عمل کن.
      این پیکربندی پنجره را تحلیل کن:
      - ابعاد: ${config.width}mm در ${config.height}mm
      - نوع بازشو: ${config.type}
      - پروفیل: ${brandName}
      - شیشه: ${config.glassType}

      لطفاً ۲ پیشنهاد کوتاه و لیست‌وار ارائه بده:
      ۱. یک پیشنهاد برای کاهش هزینه (مهندسی ارزش).
      ۲. یک پیشنهاد برای بهبود عایق‌بندی حرارتی (صرفه‌جویی انرژی).
      پاسخ را کاملاً به زبان فارسی و صمیمانه بنویس.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "هوش مصنوعی NexWin در حال حاضر در دسترس نیست. لطفا اتصال اینترنت خود را بررسی کنید.";
  }
};