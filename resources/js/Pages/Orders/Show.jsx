import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { useState, useEffect } from 'react';
import useAutoReload from '@/Hooks/useAutoReload';

export default function Show({ auth, order, whatsapp_number, qris_image }) {
    // Silent background polling — 15s for active order pages so status updates fast
    useAutoReload(['order'], 15_000);

    const { data, setData, post, processing, errors } = useForm({
        payment_proof: null,
        result_file: null,
        status: order.status,
    });

    const { data: ratingData, setData: setRatingData, post: postRating, processing: ratingProcessing } = useForm({
        rating: 5,
        comment: ''
    });

    const { data: revisionData, setData: setRevisionData, post: postRevision, processing: revisionProcessing } = useForm({
        reason: ''
    });

    const { data: extraPayData, setData: setExtraPayData, post: postExtraPay, processing: extraPayProcessing, errors: extraPayErrors, reset: resetExtraPay } = useForm({
        payment_proof: null
    });

    // Countdown Logic (3 hours from created_at)
    const calculateTimeLeft = () => {
        const createdTime = new Date(order.created_at).getTime();
        const expiryTime = createdTime + (3 * 60 * 60 * 1000); // 3 hours in ms
        const now = new Date().getTime();
        const distance = expiryTime - now;
        return distance > 0 ? distance : 0;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    const [paymentMethod, setPaymentMethod] = useState(
        // Untuk order negosiasi: selalu mulai dari 'va' agar customer bisa pilih bebas
        order.is_negotiation ? 'va' : (order.payment_method || 'va')
    );
    const [selectedBank, setSelectedBank] = useState('BCA');
    const [showAcceptModal, setShowAcceptModal] = useState(false);
    const [showRevisionModal, setShowRevisionModal] = useState(false);
    const [showPaymentWarningModal, setShowPaymentWarningModal] = useState(false);
    const [showFileErrorModal, setShowFileErrorModal] = useState(false);
    const [fileErrorMessage, setFileErrorMessage] = useState('');

    // Flash / query message
    const pageProps = usePage().props;
    const flashMessage = pageProps?.flash?.message || null;

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(interval);
    }, [order.created_at]);

    // Show file error modal when server returns a payment_proof validation error
    useEffect(() => {
        if (errors.payment_proof) {
            setFileErrorMessage(errors.payment_proof);
            setShowFileErrorModal(true);
        }
    }, [errors.payment_proof]);

    const formatTime = (ms) => {
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((ms % (1000 * 60)) / 1000);
        return `${hours}h ${minutes}m ${seconds}s`;
    };

    const handleFileChange = (e, fieldname, setterFunc) => {
        const file = e.target.files[0];
        if (!file) {
            setterFunc(fieldname, null);
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            setFileErrorMessage('Format file tidak didukung. Hanya file JPG, PNG, dan PDF yang diperbolehkan.');
            setShowFileErrorModal(true);
            e.target.value = null; 
            setterFunc(fieldname, null);
            return;
        }

        if (file.size > maxSize) {
            setFileErrorMessage('Ukuran file terlalu besar. Maksimal ukuran file adalah 5MB.');
            setShowFileErrorModal(true);
            e.target.value = null; 
            setterFunc(fieldname, null);
            return;
        }

        setterFunc(fieldname, file);
    };

    const confirmViaWhatsapp = () => {
        const message = `Halo Admin Beresin, saya telah melakukan pemesanan baru via Website.

No Order: ${order.order_number}
Nama: ${order.user.name}
Layanan: ${order.package.service.name}
Paket: ${order.package.name}

Mohon konfirmasi dan prosesnya. Terima kasih.`;
        const targetNumber = whatsapp_number || '6281234567890';
        const whatsappUrl = `https://wa.me/${targetNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const uploadPayment = (e) => {
        e.preventDefault();
        if (!data.payment_proof) {
            setShowPaymentWarningModal(true);
            return;
        }
        post(route('orders.update', order.id));
    };

    const handleAccept = (e) => {
        e.preventDefault();
        postRating(route('orders.accept', order.id), {
            onSuccess: () => setShowAcceptModal(false)
        });
    };

    const handleRevision = (e) => {
        e.preventDefault();
        postRevision(route('orders.revision', order.id), {
            onSuccess: () => setShowRevisionModal(false)
        });
    };

    // Rating Stars Helper
    const StarRating = ({ rating, setRating }) => {
        return (
            <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`text-2xl focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                        ★
                    </button>
                ))}
            </div>
        );
    };

    const shouldHideHome = (order.status === 'pending_payment' && order.payment_proof) || order.status === 'waiting_approval';

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Order #{order.order_number}</h2>}
            hideHomeLink={shouldHideHome}
        >
            <Head title={`Order #${order.order_number}`} />

            <div className="py-12 bg-gray-50 min-h-screen">
                <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">

                    {/* Flash Message Banner */}
                    {flashMessage && (
                        <div className="mb-6 bg-green-50 border-2 border-green-500 rounded-2xl p-4 flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            <p className="text-green-800 font-semibold">{flashMessage}</p>
                        </div>
                    )}

                    {/* TOP STATUS BAR */}
                    <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className={`px-4 py-2 rounded-full font-bold text-sm uppercase ${order.status === 'pending_payment' ? 'bg-orange-100 text-orange-600' :
                                order.status === 'waiting_approval' ? 'bg-yellow-100 text-yellow-800' :
                                    order.status === 'completed' ? 'bg-green-100 text-green-600' :
                                        order.status === 'review' ? 'bg-purple-100 text-purple-600' :
                                            order.status === 'finalization' ? 'bg-indigo-100 text-indigo-600' :
                                                'bg-blue-100 text-blue-600'
                                }`}>
                                {order.status === 'review' ? 'Waiting Your Review' :
                                    order.status === 'finalization' ? 'Proses Finalisasi oleh Joki' :
                                        order.status.replace('_', ' ')}
                            </div>
                            {order.status === 'pending_payment' && (
                                <div className="text-red-500 font-bold flex items-center gap-2">
                                    <span>⏳ Expires in:</span>
                                    <span className="font-mono text-xl">{formatTime(timeLeft)}</span>
                                </div>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-2xl font-extrabold text-gray-900">Rp {new Intl.NumberFormat('id-ID').format(order.amount)}</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* LEFT: MAIN CONTENT */}
                        <div className="md:col-span-2 space-y-6">

                            {/* PENDING PAYMENT or WAITING APPROVAL */}
                            {(order.status === 'pending_payment' || order.status === 'waiting_approval') && (
                                <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-6">
                                    <h3 className="text-xl font-black text-slate-900 mb-6 pb-4 border-b-2 border-slate-100">
                                        {order.status === 'waiting_approval'
                                            ? 'Status Proposal'
                                            : (order.is_negotiation && order.status === 'pending_payment')
                                                ? 'Lakukan Pembayaran'
                                                : 'Payment Instructions'}
                                    </h3>

                                    {/* Banner khusus: Proposal Pelajar Diterima */}
                                    {order.status === 'pending_payment' && order.is_negotiation && !order.payment_proof && (
                                        <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-5 mb-6 shadow-[4px_4px_0px_0px_rgba(16,185,129,0.3)]">
                                            <div className="flex items-start gap-4">
                                                <div className="text-3xl flex-shrink-0">🎉</div>
                                                <div>
                                                    <h4 className="font-black text-lg text-emerald-800 mb-1">Proposal Anda Diterima!</h4>
                                                    <p className="text-emerald-700 text-sm mb-3">
                                                        Admin telah menyetujui proposal paket pelajar Anda. Silakan lakukan pembayaran untuk melanjutkan order.
                                                    </p>
                                                    <div className="bg-white border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-4">
                                                        <div>
                                                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Pembayaran</p>
                                                            <p className="text-2xl font-black text-emerald-700">Rp {new Intl.NumberFormat('id-ID').format(order.amount)}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-gray-400">Paket</p>
                                                            <p className="text-sm font-bold text-gray-700">{order.package?.name || 'Paket Pelajar'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {order.status === 'pending_payment' && !order.payment_proof && (
                                        <>
                                            {/* Tabs: tampilkan SELALU untuk negosiasi, atau jika payment_method belum diset */}
                                            {(!order.payment_method || order.is_negotiation) && (
                                                <div className="flex gap-4 mb-6">
                                                    <button
                                                        onClick={() => setPaymentMethod('va')}
                                                        className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${paymentMethod === 'va' ? 'border-slate-900 bg-yellow-400 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-900'}`}
                                                    >
                                                        Virtual Account
                                                    </button>
                                                    <button
                                                        onClick={() => setPaymentMethod('qris')}
                                                        className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${paymentMethod === 'qris' ? 'border-slate-900 bg-yellow-400 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-900'}`}
                                                    >
                                                        QRIS
                                                    </button>
                                                </div>
                                            )}


                                            {/* VA Content */}
                                            {(paymentMethod === 'va') && (
                                                <div className="animate-fade-in">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-slate-200">Method</span>
                                                        <h4 className="font-bold text-lg text-slate-800">Virtual Account Transfer</h4>
                                                    </div>

                                                    <p className="mb-4 text-sm text-gray-600">Select Bank:</p>
                                                    <div className="flex gap-3 mb-6">
                                                        {['BCA', 'Mandiri', 'BNI', 'BRI'].map(bank => (
                                                            <button
                                                                key={bank}
                                                                onClick={() => setSelectedBank(bank)}
                                                                className={`px-4 py-2 rounded-xl border-2 text-sm font-black transition-all ${selectedBank === bank ? 'border-slate-900 bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]' : 'border-slate-300 text-slate-600 hover:border-slate-900'}`}
                                                            >
                                                                {bank}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-400 text-center mb-6">
                                                        <p className="text-gray-500 text-sm mb-2">Virtual Account Number ({selectedBank})</p>
                                                        <div className="flex items-center justify-center gap-2">
                                                            <h2 className="text-3xl font-mono font-bold text-gray-800 tracking-wider">8801234567890</h2>
                                                            <button className="text-indigo-600 hover:text-indigo-800 text-sm font-bold ml-2">COPY</button>
                                                        </div>
                                                    </div>

                                                    <div className="text-sm text-gray-600 space-y-2">
                                                        <p className="font-bold">How to pay:</p>
                                                        <ol className="list-decimal list-inside space-y-1 ml-2">
                                                            <li>Open your Mobile Banking app (m-Ranking).</li>
                                                            <li>Select <strong>Payment</strong> or <strong>Transfer</strong> menu.</li>
                                                            <li>Choose <strong>Virtual Account</strong>.</li>
                                                            <li>Enter the VA number above.</li>
                                                            <li>Confirm the payment details.</li>
                                                            <li>Save the transaction receipt.</li>
                                                        </ol>
                                                    </div>
                                                </div>
                                            )}

                                            {/* QRIS Content */}
                                            {(paymentMethod === 'qris') && (
                                                <div className="animate-fade-in text-center">
                                                    <div className="flex items-center justify-center gap-2 mb-4">
                                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase border border-slate-200">Method</span>
                                                        <h4 className="font-bold text-lg text-slate-800">QRIS Scan</h4>
                                                    </div>

                                                    <p className="mb-4 text-sm text-gray-600">Scan this QR Code with GoPay, OVO, Dana, or Mobile Banking:</p>
                                                    <div className="bg-white border-2 border-slate-900 inline-block p-4 rounded-2xl mb-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                                                        {qris_image ? (
                                                            <img src={`/storage/${qris_image}`} alt="QRIS" className="w-64 h-auto mx-auto rounded-lg" />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center w-48 h-48 bg-gray-100 rounded-lg">
                                                                <span className="text-gray-400 text-sm">No QRIS Image Configured</span>
                                                            </div>
                                                        )}
                                                        <p className="text-xs font-bold mt-2">BERESIN PAYMENT</p>
                                                    </div>
                                                    <div className="text-sm text-left max-w-md mx-auto space-y-2">
                                                        <ol className="list-decimal list-inside space-y-1 ml-2 text-gray-600">
                                                            <li>Open any e-wallet or banking app.</li>
                                                            <li>Select <strong>Scan QR</strong>.</li>
                                                            <li>Scan the code above.</li>
                                                            <li>Check the merchant name "Beresin".</li>
                                                            <li>Enter amount manually if not set.</li>
                                                            <li>Confirm payment.</li>
                                                        </ol>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Upload Form (Only visible if not uploaded) */}
                                            <div className="mt-8 pt-6 border-t border-gray-100">
                                                <div className="mt-4">
                                                    <p className="text-sm text-gray-500 mb-2">Already transferred? Upload proof:</p>
                                                    <form onSubmit={uploadPayment} className="flex gap-2">
                                                        <input
                                                            type="file"
                                                            onChange={e => handleFileChange(e, 'payment_proof', setData)}
                                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                                                        />
                                                        <button disabled={processing} className="whitespace-nowrap bg-slate-900 text-white font-bold py-2 px-6 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(203,213,225,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all">Upload</button>
                                                    </form>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* POST-UPLOAD VIEW: Details Hidden, Confirmation Shown */}
                                    {order.status === 'pending_payment' && order.payment_proof && (
                                        <div className="text-center py-6 animate-fade-in">
                                            <div className="bg-amber-50 p-6 rounded-2xl border-2 border-amber-500 shadow-[4px_4px_0px_0px_rgba(245,158,11,1)] mb-6">
                                                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                                                    <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">Payment Proof Uploaded!</h3>
                                                <p className="text-gray-600">Waiting for your confirmation to notify Admin.</p>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    post(route('orders.update', { order: order.id, action: 'confirm_payment' }), {
                                                        onSuccess: () => confirmViaWhatsapp()
                                                    });
                                                }}
                                                disabled={processing}
                                                className="w-full bg-slate-900 text-white font-black text-lg py-4 rounded-xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex items-center justify-center gap-2 animate-pulse"
                                            >
                                                Confirm Payment to Admin 🚀
                                            </button>
                                        </div>
                                    )}

                                    {/* WAITING APPROVAL VIEW - distinguish negotiation vs payment */}
                                    {order.status === 'waiting_approval' && (
                                        <div className="text-center py-6">
                                            {order.is_negotiation ? (
                                                order.payment_proof ? (
                                                    /* Fase 2: sudah bayar, menunggu verifikasi admin */
                                                    <div className="bg-emerald-50 border-2 border-emerald-400 p-6 rounded-2xl mb-6">
                                                        <div className="text-4xl mb-4">💳</div>
                                                        <h3 className="font-bold text-lg text-emerald-800 mb-2">Pembayaran Sedang Diverifikasi</h3>
                                                        <p className="text-emerald-700 mb-3">Terima kasih! Bukti pembayaran Anda sedang dalam proses verifikasi oleh admin.</p>
                                                        <div className="bg-white border border-emerald-200 rounded-xl p-3 text-sm">
                                                            <p className="text-gray-500 font-semibold mb-1">Total yang dibayar:</p>
                                                            <p className="text-2xl font-black text-emerald-700">Rp {new Intl.NumberFormat('id-ID').format(order.amount)}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Fase 1: proposal awal menunggu review admin */
                                                    <div className="bg-indigo-50 border-2 border-indigo-400 p-6 rounded-2xl mb-6">
                                                        <div className="text-4xl mb-4">🤝</div>
                                                        <h3 className="font-bold text-lg text-indigo-800 mb-2">Proposal Sedang Ditinjau Admin</h3>
                                                        <p className="text-indigo-700">Proposal Anda telah dikirim! Admin akan meninjau dan segera menghubungi Anda.</p>
                                                        {order.proposed_price > 0 && (
                                                            <div className="mt-4 bg-white p-3 rounded-xl border border-indigo-200 text-sm">
                                                                <p className="text-indigo-600 font-semibold">Penawaran Anda: <span className="text-indigo-800 font-black">Rp {new Intl.NumberFormat('id-ID').format(order.proposed_price)}</span></p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                /* Regular payment - payment under verification */
                                                <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-2xl mb-6">
                                                    <div className="text-4xl mb-4">⏳</div>
                                                    <h3 className="font-bold text-lg text-yellow-800 mb-2">Payment Under Verification</h3>
                                                    <p className="text-yellow-700">Thank you! Your payment is being reviewed.</p>
                                                </div>
                                            )}

                                            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-500">
                                                <p>{order.is_negotiation ? 'Admin akan menghubungi Anda via WhatsApp segera.' : 'Admin has been notified via WhatsApp.'}</p>
                                            </div>

                                            <Link
                                                href="/dashboard"
                                                className="inline-block mt-6 text-slate-500 font-bold hover:text-slate-900 hover:underline transition-all"
                                            >
                                                ← Back to Dashboard
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* COMPLETED / REVIEW / REVISION / IN_PROGRESS */}
                            {order.status !== 'pending_payment' && order.status !== 'waiting_approval' && (
                                <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-6 space-y-6">
                                    {['in_progress', 'review'].includes(order.status) ? (
                                        <div className={`p-6 rounded-2xl border-2 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${order.status === 'review' || (order.milestones && order.milestones.some(m => ['submitted', 'customer_review'].includes(m.status)))
                                            ? 'bg-purple-50 border-purple-600 shadow-[4px_4px_0px_0px_rgba(147,51,234,1)]'
                                            : 'bg-blue-50 border-blue-600 shadow-[4px_4px_0px_0px_rgba(37,99,235,1)]'
                                            }`}>
                                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${order.status === 'review' || (order.milestones && order.milestones.some(m => ['submitted', 'customer_review'].includes(m.status)))
                                                ? 'bg-purple-100 text-purple-600'
                                                : 'bg-blue-100 text-blue-600 animate-pulse'
                                                }`}>
                                                {order.status === 'review' || (order.milestones && order.milestones.some(m => ['submitted', 'customer_review'].includes(m.status))) ? (
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                ) : (
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                {order.status === 'review'
                                                    ? "Final Review Required"
                                                    : (order.milestones && order.milestones.length > 0
                                                        ? (() => {
                                                            const submitted = order.milestones.find(m => ['submitted', 'customer_review'].includes(m.status));
                                                            if (submitted) return `Review Diperlukan: ${submitted.name}`;

                                                            const current = order.milestones.find(m => m.status === 'in_progress');
                                                            return current ? `Sedang Mengerjakan: ${current.name}` : "Pengerjaan Dilanjutkan";
                                                        })()
                                                        : "Pesanan Sedang Dikerjakan"
                                                    )
                                                }
                                            </h3>
                                            <p className="text-gray-600">
                                                {order.status === 'review'
                                                    ? "Seluruh pekerjaan telah selesai. Silakan review hasil akhir dan berikan tanggapan Anda."
                                                    : (order.milestones && order.milestones.some(m => ['submitted', 'customer_review'].includes(m.status))
                                                        ? "Joki telah menyelesaikan milestone ini. Silakan review hasilnya di bawah."
                                                        : (order.milestones && order.milestones.length > 0
                                                            ? "Tim kami sedang mengerjakan milestone ini. Harap tunggu update selanjutnya."
                                                            : "Tim kami sedang memproses pesanan Anda. Harap tunggu notifikasi selanjutnya.")
                                                    )
                                                }
                                            </p>

                                            {/* Tombol Review Sekarang — hanya muncul saat status review */}
                                            {order.status === 'review' && (
                                                <div className="mt-5">
                                                    <Link
                                                        href={route('orders.review', order.id)}
                                                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-black rounded-xl border-2 border-purple-900 shadow-[4px_4px_0px_0px_rgba(88,28,135,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Review Sekarang
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    ) : order.status === 'completed' ? (
                                        <div className="bg-emerald-50 p-6 rounded-2xl border-2 border-emerald-600 shadow-[4px_4px_0px_0px_rgba(5,150,105,1)] text-center">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                                                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Order Completed!</h3>
                                            <p className="text-gray-600 mb-5">Terima kasih telah menggunakan jasa kami. Pesanan Anda telah selesai.</p>
                                            {/* Download result inside completed box */}
                                            {order.result_file && (
                                                <div className="flex flex-col gap-3 items-center mt-2">
                                                    <a
                                                        href={order.result_file.startsWith('http') ? order.result_file : `/storage/${order.result_file}`}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-2 bg-emerald-600 text-white px-7 py-2.5 rounded-full font-bold border-2 border-emerald-900 shadow-[3px_3px_0px_0px_rgba(6,78,59,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                        Download File Hasil 📂
                                                    </a>
                                                    {order.external_link && (
                                                        <a href={order.external_link} target="_blank" className="text-emerald-700 underline font-semibold text-sm hover:text-emerald-900 transition-colors">
                                                            Visit Upload Link 🔗
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-600 shadow-[4px_4px_0px_0px_rgba(75,85,99,1)] text-center">
                                            {/* Fallback for other statuses (e.g. refund_requested) */}
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-200 rounded-full mb-4">
                                                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-2">Status: {order.status.replace('_', ' ').toUpperCase()}</h3>
                                            <p className="text-gray-600">Pesanan dalam status {order.status}. Hubungi admin jika ada pertanyaan.</p>
                                        </div>
                                    )}

                                    {/* Result Section — ONLY shown when order is still in_progress with a result file.
                                         review/revision → user redirected to Review page.
                                         completed → download link is inside the Order Completed box above. */}
                                    {order.result_file && !['completed', 'review', 'revision'].includes(order.status) && (
                                        <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200">
                                            <div className="text-center mb-6">
                                                <h3 className="font-bold text-indigo-900 mb-2 text-lg">Result Available!</h3>

                                                {/* Access Control for Additional Revisions */}
                                                {order.additional_revision_fee > 0 && order.additional_payment_status !== 'paid' ? (
                                                    <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-6 text-center shadow-md">
                                                        <h4 className="text-xl font-bold text-orange-800 mb-2">⚠ Pelunasan Diperlukan</h4>
                                                        <p className="text-orange-700 mb-4">
                                                            Tagihan revisi tambahan: <span className="font-black text-lg">Rp {new Intl.NumberFormat('id-ID').format(order.additional_revision_fee)}</span>
                                                        </p>

                                                        {order.additional_payment_status === 'pending' ? (
                                                            <div className="bg-white p-4 rounded-lg border border-orange-200">
                                                                <p className="text-orange-600 font-bold mb-2">✅ Bukti Pembayaran Terkirim</p>
                                                                <p className="text-sm text-gray-500">Menunggu verifikasi admin. Mohon cek berkala atau hubungi admin untuk percepatan.</p>
                                                                <button
                                                                    onClick={() => confirmViaWhatsapp()}
                                                                    className="mt-3 text-sm font-bold text-green-600 hover:underline"
                                                                >
                                                                    Hubungi Admin via WA
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white p-4 rounded-lg text-left">
                                                                <p className="text-sm font-bold text-gray-700 mb-2 block">Metode Pembayaran:</p>
                                                                <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-2 rounded border">
                                                                    <p><strong>BCA:</strong> 8801234567890 (Beresin Admin)</p>
                                                                    <p><strong>QRIS:</strong> Scan QR code pada menu pembayaran awal.</p>
                                                                </div>

                                                                <form onSubmit={(e) => {
                                                                    e.preventDefault();
                                                                    postExtraPay(route('orders.additional-payment', order.id));
                                                                }}>
                                                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                                                        Upload Bukti Transfer
                                                                    </label>
                                                                    <input
                                                                        type="file"
                                                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 mb-2"
                                                                        onChange={e => handleFileChange(e, 'payment_proof', setExtraPayData)}
                                                                        required
                                                                    />
                                                                    {extraPayErrors.payment_proof && <div className="text-red-500 text-xs mb-2">{extraPayErrors.payment_proof}</div>}

                                                                    <button
                                                                        type="submit"
                                                                        disabled={extraPayProcessing}
                                                                        className="w-full bg-slate-900 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                                                                    >
                                                                        {extraPayProcessing ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
                                                                    </button>
                                                                </form>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-gray-600 text-sm mb-4">Please download and review your result below.</p>
                                                        <div className="flex flex-col gap-3 justify-center items-center">
                                                            {order.result_file && (
                                                                <a href={order.result_file.startsWith('http') ? order.result_file : `/storage/${order.result_file}`} target="_blank" className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-full font-bold border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                                                                    Download Bukti / File 📂
                                                                </a>
                                                            )}
                                                            {order.external_link && (
                                                                <a href={order.external_link} target="_blank" className="text-indigo-600 underline font-semibold mt-2 hover:text-indigo-800 transition-colors">
                                                                    Visit Upload Link 🔗
                                                                </a>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            {/* Review Actions — redirect to Review page which has full payment gate */}
                                            {(order.status === 'review' || (order.status === 'in_progress' && order.result_file)) && (
                                                <div className="border-t border-indigo-200 pt-6 mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                                                    <SecondaryButton onClick={() => setShowRevisionModal(true)} className="justify-center border-red-200 text-red-600 hover:bg-red-50">
                                                        Request Revision
                                                    </SecondaryButton>
                                                    {/* Redirect to Review page — payment gate is enforced there */}
                                                    <Link
                                                        href={route('orders.review', order.id)}
                                                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl border-2 border-emerald-900 shadow-[3px_3px_0px_0px_rgba(6,78,59,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-sm"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                        Accept & Rate (Done)
                                                    </Link>
                                                </div>
                                            )}

                                        </div>
                                    )}

                                    {/* Pesan Revisi dipisah dari container Result Available */}
                                    {order.status === 'revision' && (
                                        <div className="bg-orange-100 p-4 rounded-lg mt-4 text-center border border-orange-200">
                                            <p className="text-orange-800 font-bold">Revision Requested</p>
                                            <p className="text-sm text-orange-700">Waiting for Joki to upload revision.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: ORDER OVERVIEW */}
                        <div className="md:col-span-1">
                            <div className="sticky top-6 flex flex-col gap-4">
                                <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Order Overview</h3>
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-gray-500">Order Code</span>
                                            <span className="font-mono font-bold">{order.order_number}</span>
                                        </div>
                                        <div className="flex justify-between border-b pb-2">
                                            <span className="text-gray-500">Date</span>
                                            <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 block mb-1">Package</span>
                                            <span className="font-bold block text-gray-800">{order.package.service.name}</span>
                                            <span className="text-indigo-600 font-bold">{order.package.name}</span>
                                            {(() => {
                                                let feats = order.package.features;
                                                if (typeof feats === 'string') {
                                                    try {
                                                        feats = JSON.parse(feats);
                                                    } catch (e) {
                                                        console.error("Failed to parse features", e);
                                                        feats = [];
                                                    }
                                                }

                                                if (Array.isArray(feats) && feats.length > 0) {
                                                    return (
                                                        <ul className="mt-2 space-y-1">
                                                            {feats.map((feature, index) => (
                                                                <li key={index} className="flex items-start text-xs text-gray-600">
                                                                    <svg className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                                    {feature}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    );
                                                }
                                                return <p className="text-xs text-gray-400 italic mt-1">No specific features listed.</p>;
                                            })()}
                                        </div>
                                        <div className="pt-2">
                                            <span className="text-gray-500 block mb-1">Description</span>
                                            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-xs leading-relaxed">
                                                {order.description}
                                            </p>
                                        </div>

                                        {/* Selected Add-ons / Features (Dynamic) */}
                                        {order.selected_features && order.selected_features.length > 0 && (
                                            <div className="pt-2 border-t mt-2">
                                                <span className="text-gray-500 block mb-1">Selected Features</span>
                                                <ul className="space-y-1">
                                                    {order.selected_features.map((feature, index) => (
                                                        <li key={index} className="flex items-center text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                                                            <svg className="w-3 h-3 text-indigo-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                            {feature}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* BACK TO DASHBOARD BUTTON */}
                                <Link
                                    href={route('dashboard')}
                                    className="block w-full text-center py-3 bg-white text-slate-900 font-black rounded-lg border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                >
                                    KEMBALI KE DASHBOARD
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accept Modal */}
            <Modal show={showAcceptModal} onClose={() => setShowAcceptModal(false)}>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Rate & Complete</h2>
                    <p className="text-gray-600 mb-6">Are you satisfied with the result? Please leave a rating.</p>
                    <form onSubmit={handleAccept}>
                        <div className="mb-6 flex justify-center">
                            <StarRating rating={ratingData.rating} setRating={(r) => setRatingData('rating', r)} />
                        </div>
                        <div className="mb-6">
                            <InputLabel value="Comment (Optional)" />
                            <TextInput
                                className="w-full mt-1"
                                value={ratingData.comment}
                                onChange={e => setRatingData('comment', e.target.value)}
                                placeholder="Great work!"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <SecondaryButton onClick={() => setShowAcceptModal(false)}>Cancel</SecondaryButton>
                            <PrimaryButton disabled={ratingProcessing} className="bg-emerald-600">Confirm Completion</PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Warning Modal */}
            <Modal show={showPaymentWarningModal} onClose={() => setShowPaymentWarningModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Upload Bukti Dibutuhkan</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Silahkan Upload Bukti Pembayaran Terlebih dahulu sebelum melanjutkan.
                    </p>
                    <button
                        onClick={() => setShowPaymentWarningModal(false)}
                        className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition shadow-lg w-full"
                    >
                        Tutup
                    </button>
                </div>
            </Modal>

            {/* Revision Modal */}
            <Modal show={showRevisionModal} onClose={() => setShowRevisionModal(false)}>
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Request Revision</h2>
                    <p className="text-gray-600 mb-6">What needs to be improved? Please be specific.</p>
                    <form onSubmit={handleRevision}>
                        <div className="mb-6">
                            <InputLabel value="Revision Note" />
                            <textarea
                                className="w-full mt-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                rows="4"
                                value={revisionData.reason}
                                onChange={e => setRevisionData('reason', e.target.value)}
                                placeholder="Please fix..."
                                required
                            ></textarea>
                        </div>
                        <div className="flex justify-end gap-3">
                            <SecondaryButton onClick={() => setShowRevisionModal(false)}>Cancel</SecondaryButton>
                            <PrimaryButton disabled={revisionProcessing} className="bg-red-600 hover:bg-red-700">Submit Request</PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* Error File Modal */}
            <Modal show={showFileErrorModal} onClose={() => setShowFileErrorModal(false)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Upload Gagal</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        {fileErrorMessage}
                    </p>
                    <button
                        onClick={() => setShowFileErrorModal(false)}
                        className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition shadow-lg w-full"
                    >
                        Tutup
                    </button>
                </div>
            </Modal>
        </AuthenticatedLayout >
    );
}
