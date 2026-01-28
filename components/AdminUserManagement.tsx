import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../services/supabase';

interface AdminUserManagementProps {
    onClose: () => void;
}

const APP_LIST = [
    { id: 'video-viral', label: 'Video Viral' },
    { id: 'image-script', label: 'Visual Script' },
    { id: 'zenshot-ai', label: 'ZenShot AI' },
    { id: 'translation', label: 'Translation' },
    { id: 'new-tool', label: 'New Tool' }
];

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ onClose }) => {
    const [users, setUsers] = useState<Record<string, User>>({});
    const [searchTerm, setSearchTerm] = useState('');

    const loadUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (data) {
            const userMap: Record<string, User> = {};
            data.forEach((u: any) => {
                userMap[u.username] = {
                    id: u.id,
                    username: u.username,
                    email: u.email,
                    phone: u.phone,
                    role: u.role,
                    allowedApps: u.allowed_apps,
                    createdAt: new Date(u.created_at).getTime()
                };
            });
            setUsers(userMap);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleToggleApp = async (username: string, appId: string) => {
        const user = users[username];
        if (!user) return;

        let newApps = user.allowedApps ? [...user.allowedApps] : [];
        if (newApps.includes(appId)) {
            newApps = newApps.filter(id => id !== appId);
        } else {
            newApps.push(appId);
        }

        // Optimistic update
        setUsers(prev => ({
            ...prev,
            [username]: { ...prev[username], allowedApps: newApps }
        }));

        // DB update
        await supabase.from('users').update({ allowed_apps: newApps }).eq('id', user.id);
    };

    const handleRoleChange = async (username: string) => {
        const user = users[username];
        if (!user) return;

        const newRole = user.role === 'admin' ? 'user' : 'admin';

        setUsers(prev => ({
            ...prev,
            [username]: { ...prev[username], role: newRole as UserRole }
        }));

        await supabase.from('users').update({ role: newRole }).eq('id', user.id);
    };

    const filteredUsers = (Object.values(users) as User[]).filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[400] p-6">
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-[#020617] text-white p-8 flex justify-between items-center shrink-0 gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Admin Control Panel (v1.2)</h2>
                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-[0.3em] mt-1">User & Access Management</p>
                    </div>
                    <button onClick={loadUsers} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Force Refresh
                    </button>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4 shrink-0 justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <input
                                type="text"
                                placeholder="Search users..."
                                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-y-auto flex-1 p-6 bg-slate-100">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                                    <th className="p-4 pl-6">User Identity</th>
                                    <th className="p-4">Role</th>
                                    <th className="p-4 text-center">Video Viral</th>
                                    <th className="p-4 text-center">Visual Script</th>
                                    <th className="p-4 text-center">ZenShot New</th>
                                    <th className="p-4 text-center">Translation</th>
                                    <th className="p-4 text-center">New App</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 pl-6">
                                            <div className="font-bold text-slate-800">{user.username}</div>
                                            <div className="text-xs text-slate-400 font-medium">{user.email || 'No email'}</div>
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleRoleChange(user.username)}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {user.role}
                                            </button>
                                        </td>
                                        {APP_LIST.map(app => {
                                            const isAllowed = user.allowedApps?.includes(app.id);
                                            return (
                                                <td key={app.id} className="p-4 text-center">
                                                    <label className="inline-flex items-center cursor-pointer relative">
                                                        <input
                                                            type="checkbox"
                                                            className="peer sr-only"
                                                            checked={isAllowed}
                                                            onChange={() => handleToggleApp(user.username, app.id)}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                    </label>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Debug Section */}
                <div className="p-4 bg-black text-xs font-mono text-green-400 overflow-auto h-32 border-t border-slate-700 shrink-0">
                    <p className="font-bold text-white mb-2">DEBUG RAW DATA (Search here for username):</p>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(users, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
};

export default AdminUserManagement;
