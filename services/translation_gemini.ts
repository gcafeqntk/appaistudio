
import { GoogleGenerativeAI } from "@google/generative-ai";
import { SubtitleItem, TargetLanguage } from "../types";
import { handleGeminiError } from "../utils/geminiErrorUtils";

export class TranslationService {
    private apiKeys: string[];

    constructor(apiKeys: string[]) {
        this.apiKeys = apiKeys;
    }

    private getModel() {
        if (this.apiKeys.length === 0) {
            throw new Error("No API Keys provided");
        }
        // Simple random rotation to distribute load
        const key = this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)];
        const genAI = new GoogleGenerativeAI(key);
        return genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    }

    async translateBatch(
        items: SubtitleItem[],
        lang: TargetLanguage,
        customPrompt: string,
        autoFix: boolean
    ): Promise<SubtitleItem[]> {
        const prompt = `
Bạn là một chuyên gia dịch thuật phim ảnh cao cấp từ ${lang === 'CHINESE' ? 'Tiếng Trung' : lang === 'JAPANESE' ? 'Tiếng Nhật' : 'Tiếng Hàn'} sang Tiếng Việt.
Nhiệm vụ: Dịch nội dung các phụ đề dưới đây sang Tiếng Việt.

Yêu cầu cụ thể:
1. ${customPrompt}
2. Giữ nguyên định dạng của từng mục (Index, Timecode).
3. CHỈ trả về bản dịch Tiếng Việt cho phần text của phụ đề. Không được bao gồm ngôn ngữ gốc.
4. KHÔNG giải thích, KHÔNG thêm lời dẫn.
5. Đảm bảo cấu trúc SRT chính xác:
Index
Timecode
Nội dung dịch

Dữ liệu đầu vào:
${items.map(item => `${item.index}\n${item.timecode}\n${item.text}`).join('\n\n')}
    `;

        try {
            const model = this.getModel();
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                }
            });

            const response = await result.response;
            const translatedText = response.text() || "";
            const translatedBlocks = translatedText.trim().split(/\n\s*\n/);

            // Map translations back to original structure to ensure timecodes are preserved
            return items.map((original, i) => {
                const translatedBlock = translatedBlocks[i];
                if (!translatedBlock) return { ...original, text: "[Lỗi dịch]" };

                const lines = translatedBlock.split('\n');
                // If the LLM returned full block, take the last part as text
                // Otherwise, it might have just returned the text
                const text = lines.length >= 3 ? lines.slice(2).join('\n').trim() : lines.join('\n').trim();

                return {
                    ...original,
                    text: text || original.text
                };
            });
        } catch (error) {
            console.error("Translation error:", error);
            handleGeminiError(error);
        }
    }
}
