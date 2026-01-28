import React, { useState, useRef, useEffect } from 'react';
import { uploadImage } from '../services/supabase';

interface ImageUploadProps {
    currentImage?: string;
    onImageUploaded: (url: string) => void;
    onClear: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ currentImage, onImageUploaded, onClear }) => {
    const [preview, setPreview] = useState<string | null>(currentImage || null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPreview(currentImage || null);
    }, [currentImage]);

    // Handle global paste when container is focused or active
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.items) {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) handleUpload(blob);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const validateFile = (file: File): boolean => {
        if (!file.type.startsWith('image/')) {
            setError('Chỉ chấp nhận file hình ảnh (JPG, PNG, GIF, WEBP).');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) { // Increased to 5MB for Supabase
            setError('Dung lượng hình ảnh phải dưới 5MB.');
            return false;
        }
        return true;
    };

    const handleUpload = async (file: File) => {
        setError(null);
        if (!validateFile(file)) return;

        // Create preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setUploading(true);

        try {
            const url = await uploadImage(file, 'images');
            onImageUploaded(url);
            setUploading(false);
        } catch (err: any) {
            console.error("Upload error:", err);
            let msg = 'Có lỗi xảy ra khi tải ảnh lên.';
            if (err.message) msg = err.message;
            setError(msg);
            setUploading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <div className="space-y-3">
            <label className="block text-xs uppercase font-bold text-slate-400">Hình ảnh đại diện (Tối đa 5MB)</label>

            {preview ? (
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={preview} alt="Preview" className="w-full h-48 object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-xs font-bold"
                        >
                            Thay đổi
                        </button>
                        <button
                            onClick={() => { setPreview(null); onClear(); }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold"
                        >
                            Xóa
                        </button>
                    </div>
                    {uploading && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
                            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                            <span className="text-white text-xs font-bold mb-2">Đang tải lên Supabase...</span>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    ref={containerRef}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/50 hover:bg-slate-800 rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                    onClick={() => fileInputRef.current?.click()}
                    tabIndex={0}
                >
                    <svg className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <div>
                        <span className="text-indigo-400 font-bold text-sm">Upload File</span>
                        <span className="text-slate-500 text-sm"> hoặc kéo thả vào đây</span>
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                        Hỗ trợ Paste (Ctrl+V)
                    </div>
                </div>
            )}

            {error && (
                <div className="text-red-400 text-xs font-bold bg-red-400/10 p-2 rounded">
                    {error}
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};

export default ImageUpload;
