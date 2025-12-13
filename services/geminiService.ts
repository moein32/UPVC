import { GoogleGenAI } from "@google/genai";
import { WindowConfig, ProfileBrand } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getOptimizationSuggestions = async (config: WindowConfig, brandName: string) => {
  try {
    const prompt = `
      به عنوان یک مهندس ساختمان متخصص در پنجره های UPVC عمل کن.
      این پیکربندی پنجره را تحلیل کن:
      - ابعاد: ${config.width}mm در ${config.height}mm
      - نوع بازشو: ${config.type}
      - پروفیل: ${brandName}
      - شیشه: ${config.glassType}

      لطفاً ۲ پیشنهاد کوتاه و لیست‌وار ارائه بده:
      ۱. یک پیشنهاد برای کاهش هزینه (مهندسی ارزش).
      ۲. یک پیشنهاد برای بهبود عایق‌بندی حرارتی (صرفه‌جویی انرژی).
      پاسخ را کاملاً به زبان فارسی و رسمی بنویس. از تیترهای مارک‌داون استفاده نکن.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "هوش مصنوعی در حال حاضر در دسترس نیست. لطفا اتصال اینترنت خود را بررسی کنید.";
  }
};