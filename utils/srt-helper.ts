
import { SubtitleItem } from '../types';

export const parseSRT = (content: string): SubtitleItem[] => {
    // Normalize line endings
    content = content.replace(/\r\n/g, '\n');
    const blocks = content.trim().split(/\n\s*\n/);
    return blocks.map(block => {
        const lines = block.split('\n');
        if (lines.length < 3) return { index: '', timecode: '', text: '' };

        const index = lines[0].trim();
        const timecode = lines[1].trim();
        const text = lines.slice(2).join('\n').trim();

        return { index, timecode, text };
    }).filter(item => item.index !== '');
};

export const generateSRT = (items: SubtitleItem[]): string => {
    return items.map(item => `${item.index}\n${item.timecode}\n${item.text}\n`).join('\n');
};

export const downloadAsSrt = (filename: string, content: string) => {
    // UTF-8 with BOM: EF BB BF
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, content], { type: 'text/srt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/\.(srt|txt)$/i, '') + '_VIET.srt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const cleanText = (text: string, lang: 'CHINESE' | 'JAPANESE' | 'KOREAN'): string => {
    // Simple regex to remove non-Vietnamese characters that might be hallucinations
    // Chinese: \u4e00-\u9fa5
    // Japanese: \u3040-\u30ff (Hiragana/Katakana), \u4e00-\u9faf (Kanji)
    // Korean: \uac00-\ud7af (Hangul)

    let regex: RegExp;
    switch (lang) {
        case 'CHINESE': regex = /[\u4e00-\u9fa5]/g; break;
        case 'JAPANESE': regex = /[\u3040-\u30ff\u4e00-\u9faf]/g; break;
        case 'KOREAN': regex = /[\uac00-\ud7af]/g; break;
        default: regex = /$/;
    }

    return text.replace(regex, '').trim();
};
