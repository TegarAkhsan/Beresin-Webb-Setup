import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, Link, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import { useState } from 'react';

// Helper: returns full URL if already absolute, else prepends /storage/
const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
};

export default function Review({ auth, order }) {
    const { data: ratingData, setData: setRatingData, post: postRating, processing: ratingProcessing, errors: ratingErrors, reset: resetRating } = useForm({
        rating: 5,
        comment: ''
    });

    const { data: revisionData, setData: setRevisionData, post: postRevision, processing: revisionProcessing, errors: revisionErrors, reset: resetRevision, transform: transformRevision } = useForm({
        reason: '',
        revision_file: null
    });

    const { data: paymentData, setData: setPaymentData, post: postPayment, processing: paymentProcessing, errors: paymentErrors } = useForm({
        payment_method: 'qris',
        payment_proof: null
    });

    const [modalType, setModalType] = useState(null); // 'accept' | 'revision' | 'refund' | 'confirm_milestone' | 'payment'
    const [refundStep, setRefundStep] = useState(1);

    const isImage = (path) => {
        if (!path) return false;
        const ext = path.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
    };

    const handleAccept = (e) => {
        e.preventDefault();

        // removed checking for payment status, customer can pay later
        postRating(route('orders.accept', order.id), {
            onSuccess: () => setModalType(null)
        });
    };

    const handleMilestoneConfirm = () => {
        router.post(route('orders.accept', order.id), {
            rating: 5,
            comment: 'Milestone Approved'
        }, {
            onSuccess: () => setModalType(null)
        });
    }

    const handleRevision = (e) => {
        e.preventDefault();
        postRevision(route('orders.revision', order.id), {
            onSuccess: () => setModalType(null)
        });
    };

    // Calculate Refund Vars
    const completedWeight = (order.milestones || [])
        .filter(m => m.status === 'completed')
        .reduce((sum, m) => sum + m.weight, 0);

    // Default to 100% refundable if no milestones exist or flow hasn't started.
    // Otherwise, refund logic: 100% - Completed Weight.
    const refundPercent = (order.milestones && order.milestones.length > 0)
        ? (100 - completedWeight)
        : 100;

    const refundAmount = (order.amount * refundPercent) / 100;


    // Star Rating Helper
    const StarRating = ({ rating, setRating }) => (
        <div className="flex space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-4xl transition-transform hover:scale-110 focus:outline-none ${star <= rating ? 'text-yellow-400 drop-shadow-md' : 'text-gray-300'}`}
                >
                    ★
                </button>
            ))}
        </div>
    );

    // Helper: Identify if there's a milestone needing review
    const pendingMilestone = order.milestones && order.milestones.find(m => ['submitted', 'customer_review'].includes(m.status));

    // Helper: Determine file/link/note to show
    const displayFile = order.result_file || pendingMilestone?.file_path;
    const displayLink = pendingMilestone?.submitted_link;
    // Ambil note dari file terbaru di order.files (hasil upload joki), fallback ke milestone's joki_notes
    const latestFile = order.files && order.files.length > 0 ? order.files[order.files.length - 1] : null;
    const displayNote = latestFile?.note || pendingMilestone?.joki_notes || null;
    const versionLabel = pendingMilestone?.version_label;

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Review Order #{order.order_number}</h2>}
        >
            <Head title={`Review Order #${order.order_number}`} />

            <div className="py-12 bg-[#F3F3F1] min-h-screen">
                <div className="max-w-6xl mx-auto sm:px-6 lg:px-8">

                    {/* Header / Status Banner */}
                    <div className="mb-8">
                        {pendingMilestone && (
                            <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl font-black">Review Milestone: {pendingMilestone.name}</h1>
                                        {versionLabel && (
                                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold border border-white/30">
                                                {versionLabel}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-indigo-100 text-lg">Joki telah menyelesaikan milestone ini. Silakan periksa hasilnya.</p>
                                </div>
                                <div className="px-6 py-2 bg-white/20 rounded-full font-bold backdrop-blur-sm border-2 border-white/30">
                                    Status: Waiting Your Review
                                </div>
                            </div>
                        )}
                        {!pendingMilestone && order.status === 'review' && (
                            <div className="bg-purple-600 rounded-[2rem] p-8 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h1 className="text-3xl font-black mb-2">Review Hasil Pekerjaan</h1>
                                    <p className="text-purple-100 text-lg">Joki telah menyelesaikan pekerjaan. Mohon periksa hasil di bawah ini.</p>
                                </div>
                                <div className="px-6 py-2 bg-white/20 rounded-full font-bold backdrop-blur-sm border-2 border-white/30">
                                    Status: Waiting Your Review
                                </div>
                            </div>
                        )}
                        {order.status === 'revision' && (
                            <div className="bg-orange-500 rounded-[2rem] p-8 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900">
                                <h1 className="text-3xl font-black mb-2">Revisi Diminta</h1>
                                <p className="text-orange-100 text-lg">Anda telah meminta revisi. Menunggu Joki mengirimkan perbaikan.</p>
                            </div>
                        )}
                        {order.status === 'completed' && (
                            <div className="bg-green-600 rounded-[2rem] p-8 text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-2 border-slate-900">
                                <h1 className="text-3xl font-black mb-2">Order Selesai!</h1>
                                <p className="text-green-100 text-lg">Terima kasih! Order ini telah selesai dan disetujui.</p>
                            </div>
                        )}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* LEFT: PREVIEW AREA */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* File / Image / Link Preview */}
                            <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
                                <div className="p-6 border-b-2 border-slate-900 bg-slate-50 flex justify-between items-center">
                                    <h3 className="font-black text-xl text-slate-900">Preview Deliverable</h3>
                                    {displayFile && (
                                        <a href={getFileUrl(displayFile)} target="_blank" className="font-bold text-blue-600 hover:underline flex items-center gap-2">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            Download File
                                        </a>
                                    )}
                                </div>
                                <div className="p-8 flex flex-col items-center justify-center min-h-[400px] bg-slate-100 gap-6">
                                    {/* File Display */}
                                    {displayFile ? (
                                        isImage(displayFile) ? (
                                            <img src={getFileUrl(displayFile)} alt="Result Preview" className="max-w-full max-h-[600px] rounded-xl shadow-lg border-2 border-slate-200" />
                                        ) : (
                                            <div className="text-center">
                                                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-300">
                                                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                </div>
                                                <p className="text-slate-500 font-bold mb-2">File Format Not Supported for Preview</p>
                                                <a href={getFileUrl(displayFile)} target="_blank" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition">Download to View</a>
                                            </div>
                                        )
                                    ) : (
                                        !displayLink && (
                                            <div className="text-center text-slate-400">
                                                <svg className="w-16 h-16 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                No file or link provided
                                            </div>
                                        )
                                    )}


                                </div>
                                <div className="p-6 bg-slate-50 border-t-2 border-slate-900">
                                    <p className="text-slate-500 text-sm mb-1 font-bold">Joki's Note:</p>
                                    <p className="text-slate-900">{displayNote || "No notes provided."}</p>
                                </div>
                            </div>

                            {/* Link Display (Moved Outside) */}
                            {displayLink && (
                                <div className="bg-white rounded-[2rem] border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6">
                                    <h3 className="font-black text-xl text-slate-900 mb-4">External Resource Link</h3>
                                    <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <a href={displayLink} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-blue-600 hover:bg-blue-100/50 p-2 rounded-lg transition group">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Open Link:</p>
                                                <span className="font-bold break-all underline decoration-blue-300 underline-offset-2 block text-sm sm:text-base truncate">{displayLink}</span>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT: ACTION CARD */}
                        <div className="space-y-6">
                            {(order.status === 'review' || pendingMilestone) ? (
                                <div className="bg-white rounded-[2rem] p-6 border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                    <h3 className="font-black text-2xl text-slate-900 mb-6">Action Needed</h3>

                                    {/* Milestone Progress Info */}
                                    {order.milestones && order.milestones.length > 0 && (() => {
                                        const current = pendingMilestone || order.milestones.find(m => ['submitted', 'customer_review'].includes(m.status));
                                        if (current) {
                                            return (
                                                <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-900">
                                                    <span className="block text-xs font-bold uppercase text-indigo-500 mb-1">Current Milestone</span>
                                                    <span className="font-black text-lg block">{current.name}</span>
                                                    <span className="text-xs text-indigo-600">Weight: {current.weight}%</span>
                                                </div>
                                            );
                                        }
                                    })()}

                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revision Limit</span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${order.revision_count >= (order.package?.max_revisions || 3) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {order.revision_count || 0} / {order.package?.max_revisions || 3} Used
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => {
                                            if (order.milestones && order.milestones.length > 0) {
                                                const current = order.milestones.find(m => ['submitted', 'customer_review'].includes(m.status));
                                                const isLast = current && order.milestones[order.milestones.length - 1].id === current.id;
                                                if (!isLast) {
                                                    setModalType('confirm_milestone');
                                                    return;
                                                }
                                            }
                                            setModalType('accept');
                                        }}
                                        className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all flex items-center justify-center gap-2 mb-4"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        {order.milestones && order.milestones.length > 0 ? (
                                            (() => {
                                                const current = order.milestones.find(m => ['submitted', 'customer_review'].includes(m.status));
                                                const isLast = current && order.milestones[order.milestones.length - 1].id === current.id;
                                                return isLast ? "Approve & Finish Project" : "Approve Milestone & Continue";
                                            })()
                                        ) : "Terima Hasil & Selesai"}
                                    </button>

                                    {order.revision_count >= (order.package?.max_revisions || 3) ? (
                                        <button
                                            onClick={() => setModalType('revision')}
                                            className="w-full py-4 bg-orange-100 text-orange-700 font-bold rounded-xl border-2 border-orange-300 hover:bg-orange-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm relative overflow-hidden group"
                                        >
                                            <div className="absolute inset-0 bg-white/50 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                            <svg className="w-6 h-6 z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            <span className="z-10">Ajukan Revisi Tambahan</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setModalType('revision')}
                                            className="w-full py-4 bg-white text-slate-900 font-bold rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(200,200,200,1)] hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            Ajukan Revisi
                                        </button>
                                    )}

                                    {order.revision_count >= (order.package?.max_revisions || 3) && (
                                        <p className="text-xs text-orange-600 font-bold text-center mt-2">Biaya tambahan akan diakumulasikan ke tagihan akhir.</p>
                                    )}

                                    <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                                        <button
                                            onClick={() => setModalType('refund')}
                                            className="text-sm font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 mx-auto"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Ajukan Pengembalian Dana
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                                    <p className="font-bold text-slate-400">No actions available currently.</p>
                                    <Link href={route('dashboard')} className="mt-4 inline-block text-blue-600 font-bold hover:underline">Back to Dashboard</Link>
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t-2 border-slate-100">
                                <h4 className="font-bold text-slate-900 mb-4">Version History</h4>
                                <div className="space-y-3">
                                    {order.files && order.files.length > 0 ? (
                                        order.files.slice().reverse().map((file) => (
                                            <div key={file.id} className="flex items-center gap-3 text-sm p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition border border-transparent hover:border-slate-200">
                                                <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-500 shrink-0">
                                                    {file.version_label.substring(0, 3)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-900 truncate">{file.version_label}</p>
                                                    <p className="text-slate-500 text-xs truncate">
                                                        {new Date(file.created_at).toLocaleString('id-ID', {
                                                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                    {file.note && <p className="text-xs text-slate-400 italic truncate">"{file.note}"</p>}
                                                </div>
                                                <a
                                                    href={getFileUrl(file.file_path)}
                                                    target="_blank"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                                                    title="Download"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                </a>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-slate-400 text-xs italic">No previous versions.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODALS */}

            {/* 1. ACCEPT MODAL */}
            <Modal show={modalType === 'accept'} onClose={() => setModalType(null)}>
                <div className="p-8">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">
                        {order.milestones && order.milestones.length > 0 ? (() => {
                            const current = order.milestones.find(m => ['submitted', 'customer_review'].includes(m.status));
                            const isLast = current && order.milestones[order.milestones.length - 1].id === current.id;
                            return isLast ? "Puas dengan hasil akhir?" : "Setujui Milestone ini?";
                        })() : "Puas dengan hasilnya?"}
                    </h2>
                    <p className="text-center text-slate-500 mb-6">
                        Jika Anda menyetujui, order akan dianggap selesai dan dana akan diteruskan ke Joki.
                    </p>

                    <form onSubmit={handleAccept}>
                        {/* Rating Input */}
                        <div className="flex justify-center mb-6">
                            <StarRating rating={ratingData.rating} setRating={(r) => setRatingData('rating', r)} />
                        </div>

                        <div className="mb-6">
                            <InputLabel value="TULIS ULASAN (OPSIONAL)" className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-2" />
                            <TextInput
                                value={ratingData.comment}
                                onChange={(e) => setRatingData('comment', e.target.value)}
                                className="w-full"
                                placeholder="Contoh: Pekerjaan sangat cepat dan rapi!"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <SecondaryButton onClick={() => setModalType(null)}>Batal</SecondaryButton>
                            <button
                                type="submit"
                                disabled={ratingProcessing}
                                className="px-6 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition shadow-lg shadow-emerald-200"
                            >
                                Konfirmasi Selesai
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 2. REVISION MODAL */}
            <Modal show={modalType === 'revision'} onClose={() => setModalType(null)}>
                <div className="p-8">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${order.revision_count >= (order.package?.max_revisions || 3) ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">
                        {order.revision_count >= (order.package?.max_revisions || 3) ? 'Ajukan Revisi Tambahan' : 'Ajukan Revisi'}
                    </h2>

                    {order.revision_count >= (order.package?.max_revisions || 3) ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-center">
                            <p className="text-orange-800 font-bold text-sm mb-1">Biaya Tambahan: Rp 20.000</p>
                            <p className="text-orange-600 text-xs">Biaya ini akan ditambahkan ke tagihan akhir Anda karena jatah revisi gratis telah habis.</p>
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 mb-6">
                            Berikan detail revisi agar Joki dapat memperbaiki hasil pekerjaan.
                        </p>
                    )}

                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const isPaid = order.revision_count >= (order.package?.max_revisions || 3);

                        // Manually constructing data since we use useForm or similar upstream
                        // We need to pass 'paid_revision' to the post request.
                        // Since handleRevision (the original handler) essentially calls postRevision(route('orders.revision', order.id)), 
                        // we can try to hijack it or just use the post method directly if we have access.
                        // Assuming handleRevision is simple, let's redefine the submit here or modify handleRevision.
                        // Since I can't see handleRevision, I'll assume I can just use the setData ('paid_revision', true) before submit?
                        // But setData is async/state based. 

                        // Better approach: Create a local handler here or use the existing one with a modification.
                        // I'll call handleRevision(e, isPaid) if I can modify handleRevision signature? 

                        // Let's rely on adding a hidden input if using standard form submit, 
                        // BUT Inertia useForm helper usually validates fields.
                        // I will update this onSubmit to explicitly call the route with the extra data.

                        transformRevision((data) => ({
                            ...data,
                            paid_revision: isPaid
                        }));

                        postRevision(route('orders.revision', order.id), {
                            onSuccess: () => {
                                setModalType(null);
                                resetRevision();
                            },
                        });
                    }}>
                        <div className="mb-6">
                            <InputLabel value="Detail Revisi" className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-2" />
                            <textarea
                                className="w-full rounded-xl border-slate-300 shadow-sm focus:border-slate-900 focus:ring-slate-900 h-32"
                                placeholder="Jelaskan bagian mana yang perlu diperbaiki..."
                                required
                                onChange={(e) => setRevisionData('reason', e.target.value)}
                            ></textarea>
                        </div>

                        <div className="mb-6">
                            <InputLabel value="Lampiran Revisi (Opsional)" className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-2" />
                            <input
                                type="file"
                                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                onChange={(e) => setRevisionData('revision_file', e.target.files[0])}
                            />
                            <p className="text-xs text-slate-400 mt-1">Upload gambar/coretan jika ada.</p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <SecondaryButton onClick={() => setModalType(null)}>Batal</SecondaryButton>
                            <button
                                type="submit"
                                disabled={revisionProcessing}
                                className={`px-6 py-3 font-bold rounded-lg transition text-white ${order.revision_count >= (order.package?.max_revisions || 3) ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-700'}`}
                            >
                                {order.revision_count >= (order.package?.max_revisions || 3) ? 'Setuju & Bayar Revisi' : 'Kirim Revisi'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>

            {/* 3. REFUND MODAL (Compact Premium) */}
            <Modal
                show={modalType === 'refund'}
                onClose={() => { setModalType(null); setRefundStep(1); }}
                maxWidth="md"
            >
                <div className="p-0 overflow-hidden relative">
                    <div className="bg-gradient-to-br from-red-50 to-white px-6 py-6 pb-4 text-center border-b border-red-100">
                        <div className="w-14 h-14 bg-white rounded-2xl shadow-[0px_4px_20px_rgba(220,38,38,0.15)] flex items-center justify-center mx-auto mb-3 text-red-500 transform rotate-3">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-xl font-black text-slate-900 mb-0.5">Ajukan Pengembalian Dana</h2>
                        <p className="text-slate-500 text-xs">Versi 2.0 - {refundStep === 1 ? 'Estimasi & Ketentuan' : 'Alasan & Konfirmasi'}</p>
                    </div>

                    <div className="px-6 py-6">
                        <div className="relative overflow-hidden bg-slate-900 rounded-xl p-5 mb-6 text-white shadow-lg shadow-slate-200">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>

                            <p className="text-slate-400 text-[10px] font-bold mb-1 text-center uppercase tracking-widest">Estimasi Pengembalian</p>
                            <p className="text-3xl font-black text-center tracking-tight mb-2">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(refundAmount)}
                            </p>
                            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 bg-white/10 py-1 px-3 rounded-full w-fit mx-auto backdrop-blur-sm border border-white/5">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Nilai final ditentukan admin (Estimasi {refundPercent}%)
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (refundStep === 1) {
                                setRefundStep(2);
                            } else {
                                postRevision(route('orders.refund', order.id), {
                                    onSuccess: () => { setModalType(null); setRefundStep(1); }
                                });
                            }
                        }}>
                            {/* STEP 1: TERMS & CONDITIONS */}
                            {refundStep === 1 && (
                                <div className="mb-6 animate-fade-in">
                                    <h4 className="font-bold text-slate-900 text-xs mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                                        Syarat & Ketentuan Refund
                                    </h4>
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                        <ul className="space-y-3 text-xs text-slate-600 leading-relaxed">
                                            <li className="flex gap-2 items-start">
                                                <div className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">1</div>
                                                <span>Dana dikembalikan hanya untuk milestone yang <strong>BELUM</strong> dimulai.</span>
                                            </li>
                                            <li className="flex gap-2 items-start">
                                                <div className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">2</div>
                                                <span>Milestone <strong>Completed</strong> tidak dapat direfund dengan alasan apapun.</span>
                                            </li>
                                            <li className="flex gap-2 items-start">
                                                <div className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">3</div>
                                                <span>Platform fee tidak dapat dikembalikan.</span>
                                            </li>
                                            <li className="flex gap-2 items-start">
                                                <div className="w-4 h-4 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">4</div>
                                                <span>Proses verifikasi membutuhkan waktu 1-3 hari kerja.</span>
                                            </li>
                                        </ul>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center mt-4">
                                        Klik "Lanjut" jika Anda memahami potensi potongan biaya.
                                    </p>
                                </div>
                            )}

                            {/* STEP 2: REASON & AGREEMENT */}
                            {refundStep === 2 && (
                                <div className="mb-6 animate-fade-in">
                                    <div className="mb-5">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <InputLabel value="Alasan Refund" className="font-bold text-slate-900 uppercase tracking-wide text-[10px]" />
                                            <span className="text-[10px] text-slate-400">Wajib diisi</span>
                                        </div>
                                        <textarea
                                            className="w-full rounded-lg border-slate-300 bg-slate-50 focus:bg-white shadow-sm focus:border-red-500 focus:ring-red-500 h-24 text-sm p-3 transition-all placeholder:text-slate-400 text-slate-700 resize-none"
                                            placeholder="Jelaskan secara detail alasan anda mengajukan refund..."
                                            required
                                            autoFocus
                                            onChange={(e) => setRevisionData('reason', e.target.value)}
                                        ></textarea>
                                    </div>

                                    <label className="flex items-start gap-3 mb-2 p-3 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50/50 transition-all cursor-pointer group">
                                        <div className="min-w-fit pt-0.5">
                                            <input
                                                type="checkbox"
                                                id="agree_refund"
                                                className="rounded border-slate-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                                                required
                                            />
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium group-hover:text-slate-700 leading-tight">
                                            Saya menyetujui Syarat & Ketentuan di atas dan memahami bahwa keputusan Admin bersifat mutlak.
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="flex gap-3">
                                {refundStep === 2 && (
                                    <button
                                        type="button"
                                        onClick={() => setRefundStep(1)}
                                        className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition text-sm border border-slate-200"
                                    >
                                        Kembali
                                    </button>
                                )}

                                {refundStep === 1 ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setModalType(null)}
                                            className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition text-sm"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-[2] py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition shadow-lg shadow-slate-200 hover:-translate-y-0.5 transform text-sm"
                                        >
                                            Lanjut
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={revisionProcessing}
                                        className="flex-[2] py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition shadow-lg shadow-red-200/50 hover:shadow-red-300/50 hover:-translate-y-0.5 transform text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0-2.08-.402-2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Ajukan Refund
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </Modal>

            {/* 4. CONFIRM MILESTONE MODAL */}
            <Modal show={modalType === 'confirm_milestone'} onClose={() => setModalType(null)} maxWidth="sm">
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mb-2">Lanjut ke Milestone Berikutnya?</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Anda akan menyetujui hasil milestone ini. Dana untuk milestone ini akan diteruskan ke Joki dan proses berlanjut ke tahap berikutnya.
                    </p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => setModalType(null)}
                            className="px-6 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleMilestoneConfirm}
                            className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                        >
                            Ya, Lanjut
                        </button>
                    </div>
                </div>
            </Modal>

            {/* 5. PAYMENT MODAL */}
            <Modal show={modalType === 'payment'} onClose={() => setModalType(null)}>
                <div className="p-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">Pelunasan Revisi Tambahan</h2>
                    <p className="text-center text-slate-500 mb-6">
                        Mohon lunasi tagihan tambahan untuk mengunduh hasil final.
                    </p>

                    <div className="bg-slate-50 p-4 rounded-xl mb-6 text-center border border-slate-200">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tagihan</p>
                        <p className="text-3xl font-black text-slate-900">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(order.additional_revision_fee || 0)}
                        </p>
                        {order.additional_payment_status === 'pending' && (
                            <div className="mt-2 inline-block px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold border border-yellow-200">
                                Pembayaran Sedang Diverifikasi Admin
                            </div>
                        )}
                    </div>

                    {order.additional_payment_status === 'pending' ? (
                        <div className="text-center">
                            <p className="text-slate-500 text-sm mb-4">Bukti pembayaran Anda sudah kami terima dan sedang dalam proses pengecekan admin. Mohon tunggu konfirmasi via WhatsApp atau cek dashboard secara berkala.</p>
                            <button
                                onClick={() => setModalType(null)}
                                className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition"
                            >
                                Tutup
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            postPayment(route('orders.additional-payment', order.id), {
                                onSuccess: () => setModalType(null)
                            });
                        }}>
                            <div className="mb-6">
                                <InputLabel value="Metode Pembayaran" className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-2" />
                                <div className="grid grid-cols-2 gap-3">
                                    <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${paymentData.payment_method === 'qris' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input type="radio" value="qris" checked={paymentData.payment_method === 'qris'} onChange={(e) => setPaymentData('payment_method', e.target.value)} className="hidden" />
                                        <span className="font-bold text-sm text-slate-700">QRIS</span>
                                    </label>
                                    <label className={`cursor-pointer border-2 rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all ${paymentData.payment_method === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <input type="radio" value="bank" checked={paymentData.payment_method === 'bank'} onChange={(e) => setPaymentData('payment_method', e.target.value)} className="hidden" />
                                        <span className="font-bold text-sm text-slate-700">Transfer Bank / VA</span>
                                    </label>
                                </div>
                            </div>

                            {paymentData.payment_method === 'qris' && (
                                <div className="mb-6 text-center animate-fade-in">
                                    <p className="text-xs font-bold text-slate-400 mb-2">Scan QRIS Berikut:</p>
                                    <div className="w-48 h-48 bg-white border-2 border-slate-900 rounded-xl mx-auto flex items-center justify-center mb-2">
                                        {/* Placeholder for QR Code */}
                                        <span className="text-slate-400 font-bold text-xs">QR CODE IMAGE</span>
                                    </div>
                                </div>
                            )}

                            {paymentData.payment_method === 'bank' && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl text-center animate-fade-in">
                                    <p className="text-blue-800 font-bold text-sm">BCA: 123-456-7890</p>
                                    <p className="text-blue-600 text-xs">a.n. Beresin Admin</p>
                                </div>
                            )}

                            <div className="mb-6">
                                <InputLabel value="Upload Bukti Pembayaran" className="font-bold text-slate-900 uppercase tracking-wide text-xs mb-2" />
                                <input
                                    type="file"
                                    required
                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                    onChange={(e) => setPaymentData('payment_proof', e.target.files[0])}
                                />
                                {paymentErrors.payment_proof && <p className="text-red-500 text-xs mt-1">{paymentErrors.payment_proof}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={paymentProcessing}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                            >
                                Kirim Bukti Pembayaran
                            </button>
                            <p className="text-center text-[10px] text-slate-400 mt-4">
                                Setelah upload, harap konfirmasi ke Admin via WhatsApp untuk mempercepat proses.
                            </p>
                        </form>
                    )}
                </div>
            </Modal>
        </AuthenticatedLayout >
    );
}
