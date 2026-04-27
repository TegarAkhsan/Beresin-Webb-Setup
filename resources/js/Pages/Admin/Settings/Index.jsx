import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import InputError from '@/Components/InputError';
import { useState, useEffect } from 'react';

// Helper: returns full URL if already absolute, else prepends /storage/
const getFileUrl = (path) => {
    if (!path) return null;
    if (typeof path !== 'string') return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    // Remove leading slash for consistent processing
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // If it already has storage/ prefix, just add the leading slash
    if (cleanPath.startsWith('storage/')) return `/${cleanPath}`;
    
    return `/storage/${cleanPath}`;
};

export default function SettingsIndex({ auth, settings }) {
    const { data, setData, post, processing, errors, recentlySuccessful } = useForm({
        invoice_name: settings.invoice_name || 'Beresin Jasa Digital',
        invoice_address: settings.invoice_address || 'Jalan Digital No. 1\nJakarta, Indonesia',
        whatsapp_number: settings.whatsapp_number || '6281234567890',
        invoice_logo: null,
        qris_image: null,
    });

    const [activeTab, setActiveTab] = useState('general');
    const [logoPreview, setLogoPreview] = useState(null);
    const [qrisPreview, setQrisPreview] = useState(null);

    // Auto-generate Logo Preview
    useEffect(() => {
        if (data.invoice_logo instanceof File) {
            const url = URL.createObjectURL(data.invoice_logo);
            setLogoPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [data.invoice_logo]);

    // Auto-generate QRIS Preview
    useEffect(() => {
        if (data.qris_image instanceof File) {
            const url = URL.createObjectURL(data.qris_image);
            setQrisPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [data.qris_image]);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.settings.update'), {
            preserveScroll: true,
            onSuccess: () => {
                setLogoPreview(null);
                setQrisPreview(null);
            }
        });
    };

    const tabs = [
        { id: 'general', label: 'General Settings' },
        { id: 'logo', label: 'Logo Configuration' },
        { id: 'qris', label: 'QRIS Payment' },
    ];

    return (
        <AdminLayout
            user={auth.user}
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">System Settings</h2>}
        >
            <Head title="Settings" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Sidebar Menu */}
                        <div className="w-full md:w-64 flex-shrink-0">
                            {/* Mobile: Segmented Control */}
                            <div className="md:hidden bg-gray-100 p-1 rounded-lg flex mb-6">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all text-center ${activeTab === tab.id
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Desktop: Sidebar Menu */}
                            <div className="hidden md:block bg-white overflow-hidden shadow-sm sm:rounded-lg">
                                <div className="p-4 flex flex-col space-y-2">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6 text-gray-900 min-h-[500px]">
                                <form onSubmit={submit} className="max-w-xl">

                                    {/* GENERAL TAB */}
                                    {activeTab === 'general' && (
                                        <div className="space-y-6 animate-fade-in-up">
                                            <h3 className="text-lg font-medium mb-4 pb-2 border-b">General Information</h3>
                                            <div>
                                                <InputLabel htmlFor="invoice_name" value="Company Name (Invoice Header)" />
                                                <TextInput
                                                    id="invoice_name"
                                                    type="text"
                                                    className="mt-1 block w-full"
                                                    value={data.invoice_name}
                                                    onChange={(e) => setData('invoice_name', e.target.value)}
                                                    required
                                                />
                                                <InputError message={errors.invoice_name} className="mt-2" />
                                            </div>

                                            <div>
                                                <InputLabel htmlFor="invoice_address" value="Company Address" />
                                                <textarea
                                                    id="invoice_address"
                                                    className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm"
                                                    rows="4"
                                                    value={data.invoice_address}
                                                    onChange={(e) => setData('invoice_address', e.target.value)}
                                                    required
                                                ></textarea>
                                                <InputError message={errors.invoice_address} className="mt-2" />
                                            </div>

                                            <div>
                                                <InputLabel htmlFor="whatsapp_number" value="WhatsApp Number" />
                                                <TextInput
                                                    id="whatsapp_number"
                                                    type="text"
                                                    className="mt-1 block w-full"
                                                    value={data.whatsapp_number}
                                                    onChange={(e) => setData('whatsapp_number', e.target.value)}
                                                    required
                                                />
                                                <InputError message={errors.whatsapp_number} className="mt-2" />
                                                <p className="text-xs text-gray-500 mt-1">Format: 628...</p>
                                            </div>

                                            <div className="flex items-center gap-4 pt-4">
                                                <PrimaryButton disabled={processing}>Save General Settings</PrimaryButton>
                                                {recentlySuccessful && <p className="text-sm text-green-600">Saved.</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* LOGO TAB */}
                                    {activeTab === 'logo' && (
                                        <div className="space-y-6 animate-fade-in-up">
                                            <h3 className="text-lg font-medium mb-4 pb-2 border-b">Logo Configuration</h3>

                                            <div>
                                                <InputLabel htmlFor="invoice_logo" value="Upload New Logo" />
                                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                                                    <div className="space-y-1 text-center">
                                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                        <div className="flex text-sm text-gray-600">
                                                            <label htmlFor="invoice_logo" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                                <span>Upload a file</span>
                                                                <input id="invoice_logo" name="invoice_logo" type="file" className="sr-only" onChange={(e) => setData('invoice_logo', e.target.files[0])} accept="image/*" />
                                                            </label>
                                                            <p className="pl-1">or drag and drop</p>
                                                        </div>
                                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 1MB</p>
                                                    </div>
                                                </div>
                                                {data.invoice_logo && <p className="text-sm text-indigo-600 mt-2">Selected: {data.invoice_logo.name}</p>}
                                                <InputError message={errors.invoice_logo} className="mt-2" />
                                            </div>

                                            {(logoPreview || settings.invoice_logo) && (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                                    <p className="text-sm text-gray-500 mb-2">{logoPreview ? 'New Logo Preview:' : 'Current Logo Preview:'}</p>
                                                    <div className="border p-2 bg-white rounded flex items-center justify-center">
                                                        <img src={logoPreview || getFileUrl(settings.invoice_logo)} alt="Logo Preview" className="h-20 object-contain" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 pt-4">
                                                <PrimaryButton disabled={processing}>Save Logo Settings</PrimaryButton>
                                                {recentlySuccessful && <p className="text-sm text-green-600">Saved.</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* QRIS TAB */}
                                    {activeTab === 'qris' && (
                                        <div className="space-y-6 animate-fade-in-up">
                                            <h3 className="text-lg font-medium mb-4 pb-2 border-b">QRIS Payment Configuration</h3>

                                            <div>
                                                <InputLabel htmlFor="qris_image" value="Upload QRIS Image" />
                                                <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                                                    <div className="space-y-1 text-center">
                                                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                        <div className="flex text-sm text-gray-600">
                                                            <label htmlFor="qris_image" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                                                <span>Upload a file</span>
                                                                <input id="qris_image" name="qris_image" type="file" className="sr-only" onChange={(e) => setData('qris_image', e.target.files[0])} accept="image/*" />
                                                            </label>
                                                            <p className="pl-1">or drag and drop</p>
                                                        </div>
                                                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 1MB</p>
                                                    </div>
                                                </div>
                                                {data.qris_image && <p className="text-sm text-indigo-600 mt-2">Selected: {data.qris_image.name}</p>}
                                                <InputError message={errors.qris_image} className="mt-2" />
                                            </div>

                                            {(qrisPreview || settings.qris_image) && (
                                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                                    <p className="text-sm text-gray-500 mb-2">{qrisPreview ? 'New QRIS Preview:' : 'Current QRIS Preview:'}</p>
                                                    <div className="border p-2 bg-white rounded flex items-center justify-center">
                                                        <img src={qrisPreview || getFileUrl(settings.qris_image)} alt="QRIS Preview" className="max-w-full h-48 object-contain" />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-4 pt-4">
                                                <PrimaryButton disabled={processing}>Save QRIS Settings</PrimaryButton>
                                                {recentlySuccessful && <p className="text-sm text-green-600">Saved.</p>}
                                            </div>
                                        </div>
                                    )}

                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
