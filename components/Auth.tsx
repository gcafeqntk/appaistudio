
import React, { useState } from 'react';
import { User } from '../types';

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

    const handleAuth = () => {
        setError('');

        if (!username || !password) {
            setError('Vui lòng nhập đầy đủ thông tin đăng nhập');
            return;
        }

        const users = JSON.parse(localStorage.getItem('app_users') || '{}');

        if (isRegistering) {
            if (!email || !phone) {
                setError('Vui lòng nhập đầy đủ Email và Số điện thoại');
                return;
            }
            if (password !== confirmPassword) {
                setError('Mật khẩu nhập lại không khớp');
                return;
            }
            if (users[username]) {
                setError('Tên đăng nhập đã tồn tại');
                return;
            }

            const newUser: User & { password: string } = {
                id: 'user_' + new Date().getTime(),
                username,
                password,
                email,
                phone,
                role: 'user', // Default role
                allowedApps: [], // Default locked pending admin approval
                createdAt: Date.now()
            };

            // Auto-promote specific user during registration if needed, or handle exclusively in App.tsx
            if (username === 'huytamky') {
                newUser.role = 'admin';
            }

            users[username] = newUser;
            localStorage.setItem('app_users', JSON.stringify(users));

            // Return user without password
            const separateUser: User = { ...newUser };
            // @ts-ignore
            delete separateUser.password;

            onLogin(separateUser);
        } else {
            const user = users[username];
            if (user && user.password === password) {
                // Determine role dynamically if it's the specific user (legacy support or force update)
                let role = user.role || 'user';
                if (username === 'huytamky') role = 'admin';

                // Update user object with potentially new structure if missing
                const updatedUser: User = {
                    id: user.id,
                    username: user.username,
                    email: user.email || '',
                    phone: user.phone || '',
                    role: role,
                    allowedApps: user.allowedApps || ['video-viral', 'image-script', 'translation'],
                    createdAt: user.createdAt || Date.now()
                };

                // Save back if changed (migration)
                if (!user.role || !user.allowedApps) {
                    users[username] = { ...user, ...updatedUser };
                    localStorage.setItem('app_users', JSON.stringify(users));
                }

                onLogin(updatedUser);
            } else {
                setError('Tên đăng nhập hoặc mật khẩu sai');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl w-full max-w-md border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6 text-center">
                    {isRegistering ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Tên đăng nhập</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    {isRegistering && (
                        <>
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Số điện thoại</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-[#0f172a] border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </>
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
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors mt-4"
                    >
                        {isRegistering ? 'Đăng Ký' : 'Đăng Nhập'}
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
