
import React, { useRef, useEffect } from 'react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, className = '' }) => {
    const editorRef = useRef<HTMLDivElement>(null);

    // Initial value load
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
        }
    }, []);

    const execCmd = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleChange();
    };

    const handleChange = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className={`border border-slate-700 rounded-lg overflow-hidden flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="bg-slate-800 border-b border-slate-700 p-2 flex gap-1 flex-wrap">
                <button
                    onClick={() => execCmd('bold')}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded font-bold"
                    type="button"
                    title="Bold"
                >
                    B
                </button>
                <button
                    onClick={() => execCmd('italic')}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded italic"
                    type="button"
                    title="Italic"
                >
                    I
                </button>
                <button
                    onClick={() => execCmd('underline')}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded underline"
                    type="button"
                    title="Underline"
                >
                    U
                </button>
                <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
                <button
                    onClick={() => execCmd('justifyLeft')}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded"
                    type="button"
                    title="Align Left"
                >
                    ⇠
                </button>
                <button
                    onClick={() => execCmd('justifyCenter')}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded"
                    type="button"
                    title="Align Center"
                >
                    ↔
                </button>
                <button
                    onClick={() => execCmd('justifyRight')}
                    className="p-1 px-2 text-slate-300 hover:bg-white/10 rounded"
                    type="button"
                    title="Align Right"
                >
                    ⇢
                </button>
                <div className="w-px h-6 bg-slate-600 mx-1 self-center"></div>
                <button
                    onClick={() => {
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
                className="flex-grow bg-slate-900 text-white p-4 outline-none min-h-[150px] overflow-auto prose prose-invert prose-sm max-w-none"
            />
        </div>
    );
};

export default RichTextEditor;
