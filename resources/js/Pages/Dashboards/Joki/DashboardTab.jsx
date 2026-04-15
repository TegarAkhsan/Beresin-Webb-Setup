import { Link } from '@inertiajs/react';

const StatCard = ({ title, value, subtitle, icon, color }) => {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600',
        indigo: 'bg-indigo-50 text-indigo-600'
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-500 text-sm font-semibold tracking-wide uppercase">{title}</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
            <p className="text-sm font-medium text-gray-400">{subtitle}</p>
        </div>
    );
};

export default function DashboardTab({ user, stats, activeTasks, openDetailModal, openUploadModal, CountdownTimer }) {

    const renderTask = (task) => {
        const isRevision = task.status === 'revision';
        const isReview = task.status === 'review';
        const isFinalization = task.status === 'finalization';

        return (
            <div key={task.id} className={`p-6 transition-colors flex flex-col md:flex-row gap-6 
                ${isRevision ? 'bg-red-50 hover:bg-red-100 border-l-4 border-red-500' :
                    isFinalization ? 'bg-indigo-50 hover:bg-indigo-100 border-l-4 border-indigo-500' :
                        'hover:bg-gray-50 border-l-4 border-transparent'}`}>
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-white text-gray-600 border border-gray-200">
                            #{task.order_number}
                        </span>
                        <span className="text-sm text-indigo-600 font-medium">
                            {task.package?.service?.name}
                        </span>
                        {isRevision && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase animate-pulse">Action Required</span>}
                        {isFinalization && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded uppercase animate-pulse">Finalization Required</span>}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {task.package?.name}
                        {task.package?.max_revisions && (
                            <span className={`text-xs ml-2 px-2 py-0.5 rounded font-bold ${task.revision_count >= task.package.max_revisions ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                Rev: {task.revision_count || 0}/{task.package.max_revisions}
                            </span>
                        )}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mb-4">
                        Client: {task.user?.name}
                    </p>

                    {(isRevision || task.revision_reason) && (
                        <div className={`mb-4 bg-white/60 p-4 rounded-lg space-y-3 ${isRevision ? 'border border-red-200' : 'border border-amber-200'}`}>
                            <div>
                                <h4 className={`text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${isRevision ? 'text-red-700' : 'text-amber-700'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                    {isRevision ? 'Customer Note' : 'Last Revision Note'}
                                </h4>
                                {!isRevision && (
                                    <p className="text-xs text-amber-600 mb-1">⚑ Sudah disubmit — pastikan revisi ini sudah ditangani.</p>
                                )}
                                <p className={`text-sm italic ${isRevision ? 'text-gray-800' : 'text-gray-600'}`}>"{task.revision_reason}"</p>
                            </div>

                            {task.revision_file && (
                                <div className={`pt-3 border-t ${isRevision ? 'border-red-100' : 'border-amber-100'}`}>
                                    <h4 className={`text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1 ${isRevision ? 'text-red-700' : 'text-amber-700'}`}>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                        Attachment
                                    </h4>
                                    <a
                                        href={`/storage/${task.revision_file}`}
                                        target="_blank"
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${isRevision ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                                    >
                                        Download File
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => openDetailModal(task)}
                            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                            View Details
                        </button>
                        {task.status !== 'review' && (
                            <>
                                <span className="text-gray-300">|</span>
                                <button
                                    onClick={() => openUploadModal(task)}
                                    className={`text-sm font-semibold hover:underline ${isRevision ? 'text-red-600 hover:text-red-800' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {isRevision ? 'Upload Revision' : isFinalization ? 'Finalize Order 🚀' : 'Upload Result'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end justify-center min-w-[150px]">
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Deadline</p>
                        {CountdownTimer && <CountdownTimer deadline={task.deadline} />}
                    </div>
                    {task.milestones && task.milestones.length > 0 ? (
                        <div className="mt-4 w-full text-right">
                            {(() => {
                                const total = task.milestones.length;
                                const completed = task.milestones.filter(m => ['submitted', 'customer_review', 'completed'].includes(m.status)).length;
                                const current = task.milestones.find(m => ['in_progress', 'revision'].includes(m.status));
                                const submitted = task.milestones.find(m => ['submitted', 'customer_review'].includes(m.status)); // Check for submitted but not completed
                                const progress = Math.round((completed / total) * 100);

                                return (
                                    <div>
                                        <div className="flex justify-end items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-gray-500 uppercase">
                                                {current
                                                    ? `Current: ${current.name}`
                                                    : (submitted
                                                        ? `In Review: ${submitted.name}`
                                                        : (isFinalization ? 'Finalizing' : (progress === 100 ? 'All Done' : 'Pending Start'))
                                                    )
                                                }
                                            </span>
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                {isFinalization ? '100%' : progress + '%'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: `${isFinalization ? 100 : progress}%` }}></div>
                                        </div>
                                        {current ? (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                    ${current.status === 'revision' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {current.status === 'revision' ? 'Needs Revision' : 'Milestone Active'}
                                            </span>
                                        ) : submitted ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                Waiting for Review
                                            </span>
                                        ) : isFinalization ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                Ready to Finalize
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="mt-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                    ${isRevision ? 'bg-red-100 text-red-800' :
                                    isReview ? 'bg-purple-100 text-purple-800' :
                                        isFinalization ? 'bg-indigo-100 text-indigo-800' :
                                            'bg-blue-100 text-blue-800'}`}>
                                {isRevision ? 'Revision Requested' : isReview ? 'In Review' : isFinalization ? 'Finalization Phase' : 'In Progress'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const revisions = activeTasks.filter(t => t.status === 'revision');
    const finalization = activeTasks.filter(t => t.status === 'finalization');
    const inProgress = activeTasks.filter(t => t.status === 'in_progress');
    const inReview = activeTasks.filter(t => t.status === 'review');

    return (
        <div className="space-y-8 animate-fade-in-up">
            <header>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Dashboard</h1>
                <p className="text-lg text-gray-500">
                    Welcome back, <span className="text-gray-900 font-semibold">{user.name}</span>!
                </p>
            </header>

            {/* Workload Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Workload"
                    value={stats.workload_status}
                    subtitle="Current Status"
                    color="indigo"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>}
                />
                <StatCard
                    title="Rating"
                    value={`★ ${stats.avg_rating}`}
                    subtitle="Average Rating"
                    color="amber"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path></svg>}
                />
                <StatCard
                    title="On-Time"
                    value={`${stats.on_time_rate}%`}
                    subtitle="Completion Rate"
                    color="emerald"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                />
                <StatCard
                    title="Completed"
                    value={stats.total_completed}
                    subtitle="Total Tasks"
                    color="blue"
                    icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
                />
            </div>

            {/* Active Tasks List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900">Current Tasks</h2>
                    <div className="flex gap-2">
                        {finalization.length > 0 && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">{finalization.length} Finalization</span>}
                        {revisions.length > 0 && <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">{revisions.length} Revisions</span>}
                        {inProgress.length > 0 && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">{inProgress.length} In Progress</span>}
                        {inReview.length > 0 && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">{inReview.length} In Review</span>}
                    </div>
                </div>

                <div className="divide-y divide-gray-50">
                    {activeTasks.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-block p-4 rounded-full bg-gray-50 mb-4 text-2xl">⚡</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Available for work!</h3>
                            <p className="text-gray-500">You have no active tasks at the moment.</p>
                        </div>
                    ) : (
                        <>
                            {finalization.length > 0 && (
                                <div className="bg-indigo-50/50">
                                    <div className="px-6 py-2 bg-indigo-100/50 text-indigo-800 text-xs font-black uppercase tracking-widest border-l-4 border-indigo-500">
                                        Action Required: Finalization
                                    </div>
                                    {finalization.map(renderTask)}
                                </div>
                            )}

                            {revisions.length > 0 && (
                                <div className="bg-red-50/50">
                                    <div className="px-6 py-2 bg-red-100/50 text-red-800 text-xs font-black uppercase tracking-widest border-l-4 border-red-500">
                                        Action Required: Revisions
                                    </div>
                                    {revisions.map(renderTask)}
                                </div>
                            )}

                            {inProgress.length > 0 && (
                                <div>
                                    {(revisions.length > 0 || finalization.length > 0) && <div className="px-6 py-2 bg-gray-50 text-gray-500 text-xs font-black uppercase tracking-widest">Active Jobs</div>}
                                    {inProgress.map(renderTask)}
                                </div>
                            )}

                            {inReview.length > 0 && (
                                <div className="bg-gray-50/30">
                                    {(revisions.length > 0 || inProgress.length > 0 || finalization.length > 0) && <div className="px-6 py-2 bg-purple-50 text-purple-800 text-xs font-black uppercase tracking-widest border-l-4 border-purple-200">Waiting for Review</div>}
                                    {inReview.map(renderTask)}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
