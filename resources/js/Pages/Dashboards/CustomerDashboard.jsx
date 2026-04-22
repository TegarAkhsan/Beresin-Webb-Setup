import { useState, useEffect } from 'react';
import { Link, useForm, usePage } from '@inertiajs/react';
import Asterisk from '@/Components/Landing/Asterisk';
import InvoiceModal from '@/Components/InvoiceModal';

export default function CustomerDashboard({ auth, orders, stats }) {
    const user = auth.user;
    const [activeTab, setActiveTab] = useState('overview');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);

    // Close mobile sidebar when resizing to desktop to prevent overlay from persisting
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // run on mount too
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Normalize orders to always be a plain array
    const orderList = Array.isArray(orders)
        ? orders
        : (Array.isArray(orders?.data) ? orders.data : []);

    // Profile Form
    const { flash } = usePage().props;
    const { data: profileData, setData: setProfileData, patch: patchProfile, processing: profileProcessing, errors: profileErrors, recentlySuccessful: profileSuccessful } = useForm({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        university: user.university || '',
        address: user.address || '',
    });

    const submitProfile = (e) => {
        e.preventDefault();
        patchProfile(route('profile.update'));
    };

    // Calculate Profile Completeness
    const profileFields = ['name', 'email', 'phone', 'university', 'address'];
    const filledFields = profileFields.filter(field => user[field]).length;
    const progressPercentage = Math.round((filledFields / profileFields.length) * 100);

    const SidebarItem = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold border-2 ${activeTab === id
                ? 'bg-yellow-400 text-slate-900 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] -translate-y-1 -translate-x-1'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
        >
            {icon}
            <span>{label}</span>
        </button>
    );

    // Dismissed Notification Logic
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dismissed_completed_orders')) || [];
        } catch (e) {
            return [];
        }
    });

    const handleViewOrders = (newIds) => {
        const updatedIds = [...new Set([...dismissedIds, ...newIds])];
        setDismissedIds(updatedIds);
        localStorage.setItem('dismissed_completed_orders', JSON.stringify(updatedIds));
        setActiveTab('orders');
    };

    return (
        <div className="min-h-screen flex font-sans selection:bg-yellow-400 selection:text-black bg-[#F3F3F1]">

            {/* Sidebar Overlay — only rendered on mobile when sidebar is open */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r-2 border-slate-900 flex flex-col p-6 transition-transform duration-300 ease-in-out lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="flex items-center space-x-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                        <span className="font-black text-xl text-slate-900">B.</span>
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-slate-900">Beresin.</span>
                </div>

                <nav className="space-y-4 flex-1">
                    <Link href="/" className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold border-2 border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        <span>Ke Halaman Utama</span>
                    </Link>

                    <div className="w-full h-px bg-slate-200 my-2"></div>

                    <SidebarItem id="overview" label="Overview" icon={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    } />
                    <SidebarItem id="orders" label="Order Saya" icon={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                    } />
                    <SidebarItem id="profile" label="Profil Saya" icon={
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    } />
                </nav>

                <div className="mt-auto pt-6 border-t-2 border-slate-900">
                    <Link href={route('logout')} method="post" as="button" className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-slate-900 bg-white hover:bg-red-50 text-slate-900 font-bold transition shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        <span>Keluar</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 p-6 lg:p-10 overflow-y-auto relative min-h-screen">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-10">
                    <Asterisk className="w-64 h-64 text-slate-900" />
                </div>

                <header className="flex flex-col md:flex-row md:justify-between md:items-center mb-12 relative z-10 gap-4">
                    <div className="flex items-center gap-4">
                        {/* Mobile Toggle */}
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                            {activeTab === 'overview' && 'Ringkasan'}
                            {activeTab === 'orders' && 'Order Saya'}
                            {activeTab === 'profile' && 'Profil Saya'}
                        </h1>
                    </div>

                    <p className="text-lg text-slate-500 font-medium whitespace-nowrap md:whitespace-normal overflow-hidden text-ellipsis md:overflow-visible max-w-full">
                        Selamat datang, <span className="text-slate-900 font-bold underline decoration-yellow-400 underline-offset-4">{user.name}</span>!
                    </p>
                </header>

                {/* NOTIFICATIONS */}
                <div className="mb-8 space-y-4 relative z-10">
                    {/* Flash Message */}
                    {flash?.message && (
                        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-r shadow-sm">
                            <p className="font-bold">Notification</p>
                            <p className="text-sm">{flash.message}</p>
                        </div>
                    )}

                    {/* Completed Order Notification */}
                    {(() => {
                        const newCompleted = orderList.filter(o => o.status === 'completed' && !dismissedIds.includes(o.id));
                        if (newCompleted.length > 0) {
                            return (
                                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-r shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <p className="font-bold flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Order Completed!
                                        </p>
                                        <p className="text-sm">You have {newCompleted.length} completed order(s). Check them now!</p>
                                    </div>
                                    <button
                                        onClick={() => handleViewOrders(newCompleted.map(o => o.id))}
                                        className="whitespace-nowrap px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-green-700 transition"
                                    >
                                        Lihat Order
                                    </button>
                                </div>
                            );
                        }
                    })()}
                </div>

                {/* OVERVIEW CONTENT */}
                {activeTab === 'overview' && (
                    <div className="space-y-10 animate-fade-in-up relative z-10">
                        {/* ACTION NEEDED BANNER */}
                        {(() => {
                            const reviewOrder = orderList.find(
                                o => o.status === 'review' ||
                                (o.milestones && o.milestones.some(m => ['submitted', 'customer_review'].includes(m.status)))
                            );
                            return reviewOrder ? (
                                <div className="bg-purple-100 border-2 border-purple-600 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between shadow-[6px_6px_0px_0px_rgba(147,51,234,1)]">
                                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-black text-2xl animate-pulse">
                                            !
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-purple-900">Review Diperlukan!</h3>
                                            <p className="text-purple-700 font-medium">Ada pekerjaan (Revisi/Milestone) yang menunggu review Anda.</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={route('orders.review', reviewOrder.id)}
                                        className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl border-2 border-purple-900 hover:bg-purple-700 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                                    >
                                        Review Sekarang &rarr;
                                    </Link>
                                </div>
                            ) : null;
                        })()}

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Order', value: stats.total_orders, bg: 'bg-white', iconColor: 'text-blue-600' },
                                { label: 'Order Aktif', value: stats.active_orders, bg: 'bg-yellow-50', iconColor: 'text-yellow-600' },
                                { label: 'Selesai', value: stats.completed_orders, bg: 'bg-green-50', iconColor: 'text-green-600' },
                                { label: 'Menunggu Bayar', value: stats.pending_payment_orders, bg: 'bg-orange-50', iconColor: 'text-orange-600' },
                            ].map((stat, idx) => (
                                <div key={idx} className="bg-white rounded-[2rem] p-6 border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-transform">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{stat.label}</p>
                                            <h3 className="text-4xl font-black mt-2 text-slate-900">{stat.value}</h3>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-[8px_8px_0px_0px_#fbbf24] border-2 border-slate-900">
                                <Asterisk className="absolute -top-10 -right-10 w-48 h-48 text-white/10 animate-spin-slow" />
                                <h3 className="text-3xl font-black mb-4 relative z-10">Mulai Project Baru?</h3>
                                <p className="text-slate-300 mb-8 relative z-10 max-w-sm text-lg">Temukan layanan terbaik kami untuk membantu tugasmu selesai lebih cepat.</p>
                                <Link href="/#services" className="inline-flex items-center px-8 py-4 bg-yellow-400 text-slate-900 font-black rounded-xl border-2 border-slate-900 hover:bg-yellow-300 transition shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] relative z-10">
                                    + Buat Order Baru
                                </Link>
                            </div>

                            <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                                <h3 className="text-2xl font-black mb-6 text-slate-900">Status Profil</h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="font-bold text-slate-500">Kelengkapan Data</span>
                                        <span className="font-black text-2xl text-slate-900">{progressPercentage}%</span>
                                    </div>
                                    <div className="w-full rounded-full h-6 bg-slate-100 border-2 border-slate-900 overflow-hidden">
                                        <div className="h-full bg-yellow-400 border-r-2 border-slate-900 transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                                    </div>
                                    <p className="text-slate-600 font-medium leading-relaxed">
                                        {progressPercentage === 100
                                            ? "Hebat! Profil Anda sudah lengkap. Anda siap untuk melakukan pemesanan."
                                            : "Lengkapi profil Anda untuk memudahkan administrasi dan verifikasi order layanan kami."}
                                    </p>
                                    <button onClick={() => setActiveTab('profile')} className="text-slate-900 font-bold underline decoration-2 decoration-yellow-400 hover:bg-yellow-400 hover:text-slate-900 transition-colors px-2 py-1 rounded inline-block">
                                        Lengkapi Profil &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ORDERS CONTENT */}
                {activeTab === 'orders' && (
                    <div className="bg-white rounded-[2rem] border-2 border-slate-900 overflow-hidden shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-fade-in-up">
                        {orderList.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-900 flex items-center justify-center mx-auto mb-6">
                                    <Asterisk className="w-12 h-12 text-slate-400" />
                                </div>
                                <h3 className="text-2xl font-black mb-2 text-slate-900">Belum ada pesanan</h3>
                                <p className="mb-8 text-slate-500 font-medium">Anda belum pernah melakukan pemesanan layanan apapun.</p>
                                <Link href="/#services" className="px-8 py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                    Buat Order Sekarang
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Card View */}
                                <div className="md:hidden">
                                    {orderList.map((order) => (
                                        <div key={order.id} className="p-6 border-b-2 border-slate-100 last:border-b-0">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1">
                                                        #{order.order_number}
                                                    </span>
                                                    <h4 className="font-black text-lg text-slate-900 leading-tight">
                                                        {order.package?.service?.name}
                                                    </h4>
                                                    <p className="text-sm font-bold text-slate-500">
                                                        {order.package?.name}
                                                    </p>
                                                </div>
                                                <span className={`px-3 py-1 text-[10px] font-black rounded-lg border-2 
                                                    ${order.status === 'completed' ? 'bg-green-100 text-green-700 border-green-700' :
                                                        order.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-700' :
                                                            order.status === 'review' ? 'bg-purple-100 text-purple-700 border-purple-700' :
                                                                order.status === 'revision' ? 'bg-orange-100 text-orange-700 border-orange-700' :
                                                                    order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-700' :
                                                                        'bg-yellow-100 text-yellow-700 border-yellow-700'}`}>
                                                    {order.status === 'review' ? 'REVIEW NEEDED' : order.status.replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Tagihan</p>
                                                    <p className="text-xl font-black text-slate-900">
                                                        Rp {new Intl.NumberFormat('id-ID').format(order.amount)}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex gap-2">
                                                        <button type="button" onClick={() => setSelectedInvoiceOrder(order)} className="p-2 border-2 border-slate-900 rounded-lg text-slate-900 hover:bg-slate-900 hover:text-white transition group">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                        </button>
                                                        <Link href={route('orders.show', order.id)} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition">
                                                            Detail
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>

                                            {(order.status === 'review' || order.status === 'pending_payment') && (
                                                <div className="mt-4 pt-4 border-t-2 border-slate-100 flex gap-2">
                                                    {order.status === 'review' && (
                                                        <Link href={route('orders.review', order.id)} className="flex-1 px-4 py-2 bg-purple-600 text-white text-center text-sm font-black rounded-lg border-2 border-purple-900 hover:bg-purple-700 shadow-[2px_2px_0px_0px_rgba(88,28,135,1)] hover:translate-y-px hover:shadow-none transition-all">
                                                            BERIKAN REVIEW
                                                        </Link>
                                                    )}
                                                    {order.status === 'pending_payment' && (
                                                        <Link
                                                            href={route('orders.cancel', order.id)}
                                                            method="post"
                                                            as="button"
                                                            className="flex-1 px-4 py-2 bg-red-50 text-red-600 text-center text-sm font-bold rounded-lg border-2 border-red-100 hover:border-red-600 hover:bg-red-100 transition-colors"
                                                            preserveScroll
                                                        >
                                                            Batalkan Order
                                                        </Link>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="uppercase text-sm font-black bg-yellow-400 text-slate-900 border-b-2 border-slate-900">
                                            <tr>
                                                <th className="px-8 py-5">ID Order</th>
                                                <th className="px-8 py-5">Layanan</th>
                                                <th className="px-8 py-5">Status</th>
                                                <th className="px-8 py-5">Tagihan</th>
                                                <th className="px-8 py-5">Invoice</th>
                                                <th className="px-8 py-5">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-slate-100">
                                            {orderList.map((order) => (
                                                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-8 py-5 font-mono font-bold text-slate-900">#{order.order_number}</td>
                                                    <td className="px-8 py-5">
                                                        <div className="font-bold text-slate-900">{order.package?.service?.name}</div>
                                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{order.package?.name}</div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1 text-xs font-black rounded-lg border-2 whitespace-nowrap
                                                            ${order.status === 'completed' ? 'bg-green-100 text-green-700 border-green-700' :
                                                                order.status === 'in_progress' ? 'bg-blue-100 text-blue-700 border-blue-700' :
                                                                    order.status === 'review' ? 'bg-purple-100 text-purple-700 border-purple-700' :
                                                                        order.status === 'revision' ? 'bg-orange-100 text-orange-700 border-orange-700' :
                                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-700' :
                                                                                'bg-yellow-100 text-yellow-700 border-yellow-700'}`}>
                                                            {order.status === 'review' ? 'REVIEW NEEDED' : order.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 font-bold text-slate-900">
                                                        Rp {new Intl.NumberFormat('id-ID').format(order.amount)}
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <button type="button" onClick={() => setSelectedInvoiceOrder(order)} className="inline-flex items-center px-3 py-1 border-2 border-slate-900 rounded-lg text-xs font-bold hover:bg-slate-900 hover:text-white transition">
                                                            PDF
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center space-x-3">
                                                            {order.status === 'review' && (
                                                                <Link href={route('orders.review', order.id)} className="px-3 py-1 bg-purple-600 text-white text-xs font-black rounded border-2 border-purple-900 hover:bg-purple-700 shadow-[2px_2px_0px_0px_rgba(88,28,135,1)] transition-transform hover:-translate-y-0.5">
                                                                    REVIEW!
                                                                </Link>
                                                            )}
                                                            <Link href={route('orders.show', order.id)} className="font-bold text-xs text-slate-900 underline hover:text-blue-600">
                                                                Detail
                                                            </Link>
                                                            {order.status === 'pending_payment' && (
                                                                <Link
                                                                    href={route('orders.cancel', order.id)}
                                                                    method="post"
                                                                    as="button"
                                                                    className="font-bold text-red-600 hover:text-red-800"
                                                                    preserveScroll
                                                                >
                                                                    Cancel
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* PROFILE CONTENT */}
                {activeTab === 'profile' && (
                    <div className="max-w-3xl bg-white border-2 border-slate-900 rounded-[2rem] p-10 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] animate-fade-in-up">
                        <h3 className="text-2xl font-black mb-8 text-slate-900 flex items-center gap-3">
                            <span className="w-8 h-8 bg-yellow-400 rounded-full border-2 border-slate-900 block"></span>
                            Edit Profil
                        </h3>

                        {profileSuccessful && (
                            <div className="mb-8 p-4 bg-green-100 border-2 border-green-700 rounded-xl text-green-800 font-bold flex items-center shadow-[4px_4px_0px_0px_#15803d]">
                                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                Profil berhasil diperbarui!
                            </div>
                        )}

                        <form onSubmit={submitProfile} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Nama Lengkap</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-2 border-slate-900 px-4 py-3 focus:ring-0 focus:border-slate-900 focus:bg-yellow-50 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] font-medium"
                                        value={profileData.name}
                                        onChange={e => setProfileData('name', e.target.value)}
                                    />
                                    {profileErrors.name && <p className="text-red-600 font-bold text-xs mt-1 border-l-2 border-red-600 pl-2">{profileErrors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Email</label>
                                    <input
                                        type="email"
                                        className="w-full rounded-xl border-2 border-slate-900 px-4 py-3 bg-slate-100 text-slate-500 cursor-not-allowed font-medium"
                                        value={profileData.email}
                                        readOnly
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">No. WhatsApp</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-2 border-slate-900 px-4 py-3 focus:ring-0 focus:border-slate-900 focus:bg-yellow-50 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] font-medium"
                                        placeholder="0812..."
                                        value={profileData.phone}
                                        onChange={e => setProfileData('phone', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Universitas / Sekolah</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-2 border-slate-900 px-4 py-3 focus:ring-0 focus:border-slate-900 focus:bg-yellow-50 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] font-medium"
                                        placeholder="Asal Instansi"
                                        value={profileData.university}
                                        onChange={e => setProfileData('university', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">Alamat Lengkap</label>
                                <textarea
                                    className="w-full rounded-xl border-2 border-slate-900 px-4 py-3 focus:ring-0 focus:border-slate-900 focus:bg-yellow-50 transition h-32 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] font-medium"
                                    placeholder="Jalan..."
                                    value={profileData.address}
                                    onChange={e => setProfileData('address', e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex justify-end pt-6 border-t-2 border-slate-100">
                                <button
                                    type="submit"
                                    disabled={profileProcessing}
                                    className="px-8 py-4 bg-slate-900 text-white font-black rounded-xl border-2 border-slate-900 hover:bg-slate-800 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50"
                                >
                                    {profileProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

            <InvoiceModal 
                isOpen={!!selectedInvoiceOrder} 
                onClose={() => setSelectedInvoiceOrder(null)} 
                order={selectedInvoiceOrder} 
            />
        </div>
    );
}
