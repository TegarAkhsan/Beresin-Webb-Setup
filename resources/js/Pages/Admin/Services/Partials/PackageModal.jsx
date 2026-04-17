import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useForm, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AddonModal from './AddonModal';

export default function PackageModal({ show, onClose, serviceId, packageToEdit }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        price: '',
        duration_days: 3,
        description: '',
        features: '', // Will be handled as multiline string
        is_negotiable: false,
    });

    const [showAddonModal, setShowAddonModal] = useState(false);
    const [editingAddon, setEditingAddon] = useState(null);

    useEffect(() => {
        if (packageToEdit) {
            setData({
                name: packageToEdit.name,
                price: packageToEdit.price,
                duration_days: packageToEdit.duration_days || 3,
                description: packageToEdit.description || '',
                features: formatFeatures(packageToEdit.features),
                is_negotiable: packageToEdit.is_negotiable || false,
            });
        } else {
            reset();
            setData('duration_days', 3); // Ensure default persists
        }
    }, [packageToEdit, show]);

    const formatFeatures = (features) => {
        if (!features) return '';
        if (Array.isArray(features)) return features.join('\n');
        try {
            const parsed = JSON.parse(features);
            if (Array.isArray(parsed)) return parsed.join('\n');
            return features; // Fallback
        } catch (e) {
            return features; // Plain string
        }
    };

    const submit = (e) => {
        e.preventDefault();

        if (packageToEdit) {
            put(`/admin/packages/${packageToEdit.id}`, {
                onSuccess: () => {
                    onClose(); // Close on success of main package update
                },
            });
        } else {
            post(`/admin/services/${serviceId}/packages`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const openCreateAddon = () => {
        setEditingAddon(null);
        setShowAddonModal(true);
    };

    const openEditAddon = (addon) => {
        setEditingAddon(addon);
        setShowAddonModal(true);
    };

    const deleteAddon = (addon) => {
        if (confirm('Are you sure you want to delete this feature?')) {
            router.delete(`/admin/addons/${addon.id}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose}>
            <div className="p-6 max-h-[90vh] overflow-y-auto">
                <form onSubmit={submit}>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                        {packageToEdit ? 'Edit Package' : 'Add New Package'}
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <InputLabel htmlFor="name" value="Package Name" />
                            <TextInput
                                id="name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1 block w-full"
                                placeholder="e.g. Basic Plan"
                                required
                            />
                            <InputError message={errors.name} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="price" value="Price (Rp)" />
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                                    <TextInput
                                        id="price"
                                        type="number"
                                        value={data.price}
                                        onChange={(e) => setData('price', e.target.value)}
                                        className="block w-full pl-8"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                <InputError message={errors.price} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="duration" value="Est. Duration (Days)" />
                                <TextInput
                                    id="duration"
                                    type="number"
                                    value={data.duration_days}
                                    onChange={(e) => setData('duration_days', e.target.value)}
                                    className="mt-1 block w-full"
                                    placeholder="3"
                                    required
                                    min="1"
                                />
                                <InputError message={errors.duration_days} className="mt-2" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="description" value="Description" />
                            <textarea
                                id="description"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                rows="2"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            ></textarea>
                            <InputError message={errors.description} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="features" value="Features (One per line)" />
                            <textarea
                                id="features"
                                className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                rows="5"
                                placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                                value={data.features}
                                onChange={(e) => setData('features', e.target.value)}
                            ></textarea>
                            <InputError message={errors.features} className="mt-2" />
                            <p className="text-xs text-gray-500 mt-1">Enter each feature on a new line. They will be displayed as a list.</p>
                        </div>

                        <div className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <input
                                id="is_negotiable"
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                checked={data.is_negotiable}
                                onChange={(e) => setData('is_negotiable', e.target.checked)}
                            />
                            <div className="ml-3">
                                <label htmlFor="is_negotiable" className="block text-sm font-medium text-gray-900">
                                    Enable Negotiation Mode
                                </label>
                                <p className="text-xs text-gray-500">
                                    If enabled, users can select add-on features and propose a price.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pb-6 border-b border-gray-100">
                        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {packageToEdit ? 'Save Main Details' : 'Create Package'}
                        </PrimaryButton>
                    </div>
                </form>

                {/* Add-ons Section (Only when editing and negotiable) */}
                {packageToEdit && data.is_negotiable && (
                    <div className="mt-6 pt-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-bold text-gray-800">Negotiation Add-on Features</h3>
                            <button
                                onClick={openCreateAddon}
                                className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 transition"
                            >
                                + Add Feature
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            {packageToEdit.addons && packageToEdit.addons.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {packageToEdit.addons.map((addon) => (
                                            <tr key={addon.id}>
                                                <td className="px-4 py-2 text-sm text-gray-900">
                                                    {addon.name}
                                                    {!addon.is_active && <span className="ml-2 text-xs text-red-500">(Inactive)</span>}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-500">
                                                    Rp {new Intl.NumberFormat('id-ID').format(addon.price)}
                                                </td>
                                                <td className="px-4 py-2 text-right text-sm font-medium">
                                                    <button onClick={() => openEditAddon(addon)} className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                                                    <button onClick={() => deleteAddon(addon)} className="text-red-600 hover:text-red-900">Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    No features added yet. add one to start.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <AddonModal
                show={showAddonModal}
                onClose={() => setShowAddonModal(false)}
                packageId={packageToEdit?.id}
                addonToEdit={editingAddon}
            />
        </Modal>
    );
}
