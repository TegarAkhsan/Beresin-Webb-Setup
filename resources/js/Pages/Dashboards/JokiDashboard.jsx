import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import useAutoReload from '@/Hooks/useAutoReload';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import JokiSidebar from './Joki/JokiSidebar';
import DashboardTab from './Joki/DashboardTab';
import TasksTab from './Joki/TasksTab';
import EarningsTab from './Joki/EarningsTab';
import CompletedTab from './Joki/CompletedTab';

// Helper: returns full URL if already absolute, else prepends /storage/
const getFileUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `/storage/${path}`;
};

// Helper: Client-side compression to bypass 6MB max payload limits for Serverless/Netlify
const compressImageClient = (file, maxWidth = 1280) => {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/') || file.type === 'image/gif') {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                        type: 'image/webp',
                        lastModified: Date.now(),
                    });
                    resolve(newFile);
                }, 'image/webp', 0.8);
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

export default function JokiDashboard({ auth, upcomingTasks = [], activeTasks = [], reviewTasks = [], completedTasks = [], stats, financials }) {
    // Tab state management
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Silent background polling — refresh data every 20s without page flicker
    useAutoReload(['activeTasks', 'reviewTasks', 'upcomingTasks', 'completedTasks', 'stats', 'financials'], 20_000);

    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewTask, setPreviewTask] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailTask, setDetailTask] = useState(null);

    const openDetailModal = (task) => {
        setDetailTask(task);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setDetailTask(null);
        setShowDetailModal(false);
    };

    // Workload Colors
    const getWorkloadColor = (status) => {
        switch (status) {
            case 'Green': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'Yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Red': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Countdown Timer Component
    const CountdownTimer = ({ deadline }) => {
        const calculateTimeLeft = () => {
            const difference = +new Date(deadline) - +new Date();
            let timeLeft = {};
            if (difference > 0) {
                timeLeft = {
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                };
            } else {
                timeLeft = { expired: true };
            }
            return timeLeft;
        };

        const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

        useEffect(() => {
            const timer = setTimeout(() => {
                setTimeLeft(calculateTimeLeft());
            }, 60000);
            return () => clearTimeout(timer);
        });

        if (timeLeft.expired) return <span className="text-red-500 font-bold text-xs uppercase">Expired</span>;

        return (
            <span className="font-mono text-xl font-bold text-blue-600">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
            </span>
        );
    };

    // Task Preview & Start Logic
    const openPreviewModal = (task) => {
        setPreviewTask(task);
        setShowPreviewModal(true);
    };

    const closePreviewModal = () => {
        setShowPreviewModal(false);
        setPreviewTask(null);
    };

    const handleAcceptTask = () => {
        router.post(route('joki.orders.start', previewTask.id), {}, {
            onSuccess: () => {
                closePreviewModal();
                setActiveTab('dashboard');
            }
        });
    };

    // File Upload Form
    const { data, setData, post, processing, reset, errors } = useForm({
        file: null,
        proof_images: [],
        version_label: '',
        external_link: '',
        note: '',
        milestone_id: ''
    });

    const [proofImagePreviews, setProofImagePreviews] = useState([]);
    const [uploadType, setUploadType] = useState('regular'); // regular, milestone

    const openUploadModal = (order) => {
        setSelectedOrder(order);

        let type = 'regular';
        let defaultMilestoneId = '';

        if (order.status === 'finalization') {
            type = 'final';
        } else if (order.milestones && order.milestones.length > 0) {
            type = 'milestone';
            // Find active milestone
            let active = order.milestones.find(m => ['in_progress', 'revision'].includes(m.status));

            // Fallback for Revision Mode if milestone is stuck in 'submitted'
            if (!active && order.status === 'revision') {
                // Find the latest submitted milestone to attach revision to
                active = [...order.milestones]
                    .reverse()
                    .find(m => ['submitted', 'customer_review'].includes(m.status));
            }

            if (active) defaultMilestoneId = active.id;
        }

        setUploadType(type);

        setData({
            file: null,
            proof_images: [],
            version_label: '',
            external_link: '',
            note: '',
            milestone_id: defaultMilestoneId
        });
        setProofImagePreviews([]);
        setShowUploadModal(true);
    };

    const closeUploadModal = () => {
        setShowUploadModal(false);
        setProofImagePreviews([]);
        reset();
    };

    const submitUpload = (e) => {
        e.preventDefault();

        // Inertia useForm tidak support multiple files, gunakan router.post dengan FormData
        const formData = new FormData();
        if (data.file) formData.append('file', data.file);
        if (data.external_link) formData.append('external_link', data.external_link);
        if (data.version_label) formData.append('version_label', data.version_label);
        if (data.note) formData.append('note', data.note);
        if (data.milestone_id) formData.append('milestone_id', String(data.milestone_id));

        // Append all proof images
        (data.proof_images || []).forEach((img) => {
            formData.append('proof_images', img);
        });

        const opts = {
            forceFormData: true,
            onSuccess: () => {
                closeUploadModal();
            }
        };

        if (uploadType === 'final') {
            router.post(route('joki.finalize-order', selectedOrder.id), formData, opts);
        } else if (uploadType === 'milestone') {
            router.post(route('joki.orders.milestone', selectedOrder.id), formData, opts);
        } else {
            router.post(route('joki.orders.upload', selectedOrder.id), formData, opts);
        }
    };


    const MenuItem = ({ id, label, icon }) => (
        <button
            onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
            className={`w-full text-left px-6 py-4 flex items-center transition-colors ${activeTab === id
                ? 'bg-gray-100 border-r-4 border-indigo-600 text-indigo-700 font-bold'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
        >
            <span className="mr-3">{icon}</span>
            {label}
        </button>
    );

    return (
        <AuthenticatedLayout user={auth.user} hideNavigation={true}>
            <Head title="Joki Dashboard" />

            <div className="flex min-h-screen bg-[#F8F9FC]">
                <JokiSidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    isSidebarOpen={isSidebarOpen}
                    setIsSidebarOpen={setIsSidebarOpen}
                    user={auth.user}
                />

                <main className="flex-1 overflow-y-auto h-screen w-full md:pl-0">
                    {/* Header - Mobile Only or Minimalist */}
                    <header className="md:hidden bg-white/80 backdrop-blur-md sticky top-0 z-20 h-20 flex items-center justify-between px-6 border-b border-gray-100">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="text-gray-500 hover:text-gray-900 focus:outline-none"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                            </button>
                            <h2 className="font-bold text-lg text-gray-900">Joki Workspace</h2>
                        </div>
                    </header>

                    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
                        {activeTab === 'dashboard' && (
                            <DashboardTab
                                user={auth.user}
                                stats={stats}
                                activeTasks={activeTasks}
                                reviewTasks={reviewTasks}
                                openDetailModal={openDetailModal}
                                openUploadModal={openUploadModal}
                                CountdownTimer={CountdownTimer}
                            />
                        )}

                        {activeTab === 'tasks' && (
                            <TasksTab
                                upcomingTasks={upcomingTasks}
                                reviewTasks={reviewTasks}
                                openPreviewModal={openPreviewModal}
                            />
                        )}

                        {activeTab === 'completed' && (
                            <CompletedTab completedTasks={completedTasks} />
                        )}

                        {activeTab === 'earnings' && (
                            <EarningsTab stats={stats} financials={financials} />
                        )}
                    </div>
                </main>
            </div>

            {/* MODALS */}

            <Modal show={showPreviewModal} onClose={closePreviewModal} maxWidth="2xl">
                <div className="p-6">
                    {previewTask && (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        Order #{previewTask.order_number || previewTask.id}
                                    </span>
                                    <h2 className="text-2xl font-bold text-gray-800 mt-1">{previewTask.package?.name || 'Custom Package'}</h2>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {previewTask.package?.service?.name || 'Service'}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-100 flex items-center gap-1">
                                            <span>📅</span>
                                            Deadline: {new Date(previewTask.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-2xl font-bold text-emerald-600">
                                        Rp {new Intl.NumberFormat('id-ID').format(previewTask.joki_commission)}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">Potential Earnings</span>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Left Column: Brief & Data */}
                                <div className="space-y-4">
                                    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                        <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <span>📝</span> Client Brief
                                        </h3>
                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                                            {previewTask.description || 'No specific description provided.'}
                                        </p>
                                    </div>

                                    {/* Customer Notes */}
                                    {(previewTask.notes || previewTask.revision_reason) && (
                                        <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200">
                                            <h3 className="font-bold text-yellow-800 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <span>📌</span> {previewTask.status === 'revision' ? 'Catatan Revisi Customer' : 'Catatan Customer'}
                                            </h3>
                                            <p className="text-sm text-yellow-900 leading-relaxed whitespace-pre-wrap">
                                                {previewTask.status === 'revision' ? previewTask.revision_reason : previewTask.notes}
                                            </p>
                                        </div>
                                    )}

                                    {/* Customer Assets */}
                                    {(previewTask.external_link || previewTask.reference_file) && (
                                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                            <h3 className="font-bold text-blue-800 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                                <span>📂</span> Customer Assets
                                            </h3>
                                            <div className="space-y-3">
                                                {previewTask.external_link && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-blue-500 mt-0.5">🔗</span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-blue-600 font-bold uppercase mb-0.5">Reference URL</p>
                                                            <a href={previewTask.external_link} target="_blank" rel="noreferrer" className="text-sm text-gray-700 underline hover:text-blue-700 break-all line-clamp-1 block">
                                                                {previewTask.external_link}
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                                {previewTask.reference_file && (
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-blue-500 mt-0.5">📎</span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs text-blue-600 font-bold uppercase mb-0.5">Attachment</p>
                                                            <a href={previewTask.reference_file.startsWith('http') ? previewTask.reference_file : `/storage/${previewTask.reference_file}`} target="_blank" rel="noreferrer" className="text-sm text-gray-700 underline hover:text-blue-700 break-all line-clamp-1 block">
                                                                Download File
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: Features */}
                                <div>
                                    <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100 h-full">
                                        <h3 className="font-bold text-indigo-800 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                                            <span>⚡</span> Package Includes
                                        </h3>
                                        <ul className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                            {(() => {
                                                let features = previewTask.package?.features;
                                                if (typeof features === 'string') {
                                                    try { features = JSON.parse(features); } catch (e) { features = []; }
                                                }

                                                if (Array.isArray(features) && features.length > 0) {
                                                    return features.map((feature, index) => (
                                                        <li key={index} className="flex items-start gap-2 text-sm text-gray-700 bg-white/60 p-2 rounded-lg border border-indigo-50">
                                                            <span className="text-indigo-600 font-bold min-w-[16px]">✓</span>
                                                            <span className="leading-snug">{feature}</span>
                                                        </li>
                                                    ));
                                                } else {
                                                    return (
                                                        <li className="text-sm text-gray-400 italic text-center py-4">
                                                            No specific features data available.
                                                        </li>
                                                    );
                                                }
                                            })()}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                <div className="text-xs text-gray-400">
                                    Make sure to read the brief carefully before accepting.
                                </div>
                                <div className="flex gap-3">
                                    <SecondaryButton onClick={closePreviewModal}>
                                        Cancel
                                    </SecondaryButton>
                                    <PrimaryButton onClick={handleAcceptTask} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 border-0">
                                        Accept & Start Job
                                    </PrimaryButton>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* 2. Detail Modal (Active Tasks) */}
            <Modal show={showDetailModal} onClose={closeDetailModal} maxWidth="lg">
                <div className="p-6">
                    {detailTask && (
                        <>
                            <div className="border-b pb-4 mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Task Details</h2>
                                <p className="text-sm text-gray-500">Order #{detailTask.order_number}</p>
                            </div>

                            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div>
                                    <h3 className="font-bold text-gray-700 mb-2">Customer Information</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase">Name</p>
                                                <p className="font-semibold">{detailTask.user?.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase">Email</p>
                                                <p className="font-semibold">{detailTask.user?.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Notes & Revision */}
                                {(detailTask.notes || detailTask.revision_reason) && (
                                    <div>
                                        <h3 className="font-bold text-gray-700 mb-2">Customer Notes</h3>
                                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                            {detailTask.status === 'revision' && detailTask.revision_reason ? (
                                                <>
                                                    <h4 className="text-xs font-bold text-red-700 uppercase mb-1">Catatan Revisi</h4>
                                                    <p className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed">{detailTask.revision_reason}</p>
                                                </>
                                            ) : (
                                                detailTask.notes && (
                                                    <p className="text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed">{detailTask.notes}</p>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Client Assets Section */}
                                {(detailTask.reference_file || detailTask.previous_project_file || detailTask.external_link) && (
                                    <div>
                                        <h3 className="font-bold text-gray-700 mb-2">Client Assets</h3>
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col gap-3">
                                            {detailTask.external_link && (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">🔗</span>
                                                    <div>
                                                        <p className="text-xs font-bold text-blue-800 uppercase">External Link</p>
                                                        <a href={detailTask.external_link} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm break-all hover:text-blue-800">
                                                            {detailTask.external_link}
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                            {detailTask.reference_file && (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">📄</span>
                                                    <div>
                                                        <p className="text-xs font-bold text-blue-800 uppercase">Reference File</p>
                                                        <a href={getFileUrl(detailTask.reference_file)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm hover:text-blue-800">
                                                            Download PDF
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                            {detailTask.previous_project_file && (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">📦</span>
                                                    <div>
                                                        <p className="text-xs font-bold text-blue-800 uppercase">Previous Project</p>
                                                        <a href={getFileUrl(detailTask.previous_project_file)} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm hover:text-blue-800">
                                                            Download PDF
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Package Details / Features */}
                                <div>
                                    <h3 className="font-bold text-gray-700 mb-3">Package Deliverables</h3>
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5">
                                        <div className="flex justify-between items-center mb-4 border-b border-indigo-100 pb-3">
                                            <div>
                                                <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider block mb-1">Package Type</span>
                                                <span className="block font-bold text-gray-800 text-lg">{detailTask.package?.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Payout</span>
                                                <span className="font-bold text-gray-800">Rp {new Intl.NumberFormat('id-ID').format(detailTask.joki_commission)}</span>
                                            </div>
                                        </div>


                                        <h4 className="text-xs font-bold text-indigo-600 uppercase mb-3">Included Features</h4>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {(() => {
                                                let features = detailTask.package?.features;
                                                if (typeof features === 'string') {
                                                    try { features = JSON.parse(features); } catch (e) { features = []; }
                                                }

                                                if (Array.isArray(features) && features.length > 0) {
                                                    return features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white p-2 rounded border border-indigo-100 shadow-sm">
                                                            <span className="text-indigo-500 mt-0.5">✓</span>
                                                            <span className="leading-tight">{feature}</span>
                                                        </li>
                                                    ));
                                                } else {
                                                    return (
                                                        <li className="text-sm text-gray-400 italic">No specific features listed for this package.</li>
                                                    );
                                                }
                                            })()}
                                        </ul>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-bold text-gray-700 mb-2">Instructions / Brief</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-200">
                                        {detailTask.description}
                                    </div>
                                </div>

                                {/* Customer Notes */}
                                {detailTask.notes && (
                                    <div>
                                        <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            <span>📌</span> Catatan Customer
                                        </h3>
                                        <div className="bg-yellow-50 p-4 rounded-lg text-sm text-yellow-900 whitespace-pre-wrap leading-relaxed border border-yellow-200">
                                            {detailTask.notes}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end pt-4 border-t border-gray-100">
                                <SecondaryButton onClick={closeDetailModal}>Close Details</SecondaryButton>
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* 3. Upload Modal */}
            <Modal show={showUploadModal} onClose={closeUploadModal}>
                <div className="p-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        {uploadType === 'final' ? 'Finalize Project & Deliver' : 'Sync Deliverables'}
                    </h2>

                    {/* Main Form */}
                    <form onSubmit={submitUpload} autoComplete="off" key={selectedOrder ? selectedOrder.id : 'upload-form'}>

                        {/* Milestone Selector or Revision Indicator */}
                        {uploadType === 'milestone' && selectedOrder?.milestones && (
                            selectedOrder.status === 'revision' ? (
                                <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                                            R
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-orange-800">Revision Mode</h3>
                                            <p className="text-xs text-orange-700">You are uploading a revision for the current milestone.</p>
                                        </div>
                                    </div>
                                    {/* Hidden input to ensure milestone_id is still passed */}
                                    <input type="hidden" value={data.milestone_id} />

                                    {data.milestone_id && (() => {
                                        const active = selectedOrder.milestones.find(m => m.id == data.milestone_id);
                                        return active ? (
                                            <div className="text-sm font-medium text-gray-700 mt-2 bg-white/60 p-2 rounded border border-orange-100">
                                                Active Milestone: <strong>{active.name}</strong>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            ) : (
                                <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                    <label className="block text-sm font-bold text-indigo-900 mb-2">
                                        Select Milestone to Submit
                                    </label>
                                    <select
                                        value={data.milestone_id}
                                        onChange={(e) => setData('milestone_id', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 mb-2"
                                    >
                                        <option value="" disabled>Select a milestone...</option>
                                        {selectedOrder.milestones.map((m) => {
                                            const isLocked = !['in_progress', 'revision'].includes(m.status);
                                            return (
                                                <option key={m.id} value={m.id} disabled={isLocked}>
                                                    {m.sort_order}. {m.name} ({m.weight}%) - {m.status.replace('_', ' ').toUpperCase()} {isLocked ? '(Locked/Done)' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    {data.milestone_id && (() => {
                                        const active = selectedOrder.milestones.find(m => m.id == data.milestone_id);
                                        return active ? (
                                            <div className="text-xs text-indigo-700 mt-2 bg-white/50 p-2 rounded">
                                                <strong>Requirements:</strong> {active.description || 'No specific requirements.'}
                                            </div>
                                        ) : null;
                                    })()}
                                    {errors.milestone_id && <div className="text-red-500 text-sm mt-1">{errors.milestone_id}</div>}
                                </div>
                            )
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Upload Link (Optional)
                            </label>
                            <TextInput
                                type="url"
                                name="external_link"
                                autoComplete="off"
                                className="w-full"
                                placeholder="Google Drive, Dropbox, Figma Link..."
                                value={data.external_link}
                                onChange={(e) => setData('external_link', e.target.value)}
                            />
                        </div>

                        {/* ── Upload File Pengerjaan (tunggal) ─────────── */}
                        <div className="pt-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                📁 Upload File Pengerjaan
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                File hasil kerja utama (PDF, ZIP, DOCX, PSD, dll). Maks 10MB.
                            </p>
                            <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors mb-2 cursor-pointer group">
                                <input
                                    type="file"
                                    name="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        const f = e.target.files[0];
                                        if (!f) return setData('file', null);
                                        const compressedFile = await compressImageClient(f);
                                        setData('file', compressedFile);
                                    }}
                                />
                                <div className="text-gray-400 group-hover:text-indigo-500">
                                    {data.file ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-2xl">📄</span>
                                            <span className="text-sm font-medium text-indigo-700 break-all">{data.file.name}</span>
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium">Click atau drag file di sini (Max 10MB)</p>
                                    )}
                                </div>
                            </div>
                            {errors.file && <div className="text-red-500 text-sm mb-2">{errors.file}</div>}
                        </div>

                        {/* ── Upload Gambar / Screenshot (multiple) ──────── */}
                        <div className="pt-4">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                🖼️ Upload Gambar / Screenshot Bukti
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                Screenshot, foto hasil, atau bukti pengerjaan dalam bentuk gambar. Bisa upload banyak sekaligus, otomatis dikompres.
                            </p>
                            <div className="relative border-2 border-dashed border-blue-300 bg-blue-50/40 rounded-xl p-6 text-center hover:bg-blue-50 transition-colors mb-3 cursor-pointer group">
                                <input
                                    type="file"
                                    name="proof_images"
                                    multiple
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={async (e) => {
                                        const files = Array.from(e.target.files);
                                        const compressedFiles = await Promise.all(files.map(f => compressImageClient(f)));
                                        setData('proof_images', [...(data.proof_images || []), ...compressedFiles]);
                                        const newPreviews = compressedFiles.map(f => URL.createObjectURL(f));
                                        setProofImagePreviews(prev => [...prev, ...newPreviews]);
                                        // reset input so same files can be added again
                                        e.target.value = '';
                                    }}
                                />
                                <div className="text-blue-400 group-hover:text-blue-600 pointer-events-none">
                                    <span className="text-2xl block mb-1">🖼️</span>
                                    <p className="text-sm font-medium">Click atau drag gambar/screenshot di sini</p>
                                    <p className="text-xs mt-1 text-blue-400">Boleh pilih banyak sekaligus • JPEG, PNG, WebP</p>
                                </div>
                            </div>

                            {/* Preview thumbnail grid */}
                            {proofImagePreviews.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                    {proofImagePreviews.map((src, i) => (
                                        <div key={i} className="relative group/thumb rounded-lg overflow-hidden border border-blue-200 aspect-square">
                                            <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setProofImagePreviews(prev => prev.filter((_, idx) => idx !== i));
                                                    setData('proof_images', (data.proof_images || []).filter((_, idx) => idx !== i));
                                                }}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity leading-none"
                                            >✕</button>
                                            <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] text-center py-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                                Hapus
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {(data.proof_images || []).length > 0 && (
                                <p className="text-xs text-blue-600 font-medium mb-2">
                                    {data.proof_images.length} gambar dipilih
                                </p>
                            )}
                        </div>

                        {/* ── Version Label & Note ─────────────────────── */}
                        uat <div className="pt-4 mb-4">
                            <InputLabel value="Version Label" className="mb-2" />
                            <TextInput
                                type="text"
                                name="version_label"
                                autoComplete="off"
                                className="w-full"
                                placeholder="e.g. V1, Rev V1, Final..."
                                value={data.version_label}
                                onChange={(e) => setData('version_label', e.target.value)}
                            />
                            {errors.version_label && <div className="text-red-500 text-sm mt-1">{errors.version_label}</div>}

                            {/* Version History - tampil jika ada riwayat */}
                            {selectedOrder?.files && selectedOrder.files.length > 0 ? (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">
                                        📋 Label yang sudah dipakai:
                                    </p>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        {selectedOrder.files.map((file, idx) => {
                                            const isLast = idx === selectedOrder.files.length - 1;
                                            return (
                                                <div key={file.id} className="flex flex-col items-center gap-0.5">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border
                                                        ${isLast
                                                            ? 'bg-indigo-100 text-indigo-700 border-indigo-300 ring-2 ring-indigo-200'
                                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                                        }`}>
                                                        {file.version_label}
                                                    </span>
                                                    {isLast && (
                                                        <span className="text-[10px] text-indigo-500 font-semibold">terakhir</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        Sudah ada <strong>{selectedOrder.files.length}</strong> versi. Gunakan label baru seperti{' '}
                                        <button
                                            type="button"
                                            className="text-indigo-600 font-bold underline hover:text-indigo-800"
                                            onClick={() => {
                                                const lastLabel = selectedOrder.files[selectedOrder.files.length - 1]?.version_label || '';
                                                // Auto-suggest: V1→V2, Rev V1→Rev V2, dll
                                                const match = lastLabel.match(/(\d+)$/);
                                                const suggested = match
                                                    ? lastLabel.replace(/(\d+)$/, String(parseInt(match[1]) + 1))
                                                    : lastLabel + ' Rev';
                                                setData('version_label', suggested);
                                            }}
                                        >
                                            {(() => {
                                                const lastLabel = selectedOrder.files[selectedOrder.files.length - 1]?.version_label || 'V1';
                                                const match = lastLabel.match(/(\d+)$/);
                                                return match
                                                    ? lastLabel.replace(/(\d+)$/, String(parseInt(match[1]) + 1))
                                                    : lastLabel + ' Rev';
                                            })()}
                                        </button>
                                        {' '}(klik untuk isi otomatis)
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400 mt-2">Belum ada versi sebelumnya. Gunakan <strong>V1</strong> untuk pengiriman pertama.</p>
                            )}
                        </div>

                        {/* Naming Convention Guide */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-xs text-yellow-800">
                            <p className="font-bold mb-1">Naming Guide:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                                <li>First submission: <strong>V1</strong></li>
                                <li>Revisions: <strong>Rev V1</strong>, <strong>Rev V2</strong>, etc.</li>
                                <li>Final (approved/done): <strong>Final</strong></li>
                            </ul>
                        </div>

                        <div className="mb-6">
                            <InputLabel value="Note / Catatan (Optional)" className="mb-2" />
                            <textarea
                                className="block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm text-sm"
                                rows="3"
                                placeholder="Add notes about this version..."
                                value={data.note}
                                onChange={(e) => setData('note', e.target.value)}
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 space-x-3">
                            <SecondaryButton onClick={closeUploadModal}>Cancel</SecondaryButton>
                            <PrimaryButton className={selectedOrder?.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600'}>
                                {uploadType === 'milestone'
                                    ? (selectedOrder?.status === 'revision' ? 'Submit Revision' : 'Submit Milestone')
                                    : 'Submit Deliverables'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>

            </Modal>
        </AuthenticatedLayout >
    );
}
