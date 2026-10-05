
import { GoogleGenAI, Type } from "@google/genai";
import { Order } from "../types";

// Always use named parameter for apiKey and obtain it directly from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getOrderInsights = async (orders: Order[]) => {
  const prompt = `
    Dưới đây là danh sách các đơn hàng nội thất của tôi. 
    Hãy phân tích tình hình kinh doanh, nhận xét về lợi nhuận và đưa ra 3 lời khuyên cụ thể để tối ưu hóa quy trình nhập hàng hoặc tăng doanh số.
    Dữ liệu: ${JSON.stringify(orders)}
    
    Hãy trả về dưới định dạng JSON với cấu trúc:
    {
      "summary": "Tóm tắt ngắn gọn",
      "profitAnalysis": "Phân tích lợi nhuận",
      "tips": ["Lời khuyên 1", "Lời khuyên 2", "Lời khuyên 3"]
    }
  `;

  try {
    // Directly use ai.models.generateContent with model name and prompt
    // Using gemini-3-pro-preview for complex reasoning task as it involves business analysis
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            profitAnalysis: { type: Type.STRING },
            tips: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "profitAnalysis", "tips"]
        }
      }
    });

    // Directly access the .text property from GenerateContentResponse
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};
