import { GoogleGenAI } from "@google/genai";

export interface ScriptParams {
  companyName: string;
  hotline: string;
  style: string;
  duration: string;
  mediaData?: { mimeType: string; data: string }[];
  customApiKey?: string;
}

export async function generateVideoScript(params: ScriptParams) {
  const { companyName, hotline, style, duration, mediaData, customApiKey } = params;

  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please provide an API Key in settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Bạn là một chuyên gia marketing kỳ cựu trong ngành Xây dựng và Nội thất. 
    Hãy viết một kịch bản video quảng cáo hoàn chỉnh cho công ty: ${companyName}.
    Lĩnh vực: Thiết kế thi công xây dựng nhà trọn gói và Thiết kế thi công nội thất trọn gói.
    Thông tin liên hệ (Hotline): ${hotline}.
    Phong cách viết: ${style}.
    Thời lượng dự kiến: ${duration}.
    
    Yêu cầu quan trọng đối với tệp khách hàng xây dựng/nội thất:
    1. Tập trung tối đa vào nội dung LỜI BÌNH (Voiceover) để người dùng có thể copy trực tiếp vào các công cụ tạo giọng nói AI.
    2. ĐẶC BIỆT QUAN TRỌNG: Nếu có hình ảnh hoặc video đính kèm, kịch bản PHẢI dựa trên nội dung thực tế của các file đó. Ví dụ: Nếu ảnh là phòng khách hiện đại, lời bình phải mô tả về không gian phòng khách đó. Nếu video là cảnh thi công phần thô, lời bình phải nói về quy trình xây dựng thực tế đang diễn ra.
    3. Ngôn từ cần thể hiện sự TIN CẬY, TẬN TÂM, CHUYÊN NGHIỆP và SANG TRỌNG. Đánh vào tâm lý khách hàng muốn xây dựng tổ ấm bền vững và không gian sống đẳng cấp.
    4. Nhấn mạnh vào dịch vụ "TRỌN GÓI" - giúp khách hàng tiết kiệm thời gian, chi phí và an tâm tuyệt đối.
    5. Sử dụng chính xác tên công ty là "${companyName}" và hotline ${hotline} trong kịch bản. 
    6. LƯU Ý: "Đình Hiển" chỉ là tên của công cụ này, KHÔNG đưa tên "Đình Hiển" vào kịch bản trừ khi nó trùng với tên công ty được nhập ở trên.
    7. Không trình bày mô tả cảnh quay kỹ thuật rườm rà, chỉ tập trung vào "Nội dung lời thoại" hoàn chỉnh, sẵn sàng để đọc voice.
  `;

  const contents: any[] = [{ text: prompt }];
  
  if (mediaData && mediaData.length > 0) {
    mediaData.forEach(media => {
      contents.push({
        inlineData: {
          mimeType: media.mimeType,
          data: media.data
        }
      });
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts: contents },
  });

  return response.text;
}
