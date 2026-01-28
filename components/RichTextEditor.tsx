import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    className?: string;
}

export interface RichTextEditorHandle {
    insertText: (text: string) => void;
}

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(({ value, onChange, className = '' }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const selectionRef = useRef<Range | null>(null);

    // Initial value load
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            // Only update if significantly different to avoid cursor jumps on every keystroke
            // Simple check: if empty, or distinct. 
            // Better: only if not focused? But that prevents external updates.
            // For now, simple check is inherently risky in React + contentEditable, 
            // but we'll stick to the previous logic which was:
            if (value === '' && editorRef.current.innerHTML !== '') {
                editorRef.current.innerHTML = '';
            } else if (editorRef.current.innerHTML === '' && value) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    useImperativeHandle(ref, () => ({
        insertText: (text: string) => {
            restoreSelection();
            document.execCommand('insertText', false, text);
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
        if (sel && selectionRef.current) {
            sel.removeAllRanges();
            sel.addRange(selectionRef.current);
        } else {
            // Fallback: focus at end if no selection saved
            editorRef.current?.focus();
        }
    };

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleChange();
    };

    const handleChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
        saveSelection();
    };

    return (
        <div className={`border border-slate-700 rounded-lg overflow-hidden flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="bg-slate-800 border-b border-slate-700 p-2 flex gap-1 flex-wrap">
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('bold'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded font-bold" type="button" title="Bold">B</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('italic'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded italic" type="button" title="Italic">I</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('underline'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded underline" type="button" title="Underline">U</button>
                <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyLeft'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded" type="button" title="Align Left">⇠</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyCenter'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded" type="button" title="Align Center">↔</button>
                <button onMouseDown={(e) => { e.preventDefault(); execCmd('justifyRight'); }} className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded" type="button" title="Align Right">⇢</button>
                <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
                <button
                    onMouseDown={(e) => {
                        e.preventDefault();
                        const url = prompt('Nhập đường dẫn URL:');
                        if (url) execCmd('createLink', url);
                    }}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded text-blue-400"
                    type="button"
                    title="Link"
                >
                    Link
                </button>
                <select
                    onChange={(e) => execCmd('formatBlock', e.target.value)}
                    className="bg-slate-700 text-white text-xs rounded px-2 py-1 outline-none border border-slate-600"
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
