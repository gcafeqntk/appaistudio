
import React from 'react';

const NewToolApp: React.FC = () => {
    return (
        <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-10 bg-white rounded-3xl shadow-xl border border-dashed border-slate-300">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">New Application</h2>
            <p className="text-slate-500 text-center max-w-md">
                This is a placeholder for your future application. <br />
                You can start building your new features here within the <code>apps/NewToolApp.tsx</code> file.
            </p>
            <button className="mt-8 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all">
                Initialize Project
            </button>
        </div>
    );
};

export default NewToolApp;
