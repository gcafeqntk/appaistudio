import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { uploadImage } from '../services/supabase';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    className?: string;
}

export interface RichTextEditorHandle {
    insertText: (text: string) => void;
    insertHtml: (html: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ value, onChange, className = '' }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Range | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    // Initial value load
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            // Check if content is effectively different (ignoring simple cursor movements triggering updates)
            if (value === '' && editorRef.current.innerHTML !== '') {
                editorRef.current.innerHTML = '';
            } else if (editorRef.current.innerHTML === '' && value) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    useImperativeHandle(ref, () => ({
        insertText: (text: string) => {
            // Check if we already have focus, if so, DON'T restore old selection (it might be stale)
            if (document.activeElement === editorRef.current) {
                // We are focused, proceed directly
            } else {
                restoreSelection();
            }
            document.execCommand('insertText', false, text);
            handleChange();
        },
        insertHtml: (html: string) => {
            if (document.activeElement === editorRef.current) {
                // Focus exists
            } else {
                restoreSelection();
            }
            document.execCommand('insertHTML', false, html);
            handleChange();
        }
    }));

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
            selectionRef.current = sel.getRangeAt(0);
        }
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (!sel) return;

        // If selection is already in editor, do nothing
        if (sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
            return;
        }

        if (selectionRef.current && editorRef.current?.contains(selectionRef.current.commonAncestorContainer)) {
            sel.removeAllRanges();
            sel.addRange(selectionRef.current);
        } else {
            // Fallback: focus at end if no valid selection saved
            if (editorRef.current) {
                editorRef.current.focus();
                // Move cursor to the end
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false); // false = end
                sel.removeAllRanges();
                sel.addRange(range);

                // Save this new selection as the current valid one
                selectionRef.current = range;
            }
        }
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        // Ensure we have focus/selection before executing
        if (document.activeElement !== editorRef.current) {
            restoreSelection();
        }
        document.execCommand(command, false, value);
        handleChange();
    };

    const handleChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        saveSelection();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                // Store current selection before async upload
                saveSelection();

                const url = await uploadImage(file, 'images');

                // Restore selection after async
                restoreSelection();
                document.execCommand('insertHTML', false, `<img src="${url}" style="max-width:100%; border-radius: 8px;" />`);
                handleChange();
            } catch (err: any) {
                alert('Upload fail: ' + err.message);
            } finally {
                setUploading(false);
                // Reset input
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={`border border-slate-700 rounded-lg overflow-hidden flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="bg-slate-800 border-b border-slate-700 p-2 flex gap-1 flex-wrap items-center">
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded font-bold" type="button" title="Bold">B</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded italic" type="button" title="Italic">I</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded underline" type="button" title="Underline">U</button>
                <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded" type="button" title="Align Left">⇠</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded" type="button" title="Align Center">↔</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded" type="button" title="Align Right">⇢</button>
                <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
                {/* Link Button */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();

                        // Check if we are selecting an existing link to edit
                        let currentUrl = '';
                        let selection = window.getSelection();
                        let anchorNode = selection?.anchorNode;

                        // Traverse up to find 'A' tag
                        while (anchorNode && anchorNode.nodeName !== 'A' && anchorNode !== editorRef.current) {
                            anchorNode = anchorNode.parentNode;
                        }

                        if (anchorNode && anchorNode.nodeName === 'A') {
                            currentUrl = (anchorNode as HTMLAnchorElement).href;
                        }

                        const url = prompt('Nhập đường dẫn URL:', currentUrl);

                        if (url !== null) { // Only if user didn't cancel
                            restoreSelection();
                            if (url === '') {
                                document.execCommand('unlink');
                            } else {
                                document.execCommand('createLink', false, url);
                            }
                            handleChange();
                        }
                    }}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded text-blue-400"
                    type="button"
                    title="Chèn/Sửa Link"
                >
                    Link
                </button>
                {/* Image Button - File Upload */}
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                    }}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded text-emerald-400 flex items-center gap-1"
                    type="button"
                    title="Upload Ảnh (Chèn ngay)"
                >
                    {uploading ? '...' : (
                        <>
                            Img
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        </>
                    )}
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*"
                />

                <select
                    onChange={(e) => execCmd('formatBlock', e.target.value)}
                    className="bg-slate-700 text-white text-xs rounded px-2 py-1 outline-none border border-slate-600 ml-2"
                >
                    <option value="p">Normal</option>
                    <option value="h3">Heading 1</option>
                    <option value="h4">Heading 2</option>
                    <option value="blockquote">Quote</option>
                </select>
            </div>

            {/* Editable Area */}
            <div
                ref={editorRef}
                contentEditable
                onInput={handleChange}
                onBlur={saveSelection}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                className="flex-grow bg-slate-900 text-white p-4 outline-none min-h-[150px] overflow-auto prose prose-invert prose-sm max-w-none"
            />
        </div>
    );
});

export default RichTextEditor;
