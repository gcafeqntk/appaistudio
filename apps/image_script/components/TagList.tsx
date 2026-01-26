
import React, { useRef, useState } from 'react';
import { ScriptTag } from '../../../types';
import TagItem, { TagItemRef } from './TagItem';

interface TagListProps {
    tags: ScriptTag[];
    style: string;
    apiKey: string;
}

const TagList: React.FC<TagListProps> = ({ tags, style, apiKey }) => {
    const tagRefs = useRef<(TagItemRef | null)[]>([]);
    const [isAutoProcessing, setIsAutoProcessing] = useState(false);

    const handleAutoAll = async () => {
        if (tags.length === 0) return;
        setIsAutoProcessing(true);
        try {
            for (let i = 0; i < tagRefs.current.length; i++) {
                const ref = tagRefs.current[i];
                if (ref) {
                    console.log(`Auto processing tag ${i + 1}/${tags.length}...`);
                    await ref.runAutoSequence();
                }
            }
            alert("Đã hoàn tất tự động hóa cho tất cả các TAG!");
        } catch (err) {
            console.error(err);
            alert("Quá trình tự động bị gián đoạn do lỗi.");
        } finally {
            setIsAutoProcessing(false);
        }
    };

    const handleCopyAllScripts = () => {
        const allRows: string[] = [];
        tagRefs.current.forEach(ref => {
            if (ref) {
                const rows = ref.getRows();
                const cleanedRows = rows
                    .map(r => r.trim())
                    .filter(r => r.length > 0)
                    // Loại bỏ xuống dòng bên trong nội dung hàng để bảo toàn số lượng hàng tuyệt đối
                    .map(r => r.replace(/\r?\n|\r/g, " "))
                    // Loại bỏ dấu ngoặc kép
                    .map(r => r.replace(/^["']+|["']+$/g, ''));
                allRows.push(...cleanedRows);
            }
        });

        if (allRows.length === 0) {
            alert("Không có kịch bản đã chia hàng để copy!");
            return;
        }

        navigator.clipboard.writeText(allRows.join('\n'));
        alert(`Đã copy chính xác ${allRows.length} hàng kịch bản!`);
    };

    const handleCopyAllPrompts = () => {
        const allPrompts: string[] = [];
        tagRefs.current.forEach(ref => {
            if (ref) {
                const prompts = ref.getPrompts();
                const cleanedPrompts = prompts
                    .map(p => p.trim())
                    .filter(p => p.length > 0)
                    .map(p => p.replace(/\r?\n|\r/g, " "))
                    .map(p => p.replace(/^["']+|["']+$/g, ''));
                allPrompts.push(...cleanedPrompts);
            }
        });

        if (allPrompts.length === 0) {
            alert("Không có prompt để copy!");
            return;
        }

        navigator.clipboard.writeText(allPrompts.join('\n'));
        alert(`Đã copy chính xác ${allPrompts.length} prompt!`);
    };

    if (tags.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4 p-12 bg-white rounded-3xl border border-gray-100 border-dashed">
                <svg className="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-lg font-medium">Chưa có kịch bản được chia</p>
                <p className="text-sm">Vui lòng nhập kịch bản và nhấn "Chia Kịch Bản" ở cột trái</p>
            </div>
        );
    }

    // Reset refs when tags change
    if (tagRefs.current.length !== tags.length) {
        tagRefs.current = new Array(tags.length).fill(null);
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Global Toolbar */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-100 rounded-2xl sticky top-4 z-10 shadow-sm border border-gray-200">
                <button
                    onClick={handleAutoAll}
                    disabled={isAutoProcessing}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isAutoProcessing ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-md active:scale-95'}`}
                >
                    {isAutoProcessing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Đang Tự Động...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Tự Động Hoàn Toàn
                        </>
                    )}
                </button>

                <button
                    onClick={handleCopyAllScripts}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Copy All Kịch Bản
                </button>

                <button
                    onClick={handleCopyAllPrompts}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Copy All Prompt Anh
                </button>
            </div>

            <div className="flex items-center gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Bảng Điều Khiển Tags</h2>
                <div className="h-px flex-grow bg-gray-100"></div>
                <span className="text-sm font-medium text-gray-400">{tags.length} TAGS SẴN SÀNG</span>
            </div>

            <div className="space-y-8">
                {tags.map((tag, idx) => (
                    <TagItem
                        key={tag.id}
                        tag={tag}
                        style={style}
                        index={idx}
                        apiKey={apiKey}
                        ref={el => (tagRefs.current[idx] = el)}
                    />
                ))}
            </div>
        </div>
    );
};

export default TagList;
