
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
        mountedRef.current = true;
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
                setError('Email này đã được đăng ký. Vui lòng sử dụng Email khác hoặc đăng nhập.');
            } else if (err.message.includes("Tên hiển thị đã tồn tại")) {
                setError('Tên hiển thị này đã tồn tại. Vui lòng chọn tên khác.');
            } else if (err.message.includes("Số điện thoại đã được đăng ký")) {
                setError('Số điện thoại này đã được đăng ký. Vui lòng sử dụng số khác.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Địa chỉ Email không hợp lệ (Ví dụ: ten@gmail.com).');
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError('Tài khoản hoặc mật khẩu không chính xác.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Quá nhiều lần thử đăng nhập sai. Vui lòng thử lại sau ít phút.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.');
            } else if (err.code === 'auth/unauthorized-domain') {
                setError('Tên miền trang web chưa được cấp phép trong Firebase Auth (Authorized Domains).');
            } else {
                // Generic Error Translation
                let msg = err.message || "Lỗi không xác định";

                if (msg.includes("Missing or insufficient permissions")) {
                    msg = "Lỗi quyền truy cập hệ thống (Firestore). Vui lòng báo Admin kiểm tra Security Rules.";
                } else if (msg.includes("quota")) {
                    msg = "Hệ thống quá tải (Quota Exceeded).";
                } else if (msg.includes("internal")) {
                    msg = "Lỗi nội bộ hệ thống (Internal Error).";
                }

                setError('Lỗi: ' + msg);
                // Only alert for critical/unknown system errors to avoid spamming user
                if (!msg.includes("đã có người dùng") && !msg.includes("Email này đã được sử dụng")) {
                    alert("Thông báo từ hệ thống: " + msg);
                }
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

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase">Hoặc</span>
                        <div className="flex-grow border-t border-white/10"></div>
                    </div>

                    <button
                        onClick={async () => {
                            setError('');
                            setLoading(true);
                            try {
                                const user = await authFirebase.loginWithGoogle();
                                onLogin(user);
                            } catch (err: any) {
                                console.error(err);
                                if (err.code === 'auth/popup-closed-by-user') {
                                    setError('Bạn đã hủy đăng nhập Google.');
                                } else {
                                    setError('Lỗi đăng nhập Google: ' + err.message);
                                }
                            } finally {
                                if (mountedRef.current) setLoading(false);
                            }
                        }}
                        disabled={loading}
                        className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Tiếp tục với Google
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
