
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import RichTextEditor from '../components/RichTextEditor';

interface LandingPageProps {
    user: User;
    onNavigate: (tab: 'video-viral' | 'image-script' | 'new-tool') => void;
}

interface NewsItem {
    id: string;
    title: string;
    content: string;
    date: number;
    author: string;
}

interface SidebarWidget {
    id: string;
    type: 'status' | 'shortcuts' | 'custom';
    title: string;
    content?: string;
    order: number;
}

interface AppSettings {
    layout: 'modern' | 'classic' | 'news-focus';
    news: NewsItem[];
    // New Fields
    welcomeTitle?: string;
    welcomeMessage?: string;
    statusTitle?: string;
    statusMessage?: string;
    zaloPhone?: string;
    sidebarWidgets?: SidebarWidget[];
}

const LandingPage: React.FC<LandingPageProps> = ({ user, onNavigate }) => {
    const [settings, setSettings] = useState<AppSettings>({
        layout: 'modern',
        news: [],
        welcomeTitle: '',
        welcomeMessage: '',
        statusTitle: '',
        statusMessage: ''
    });
    const [showAdminPanel, setShowAdminPanel] = useState(false);

    // Admin State
    const [editingNews, setEditingNews] = useState<Partial<NewsItem>>({});
    const [isEditing, setIsEditing] = useState(false);

    // Pending Settings for Sidebar
    const [pendingSettings, setPendingSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('app_settings');
        if (saved) {
            setSettings(JSON.parse(saved));
        } else {
            // Default seeding
            const defaultNews = [
                {
                    id: '1',
                    title: 'Chào mừng đến với Quang Huy Studio',
                    content: '<p>Hệ thống <b>Multi-App Engine</b> đã chính thức vận hành. Hãy chọn ứng dụng để bắt đầu!</p>',
                    date: Date.now(),
                    author: 'System'
                }
            ];
            setSettings({
                layout: 'modern',
                news: defaultNews,
                welcomeTitle: 'Chào mừng, {username}!',
                welcomeMessage: 'Hệ thống AI Studio cung cấp các công cụ tối tân nhất để tự động hóa quy trình sáng tạo nội dung của bạn.',
                statusTitle: 'Stable',
                statusMessage: 'Tất cả dịch vụ API đang hoạt động bình thường.',
                zaloPhone: '0987654321', // Example
                sidebarWidgets: [
                    { id: 'w1', type: 'status', title: 'Trạng thái', order: 0 },
                    { id: 'w2', type: 'shortcuts', title: 'Lối tắt', order: 1 }
                ]
            });
        }
    }, []);

    // Sync pending settings when admin panel opens
    useEffect(() => {
        if (showAdminPanel) {
            setPendingSettings(settings);
        }
    }, [showAdminPanel, settings]);

    const saveSettings = (newSettings: AppSettings) => {
        setSettings(newSettings);
        localStorage.setItem('app_settings', JSON.stringify(newSettings));
    };

    const handleSavePendingSettings = () => {
        if (pendingSettings) {
            saveSettings(pendingSettings);
            alert('Đã lưu cấu hình thành công!');
        }
    };

    const updatePendingSetting = (key: keyof AppSettings, value: any) => {
        if (pendingSettings) {
            setPendingSettings({ ...pendingSettings, [key]: value });
        }
    };

    const handleSaveNews = () => {
        if (!editingNews.title || !editingNews.content) return;

        const newItem: NewsItem = {
            id: editingNews.id || crypto.randomUUID(),
            title: editingNews.title,
            content: editingNews.content,
            date: editingNews.date || Date.now(),
            author: user.username
        };

        let newNewsList = [...settings.news];
        if (editingNews.id) {
            newNewsList = newNewsList.map(n => n.id === editingNews.id ? newItem : n);
        } else {
            newNewsList = [newItem, ...newNewsList];
        }

        saveSettings({ ...settings, news: newNewsList });
        setIsEditing(false);
        setEditingNews({});
    };

    const handleDeleteNews = (id: string) => {
        if (confirm('Bạn có chắc muốn xóa tin tức này?')) {
            const newNewsList = settings.news.filter(n => n.id !== id);
            saveSettings({ ...settings, news: newNewsList });
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString('vi-VN', { year: 'numeric', month: 'long', day: 'numeric' });

    // Helper to process template strings
    const processText = (text: string | undefined) => {
        if (!text) return '';
        return text.replace('{username}', user.username || 'User');
    };

    // --- SIDEBAR WIDGETS LOGIC ---
    const moveWidget = (index: number, direction: 'up' | 'down') => {
        if (!pendingSettings) return;
        const newWidgets = [...(pendingSettings.sidebarWidgets || [])];
        if (direction === 'up' && index > 0) {
            [newWidgets[index], newWidgets[index - 1]] = [newWidgets[index - 1], newWidgets[index]];
        } else if (direction === 'down' && index < newWidgets.length - 1) {
            [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
        }
        updatePendingSetting('sidebarWidgets', newWidgets);
    };

    const addWidget = () => {
        if (!pendingSettings) return;
        const newWidget: SidebarWidget = {
            id: crypto.randomUUID(),
            type: 'custom',
            title: 'Tiêu đề mới',
            content: '<p>Nội dung tùy chỉnh...</p>',
            order: (pendingSettings.sidebarWidgets?.length || 0)
        };
        updatePendingSetting('sidebarWidgets', [...(pendingSettings.sidebarWidgets || []), newWidget]);
    };

    const removeWidget = (id: string) => {
        if (!pendingSettings) return;
        if (confirm('Xóa widget này?')) {
            const newWidgets = pendingSettings.sidebarWidgets?.filter(w => w.id !== id) || [];
            updatePendingSetting('sidebarWidgets', newWidgets);
        }
    };

    const updateWidgetContent = (id: string, field: keyof SidebarWidget, value: any) => {
        if (!pendingSettings) return;
        const newWidgets = pendingSettings.sidebarWidgets?.map(w => w.id === id ? { ...w, [field]: value } : w) || [];
        updatePendingSetting('sidebarWidgets', newWidgets);
    };

    // --- NEWS SORTING LOGIC ---
    const moveNews = (index: number, direction: 'up' | 'down') => {
        // ... (existing logic)
        const newNews = [...settings.news];
        if (direction === 'up' && index > 0) {
            [newNews[index], newNews[index - 1]] = [newNews[index - 1], newNews[index]];
        } else if (direction === 'down' && index < newNews.length - 1) {
            [newNews[index], newNews[index + 1]] = [newNews[index + 1], newNews[index]];
        }
        saveSettings({ ...settings, news: newNews });
    };

    // --- COMPONENT: Expandable News Item ---
    const ExpandableNewsItem = ({ news, formatDate }: { news: NewsItem; formatDate: (ts: number) => string }) => {
        const [expanded, setExpanded] = useState(false);

        // Strip HTML tags to count words (approximate)
        const stripHtml = (html: string) => {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        const textContent = stripHtml(news.content);
        const words = textContent.split(/\s+/).filter(w => w.length > 0);
        const isLong = words.length > 50;

        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-indigo-700 mb-2">{news.title}</h3>
                <div className="text-xs text-gray-400 mb-4">{formatDate(news.date)} | Bởi {news.author}</div>

                <div className={`prose prose-slate max-w-none ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
                    {/* If expanded or short, show full HTML. If collapsed and long, we ideally show truncated text or just hide overflow with CSS line-clamp as a simple visual fallback, but user asked for "click to see more" specifically involving 50 words. 
                       However, purely mixing HTML truncation is hard. 
                       Let's use a CSS-based approach for the 'preview' which is safer for HTML content, 
                       OR if we strictly want 50 words text preview: */}

                    {expanded || !isLong ? (
                        <div dangerouslySetInnerHTML={{ __html: news.content }} />
                    ) : (
                        <div>
                            <p>{words.slice(0, 50).join(' ')}...</p>
                        </div>
                    )}
                </div>

                {isLong && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-3 text-sm font-bold text-indigo-600 hover:text-indigo-800 underline decoration-2 underline-offset-4"
                    >
                        {expanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                )}
            </div>
        );
    };

    // --- LAYOUTS ---

    const LayoutModern = () => (
        <div className="flex flex-col h-full overflow-y-auto">
            {/* Zalo Button */}
            {settings.zaloPhone && (
                <a
                    href={`https://zalo.me/${settings.zaloPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="fixed bottom-24 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce transition-transform hover:scale-110"
                    title="Chat Zalo"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.92 2 10.5c0 2.37 1.17 4.54 3.12 6.13-.15.86-.54 1.95-1.42 2.62-.23.18-.08.57.21.57 2.39 0 4.19-1.29 4.88-1.93.7.13 1.43.21 2.21.21 5.52 0 10-3.92 10-8.5S17.52 2 12 2zm0 15c-.71 0-1.39-.07-2.04-.2-.27-.05-.54.04-.73.23-.74.72-2.12 1.58-3.73 1.66.44-.8 1.05-2.22 1.05-2.22.06-.16.03-.35-.09-.48C4.94 14.54 4 12.63 4 10.5 4 7.02 7.7 4 12 4s8 3.02 8 6.5-3.7 6.5-8 6.5z" /></svg>
                    <span className="font-bold text-xs">{settings.zaloPhone}</span>
                </a>
            )}

            {/* Hero Section */}
            <div className="relative py-24 px-6 md:px-12 text-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-[#0f172a] to-slate-900 z-0"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-0"></div>
                <div className="relative z-10 space-y-6 max-w-4xl mx-auto">
                    <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4">
                        Hệ thống điều hành AI tập trung
                    </span>
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 leading-tight drop-shadow-2xl animate-in zoom-in-95 duration-700">
                        {settings.welcomeTitle ? processText(settings.welcomeTitle) : 'QUANG HUY AI STUDIO'}
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 delay-200">
                        {settings.welcomeMessage || 'Nền tảng tích hợp đa công cụ mạnh mẽ, giúp bạn tối ưu hóa quy trình sáng tạo Video và Hình ảnh Viral chỉ với một cú click.'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-8 delay-300">
                        <button
                            onClick={() => onNavigate('video-viral')}
                            className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 transform skew-y-12"></div>
                            VIDEO VIRAL ENGINE
                        </button>
                        <button
                            onClick={() => onNavigate('image-script')}
                            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95"
                        >
                            VISUAL SCRIPT ENGINE
                        </button>
                    </div>
                </div>
            </div>

            {/* News Section */}
            <div className="max-w-5xl mx-auto w-full px-6 py-16 space-y-12">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-indigo-600 pl-4 uppercase tracking-wider">Tin Tức Mới Nhất</h2>
                    <div className="h-px bg-gray-200 flex-grow"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {settings.news.map(news => (
                        <div key={news.id} className="group bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-2xl hover:border-indigo-100 transition-all">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-4 font-bold uppercase tracking-wider">
                                <span>{formatDate(news.date)}</span>
                                <span className="text-indigo-500">{news.author}</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors line-clamp-2">{news.title}</h3>
                            <div
                                className="prose prose-sm text-gray-500 line-clamp-4"
                                dangerouslySetInnerHTML={{ __html: news.content }}
                            />
                            <button className="mt-6 text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-2 group/btn">
                                Xem chi tiết
                                <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                            </button>
                        </div>
                    ))}
                    {settings.news.length === 0 && <p className="text-gray-400 italic">Chưa có tin tức nào.</p>}
                </div>
            </div>
        </div>
    );

    const LayoutClassic = () => (
        <div className="h-full overflow-y-auto bg-gray-50">
            {/* Zalo Button */}
            {settings.zaloPhone && (
                <a
                    href={`https://zalo.me/${settings.zaloPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="fixed bottom-24 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce transition-transform hover:scale-110"
                    title="Chat Zalo"
                >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.92 2 10.5c0 2.37 1.17 4.54 3.12 6.13-.15.86-.54 1.95-1.42 2.62-.23.18-.08.57.21.57 2.39 0 4.19-1.29 4.88-1.93.7.13 1.43.21 2.21.21 5.52 0 10-3.92 10-8.5S17.52 2 12 2zm0 15c-.71 0-1.39-.07-2.04-.2-.27-.05-.54.04-.73.23-.74.72-2.12 1.58-3.73 1.66.44-.8 1.05-2.22 1.05-2.22.06-.16.03-.35-.09-.48C4.94 14.54 4 12.63 4 10.5 4 7.02 7.7 4 12 4s8 3.02 8 6.5-3.7 6.5-8 6.5z" /></svg>
                    <span className="font-bold text-sm">Hỗ trợ: {settings.zaloPhone}</span>
                </a>
            )}

            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left: Main Intro */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 w-64 opacity-10">
                                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" /></svg>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 mb-6">
                                {processText(settings.welcomeTitle) || `Chào mừng, ${user.username}!`}
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                {settings.welcomeMessage || 'Hệ thống AI Studio cung cấp các công cụ tối tân nhất để tự động hóa quy trình sáng tạo nội dung của bạn.'}
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {/* Buttons removed as per request */}
                            </div>
                        </div>

                        {/* News List */}
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-800">Cập nhật hệ thống</h2>
                            {settings.news.map(news => (
                                <ExpandableNewsItem key={news.id} news={news} formatDate={formatDate} />
                            ))}
                        </div>
                    </div>

                    {/* Right: Dynamic Widgets */}
                    <div className="space-y-6">
                        {settings.sidebarWidgets?.map(widget => (
                            <div key={widget.id} className={`${widget.type === 'status' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-white text-gray-800 border-gray-100'} rounded-3xl p-8 shadow-xl border`}>
                                <h3 className={`text-lg font-bold uppercase tracking-widest mb-4 opacity-80`}>{widget.title}</h3>
                                {widget.type === 'status' && (
                                    <>
                                        <div className="text-4xl font-black mb-4">{settings.statusTitle || 'Stable'}</div>
                                        <p className="text-sm opacity-90">{settings.statusMessage || 'Tất cả dịch vụ API đang hoạt động bình thường.'}</p>
                                    </>
                                )}
                                {widget.type === 'shortcuts' && (
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-center gap-2 cursor-pointer hover:text-indigo-600"><span className="w-2 h-2 rounded-full bg-green-500"></span> User Guide</li>
                                        <li className="flex items-center gap-2 cursor-pointer hover:text-indigo-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span> API Docs</li>
                                        <li className="flex items-center gap-2 cursor-pointer hover:text-indigo-600"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Support</li>
                                    </ul>
                                )}
                                {widget.type === 'custom' && widget.content && (
                                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: widget.content }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative h-full w-full bg-slate-50">
            {/* Render Selected Layout */}
            {settings.layout === 'modern' && <LayoutModern />}
            {settings.layout === 'classic' && <LayoutClassic />}
            {settings.layout === 'news-focus' && <LayoutClassic />} {/* Fallback simple */}

            {/* ADMIN CONTROLS (Floating) */}
            {user.role === 'admin' && (
                <div className="fixed bottom-6 right-6 z-50">
                    <button
                        onClick={() => setShowAdminPanel(true)}
                        className="w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                        title="Quản trị trang chủ"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                </div>
            )}

            {/* ADMIN PANEL */}
            {showAdminPanel && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                    <div className="bg-[#1e293b] w-full max-w-4xl h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest">
                                Cấu hình Trang Chủ
                            </h2>
                            <button onClick={() => setShowAdminPanel(false)} className="text-slate-400 hover:text-white">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-grow flex overflow-hidden">
                            {/* Left: Sidebar Settings */}
                            <div className="w-1/3 bg-black/20 p-6 border-r border-white/5 space-y-8 overflow-y-auto flex flex-col">
                                <div className="flex-grow space-y-8">
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-400 mb-3">Chọn Bố Cục (Layout)</label>
                                        <div className="space-y-3">
                                            <div
                                                onClick={() => updatePendingSetting('layout', 'modern')}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${pendingSettings?.layout === 'modern' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                                            >
                                                <div className="font-bold text-white text-sm mb-1">Modern Visual (Default)</div>
                                                <div className="text-xs text-slate-400">Hero lớn, nền động, card trong suốt.</div>
                                            </div>
                                            <div
                                                onClick={() => updatePendingSetting('layout', 'classic')}
                                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${pendingSettings?.layout === 'classic' ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                                            >
                                                <div className="font-bold text-white text-sm mb-1">Classic Dashboard</div>
                                                <div className="text-xs text-slate-400">Gọn gàng, tập trung thông tin.</div>
                                            </div>
                                        </div>
                                    </div>
                                    <hr className="border-white/10" />
                                    {/* Zalo Settings */}
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-400 mb-3">Thông tin Zalo (0để ẩn)</label>
                                        <input
                                            type="text"
                                            value={pendingSettings?.zaloPhone || ''}
                                            onChange={e => updatePendingSetting('zaloPhone', e.target.value)}
                                            placeholder="SĐT Zalo (Ví dụ: 0987654321)"
                                            className="w-full bg-slate-800 border-slate-700 text-white p-2 rounded text-sm"
                                        />
                                    </div>
                                    <hr className="border-white/10" />

                                    {/* Right Sidebar Widgets Management */}
                                    <div>
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-xs uppercase font-bold text-slate-400">Quản lý Cột Bên Phải</label>
                                            <button onClick={addWidget} className="text-xs bg-indigo-600 px-2 py-1 rounded text-white hover:bg-indigo-700">+ Thêm Cột</button>
                                        </div>
                                        <div className="space-y-3">
                                            {pendingSettings?.sidebarWidgets?.map((widget, idx) => (
                                                <div key={widget.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-slate-300">#{idx + 1} - {widget.type === 'custom' ? 'Tùy chỉnh' : widget.title}</span>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => moveWidget(idx, 'up')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">▲</button>
                                                            <button onClick={() => moveWidget(idx, 'down')} disabled={idx === (pendingSettings.sidebarWidgets?.length || 0) - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-30">▼</button>
                                                            <button onClick={() => removeWidget(widget.id)} className="p-1 text-red-400 hover:text-red-300">✕</button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={widget.title}
                                                        onChange={e => updateWidgetContent(widget.id, 'title', e.target.value)}
                                                        className="w-full bg-slate-900 border border-slate-700 text-white p-1 rounded text-xs mb-2"
                                                        placeholder="Tiêu đề widget..."
                                                    />
                                                    {widget.type === 'custom' && (
                                                        <textarea
                                                            value={widget.content || ''}
                                                            onChange={e => updateWidgetContent(widget.id, 'content', e.target.value)}
                                                            className="w-full bg-slate-900 border border-slate-700 text-white p-1 rounded text-xs h-16"
                                                            placeholder="Nội dung HTML..."
                                                        />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <hr className="border-white/10" />
                                    <div>
                                        <label className="block text-xs uppercase font-bold text-slate-400 mb-3">Nội dung Chào mừng</label>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs text-slate-500 block mb-1">Tiêu đề (dùng {'{username}'} để chèn tên)</label>
                                                <input
                                                    type="text"
                                                    value={pendingSettings?.welcomeTitle || ''}
                                                    onChange={e => updatePendingSetting('welcomeTitle', e.target.value)}
                                                    placeholder="Chào mừng, {username}!"
                                                    className="w-full bg-slate-800 border-slate-700 text-white p-2 rounded text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 block mb-1">Mô tả</label>
                                                <textarea
                                                    value={pendingSettings?.welcomeMessage || ''}
                                                    onChange={e => updatePendingSetting('welcomeMessage', e.target.value)}
                                                    placeholder="Mô tả ngắn..."
                                                    className="w-full bg-slate-800 border-slate-700 text-white p-2 rounded text-sm h-20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-white/10">
                                    <button
                                        onClick={handleSavePendingSettings}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all"
                                    >
                                        Lưu Cấu Hình
                                    </button>
                                </div>
                            </div>

                            {/* Right: News Manager */}
                            <div className="w-2/3 p-6 flex flex-col bg-[#0f172a]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-bold text-white">Quản lý Tin Tức</h3>
                                    <button
                                        onClick={() => { setIsEditing(true); setEditingNews({}); }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg"
                                    >
                                        + Thêm Tin Mới
                                    </button>
                                </div>

                                {isEditing ? (
                                    <div className="flex-grow flex flex-col space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Tiêu đề bài viết..."
                                            value={editingNews.title || ''}
                                            onChange={e => setEditingNews({ ...editingNews, title: e.target.value })}
                                            className="bg-slate-800 border-slate-700 text-white p-3 rounded-lg outline-none focus:border-indigo-500"
                                        />
                                        <div className="flex-grow flex flex-col">
                                            <RichTextEditor
                                                value={editingNews.content || ''}
                                                onChange={html => setEditingNews({ ...editingNews, content: html })}
                                                className="flex-grow h-full"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-3 pt-2">
                                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white">Hủy</button>
                                            <button onClick={handleSaveNews} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold">Lưu Tin</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                                        {settings.news.map((news, idx) => (
                                            <div key={news.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-start group">
                                                <div>
                                                    <h4 className="font-bold text-white text-sm">{news.title}</h4>
                                                    <div className="text-[10px] text-slate-400 mt-1">
                                                        {formatDate(news.date)} - {news.author}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex flex-col gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => moveNews(idx, 'up')} disabled={idx === 0} className="text-slate-500 hover:text-white disabled:opacity-20">▲</button>
                                                        <button onClick={() => moveNews(idx, 'down')} disabled={idx === settings.news.length - 1} className="text-slate-500 hover:text-white disabled:opacity-20">▼</button>
                                                    </div>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity items-center">
                                                        <button
                                                            onClick={() => { setEditingNews(news); setIsEditing(true); }}
                                                            className="p-1 text-blue-400 hover:bg-blue-400/10 rounded"
                                                        >
                                                            Sửa
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteNews(news.id)}
                                                            className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                                                        >
                                                            Xóa
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
