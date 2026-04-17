import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import useAutoReload from '@/Hooks/useAutoReload';
import PrimaryButton from '@/Components/PrimaryButton';

// Helper: returns full URL if already absolute, else prepends /storage/
const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
};

export default function Verify({ auth, orders, additionalPaymentOrders }) {
    // Silent background polling — auto refresh payment queue every 25s
    useAutoReload(['orders', 'additionalPaymentOrders'], 25_000);

    const [confirmingApproval, setConfirmingApproval] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const { post, processing } = useForm();

    const confirmApprove = (order) => {
        setSelectedOrder(order);
        setConfirmingApproval(true);
    };

    const closeModal = () => {
        setConfirmingApproval(false);
        setSelectedOrder(null);
    };

    const approveOrder = () => {
        post(route('admin.orders.approve', selectedOrder.id), {
            onSuccess: () => closeModal(),
        });
    };

    const [viewingOrder, setViewingOrder] = useState(null);

    const openDetails = (order) => {
        setViewingOrder(order);
    };

    const closeDetails = () => {
        setViewingOrder(null);
    };

    return (
        <AdminLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Verify Payments</h2>}
        >
            <Head title="Verify Payments" />

            <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                <div className="p-6 text-gray-900 dark:text-gray-100">

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {orders.data.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 italic">No pending payments found.</div>
                        ) : (
                            orders.data.map((order) => (
                                <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{order.order_number || `#${order.id}`}</h4>
                                            <div className="flex items-center gap-1 mt-1">
                                                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase">
                                                    {order.package?.service?.name}
                                                </span>
                                                {order.is_negotiation && (
                                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-yellow-200">
                                                        NEGO
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <p className="font-bold text-gray-900 text-lg">
                                            Rp {new Intl.NumberFormat('id-ID').format(order.amount)}
                                        </p>
                                    </div>

                                    <div className="mb-3">
                                        <p className="text-xs text-gray-500 font-medium">{order.user.name}</p>
                                        <p className="text-[10px] text-gray-400">{order.user.email}</p>
                                    </div>

                                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                                        {order.payment_proof ? (
                                            <a
                                                href={getFileUrl(order.payment_proof)}
                                                target="_blank"
                                                className="flex-1 text-center py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-bold border border-blue-100"
                                            >
                                                View Proof
                                            </a>
                                        ) : (
                                            <div className="flex-1 text-center py-2 bg-gray-100 text-gray-400 rounded-md text-sm italic">No Proof</div>
                                        )}
                                        <button
                                            onClick={() => openDetails(order)}
                                            className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-bold"
                                        >
                                            Details
                                        </button>
                                        <button
                                            onClick={() => confirmApprove(order)}
                                            className="flex-1 py-2 bg-green-600 text-white rounded-md text-sm font-bold shadow-sm"
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Order ID</th>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3">Service</th>
                                    <th className="px-6 py-3">Amount</th>
                                    <th className="px-6 py-3">Proof</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.data.map((order) => (
                                    <tr key={order.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium">{order.order_number || `#${order.id}`}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{order.user.name}</div>
                                            <div className="text-xs text-gray-500">{order.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-0.5 rounded">
                                                {order.package?.service?.name} - {order.package?.name}
                                            </span>
                                            {order.is_negotiation && (
                                                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded border border-yellow-200">
                                                    Negotiation
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900">
                                            Rp {new Intl.NumberFormat('id-ID').format(order.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {order.payment_proof ? (
                                                <a href={getFileUrl(order.payment_proof)} target="_blank" className="text-blue-600 underline hover:text-blue-800">
                                                    View Proof
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 italic">No proof</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button
                                                onClick={() => openDetails(order)}
                                                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium transition"
                                            >
                                                Details
                                            </button>
                                            <button
                                                onClick={() => confirmApprove(order)}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition shadow-sm"
                                            >
                                                Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {orders.data.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                            No pending payments found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ADDITIONAL PAYMENTS SECTION */}
            <div className="mt-8">
                <h3 className="text-lg font-bold text-gray-800 mb-4 px-1">Verifikasi Pembayaran Tambahan (Revisi)</h3>
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
                    <div className="p-6 text-gray-900 dark:text-gray-100">
                        {/* Mobile Card View (Additional) */}
                        <div className="md:hidden space-y-4">
                            {additionalPaymentOrders && additionalPaymentOrders.length > 0 ? (
                                additionalPaymentOrders.map((order) => (
                                    <div key={order.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900">{order.order_number || `#${order.id}`}</h4>
                                            <p className="font-bold text-orange-600">
                                                Rp {new Intl.NumberFormat('id-ID').format(order.additional_revision_fee)}
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3">{order.user?.name}</p>

                                        <div className="flex gap-2 pt-3 border-t border-gray-200">
                                            {order.additional_payment_proof ? (
                                                <a
                                                    href={'/storage/' + order.additional_payment_proof}
                                                    target="_blank"
                                                    className="flex-1 text-center py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-bold border border-blue-100"
                                                >
                                                    View Proof
                                                </a>
                                            ) : (
                                                <div className="flex-1 text-center py-2 bg-gray-100 text-gray-400 rounded-md text-sm italic">No Proof</div>
                                            )}
                                            <PrimaryButton
                                                className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700"
                                                onClick={() => {
                                                    if (confirm('Approve additional payment?')) {
                                                        post(route('admin.orders.approve_additional', order.id));
                                                    }
                                                }}
                                            >
                                                Approve
                                            </PrimaryButton>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-500 italic text-sm">
                                    No pending additional revision payments found.
                                </div>
                            )}
                        </div>

                        {/* Desktop Table View (Additional) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-6 py-3">Order ID</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Additional Fee</th>
                                        <th className="px-6 py-3">Proof</th>
                                        <th className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {additionalPaymentOrders && additionalPaymentOrders.length > 0 ? (
                                        additionalPaymentOrders.map((order) => (
                                            <tr key={order.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">{order.order_number || `#${order.id}`}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-900">{order.user?.name}</div>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-orange-600">
                                                    Rp {new Intl.NumberFormat('id-ID').format(order.additional_revision_fee)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {order.additional_payment_proof ? (
                                                        <a href={'/storage/' + order.additional_payment_proof} target="_blank" className="text-blue-600 underline hover:text-blue-800">
                                                            View Proof
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 italic">No proof</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <PrimaryButton
                                                        className="bg-emerald-600 hover:bg-emerald-700 focus:bg-emerald-700 active:bg-emerald-800"
                                                        onClick={() => {
                                                            if (confirm('Approve additional payment?')) {
                                                                post(route('admin.orders.approve_additional', order.id));
                                                            }
                                                        }}
                                                    >
                                                        Approve
                                                    </PrimaryButton>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">
                                                No pending additional revision payments found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approval Modal */}
            <Modal show={confirmingApproval} onClose={closeModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        Approve Payment?
                    </h2>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Are you sure you want to approve this payment for Order <span className="font-bold">{selectedOrder?.order_number}</span>?
                        This will generate an invoice number and move the order to the assignment queue.
                    </p>

                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={closeModal}>Cancel</SecondaryButton>
                        <PrimaryButton className="bg-green-600 hover:bg-green-700" onClick={approveOrder} disabled={processing}>
                            Approve Payment
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>

            {/* Details Modal */}
            <Modal show={!!viewingOrder} onClose={closeDetails} maxWidth="2xl">
                {viewingOrder && (
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Order Details #{viewingOrder.order_number}</h2>
                            <button onClick={closeDetails} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Customer</p>
                                    <p className="font-medium">{viewingOrder.user.name}</p>
                                    <p className="text-sm text-gray-600">{viewingOrder.user.email}</p>
                                    <p className="text-sm text-gray-600">{viewingOrder.user.phone}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Package Info</p>
                                    <p className="font-medium text-indigo-700">{viewingOrder.package?.service?.name}</p>
                                    <p className="text-sm text-gray-700 font-bold">{viewingOrder.package?.name}</p>
                                    <p className="text-xs text-gray-500 mt-1">Deadline: {viewingOrder.deadline}</p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Description / Project Notes</p>
                                <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 border border-gray-200">
                                    {viewingOrder.description || <em className="text-gray-400">No description.</em>}
                                </div>
                            </div>

                            {/* Customer Notes */}
                            {viewingOrder.notes && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Catatan Tambahan Customer</p>
                                    <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-900 border border-yellow-200">
                                        {viewingOrder.notes}
                                    </div>
                                </div>
                            )}

                            {/* Customer Submitted Links & Files */}
                            {(viewingOrder.external_link || viewingOrder.reference_file || viewingOrder.previous_project_file || viewingOrder.student_card) && (
                                <div className="border-t pt-4">
                                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <span className="text-base">📎</span> Lampiran & Link Customer
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {viewingOrder.external_link && (
                                            <a
                                                href={viewingOrder.external_link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition"
                                            >
                                                <span className="text-blue-600 text-xl">🔗</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-blue-700 uppercase mb-0.5">External Link (Reference URL)</p>
                                                    <p className="text-sm text-blue-800 underline truncate">{viewingOrder.external_link}</p>
                                                </div>
                                                <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                            </a>
                                        )}
                                        {viewingOrder.reference_file && (
                                            <a
                                                href={getFileUrl(viewingOrder.reference_file)}
                                                target="_blank"
                                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                                            >
                                                <span className="text-gray-600 text-xl">📄</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-gray-700 uppercase mb-0.5">Reference File</p>
                                                    <p className="text-sm text-gray-600">Download / View</p>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        )}
                                        {viewingOrder.previous_project_file && (
                                            <a
                                                href={getFileUrl(viewingOrder.previous_project_file)}
                                                target="_blank"
                                                className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                                            >
                                                <span className="text-gray-600 text-xl">📦</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-gray-700 uppercase mb-0.5">Previous Project Assets</p>
                                                    <p className="text-sm text-gray-600">Download / View</p>
                                                </div>
                                                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        )}
                                        {viewingOrder.student_card && (
                                            <a
                                                href={getFileUrl(viewingOrder.student_card)}
                                                target="_blank"
                                                className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                                            >
                                                <span className="text-indigo-600 text-xl">🎓</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-indigo-700 uppercase mb-0.5">Kartu Mahasiswa (KTM)</p>
                                                    <p className="text-sm text-indigo-600">View Student Card</p>
                                                </div>
                                                <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Negotiation Details */}
                            {viewingOrder.is_negotiation && (
                                <div className="border-t pt-4">
                                    <h3 className="text-md font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Negotiation Data</span>
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(() => {
                                            let parsedSelected = [];
                                            if (typeof viewingOrder.selected_features === 'string') {
                                                try {
                                                    parsedSelected = JSON.parse(viewingOrder.selected_features);
                                                } catch(e) { /* ignore */ }
                                            } else if (Array.isArray(viewingOrder.selected_features)) {
                                                parsedSelected = viewingOrder.selected_features;
                                            }
                                            
                                            if (!parsedSelected || parsedSelected.length === 0) return null;
                                            
                                            return (
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-1">Requested Features:</p>
                                                    <ul className="space-y-1">
                                                        {parsedSelected.map((f, i) => (
                                                            <li key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 inline-block mr-1 mb-1">
                                                                {f}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })()}

                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Proposed Budget:</p>
                                            <p className="text-lg font-bold text-green-600">Rp {new Intl.NumberFormat('id-ID').format(viewingOrder.amount)}</p>

                                            {/* System Calculation Display */}
                                            {(() => {
                                                // Combine all possible sources for features
                                                const featureSources = [
                                                    ...(viewingOrder.package?.addons || []),
                                                    ...(() => {
                                                        const af = viewingOrder.package?.addon_features;
                                                        if (!af) return [];
                                                        try { return typeof af === 'string' ? JSON.parse(af) : af; } catch(e) { return []; }
                                                    })(),
                                                    ...(() => {
                                                        const bf = viewingOrder.package?.features;
                                                        if (!bf) return [];
                                                        try { return typeof bf === 'string' ? JSON.parse(bf) : bf; } catch(e) { return []; }
                                                    })()
                                                ];
                                                
                                                let safeSelectedFeatures = [];
                                                if (typeof viewingOrder.selected_features === 'string') {
                                                    try {
                                                        safeSelectedFeatures = JSON.parse(viewingOrder.selected_features);
                                                    } catch (e) {
                                                        safeSelectedFeatures = [];
                                                    }
                                                } else if (Array.isArray(viewingOrder.selected_features)) {
                                                    safeSelectedFeatures = viewingOrder.selected_features;
                                                }
                                                
                                                const selectedNames = safeSelectedFeatures;

                                                let systemPrice = 0;
                                                let totalDays = 1;

                                                if (featureSources.length > 0 && selectedNames.length > 0) {
                                                    const selected = featureSources.filter(f => {
                                                        const name = typeof f === 'string' ? f : f.name;
                                                        return selectedNames.includes(name);
                                                    });
                                                    
                                                    systemPrice = selected.reduce((sum, f) => {
                                                        const price = typeof f === 'string' ? 0 : parseFloat(f.price || 0);
                                                        return sum + price;
                                                    }, 0);
                                                    
                                                    totalDays += selected.reduce((sum, f) => {
                                                        const days = typeof f === 'string' ? 1 : parseInt(f.estimate_days || 1);
                                                        return sum + days;
                                                    }, 0);
                                                }

                                                // Calculate Rush Fee (Mirroring Create.jsx logic)
                                                let rushFee = 0;
                                                if (viewingOrder.deadline && viewingOrder.created_at) {
                                                    const createdDate = new Date(viewingOrder.created_at);
                                                    const targetDate = new Date(createdDate);
                                                    targetDate.setDate(targetDate.getDate() + totalDays);
                                                    targetDate.setHours(0, 0, 0, 0);

                                                    const deadlineDate = new Date(viewingOrder.deadline);
                                                    deadlineDate.setHours(0, 0, 0, 0);

                                                    // If deadline is earlier than target date
                                                    const diffTime = targetDate - deadlineDate;
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    if (diffDays > 0) {
                                                        rushFee = diffDays * 50000;
                                                    }
                                                }

                                                const totalSystemPrice = systemPrice + rushFee;

                                                return (
                                                    <div className="mt-2 pt-2 border-t border-dashed">
                                                        <p className="text-xs text-gray-400">Harga Sistem (referensi admin):</p>
                                                        <p className="text-xs text-gray-400 italic mb-1">Harga normal fitur yang dipilih + biaya rush deadline</p>
                                                        <p className="text-sm font-bold text-gray-600">
                                                            Rp {new Intl.NumberFormat('id-ID').format(totalSystemPrice)}
                                                            {rushFee > 0 && <span className="text-amber-500 text-xs ml-1">(+{new Intl.NumberFormat('id-ID').format(rushFee)} Rush)</span>}
                                                        </p>
                                                        <p className="text-xs text-indigo-600 mt-1">
                                                            Budget customer: <strong>Rp {new Intl.NumberFormat('id-ID').format(viewingOrder.amount)}</strong>
                                                            {' '}{viewingOrder.amount < totalSystemPrice
                                                                ? <span className="text-red-500">(di bawah harga sistem)</span>
                                                                : <span className="text-green-600">(✓ di atas harga sistem)</span>
                                                            }
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                    </div>
                                </div>
                            )}


                            {/* Files section moved above – this block is now redundant */}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
                            <SecondaryButton onClick={closeDetails}>Close</SecondaryButton>
                            <PrimaryButton className="bg-green-600 hover:bg-green-700" onClick={() => { closeDetails(); confirmApprove(viewingOrder); }}>
                                Approve This Order
                            </PrimaryButton>
                        </div>
                    </div>
                )}
            </Modal>
        </AdminLayout>
    );
}
