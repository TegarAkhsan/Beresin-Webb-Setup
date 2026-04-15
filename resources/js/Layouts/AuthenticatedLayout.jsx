import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import Toast from '@/Components/Toast';
import usePushNotification from '@/Hooks/usePushNotification';
import axios from 'axios';

export default function AuthenticatedLayout({ header, children, hideNavigation = false, hideHomeLink = false }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [newTaskCount, setNewTaskCount] = useState(0);
    const [showChatToast, setShowChatToast] = useState(false);
    const [showTaskToast, setShowTaskToast] = useState(false);
    const audioRef = useRef(null);
    const { isSubscribed, subscribeToPush, loading: pushLoading } = usePushNotification();

    const notificationSound = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTSVMAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIwAXFxcXGxsbGx8fHx8jIyMjJycnJysrKysvLy8vMzMzMzc3Nzc7Ozs7Pz8/P0NDQ0NHR0dHS0tLS09PT09TU1NTV1dXV1tbW1tfX19fY2NjY2dnZ2dra2trb29vb3Nzc3N3d3d3e3t7e39/f3+Dg4ODh4eHh4iIiIiMjIyMk5OTk5aWlpaampqan5+fn6KioqKmpqamqKioKKqqqqqurq6usLCwsLS0tLS4uLi4vLy8vMHBwcHFxcXFyc/Pz9PT09PX19fX29vb29/f39/j4+Pj5+fn5+vr6+v///////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAMAAAAAAAAAASMDRFE9AAAA//MUZAAAAAI0AUA0AABHAAAARwAAACQAAAI0AUA0AABHAAAARwAAACQAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAAAGkAYA0AAA3QAAAN0AAAAkAAAGkAYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAIAGkQYA0AAA3QAAAN0AAAAkAAAGkQYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAMAGkYYA0AAA3QAAAN0AAAAkAAAGkYYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAYAGkgYA0AAA3QAAAN0AAAAkAAAGkgYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAkAGkoYA0AAA3QAAAN0AAAAkAAAGkoYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZAsAGkwYA0AAA3QAAAN0AAAAkAAAGkwYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBAAGk4YA0AAA3QAAAN0AAAAkAAAGk4YA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBMAGlAYA0AAA3QAAAN0AAAAkAAAGlAYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBUAGlIYA0AAA3QAAAN0AAAAkAAAGlIYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBcAGlQYA0AAA3QAAAN0AAAAkAAAGlQYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBgAGlYYA0AAA3QAAAN0AAAAkAAAGlYYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBkAGlgYA0AAA3QAAAN0AAAAkAAAGlgYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZBsAGloYA0AAA3QAAAN0AAAAkAAAGloYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZCAAGlwYA0AAA3QAAAN0AAAAkAAAGlwYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZCMAGmAYA0AAA3QAAAN0AAAAkAAAGmAYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZCUAGmIYA0AAA3QAAAN0AAAAkAAAGmIYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZCcAGmQYA0AAA3QAAAN0AAAAkAAAGmQYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZCeAGmYYA0AAA3QAAAN0AAAAkAAAGmYYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZCsAGmgYA0AAA3QAAAN0AAAAkAAAGmgYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDEAGmoYA0AAA3QAAAN0AAAAkAAAGmoYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDMAGmwYA0AAA3QAAAN0AAAAkAAAGmwYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDUAGnAYA0AAA3QAAAN0AAAAkAAAGnAYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDcAGnIYA0AAA3QAAAN0AAAAkAAAGnIYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDgAGnQYA0AAA3QAAAN0AAAAkAAAGnQYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDkAGnYYA0AAA3QAAAN0AAAAkAAAGnYYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZDsAGngYA0AAA3QAAAN0AAAAkAAAGngYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZEEAGnoYA0AAA3QAAAN0AAAAkAAAGnoYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZEMAGnwYA0AAA3QAAAN0AAAAkAAAGnwYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZEUAGoAYA0AAA3QAAAN0AAAAkAAAGoAYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZEcAGoIYA0AAA3QAAAN0AAAAkAAAGoIYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZEgAGoQYA0AAA3QAAAN0AAAAkAAAGoQYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZEkAGoYYA0AAA3QAAAN0AAAAkAAAGoYYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZFsAGogYA0AAA3QAAAN0AAAAkAAAGogYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZGEAGooYA0AAA3QAAAN0AAAAkAAAGooYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZGMAGowYA0AAA3QAAAN0AAAAkAAAGowYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA//MUZGUAGpAYA0AAA3QAAAN0AAAAkAAAGpAYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA///MUZGcAGpIYA0AAA3QAAAN0AAAAkAAAGpIYA0AAA3QAAAN0AAAAkAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    useEffect(() => {
        let abortController = null;
        let retryDelay = 15000; // Start at 15s, backoff on error
        let timeoutId = null;

        const checkNotifications = async () => {
            // Skip polling when tab is not visible (e.g., user switched browser tab)
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
                    timeout: 10000 // 10s timeout per request
                });
                const { unread_chats, new_tasks } = response.data;

                // Reset backoff on success
                retryDelay = 15000;

                // 1. Unread Chat Notification
                setUnreadCount(prev => {
                    if (unread_chats > prev) {
                        if (audioRef.current) audioRef.current.play().catch(() => {});
                        setShowChatToast(true);
                        setTimeout(() => setShowChatToast(false), 5000);
                    }
                    return unread_chats;
                });

                // 2. New Task Notification (For Joki)
                setNewTaskCount(prev => {
                    if (new_tasks > prev) {
                        if (audioRef.current) audioRef.current.play().catch(() => {});
                        setShowTaskToast(true);
                        setTimeout(() => setShowTaskToast(false), 5000);
                    }
                    return new_tasks;
                });

            } catch (error) {
                // Ignore cancelled requests (AbortController)
                if (axios.isCancel(error) || error.name === 'CanceledError' || error.name === 'AbortError') return;

                // Exponential backoff on network error (cap at 60s)
                retryDelay = Math.min(retryDelay * 2, 60000);
            }

            scheduleNext();
        };

        const scheduleNext = () => {
            timeoutId = setTimeout(checkNotifications, retryDelay);
        };

        // Listen for tab visibility changes to resume immediately when user returns
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                clearTimeout(timeoutId);
                retryDelay = 15000; // Reset delay when tab becomes active
                checkNotifications();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Initial check
        checkNotifications();

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (abortController) abortController.abort();
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#F3F3F1] font-sans selection:bg-yellow-400 selection:text-black">
            {!hideNavigation && (
                <nav className="border-b-2 border-slate-900 bg-white shadow-sm">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between">
                            <div className="flex">
                                <div className="flex shrink-0 items-center">
                                    <Link href="/">
                                        <div className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
                                            <ApplicationLogo className="w-8 h-8" />
                                            Beresin.
                                        </div>
                                    </Link>
                                </div>

                                <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                    {!hideHomeLink && (
                                        <NavLink
                                            href={route('dashboard')}
                                            active={route().current('dashboard')}
                                            className="font-bold text-slate-700 hover:text-slate-900 border-b-2 border-transparent hover:border-slate-900"
                                        >
                                            Beranda
                                        </NavLink>
                                    )}
                                </div>
                            </div>

                            <div className="hidden sm:ms-6 sm:flex sm:items-center">
                                <div className="relative ms-3">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <span className="inline-flex rounded-md">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-bold leading-4 text-slate-900 transition duration-150 ease-in-out hover:bg-slate-50 focus:outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                                                >
                                                    {user.name}

                                                    <svg
                                                        className="-me-0.5 ms-2 h-4 w-4"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </span>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content>
                                            <Dropdown.Link
                                                href={route('profile.edit')}
                                                className="font-medium text-slate-700 hover:bg-yellow-50 hover:text-slate-900"
                                            >
                                                Profile
                                            </Dropdown.Link>
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                                className="font-medium text-slate-700 hover:bg-yellow-50 hover:text-slate-900"
                                            >
                                                Log Out
                                            </Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            </div>

                            <div className="-me-2 flex items-center sm:hidden">
                                <button
                                    onClick={() =>
                                        setShowingNavigationDropdown(
                                            (previousState) => !previousState,
                                        )
                                    }
                                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:bg-slate-100 focus:text-slate-700 focus:outline-none"
                                >
                                    <svg
                                        className="h-6 w-6"
                                        stroke="currentColor"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            className={
                                                !showingNavigationDropdown
                                                    ? 'inline-flex'
                                                    : 'hidden'
                                            }
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M4 6h16M4 12h16M4 18h16"
                                        />
                                        <path
                                            className={
                                                showingNavigationDropdown
                                                    ? 'inline-flex'
                                                    : 'hidden'
                                            }
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M6 18L18 6M6 6l12 12"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        className={
                            (showingNavigationDropdown ? 'block' : 'hidden') +
                            ' sm:hidden'
                        }
                    >
                        <div className="space-y-1 pb-3 pt-2">
                            {!hideHomeLink && (
                                <ResponsiveNavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Beranda
                                </ResponsiveNavLink>
                            )}
                        </div>

                        <div className="border-t border-slate-200 pb-1 pt-4">
                            <div className="px-4">
                                <div className="text-base font-medium text-slate-800">
                                    {user.name}
                                </div>
                                <div className="text-sm font-medium text-slate-500">
                                    {user.email}
                                </div>
                            </div>

                            <div className="mt-3 space-y-1">
                                <ResponsiveNavLink href={route('profile.edit')}>
                                    Profile
                                </ResponsiveNavLink>
                                <ResponsiveNavLink
                                    method="post"
                                    href={route('logout')}
                                    as="button"
                                >
                                    Log Out
                                </ResponsiveNavLink>
                            </div>
                        </div>
                    </div>
                </nav>
            )}

            {header && (
                <header className="bg-white border-b-2 border-slate-900">
                    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main>{children}</main>
            <Toast flash={flash} />
            <audio ref={audioRef} src={notificationSound} preload="auto" />

            {/* Push Notification Prompt (Temporarily Disabled)
            {!isSubscribed && (
                <div className="fixed top-20 right-5 z-40 animate-bounce-short">
                    <button
                        onClick={subscribeToPush}
                        disabled={pushLoading}
                        className="bg-sky-500 text-white px-4 py-2 rounded-lg shadow-lg border-2 border-slate-900 font-bold hover:bg-sky-600 transition"
                    >
                        {pushLoading ? 'Enabling...' : '🔔 Enable Notifications'}
                    </button>
                </div>
            )}
            */}

            {/* Chat Toast */}
            {showChatToast && (
                <div className="fixed bottom-5 right-5 z-50 animate-bounce-short">
                    <Link href={user.role === 'admin' ? route('admin.chat.index') : '/'}> {/* Redirect to dashboard or specific chat page */}
                        <div className="bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900 flex items-center gap-3 hover:translate-y-[-2px] transition-transform cursor-pointer">
                            <span className="text-2xl">💬</span>
                            <div>
                                <p className="font-bold text-sm">New Message!</p>
                                <p className="text-xs text-indigo-100">You have a new message.</p>
                            </div>
                        </div>
                    </Link>
                </div>
            )}

            {/* Task Toast (Joki Only) */}
            {showTaskToast && (
                <div className="fixed bottom-24 right-5 z-50 animate-bounce-short">
                    <div onClick={() => window.location.reload()} className="cursor-pointer"> {/* Simple reload to refresh dashboard for now, or link to tasks tab */}
                        <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900 flex items-center gap-3 hover:translate-y-[-2px] transition-transform">
                            <span className="text-2xl">⚡</span>
                            <div>
                                <p className="font-bold text-sm">New Task Assigned!</p>
                                <p className="text-xs text-emerald-100">Check your workspace.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
