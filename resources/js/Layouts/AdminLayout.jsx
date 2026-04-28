import Toast from '@/Components/Toast';
import { usePage, Link } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import NavLink from '@/Components/NavLink';
import Dropdown from '@/Components/Dropdown';
import usePushNotification from '@/Hooks/usePushNotification';
import axios from 'axios';

export default function AdminLayout({ user, header, children }) {
    const { url } = usePage();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [verifyOrdersCount, setVerifyOrdersCount] = useState(0);
    const [pendingPayoutsCount, setPendingPayoutsCount] = useState(0);
    const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);
    const [showChatToast, setShowChatToast] = useState(false);
    const [showOrderToast, setShowOrderToast] = useState(false);
    const audioRef = useRef(null);
    const { isSubscribed, subscribeToPush, loading: pushLoading } = usePushNotification();

    // Sound: Simple "Pop" (Base64)
    const notificationSound = "data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAFRTU0UAAAAPAAADTGF2ZjU3LjU2LjEwMAAAAAAAAAAAAAAA//tQZAAAAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZBQA8AAANIAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJEluZm8AAAAPAAAABAAAAREAVlZXd3d3d3d3d3d3d3d3//////////////////////////////////8AAAAATGF2YzU3LjY0AAAAAAAAAAAAAAAAJAAAAAAAAAAAARAAAAAAAAAAAAAAAAD/7UGQMAAAADSAAAAAAEAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAAAEQBWVld3d3d3d3d3d3d3d3f//////////////////////////////////wAAAABMYXZjNTcuNjQAAAAAAAAAAAAAAAAkAAAAAAAAAAABEFJAAgAAAAAA//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//sQZAAACQANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq";

    useEffect(() => {
        let abortController = null;
        let retryDelay = 15000; // Start at 15s
        let timeoutId = null;

        // Init Audio
        audioRef.current = new Audio(notificationSound);

        const checkUnread = async () => {
            // Skip polling when tab is not visible
            if (document.visibilityState !== 'visible') {
                scheduleNext();
                return;
            }

            // Cancel any in-flight request
            if (abortController) abortController.abort();
            abortController = new AbortController();

            try {
                const response = await axios.get(route('notifications.check'), {
                    signal: abortController.signal,
                    timeout: 10000 // 10s timeout
                });
                const { unread_chats, verify_orders, pending_payouts, pending_assignments } = response.data;

                // Reset backoff on success
                retryDelay = 15000;

                // 1. Chat Notification
                setUnreadCount(prev => {
                    if (unread_chats > prev) {
                        if (audioRef.current) audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
                        setShowChatToast(true);
                        setTimeout(() => setShowChatToast(false), 5000);
                    }
                    return unread_chats;
                });

                // 2. Order Notification (Verify Orders)
                setVerifyOrdersCount(prev => {
                    if (verify_orders > prev) {
                        if (audioRef.current) audioRef.current.play().catch(e => console.log('Audio autoplay blocked', e));
                        setShowOrderToast(true);
                        setTimeout(() => setShowOrderToast(false), 5000);
                    }
                    return verify_orders;
                });

                // 3. Other Admin specific counts
                setPendingPayoutsCount(pending_payouts || 0);
                setPendingAssignmentsCount(pending_assignments || 0);

            } catch (error) {
                if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') return;
                
                console.error('Polling error', error);
                // Exponential backoff on error (cap at 60s)
                retryDelay = Math.min(retryDelay * 2, 60000);
            }

            scheduleNext();
        };

        const scheduleNext = () => {
            timeoutId = setTimeout(checkUnread, retryDelay);
        };

        // Listen for tab visibility changes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                clearTimeout(timeoutId);
                retryDelay = 15000;
                checkUnread();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check
        checkUnread();

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (abortController) abortController.abort();
        };
    }, []);

    const navigation = [
        { name: 'Dashboard', href: '/admin', active: route().current('admin.dashboard'), badge: pendingPayoutsCount },
        { name: 'Earnings', href: route('admin.earnings'), active: route().current('admin.earnings') },
        { name: 'Users', href: route('admin.users.index'), active: route().current('admin.users.*') },
        { name: 'Services', href: route('admin.services.index'), active: route().current('admin.services.*') },
        { name: 'Assign Task', href: route('admin.orders.assign'), active: route().current('admin.orders.assign'), badge: pendingAssignmentsCount },
        { name: 'Chats', href: route('admin.chat.index'), active: route().current('admin.chat.*'), badge: unreadCount },
        { name: 'Verify Orders', href: route('admin.orders.verify'), active: route().current('admin.verify.*') || route().current('admin.orders.verify'), badge: verifyOrdersCount },
        { name: 'Transactions', href: route('admin.transactions.index'), active: route().current('admin.transactions.*') },
        { name: 'Settings', href: route('admin.settings.index'), active: route().current('admin.settings.*') },
    ];

    return (
        <div className="min-h-screen bg-[#F8F9FC] font-sans text-gray-900 flex">
            <Toast />
            {/* Custom Chat Toast */}
            {showChatToast && (
                <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
                    <Link href={route('admin.chat.index')}>
                        <div className="bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900 flex items-center gap-3 hover:translate-y-[-2px] transition-transform cursor-pointer">
                            <span className="text-2xl">💬</span>
                            <div>
                                <p className="font-bold text-sm">New Message!</p>
                                <p className="text-xs text-indigo-100">Customer needs help.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Custom Order Toast */}
            {showOrderToast && (
                <div className="fixed bottom-24 right-5 z-50 animate-bounce-short">
                    <Link href={route('admin.orders.verify')}>
                        <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900 flex items-center gap-3 hover:translate-y-[-2px] transition-transform cursor-pointer">
                            <span className="text-2xl">⚡</span>
                            <div>
                                <p className="font-bold text-sm">New Order!</p>
                                <p className="text-xs text-emerald-100">Waiting for verification.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Push Notification Prompt (Temporarily Disabled)
            {!isSubscribed && (
                <div className="fixed top-5 right-5 z-50 animate-bounce-short">
                    <button
                        onClick={subscribeToPush}
                        disabled={pushLoading}
                        className="bg-sky-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-slate-900 font-bold hover:bg-sky-600 transition"
                    >
                        {pushLoading ? 'Enabling...' : '🔔 Enable Desktop Notifications'}
                    </button>
                </div>
            )}
            */}

            {/* Sidebar - Glassy & Clean */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-100 flex flex-col h-screen transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-[2px_0_20px_rgba(0,0,0,0.02)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>

                <div className="h-20 flex items-center px-8 border-b border-gray-50">
                    <Link href="/admin" className="text-2xl font-bold tracking-tight text-gray-900">
                        Beresin<span className="text-indigo-600">.</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Main Menu</p>
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`group flex items-center justify-between px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ${item.active
                                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center">
                                <span className={`w-1.5 h-1.5 rounded-full mr-3 ${item.active ? 'bg-indigo-600' : 'bg-gray-300 group-hover:bg-gray-400'}`}></span>
                                {item.name}
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-50">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                        <span className="w-1.5 h-1.5 rounded-full mr-3 bg-gray-300 group-hover:bg-red-400"></span>
                        Sign Out
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 flex flex-col min-h-screen">
                {/* Header - Minimalist */}
                <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 h-20 flex items-center justify-between px-8 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        {/* Top Menu Removed as requested */}
                    </div>

                    <div className="flex items-center gap-4">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-3 focus:outline-none group">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition">{user?.name}</p>
                                        <p className="text-xs text-gray-400">Admin</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-200/50">
                                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                            <span className="text-indigo-600 font-bold text-lg">{user?.name?.charAt(0)}</span>
                                        </div>
                                    </div>
                                </button>
                            </Dropdown.Trigger>

                            <Dropdown.Content align="right" width="48">
                                <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">
                                    Log Out
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {/* Page Content - Airy */}
                <div className="p-8 space-y-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
