
import { TargetLanguage, TranslationConfig } from '../types';

export const LANGUAGE_OPTIONS = [
    { id: 'CHINESE' as TargetLanguage, name: 'Tiếng Trung', icon: '🇨🇳' },
    { id: 'JAPANESE' as TargetLanguage, name: 'Tiếng Nhật', icon: '🇯🇵' },
    { id: 'KOREAN' as TargetLanguage, name: 'Tiếng Hàn', icon: '🇰🇷' },
];

export const DEFAULT_CONFIGS: Record<TargetLanguage, TranslationConfig> = {
    CHINESE: {
        batchSize: 50,
        delaySeconds: 1,
        customPrompt: 'Dịch sang tiếng Việt phong cách kiếm hiệp, xưng hô huynh-đệ, văn phong cổ trang, giữ nguyên các danh xưng đặc thù.',
        removeSourceText: true,
        autoFixFormat: true,
    },
    JAPANESE: {
        batchSize: 40,
        delaySeconds: 1.5,
        customPrompt: 'Dịch sang tiếng Việt phong cách Anime/Manga, giữ nguyên các hậu tố như -san, -kun, -sama nếu cần thiết, dịch sát nghĩa nhưng tự nhiên.',
        removeSourceText: true,
        autoFixFormat: true,
    },
    KOREAN: {
        batchSize: 45,
        delaySeconds: 1,
        customPrompt: 'Dịch sang tiếng Việt phong cách phim truyền hình Hàn Quốc (K-Drama), xưng hô Oppa/Unnie/Noona phù hợp ngữ cảnh, văn phong gần gũi.',
        removeSourceText: true,
        autoFixFormat: true,
    },
};
