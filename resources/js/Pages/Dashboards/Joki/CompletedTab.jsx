
export default function CompletedTab({ completedTasks }) {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Completed Tasks</h1>
                <p className="text-gray-500">History of your successfully delivered work.</p>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="divide-y divide-gray-50">
                    {(!completedTasks || completedTasks.length === 0) ? (
                        <div className="p-12 text-center">
                            <div className="inline-block p-4 rounded-full bg-gray-50 mb-4 text-2xl">🎉</div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed tasks yet.</h3>
                            <p className="text-gray-500">Complete your first task to see it here!</p>
                        </div>
                    ) : (
                        completedTasks.map(task => (
                            <div key={task.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                                            #{task.order_number}
                                        </span>
                                        <span className="text-sm text-gray-500 font-medium">
                                            {new Date(task.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                                        {task.package?.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 line-clamp-1 mb-2">
                                        Client: {task.user?.name}
                                    </p>

                                    {/* Rating Review */}
                                    {task.review ? (
                                        <div className="bg-yellow-50 inline-block px-3 py-1 rounded-lg border border-yellow-100">
                                            <div className="flex items-center gap-1">
                                                <span className="text-yellow-500 font-bold">★ {task.review.rating}</span>
                                                {task.review.comment && (
                                                    <span className="text-xs text-gray-600 italic"> - "{task.review.comment}"</span>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No rating provided</span>
                                    )}
                                </div>

                                <div className="flex flex-col items-end justify-center min-w-[150px]">
                                    <div className="text-right mb-2">
                                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">Earning</p>
                                        <span className="text-xl font-bold text-emerald-600">
                                            Rp {new Intl.NumberFormat('id-ID').format(task.joki_commission)}
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Completed
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
