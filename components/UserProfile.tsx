
import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface UserProfileProps {
    user: User;
    onUpdateUser: (updatedUser: User) => void;
    onClose: () => void;
    appNames?: Record<string, string>;
    onUpdateAppNames?: () => void;
}

import AdminUserManagement from './AdminUserManagement';
import AppConfigModal from './AppConfigModal';
import { authSupabase } from '../services/authSupabase';

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateUser, onClose, appNames = {}, onUpdateAppNames = () => { } }) => {
    const [email, setEmail] = useState(user.email || '');
    const [phone, setPhone] = useState(user.phone || '');
    const [password, setPassword] = useState(''); // Only used if user wants to change
    const [message, setMessage] = useState('');
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showAppConfig, setShowAppConfig] = useState(false);

    const handleSave = async () => {
        try {
            await authSupabase.updateProfile(user.id, {
                email,
                phone
            });
            // Update local state
            onUpdateUser({ ...user, email, phone });

            setMessage('Cập nhật thành công!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error(error);
            setMessage('Lỗi khi cập nhật!');
        }
    };

    if (showAdminPanel) {
        return <AdminUserManagement onClose={() => setShowAdminPanel(false)} />;
    }

    if (showAppConfig) {
        return (
            <AppConfigModal
                currentNames={appNames}
                onClose={() => setShowAppConfig(false)}
                onUpdate={onUpdateAppNames}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
            <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        Quản lý tài khoản
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Tên đăng nhập</p>
                            <p className="text-lg font-bold text-white">{user.username}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Vai trò</p>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'}`}>
                                {user.role}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Số điện thoại</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Đổi mật khẩu mới (Nếu cần)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Để trống nếu không đổi"
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm placeholder-slate-600"
                        />
                    </div>

                    {message && <div className="p-3 bg-emerald-500/10 text-emerald-400 text-sm font-bold rounded-lg text-center animate-in fade-in slide-in-from-top-2">{message}</div>}

                    <div className="pt-4 border-t border-white/5 flex justify-between gap-3 items-center">
                        {user.role === 'admin' ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowAdminPanel(true)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all uppercase tracking-wider flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                    Admin Panel
                                </button>
                                <button
                                    onClick={() => setShowAppConfig(true)}
                                    className="px-4 py-2 rounded-lg text-sm font-bold bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all uppercase tracking-wider flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Manage App Names
                                </button>
                            </div>
                        ) : <div></div>}

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Đóng
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 rounded-lg text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg active:scale-95"
                            >
                                Lưu Thay Đổi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
