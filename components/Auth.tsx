
import React, { useState } from 'react';
import { User } from '../types';

import { authService } from '../services/authService';

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

    const handleAuth = async () => {
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Vui lòng nhập Email và Mật khẩu');
            setLoading(false);
            return;
        }

        try {
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

                user = await authService.registerUser(email, password, username, phone);
            } else {
                user = await authService.loginUser(email, password);
            }
            onLogin(user);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Email này đã được sử dụng.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Địa chỉ Email không hợp lệ (Ví dụ: ten@gmail.com).');
            } else if (err.code === 'auth/invalid-credential') {
                setError('Email hoặc mật khẩu không đúng.');
            } else if (err.code === 'auth/weak-password') {
                setError('Mật khẩu quá yếu (cần ít nhất 6 ký tự).');
            } else {
                setError('Đã có lỗi xảy ra: ' + err.message);
            }
        } finally {
            setLoading(false);
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
                </div>
            </div>
        </div>
    );
};

export default Auth;
