import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

const BANKS = [
    { key: 'BCA',     label: 'BCA',     va: '8801234567890', color: 'blue' },
    { key: 'Mandiri', label: 'Mandiri', va: '8901234567890', color: 'yellow' },
    { key: 'BNI',     label: 'BNI',     va: '8701234567890', color: 'orange' },
    { key: 'BRI',     label: 'BRI',     va: '8601234567890', color: 'indigo' },
];

export default function AdditionalPayment({ auth, order, qris_image, whatsapp_number }) {
    const maxRevisions   = order.package?.max_revisions ?? 3;
    const extraCount     = Math.max(
        order.additional_revision_fee > 0 ? Math.round(order.additional_revision_fee / 20000) : 0,
        order.revision_count > maxRevisions ? order.revision_count - maxRevisions : 0
    );
    const totalFee = order.additional_revision_fee > 0
        ? order.additional_revision_fee
        : extraCount * 20000;

    const [method, setMethod]     = useState('qris');       // 'qris' | 'va'
    const [selectedBank, setBank] = useState('BCA');
    const [copied, setCopied]     = useState(false);
    const [uploading, setUploading] = useState(false);

    const { data, setData, errors, reset } = useForm({ payment_proof: null });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return setData('payment_proof', null);
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert('Format tidak didukung. Gunakan JPG, PNG, atau PDF.');
            e.target.value = null;
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Ukuran file maksimal 5MB.');
            e.target.value = null;
            return;
        }
        setData('payment_proof', file);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.payment_proof) {
            alert('Harap upload bukti pembayaran terlebih dahulu.');
            return;
        }
        setUploading(true);
        const formData = new FormData();
        formData.append('payment_proof', data.payment_proof);

        router.post(route('orders.additional-payment', order.id), formData, {
            forceFormData: true,
            onSuccess: () => {
                setUploading(false);
                reset();
            },
            onError: () => setUploading(false),
        });
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currentBank = BANKS.find(b => b.key === selectedBank) || BANKS[0];

    // Already submitted — show waiting screen
    if (order.additional_payment_status === 'pending') {
        return (
            <AuthenticatedLayout user={auth.user}
                header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Pelunasan Revisi — Order #{order.order_number}</h2>}
            >
                <Head title="Pelunasan Revisi Tambahan" />
                <div className="py-12 bg-[#F3F3F1] min-h-screen flex items-center justify-center px-4">
                    <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-10 max-w-md w-full text-center">
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-5">
                            <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Menunggu Verifikasi Admin</h2>
                        <p className="text-slate-500 mb-6 text-sm">
                            Bukti pembayaran Anda sudah kami terima dan sedang dalam proses pengecekan. Mohon tunggu konfirmasi via WhatsApp.
                        </p>
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
                            <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-1">Total yang dibayar</p>
                            <p className="text-3xl font-black text-orange-700">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalFee)}
                            </p>
                        </div>
                        <a
                            href={route('orders.review', order.id)}
                            className="block w-full py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 transition text-center"
                        >
                            ← Kembali ke Review
                        </a>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Pelunasan Revisi — Order #{order.order_number}</h2>}
        >
            <Head title="Pelunasan Revisi Tambahan" />

            <div className="py-12 bg-[#F3F3F1] min-h-screen">
                <div className="max-w-2xl mx-auto sm:px-6 lg:px-8 space-y-6">

                    {/* ── Header Tagihan ── */}
                    <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                        {/* Orange bar */}
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-8 py-6 text-white">
                            <div className="flex items-center gap-3 mb-1">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                <span className="font-black text-lg">Tagihan Revisi Tambahan</span>
                            </div>
                            <p className="text-orange-100 text-sm">Order #{order.order_number} · {order.package?.name}</p>
                        </div>

                        {/* Fee breakdown */}
                        <div className="px-8 py-6 grid grid-cols-3 gap-4 border-b-2 border-slate-100">
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Slot Gratis</p>
                                <p className="text-2xl font-black text-slate-900">{maxRevisions}×</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Revisi Tambahan</p>
                                <p className="text-2xl font-black text-orange-600">{extraCount}×</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Harga/Revisi</p>
                                <p className="text-2xl font-black text-slate-900">20k</p>
                            </div>
                        </div>
                        <div className="px-8 py-5 flex items-center justify-between bg-orange-50">
                            <div>
                                <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Total Tagihan</p>
                                <p className="text-3xl font-black text-orange-700">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalFee)}
                                </p>
                                <p className="text-xs text-orange-500 mt-0.5">{extraCount} revisi × Rp 20.000</p>
                            </div>
                            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 border-2 border-orange-200">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* ── Payment Method Selector ── */}
                    <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                        <h3 className="font-black text-xl text-slate-900 mb-4">Metode Pembayaran</h3>

                        {/* Tabs — QRIS first (default) */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {[
                                { key: 'qris', label: 'QRIS', icon: (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M3 3h5v5H3V3zm13 0h5v5h-5V3zM3 16h5v5H3v-5z"/>
                                    </svg>
                                )},
                                { key: 'va',   label: 'Transfer Bank / VA', icon: (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                                    </svg>
                                )},
                            ].map(m => (
                                <button
                                    key={m.key}
                                    onClick={() => setMethod(m.key)}
                                    className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 font-bold transition-all text-sm ${
                                        method === m.key
                                            ? 'border-slate-900 bg-slate-900 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]'
                                            : 'border-slate-200 text-slate-500 hover:border-slate-400'
                                    }`}
                                >
                                    {m.icon}
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {/* ── QRIS Content ── */}
                        {method === 'qris' && (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-slate-200">QRIS Scan</span>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">Scan QR Code berikut menggunakan GoPay, OVO, Dana, atau Mobile Banking:</p>
                                <div className="flex justify-center mb-4">
                                    <div className="bg-white border-2 border-slate-900 inline-block p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        {qris_image ? (
                                            <img src={`/storage/${qris_image}`} alt="QRIS" className="w-52 h-auto mx-auto rounded-lg" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center w-48 h-48 bg-gray-100 rounded-lg">
                                                <svg className="w-12 h-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M3 3h5v5H3V3zm13 0h5v5h-5V3zM3 16h5v5H3v-5z"/>
                                                </svg>
                                                <span className="text-xs text-gray-400 font-bold">No QRIS Configured</span>
                                            </div>
                                        )}
                                        <p className="text-center text-[10px] font-black text-slate-900 mt-2 tracking-widest">BERESIN PAYMENT</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-600">
                                    <ol className="list-decimal list-inside space-y-1 ml-1">
                                        <li>Buka aplikasi e-wallet atau mobile banking.</li>
                                        <li>Pilih menu <strong>Scan QR</strong>.</li>
                                        <li>Scan kode di atas.</li>
                                        <li>Periksa nama merchant: <strong>Beresin</strong>.</li>
                                        <li>Masukkan nominal jika tidak otomatis.</li>
                                        <li>Konfirmasi pembayaran dan simpan buktinya.</li>
                                    </ol>
                                </div>
                            </div>
                        )}

                        {/* ── VA Content ── */}
                        {method === 'va' && (
                            <div className="animate-fade-in">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-slate-200">Virtual Account</span>
                                </div>

                                {/* Bank Selector */}
                                <p className="text-sm text-slate-500 mb-3">Pilih Bank:</p>
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {BANKS.map(bank => (
                                        <button
                                            key={bank.key}
                                            onClick={() => setBank(bank.key)}
                                            className={`px-4 py-2 rounded-xl border-2 text-sm font-black transition-all ${
                                                selectedBank === bank.key
                                                    ? 'border-slate-900 bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                                    : 'border-slate-200 text-slate-600 hover:border-slate-900'
                                            }`}
                                        >
                                            {bank.label}
                                        </button>
                                    ))}
                                </div>

                                {/* VA Number Display */}
                                <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center mb-5">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Nomor Virtual Account ({currentBank.label})
                                    </p>
                                    <p className="font-mono text-3xl font-bold text-slate-900 tracking-widest mb-3">{currentBank.va}</p>
                                    <button
                                        onClick={() => handleCopy(currentBank.va)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                                            copied
                                                ? 'bg-green-100 text-green-700 border-green-300'
                                                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-900'
                                        }`}
                                    >
                                        {copied ? (
                                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Tersalin!</>
                                        ) : (
                                            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>Salin Nomor VA</>
                                        )}
                                    </button>
                                    <p className="text-xs text-slate-400 mt-2">a.n. Beresin Admin</p>
                                </div>

                                {/* Steps */}
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-600">
                                    <p className="font-bold text-slate-700 mb-2">Cara Bayar:</p>
                                    <ol className="list-decimal list-inside space-y-1 ml-1">
                                        <li>Buka Mobile Banking / ATM {currentBank.label}.</li>
                                        <li>Pilih menu <strong>Transfer</strong> atau <strong>Bayar</strong>.</li>
                                        <li>Pilih <strong>Virtual Account</strong>.</li>
                                        <li>Masukkan nomor VA di atas.</li>
                                        <li>Pastikan nominal: <strong>Rp {new Intl.NumberFormat('id-ID').format(totalFee)}</strong>.</li>
                                        <li>Konfirmasi dan simpan bukti transfer.</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Upload Bukti ── */}
                    <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
                        <h3 className="font-black text-xl text-slate-900 mb-1">Upload Bukti Pembayaran</h3>
                        <p className="text-sm text-slate-400 mb-5">Setelah transfer, upload screenshot/foto bukti pembayaran di sini.</p>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-5">
                                <label className="block w-full cursor-pointer">
                                    <div className="border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-2xl p-8 text-center transition-all group">
                                        {data.payment_proof ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <p className="font-bold text-green-700">{data.payment_proof.name}</p>
                                                <p className="text-xs text-slate-400">{(data.payment_proof.size / 1024).toFixed(1)} KB</p>
                                                <p className="text-xs text-orange-500 font-bold">Klik untuk ganti file</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-14 h-14 bg-slate-100 group-hover:bg-orange-100 rounded-2xl flex items-center justify-center transition-colors">
                                                    <svg className="w-7 h-7 text-slate-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                    </svg>
                                                </div>
                                                <p className="font-bold text-slate-600 group-hover:text-orange-600 transition-colors">Klik atau drag file ke sini</p>
                                                <p className="text-xs text-slate-400">JPG, PNG, PDF • Maks 5MB</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,application/pdf"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>
                                {errors.payment_proof && (
                                    <p className="text-red-500 text-xs mt-2 font-bold">{errors.payment_proof}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={uploading || !data.payment_proof}
                                className="w-full py-4 bg-orange-600 text-white font-black rounded-xl border-2 border-orange-800 shadow-[4px_4px_0px_0px_rgba(154,52,18,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0px_0px_rgba(154,52,18,1)]"
                            >
                                {uploading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Mengirim...
                                    </span>
                                ) : 'Kirim Bukti Pembayaran'}
                            </button>

                            <p className="text-center text-xs text-slate-400 mt-3">
                                Setelah upload, admin akan memverifikasi dalam 1×24 jam. Anda juga dapat
                                {' '}
                                {whatsapp_number && (
                                    <a
                                        href={`https://wa.me/${whatsapp_number}?text=${encodeURIComponent(`Halo Admin, saya sudah upload bukti bayar revisi tambahan untuk order #${order.order_number}. Mohon segera diverifikasi.`)}`}
                                        target="_blank"
                                        className="text-green-600 font-bold hover:underline"
                                    >
                                        konfirmasi via WhatsApp
                                    </a>
                                )}
                                {' '}untuk mempercepat proses.
                            </p>
                        </form>
                    </div>

                    {/* ── Back button ── */}
                    <div className="text-center pb-4">
                        <a
                            href={route('orders.review', order.id)}
                            className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Kembali ke Halaman Review
                        </a>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
