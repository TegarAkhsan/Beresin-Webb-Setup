import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useForm } from '@inertiajs/react';
import { useEffect } from 'react';

export default function ServiceModal({ show, onClose, serviceToEdit }) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        description: '',
    });

    useEffect(() => {
        if (serviceToEdit) {
            setData({
                name: serviceToEdit.name,
                description: serviceToEdit.description || '',
            });
        } else {
            reset();
        }
    }, [serviceToEdit, show]);

    const submit = (e) => {
        e.preventDefault();

        if (serviceToEdit) {
            put(`/admin/services/${serviceToEdit.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/admin/services', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={submit} className="p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    {serviceToEdit ? 'Edit Service Category' : 'Add New Service Category'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <InputLabel htmlFor="name" value="Service Name" />
                        <TextInput
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="e.g. Web Development"
                            required
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="description" value="Description" />
                        <textarea
                            id="description"
                            className="mt-1 block w-full border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                            rows="3"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            required
                        ></textarea>
                        <InputError message={errors.description} className="mt-2" />
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                    <PrimaryButton disabled={processing}>
                        {serviceToEdit ? 'Save Changes' : 'Create Service'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
