
import React, { useState } from 'react';
import { analyzeImageStyle } from '../../../services/image_script_gemini';

interface SidebarProps {
    onStyleChange: (style: string) => void;
    onSplitScript: (script: string) => void;
    apiKey: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onStyleChange, onSplitScript, apiKey }) => {
    const [image, setImage] = useState<string | null>(null);
    const [styleDesc, setStyleDesc] = useState('');
    const [scriptInput, setScriptInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            setImage(reader.result as string);
            setIsAnalyzing(true);
            try {
                const result = await analyzeImageStyle(apiKey, base64);
                setStyleDesc(result);
                onStyleChange(result);
            } catch (err) {
                console.error(err);
                alert("Lỗi khi phân tích ảnh: " + (err instanceof Error ? err.message : String(err)));
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const splitLogic = () => {
        if (!scriptInput.trim()) return;
        onSplitScript(scriptInput);
    };

    return (
        <div className="flex flex-col h-full space-y-6 p-6 border-r border-gray-200 bg-white">
            <div className="space-y-2">
                <h2 className="text-xl font-bold text-indigo-700">HOT AI Visual Director</h2>
                <p className="text-xs text-gray-500 italic">Professional image direction & analysis</p>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">Tải ảnh phong cách</label>
                <div className="relative group">
                    <div className={`border-2 border-dashed rounded-xl p-4 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer ${image ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-500 hover:bg-gray-50'}`}>
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={handleImageUpload}
                            accept="image/*"
                        />
                        {image ? (
                            <img src={image} alt="Reference" className="w-full h-32 object-cover rounded-lg shadow-sm" />
                        ) : (
                            <div className="text-center">
                                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="mt-2 block text-xs font-medium text-gray-600">Click hoặc kéo thả ảnh vào đây</span>
                            </div>
                        )}
                    </div>
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                </div>
            </div>

            {/* Style Output */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Phong cách phân tích</label>
                <textarea
                    value={styleDesc}
                    onChange={(e) => {
                        setStyleDesc(e.target.value);
                        onStyleChange(e.target.value);
                    }}
                    className="w-full h-32 p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-gray-50"
                    placeholder="Đặc điểm phong cách sẽ hiện ở đây..."
                />
            </div>

            {/* Script Input Area */}
            <div className="flex-grow flex flex-col space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Nhập kịch bản</label>
                <textarea
                    value={scriptInput}
                    onChange={(e) => setScriptInput(e.target.value)}
                    className="flex-grow w-full p-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Dán kịch bản của bạn vào đây..."
                />
            </div>

            {/* Action Button */}
            <button
                onClick={splitLogic}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transform transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-indigo-200"
            >
                Chia Kịch Bản
            </button>

            <div className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
                © 2024 HOT AI Studio
            </div>
        </div>
    );
};

export default Sidebar;
