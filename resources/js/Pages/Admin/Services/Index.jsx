import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import PackageModal from './Partials/PackageModal';
import ServiceModal from './Partials/ServiceModal';
import DeleteConfirmationModal from './Partials/DeleteConfirmationModal';

export default function Index({ auth, services }) {
    // Package Modal State
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState(null);
    const [editingPackage, setEditingPackage] = useState(null);

    // Service Modal State
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [editingService, setEditingService] = useState(null);

    // Delete Confirmation State
    const [deleteState, setDeleteState] = useState({ show: false, type: null, item: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Package Handlers ---
    const openCreatePackage = (serviceId) => {
        setSelectedServiceId(serviceId);
        setEditingPackage(null);
        setShowPackageModal(true);
    };

    const openEditPackage = (pkg, serviceId) => {
        setSelectedServiceId(serviceId);
        setEditingPackage(pkg);
        setShowPackageModal(true);
    };

    const deletePackage = (pkg) => {
        setDeleteState({ show: true, type: 'package', item: pkg });
    };

    const closePackageModal = () => {
        setShowPackageModal(false);
        setEditingPackage(null);
        setSelectedServiceId(null);
        router.reload();
    };

    // --- Service Handlers ---
    const openCreateService = () => {
        setEditingService(null);
        setShowServiceModal(true);
    };

    const openEditService = (service) => {
        setEditingService(service);
        setShowServiceModal(true);
    };

    const deleteService = (service) => {
        setDeleteState({ show: true, type: 'service', item: service });
    };

    const closeServiceModal = () => {
        setShowServiceModal(false);
        setEditingService(null);
        router.reload();
    };

    // --- Delete Confirmation Handler ---
    const confirmDelete = () => {
        const { type, item } = deleteState;
        setIsDeleting(true);

        const url = type === 'package' ? `/admin/packages/${item.id}` : `/admin/services/${item.id}`;

        router.delete(url, {
            onSuccess: () => {
                setIsDeleting(false);
                setDeleteState({ show: false, type: null, item: null });
                router.reload();
            },
            onError: () => setIsDeleting(false),
        });
    };

    const formatFeatures = (features) => {
        if (!features) return [];
        let items = [];
        if (Array.isArray(features)) {
            items = features;
        } else {
            try {
                const parsed = JSON.parse(features);
                if (Array.isArray(parsed)) items = parsed;
                else items = [features];
            } catch (e) {
                items = features.toString().split('\n');
            }
        }
        return items;
    };


    return (
        <AdminLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Manage Services & Packages</h2>}
        >
            <Head title="Manage Services" />

            <div className="grid gap-6">
                {services.map((service) => (
                    <div key={service.id} className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2">{service.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditService(service)}
                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="Edit Service"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => deleteService(service)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Delete Service"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Packages</h4>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {service.packages.map((pkg) => (
                                        <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors flex flex-col justify-between group relative">
                                            {/* Absolute delete button for package */}
                                            <button
                                                onClick={() => deletePackage(pkg)}
                                                className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete Package"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>

                                            <div>
                                                <div className="flex justify-between items-start mb-2 pr-6">
                                                    <div className="font-semibold text-gray-900">{pkg.name}</div>
                                                    <div className="text-sm font-bold text-green-600">
                                                        Rp {new Intl.NumberFormat('id-ID').format(pkg.price)}
                                                    </div>
                                                </div>
                                                <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside mb-4">
                                                    {formatFeatures(pkg.features).slice(0, 5).map((f, i) => (
                                                        <li key={i}>{f.replace(/["\[\]]/g, '')}</li>
                                                    ))}
                                                    {formatFeatures(pkg.features).length > 5 && <li>...</li>}
                                                </ul>
                                            </div>
                                            <div className="mt-auto text-right border-t border-gray-50 pt-2">
                                                <button
                                                    onClick={() => openEditPackage(pkg, service.id)}
                                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                >
                                                    Edit Package
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add Package Card */}
                                    <button
                                        onClick={() => openCreatePackage(service.id)}
                                        className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors h-full min-h-[140px]"
                                    >
                                        <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                        <span className="text-sm font-medium">Add Package</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add Service Card */}
                <button
                    onClick={openCreateService}
                    className="bg-gray-50 overflow-hidden shadow-sm sm:rounded-lg border-2 border-dashed border-gray-300 p-8 flex flex-col items-center justify-center text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                >
                    <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    <span className="text-lg font-medium">Add New Service Category</span>
                </button>
            </div>

            <PackageModal
                show={showPackageModal}
                onClose={closePackageModal}
                serviceId={selectedServiceId}
                packageToEdit={editingPackage}
            />

            <ServiceModal
                show={showServiceModal}
                onClose={closeServiceModal}
                serviceToEdit={editingService}
            />

            <DeleteConfirmationModal
                show={deleteState.show}
                onClose={() => setDeleteState({ show: false, type: null, item: null })}
                onConfirm={confirmDelete}
                processing={isDeleting}
                title={deleteState.type === 'package' ? 'Delete Package' : 'Delete Service'}
                message={deleteState.type === 'package'
                    ? `Are you sure you want to delete package "${deleteState.item?.name}"?`
                    : `Are you sure you want to delete service "${deleteState.item?.name}"? This will permanently delete all included packages.`}
            />
        </AdminLayout>
    );
}
