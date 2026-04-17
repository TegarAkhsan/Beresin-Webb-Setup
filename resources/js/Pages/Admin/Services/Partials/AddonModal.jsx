import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function AddonModal({ show, onClose, packageId, addonToEdit }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        price: '',
        description: '',
        is_active: true,
    });

    useEffect(() => {
        if (addonToEdit) {
            setData({
                name: addonToEdit.name,
                price: addonToEdit.price,
                description: addonToEdit.description || '',
                is_active: addonToEdit.is_active,
            });
        } else {
            reset();
            setData('is_active', true);
        }
    }, [addonToEdit, show]);

    const submit = (e) => {
        e.preventDefault();

        if (addonToEdit) {
            put(`/admin/addons/${addonToEdit.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post(`/admin/packages/${packageId}/addons`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <form onSubmit={submit} className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {addonToEdit ? 'Edit Add-on Feature' : 'Add New Feature'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="addon_name" value="Feature Name" />
                        <TextInput
                            id="addon_name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="e.g. Landing Page"
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="addon_price" value="Price (Rp)" />
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-2 text-gray-500 text-sm">Rp</span>
                            <TextInput
                                id="addon_price"
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
                        <InputLabel htmlFor="addon_description" value="Description (Optional)" />
                        <textarea
                            id="addon_description"
                            className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            rows="2"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                        ></textarea>
                        <InputError message={errors.description} className="mt-2" />
                    </div>

                    <div className="flex items-center">
                        <input
                            id="is_active"
                            type="checkbox"
                            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                            checked={data.is_active}
                            onChange={(e) => setData('is_active', e.target.checked)}
                        />
                        <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                            Active (Available for order)
                        </label>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                    <PrimaryButton disabled={processing}>
                        {addonToEdit ? 'Save Changes' : 'Add Feature'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
