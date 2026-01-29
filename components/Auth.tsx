
import React, { useState } from 'react';
import { User } from '../types';

import { authFirebase } from '../services/authFirebase';

interface AuthProps {
    onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    const handleAuth = async () => {
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Vui lòng nhập Email và Mật khẩu');
            setLoading(false);
            return;
        }

        try {
            // DEBUG: Alert to track progress online
            console.log("Starting Auth...");

            // Timeout Promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Request timed out (15s)")), 15000)
            );

            let user: User;
            if (isRegistering) {
                if (!username || !phone) {
                    setError('Vui lòng nhập đầy đủ Tên và SĐT');
                    setLoading(false);
                    return;
                }
                if (password !== confirmPassword) {
                    setError('Mật khẩu nhập lại không khớp');
                    setLoading(false);
                    return;
                }

                // Race between Register and Timeout
                user = await Promise.race([
                    authFirebase.registerUser(email, password, username, phone),
                    timeoutPromise
                ]) as User;
            } else {
                // Race between Login and Timeout
                user = await Promise.race([
                    authFirebase.loginUser(email, password),
                    timeoutPromise
                ]) as User;
            }

            console.log("Auth Success:", user);
            onLogin(user);
        } catch (err: any) {
            console.error(err);
            if (err.message.includes("timed out")) {
                setError("Mạng quá chậm hoặc bị chặn. Vui lòng thử lại!");
                alert("Lỗi: Quá thời gian chờ (Timeout). Kiểm tra kết nối mạng.");
            } else if (err.code === 'auth/email-already-in-use') {
                setError('Email này đã được sử dụng.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Địa chỉ Email không hợp lệ (Ví dụ: ten@gmail.com).');
            } else if (err.code === 'auth/invalid-credential' || err.message.includes('Invalid login credentials')) {
                setError('Sai email hoặc mật khẩu.');
            } else if (err.code === 'auth/weak-password') {
                setError('Mật khẩu quá yếu (cần ít nhất 6 ký tự).');
            } else {
                setError('Lỗi: ' + (err.message || "Không xác định"));
                alert("Lỗi chi tiết: " + err.message);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl w-full max-w-md border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isRegistering ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
                </h2>

                <div className="space-y-4">
                    {isRegistering && (
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Tên hiển thị</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {isRegistering && (
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Số điện thoại</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {isRegistering && (
                        <div>
                            <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Nhập lại mật khẩu</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <button
                        onClick={handleAuth}
                        disabled={loading}
                        className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors mt-4 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Đang xử lý...' : (isRegistering ? 'Đăng Ký' : 'Đăng Nhập')}
                    </button>

                    <p className="text-center text-slate-400 text-sm mt-4 cursor-pointer hover:text-white" onClick={() => setIsRegistering(!isRegistering)}>
                        {isRegistering ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký mới'}
                    </p>
                    <div className="mt-6 pt-4 border-t border-white/5 text-center">
                        <span className="text-[10px] uppercase font-black tracking-widest text-orange-500/50">
                            System: Firebase V2 (Fast) + Supabase Storage
                        </span>
                    </div>
                </div>

                {/* TROUBLESHOOT: Reset Data Button */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-slate-500 text-xs mb-3">Gặp sự cố đăng nhập?</p>
                    <button
                        onClick={() => {
                            if (window.confirm("Thao tác này sẽ xóa toàn bộ dữ liệu tạm (Cache/Storage) và tải lại trang. Bạn có chắc chắn?")) {
                                localStorage.clear();
                                sessionStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="text-xs font-bold text-slate-400 hover:text-red-400 uppercase tracking-wider underline decoration-slate-700 hover:decoration-red-400 underline-offset-4 transition-all"
                    >
                        Xóa Cache & Tải Lại App
                    </button>
                    <div className="mt-2 text-[10px] text-slate-600">
                        Sử dụng khi bị lỗi "Timeout" hoặc treo logo
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Auth;
