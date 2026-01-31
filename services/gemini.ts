import { GoogleGenerativeAI } from "@google/generative-ai";
import { Idea, CharacterProfile, ActionDetail } from "../types";
import { handleGeminiError } from "../utils/geminiErrorUtils";

// --- GLOBAL CONFIG ---

// Priority: Flash Latest -> Flash -> Lite -> Pro
// We can use a different list for text-heavy tasks vs lightweight.
const MODEL_FALLBACKS = [
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite-001',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
];

// Support legacy global setter
let globalApiKeys: string[] = [];
export const setGeminiKeys = (keys: string[]) => {
  globalApiKeys = keys.filter(k => k.trim() !== '');
};

// --- HELPERS ---

const resolveKeys = (input?: string): string[] => {
  let keys: string[] = [];

  // 1. User Input Keys (Split by newline or comma)
  if (input) {
    keys = input.split(/[\n,]+/).map(k => k.trim()).filter(k => k);
  }

  // 2. Environment Keys (Split by comma)
  const envKeyStr = process.env.API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKeyStr) {
    const envKeys = envKeyStr.split(',').map((k: string) => k.trim()).filter((k: string) => k);
    keys = [...keys, ...envKeys];
  }

  // 3. Global Runtime Keys (Legacy)
  if (globalApiKeys.length > 0) {
    keys = [...keys, ...globalApiKeys];
  }

  // Deduplicate
  return [...new Set(keys)];
};

/**
 * Executes a Generative AI operation with robust fallback:
 * 1. Rotates through ALL provided API Keys.
 * 2. For each Key, rotates through ALL available Models.
 */
const generateWithFallback = async <T>(
  apiKeyInput: string | undefined,
  operation: (model: any) => Promise<T>
): Promise<T> => {
  // Resolve ALL available keys
  const keys = resolveKeys(apiKeyInput);

  if (keys.length === 0) throw new Error("No API Keys provided. Please configure VITE_GEMINI_API_KEY or enter a key.");

  let lastError: any;

  // KEY ROTATION LOOP
  for (const key of keys) {
    const genAI = new GoogleGenerativeAI(key);

    // MODEL ROTATION LOOP
    for (const modelName of MODEL_FALLBACKS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        // Attempt operation
        return await operation(model);
      } catch (err: any) {
        // Log warning but continue
        console.warn(`Failed: Key(...${key.slice(-4)}) Model(${modelName}) error: ${err.message}`);
        lastError = err;

        // If we want to strictly stop on non-quota errors, we could check here.
        // But for "Quota Exceeded" (429) or "Model Not Found" (404), we MUST continue.
        // We generally continue on all errors to be safe.
      }
    }
  }

  // If we reach here, ALL keys and models failed.
  throw lastError || new Error("All keys and models failed to generate content.");
};

// --- EXPORTED FUNCTIONS ---

export const analyzeOpponentScript = async (script: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Đọc toàn bộ "Kịch bản đối thủ" sau và phân tích theo quy tắc:
        Kịch bản: """${script}"""

        Mục tiêu: Rút ra khung xương cấu trúc cảm xúc (Hook, Build-up, Value/Twist, CTA).
        
        Yêu cầu:
        1. Xác định ranh giới phần theo chức năng cảm xúc.
        2. Với từng phần mô tả: Nội dung chính, Cảm xúc chủ đạo, Cách truyền tải cảm xúc, Lý do hiệu quả.
        3. Rút ra: 3 yếu tố cốt lõi, Đặc điểm ngôn ngữ & tiết tấu (5-8 điểm), 3 pattern cảm xúc.
        
        Ràng buộc: Không thêm nhân vật/bối cảnh ngoài script. Không đánh giá cảm tính. 
        KẾT THÚC BẰNG MỘT ĐOẠN RIÊNG BIỆT CÓ TIÊU ĐỀ "PHONG CÁCH ĐỐI THỦ" liệt kê các đặc điểm phong cách để bước sau sử dụng.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const generateIdeas = async (skeleton: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Dựa trên kết quả phân tích khung xương sau:
        """${skeleton}"""
        
        Nhiệm vụ: Sáng tạo ra 5 ý tưởng nội dung video mới, giữ nguyên "linh hồn cảm xúc" của kịch bản gốc.
        
        Mỗi ý tưởng gồm:
        - Tiêu đề ngắn
        - Mô tả nội dung (3-5 câu)
        - Nhân vật/Bối cảnh
        - Giá trị nổi bật (Cảm xúc/Thực tiễn)
        - Khả năng lan truyền

        Response must be a valid JSON array matching the schema:
        [{ "id": number, "title": string, "description": string, "charactersContext": string, "highlightValue": string, "viralPotential": string }]
      `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text()) as Idea[];
  });
};

export const buildOutline = async (skeleton: string, idea: Idea, targetCount: number, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Xây dựng dàn ý chi tiết dựa trên:
        - Khung xương gốc: """${skeleton}"""
        - Ý tưởng chọn: """${JSON.stringify(idea)}"""
        - Tổng số từ mục tiêu: ${targetCount}

        Cấu trúc: Giữ nguyên form gốc (Hook -> Build-up -> Value/Twist -> CTA).
        Yêu cầu: Với mỗi phần nêu rõ: Mục tiêu, Cảm xúc chính, Nội dung triển khai, Liên kết trước-sau, Số từ phân bổ.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const writeFinalScript = async (outline: string, style: string, targetLanguage: string = 'VN', apiKey?: string) => {
  const langMap: Record<string, string> = {
    'VN': 'Vietnamese',
    'EN': 'English',
    'JA': 'Japanese',
    'KO': 'Korean',
    'ZH': 'Chinese'
  };
  const langName = langMap[targetLanguage] || targetLanguage;

  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Viết lời thoại kịch bản hoàn chỉnh (voice-ready) dựa trên dàn ý và phong cách sau:
        - Dàn ý: """${outline}"""
        - Phong cách mô phỏng: """${style}"""

        NGÔN NGỮ ĐẦU RA BẮT BUỘC: ${langName}.
        Toàn bộ nội dung kịch bản phải được viết bằng ${langName}.

        QUY TẮC NGHIÊM NGẶT:
        1. Chỉ trả về lời thoại sạch 100%. Không tiêu đề, không chú thích, không ngoặc ( ), không nhạc nền.
        2. Viết liền mạch theo thứ tự Hook -> Build-up -> Value/Twist -> CTA.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
};

export const recommendStyle = async (script: string, availableStyles: string[], apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Dựa trên kịch bản video sau:
        """${script}"""
        
        Hãy chọn ra 1 phong cách hình ảnh phù hợp nhất từ danh sách sau:
        ${availableStyles.join(", ")}
        
        Chỉ trả về duy nhất tên ID của phong cách đó, không giải thích gì thêm.
      `;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });
};

export const designCharacters = async (script: string, style: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
        Dựa trên kịch bản sau và phong cách hình ảnh [${style}]:
        Kịch bản: """${script}"""
        
        Hãy thiết kế chi tiết các nhân vật xuất hiện trong kịch bản. Nếu kịch bản không mô tả rõ, hãy tự sáng tạo chi tiết để đảm bảo tính thẩm mỹ và đồng bộ.
        
        QUY TẮC BẮT BUỘC: 
        1. Phần "bodyType" (Dáng người): Ghi CỰC KỲ NGẮN GỌN (ví dụ: "Cao gầy", "Mập mạp", "Cân đối", "Vạm vỡ").
        2. Phần "facialDetails" (Đặc điểm khuôn mặt): 
           - Nếu kịch bản thiếu, hãy tự thêm cho đầy đủ nhưng phải MÔ TẢ GỌN GÀNG, KHÔNG LẰNG NHẰNG, KHÔNG VĂN HOA. 
           - CHỈ ĐƯỢC MÔ TẢ TRẠNG THÁI BÌNH THƯỜNG/TRUNG TÍNH (Neutral expression).
           - TUYỆT ĐỐI KHÔNG đưa vào cảm xúc hay tình huống cụ thể (ví dụ: KHÔNG ghi "đang khóc", "mặt lấm lem", "cười nham hiểm"). Chỉ mô tả cấu trúc vật lý (mắt, mũi, miệng, da, tóc...).

        Trả về định dạng JSON mảng các đối tượng:
        - name: Tên nhân vật
        - gender: Giới tính
        - country: Quốc gia/Chủng tộc
        - age: Độ tuổi
        - bodyType: Dáng người (ngắn gọn nhất có thể)
        - facialDetails: Đặc điểm chi tiết khuôn mặt (cấu trúc vật lý, gọn gàng, không cảm xúc)
      `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text()) as CharacterProfile[];
  });
};

export const analyzeActionsForTag = async (tagContent: string, style: string, characters: CharacterProfile[], targetLanguage: string = 'VN', apiKey?: string) => {
  const langMap: Record<string, string> = {
    'VN': 'Vietnamese',
    'EN': 'English',
    'JA': 'Japanese',
    'KO': 'Korean',
    'ZH': 'Chinese'
  };
  const langName = langMap[targetLanguage] || targetLanguage;

  return generateWithFallback(apiKey, async (model) => {
    const charDetailsStr = characters.map(c =>
      `[Nhân vật: ${c.name} | Giới tính: ${c.gender} | Quốc gia: ${c.country} | Tuổi: ${c.age} | Dáng người: ${c.bodyType} | Khuôn mặt: ${c.facialDetails}]`
    ).join('\n');

    const prompt = `
        Bạn là một CHUYÊN GIA PHÂN TÍCH TÌNH HUỐNG và đạo diễn hình ảnh đại tài.
        Nhiệm vụ: Phân tích kịch bản sau để trích xuất các hành động quay (Shot Action).

        Kịch bản: """${tagContent}"""
        
        NGÔN NGỮ ĐẦU RA BẮT BUỘC cho nội dung text (Action, VoiceText): ${langName}.

        QUY TẮC PHÂN LOẠI NỘI DUNG (CỰC KỲ QUAN TRỌNG):
        1. "Master Transcript" (voiceText): CHỈ CHỨA LỜI THOẠI CỦA NHÂN VẬT (Dialogue) mà nhân vật thực sự nói ra (trực tiếp). Phải dịch sang ${langName}.
        2. "Shot Execution" (action): Chứa mô tả hành động (Visual Action) VÀ lời dẫn chuyện (Narrator/Voiceover) VÀ các âm thanh nền/hành động không lời. Phải dịch sang ${langName}.

        THÔNG TIN NHÂN VẬT GỐC (BẮT BUỘC PHẢI SAO CHÉP CHÍNH XÁC KHI NHẮC ĐẾN):
        ${charDetailsStr}

        NGUYÊN TẮC PHÂN TÍCH TÌNH HUỐNG (SITUATIONAL ANALYSIS):
        1. QUAN SÁT NGỮ CẢNH: Dựa vào nội dung liền trước (nếu có) và liền sau của mỗi hành động, hãy suy luận logic xem nhân vật nào ĐANG CÓ MẶT trong cảnh đó.
        2. DỰ ĐOÁN NHÂN VẬT: Nếu kịch bản không nhắc tên nhưng logic tình huống cho thấy nhân vật đó phải ở đó (ví dụ: đang đối thoại, đang đứng cạnh), BẮT BUỘC phải đưa họ vào.
        3. HIỂN THỊ TRONG 'ACTION': Trong trường 'action' (Mô tả ngắn hành động), hãy liệt kê tên các nhân vật có mặt đầu tiên đặt trong dấu ngoặc ĐƠN ( ), ví dụ: (Nam, Lan): ..., sau đó đến mô tả hành động.

        QUY TẮC TẠO PROMPT (Strict Compliance - Rules Override All):

        1. [VISUAL STYLE]: Luôn bắt đầu bằng phong cách: [${style}].

        2. [Bối cảnh] (Context Memory):
           - Nếu kịch bản không nêu rõ, hãy thêm chi tiết (bàn ghế, đồ vật, bố cục...).
           - QUAN TRỌNG: Ghi nhớ bối cảnh. Nếu chưa đổi cảnh, DÙNG LẠI mô tả bối cảnh cũ. Nếu đổi cảnh, thiết lập bối cảnh mới chi tiết và ghi nhớ cho các shot sau.

        3. [QUY TẮC] (Safety & Quality):
           - Luôn thêm vào prompt: [NO duplication, NO mutation, NO anatomical distortion, Any violation of anatomy rules is forbidden]

        4. [CAMERA]: Góc máy, chuyển động máy (Cinematic wording).

        5. [ACTION] (Character Consistency):
           - Khi nhắc đến nhân vật nào, BẮT BUỘC COPY NGUYÊN VĂN "Đặc điểm nhân vật" (Giới tính, Tuổi, Dáng, Khuôn mặt) từ thông tin gốc vào prompt.
           - TUYỆT ĐỐI KHÔNG ghi tắt, KHÔNG tóm tắt, KHÔNG dùng "như trên". Phải copy full.
           - Nếu shot có nhân vật khác, cũng copy full đặc điểm của họ vào.

        6. [Trang Phục] (Costume Memory):
           - Nếu kịch bản không nêu, tự thêm và ghi rõ màu sắc.
           - QUAN TRỌNG: Giữ nguyên trang phục xuyên suốt các shot nếu chưa đổi thời gian/cảnh.

        7. [AUDIO/VOICE – LIP SYNC]:
           - Cấu trúc: [Tên nhân vật nói: "Lời thoại trong Master Transcript"] (CHỈ LỜI THOẠI TRỰC TIẾP).
           - Lời dẫn chuyện (Narrator) phải đưa vào phần ACTION, KHÔNG đưa vào đây.

        8. [SPEECH SYNC]:
           - Nếu có lời thoại ở mục trên, BẮT BUỘC ghi tag: [Chuyển động miệng nhân vật đồng bộ với lời thoại].

        9. [TECHNICAL]: Ánh sáng, màu sắc (Lighting, Color).

        10. [SỐ LƯỢNG NHÂN VẬT]:
           - Nếu trong cảnh (Shot) chỉ có DUY NHẤT 1 nhân vật xuất hiện, BẮT BUỘC thêm câu lệnh này vào cuối phần ACTION: "The scene contains EXACTLY ONE character".
           - Nếu có từ 2 nhân vật trở lên, KHÔNG ĐƯỢC thêm câu này.

        CẤU TRÚC PROMPT VIDEO (Video Motion Ai Prompt - Output String):
        [${style}], [Bối cảnh chi tiết], [NO duplication, NO mutation, NO anatomical distortion, Any violation of anatomy rules is forbidden], [CAMERA], [ACTION: Tên NV + (Đặc điểm Full Copy) + Hành động. (Thêm 'The scene contains EXACTLY ONE character' nến chỉ có 1 NV)], [Trang phục], [AUDIO/VOICE – LIP SYNC], [SPEECH SYNC], [TECHNICAL]

        TRẢ VỀ JSON Array các object:
        - action: (Tên các NV có mặt): [Mô tả hành động]
        - voiceText: Lời thoại (nếu có - KHÔNG BAO GỒM NARRATOR)
        - motionPrompt: Prompt video (Tuân thủ cấu trúc trên)
      `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text()) as ActionDetail[];
  });
};

export const analyzeImageStyle = async (imageBase64: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
      Hãy phân tích phong cách nghệ thuật (Art Style) của bức ảnh này để tôi có thể DỰNG LẠI (Recreate) một bức ảnh khác có cùng không khí.
      
      Tập trung sâu vào 4 yếu tố sau (Bỏ qua text, logo, chi tiết không liên quan):
      1. **Bối cảnh/Dựng cảnh (Scene Composition)**: Bố cục, hậu cảnh, góc máy đặc trưng.
      2. **Nhân vật (Character Design)**: Phong cách vẽ/chụp nhân vật (thực tế, anime, 3D, sơn dầu...), tỉ lệ cơ thể, biểu cảm đặc trưng.
      3. **Ánh sáng (Lighting)**: Nguồn sáng, độ tương phản (contrast), shadow.
      4. **Màu sắc (Color Palette)**: Tone màu chủ đạo, các màu điểm nhấn, bộ lọc màu (filter).
      
      Kết quả trả về một đoạn văn mô tả chi tiết nhưng súc tích (tiếng Việt), giúp họa sĩ hoặc AI khác có thể hình dung và vẽ lại được style này.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: "image/jpeg",
        },
      },
    ]);
    return result.response.text();
  });
};

export const generateViralTitle = async (script: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
      CONTEXT: You are a World-Class YouTube Strategist. You know exactly what makes people click.
      INPUT SCRIPT: """${script.substring(0, 5000)}"""
      
      TASK: Generate THE SINGLE BEST viral title for this video.
      
      RULES:
      1. **DETECT LANGUAGE**: Output the title in the SAME LANGUAGE as the input script. 
      2. **STYLE**: Click-worthy, high curiosity, emotional hook, or "Blue Ocean" style.
      3. **FORMAT**: Return ONLY the raw title text. No quotes, no "Here is the title:", no breakdown.
      4. **LENGTH**: Short, punchy (under 60 characters preferred).
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  });
};

export const generateDescriptionAndHashtags = async (script: string, title: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
      CONTEXT: You are an SEO Expert for Video Content.
      INPUT SCRIPT: """${script.substring(0, 5000)}"""
      INPUT TITLE: "${title}"
      
      TASK: Create a concise description and hashtags.
      
      RULES:
      1. **LANGUAGE**: Same as the script.
      2. **DESCRIPTION**: 2-3 sentences. Concise, summarized, teasing the content without giving everything away. Include SEO keywords naturally.
      3. **HASHTAGS**: Exactly 4 relevant, high-traffic hashtags.
      
      OUTPUT FORMAT (JSON):
      {
        "text": "The concise description text...",
        "hashtags": ["tag1", "tag2", "tag3", "tag4"]
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text());
  });
};

export const generateThumbnailLayout = async (script: string, title: string, styleAnalysis: string, apiKey?: string) => {
  return generateWithFallback(apiKey, async (model) => {
    const prompt = `
      CONTEXT: You are a Professional Thumbnail Designer.
      INPUT SCRIPT: """${script.substring(0, 3000)}"""
      INPUT TITLE: "${title}"
      STYLE GUIDE: """${styleAnalysis}"""
      
      TASK: 
      1. Split the TITLE into exactly 4 meaningful lines (semantic split).
         - If title is short, spread it out or repeat key keywords for impact.
         - Ensure lines are roughly balanced to fill the left side of the screen.
      
      2. Write a highly detailed Visual Prompt (STRICTLY IN ENGLISH) for an AI Image Generator to create the BACKGROUND.
         - **CRITICAL**: The prompt MUST be in English, even if the Input Script is in Japanese/Vietnamese.
         - **CONTENT**: Describe the SCENE details from the [INPUT SCRIPT]. Do not just describe abstract concepts. If the script is about "Money/Tax", show "A dramatic pile of japanese yen notes burning" or "A stressed family looking at financial documents". Make it concrete.
         - **COMPOSITION RULE**: The main subject/action MUST be positioned on the **RIGHT 30%** of the frame. The **LEFT 70%** must be relatively empty/dark or have negative space.
         - STYLE: Incorporate elements from the [STYLE GUIDE] (Lighting, Colors, Mood).
         - QUALITY: 8k resolution, cinematic lighting, hyper-realistic (unless style says otherwise).
         - NO TEXT in the image prompt.
      
      OUTPUT FORMAT (JSON):
      {
        "lines": ["Line 1", "Line 2", "Line 3", "Line 4"],
        "backgroundPrompt": "detailed english description..."
      }
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(result.response.text());
  });
};
