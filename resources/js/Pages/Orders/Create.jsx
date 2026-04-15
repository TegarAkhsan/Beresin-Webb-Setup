import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, useForm } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';


export default function Create({ auth, packages, selectedPackageId }) {
    const user = auth.user;
    const [showSizeError, setShowSizeError] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        package_id: selectedPackageId || '',
        // Bio Data
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'L',
        address: user.address || '',
        university: user.university || '', // Asal Instansi
        referral_source: user.referral_source || '',

        // Order Data
        description: '', // Catatan Pesanan
        deadline: '',
        notes: '',
        external_link: '',
        reference_file: null,
        previous_project_file: null,

        // Negotiation Data
        student_card: null,
        proposed_price: 0,
        selected_features: [],

        // Payment Method (Visual only for now, passed to backend if needed)
        payment_method: 'qris',
    });

    const [selectedPackage, setSelectedPackage] = useState(
        packages.find(p => p.id == selectedPackageId) || null
    );

    const [rushFee, setRushFee] = useState(0);
    const [totalPrice, setTotalPrice] = useState(0);

    // Helper: robust check for is_negotiable (handles boolean, int 1/0, string 'true'/'t')
    const isNegotiable = (pkg) => {
        if (!pkg) return false;
        const v = pkg.is_negotiable;
        return v === true || v === 1 || v === '1' || v === 't' || v === 'true' || v === '1.0';
    };

    // Helper: get combined, safely-parsed feature list for negotiable packages
    // Priority: addons (DB relation) > addon_features (JSON) > features (base JSON)
    const getFeatureList = (pkg) => {
        if (!pkg) return [];
        // 1. Use relational addons (most complete - has price + estimate_days)
        if (Array.isArray(pkg.addons) && pkg.addons.length > 0) {
            return pkg.addons.map(a => ({
                name: typeof a === 'string' ? a : (a.name || ''),
                price: typeof a === 'object' ? Number(a.price || 0) : 0,
                estimate_days: typeof a === 'object' ? (a.estimate_days || 1) : 1,
                description: typeof a === 'object' ? (a.description || '') : '',
            }));
        }
        // 2. Try addon_features JSON field
        if (pkg.addon_features) {
            try {
                const parsed = typeof pkg.addon_features === 'string'
                    ? JSON.parse(pkg.addon_features) : pkg.addon_features;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(a => ({
                        name: typeof a === 'string' ? a : (a.name || ''),
                        price: typeof a === 'object' ? Number(a.price || 0) : 0,
                        estimate_days: typeof a === 'object' ? (a.estimate_days || 1) : 1,
                        description: typeof a === 'object' ? (a.description || '') : '',
                    }));
                }
            } catch (e) {}
        }
        // 3. Try base features JSON field
        if (pkg.features) {
            try {
                const parsed = typeof pkg.features === 'string'
                    ? JSON.parse(pkg.features) : pkg.features;
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map(a => ({
                        name: typeof a === 'string' ? a : (a.name || ''),
                        price: typeof a === 'object' ? Number(a.price || 0) : 0,
                        estimate_days: typeof a === 'object' ? (a.estimate_days || 1) : 1,
                        description: typeof a === 'object' ? (a.description || '') : '',
                    }));
                }
            } catch (e) {}
        }
        return [];
    };

    // Initial Defaults
    useEffect(() => {
        const pkg = packages.find(p => p.id == data.package_id);
        setSelectedPackage(pkg);

        // Auto-set default deadline if package selected and deadline empty
        if (pkg && !data.deadline) {
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + (pkg.duration_days || 3));
            setData('deadline', defaultDate.toISOString().split('T')[0]);
        }

        // Reset negotiation data when package changes
        if (isNegotiable(pkg)) {
            setData(d => ({
                ...d,
                student_card: null,
                proposed_price: 0,
                selected_features: []
            }));
        }

    }, [data.package_id]);

    // Effect 1: Auto-update deadline when features change
    useEffect(() => {
        if (!isNegotiable(selectedPackage)) return;

        let addonsDays = 1; // Base
        const features = getFeatureList(selectedPackage);

        if (features.length > 0 && data.selected_features.length > 0) {
            const selected = features.filter(f => data.selected_features.includes(f.name));
            addonsDays += selected.reduce((sum, f) => sum + (parseInt(f.estimate_days) || 1), 0);
        }

        // Auto-set deadline to "Today + Estimated Days"
        const newDeadline = new Date();
        newDeadline.setDate(newDeadline.getDate() + addonsDays);
        setData('deadline', newDeadline.toISOString().split('T')[0]);

    }, [data.selected_features, selectedPackage]);

    // Helper: compute reference price from selected features
    const computeReferencePrice = () => {
        if (!isNegotiable(selectedPackage)) return 0;
        const features = getFeatureList(selectedPackage);
        if (features.length === 0 || data.selected_features.length === 0) return 0;
        const selected = features.filter(f => data.selected_features.includes(f.name));
        return selected.reduce((sum, f) => sum + Number(f.price || 0), 0);
    };


    // Effect 2: Calculate Fee and Total when Deadline or Features change
    useEffect(() => {
        if (!selectedPackage || !data.deadline) {
            setRushFee(0);
            setTotalPrice(selectedPackage ? parseFloat(selectedPackage.price) + 5000 : 0);
            return;

        }

        if (isNegotiable(selectedPackage)) {
            // Calculate base total from add-ons
            let addonsTotal = 0;
            let addonsDays = 1;
            const features = getFeatureList(selectedPackage);

            if (features.length > 0 && data.selected_features.length > 0) {
                const selected = features.filter(f => data.selected_features.includes(f.name));
                addonsTotal = selected.reduce((sum, f) => sum + parseFloat(f.price), 0);
                addonsDays += selected.reduce((sum, f) => sum + (parseInt(f.estimate_days) || 1), 0);
            }

            // Calculate Rush Fee for Negotiation
            let rushFeeCalc = 0;
            if (data.deadline) {
                const standardDeadline = new Date();
                standardDeadline.setDate(standardDeadline.getDate() + addonsDays);
                standardDeadline.setHours(0, 0, 0, 0);

                const userDeadline = new Date(data.deadline);
                userDeadline.setHours(0, 0, 0, 0);

                const diffTime = standardDeadline - userDeadline;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Only apply fee if deadline is strictly BEFORE the estimated date
                if (diffDays > 0) {
                    rushFeeCalc = diffDays * 50000;
                }
            }

            setRushFee(rushFeeCalc);
            setTotalPrice(addonsTotal + rushFeeCalc);
            return;
        }

        // Non-negotiable logic
        const standardDeadline = new Date();
        standardDeadline.setDate(standardDeadline.getDate() + (selectedPackage.duration_days || 3));
        standardDeadline.setHours(0, 0, 0, 0);

        const userDeadline = new Date(data.deadline);
        userDeadline.setHours(0, 0, 0, 0);

        const diffTime = standardDeadline - userDeadline;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let fee = 0;
        if (diffDays > 0) {
            fee = diffDays * 25000;
        }

        setRushFee(fee);
        setTotalPrice(parseFloat(selectedPackage.price) + fee + 5000);


    }, [data.deadline, selectedPackage, data.selected_features]);

    const submit = (e) => {
        e.preventDefault();
        post(route('orders.store'));
    };

    // Helper for duration text
    const formatDuration = (days) => {
        if (!days) return '3 Days'; // Default if days is null/undefined
        if (days <= 3) return '1-3 Days';
        if (days <= 7) return '6-7 Days';
        return '10-15 Days';
    };

    const handleFeatureToggle = (featureName) => {
        const current = data.selected_features;
        if (current.includes(featureName)) {
            setData('selected_features', current.filter(f => f !== featureName));
        } else {
            setData('selected_features', [...current, featureName]);
        }
    };

    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Checkout Order</h2>}>
            <Head title="Checkout" />

            <div className="py-12 bg-gray-50 from-gray-50 to-white">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="grid md:grid-cols-3 gap-8">

                        {/* LEFT COLUMN: FORM DATA */}
                        <div className="md:col-span-2 space-y-8">

                            {/* 1. Biodata Section */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
                                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                                    <span className="bg-yellow-400 text-slate-900 border-2 border-slate-900 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">1</span>
                                    Personal Details {isNegotiable(selectedPackage) && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">Student Verif Req.</span>}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <InputLabel htmlFor="name" value="Full Name" />
                                        <TextInput id="name" value={data.name} onChange={e => setData('name', e.target.value)} className="mt-1 block w-full" required />
                                        <InputError message={errors.name} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="email" value="Email" />
                                        <TextInput id="email" type="email" value={data.email} onChange={e => setData('email', e.target.value)} className="mt-1 block w-full bg-gray-50" readOnly />
                                        <InputError message={errors.email} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="phone" value="WhatsApp Number" />
                                        <TextInput id="phone" value={data.phone} onChange={e => setData('phone', e.target.value)} className="mt-1 block w-full" placeholder="08..." required />
                                        <InputError message={errors.phone} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="gender" value="Gender" />
                                        <select id="gender" value={data.gender} onChange={e => setData('gender', e.target.value)} className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm">
                                            <option value="L">Male (Laki-laki)</option>
                                            <option value="P">Female (Perempuan)</option>
                                        </select>
                                        <InputError message={errors.gender} className="mt-2" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <InputLabel htmlFor="address" value="Full Address" />
                                        <TextInput id="address" value={data.address} onChange={e => setData('address', e.target.value)} className="mt-1 block w-full" placeholder="Street, City, Province" required />
                                        <InputError message={errors.address} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="university" value="Institution / University" />
                                        <TextInput id="university" value={data.university} onChange={e => setData('university', e.target.value)} className="mt-1 block w-full" required />
                                        <InputError message={errors.university} className="mt-2" />
                                    </div>
                                    <div>
                                        <InputLabel htmlFor="referral_source" value="Source (Know us from?)" />
                                        <select id="referral_source" value={data.referral_source} onChange={e => setData('referral_source', e.target.value)} className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm" required>
                                            <option value="">-- Select Source --</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="tiktok">TikTok</option>
                                            <option value="google">Google Search</option>
                                            <option value="friend">Friend / Recommendation</option>
                                            <option value="other">Other</option>
                                        </select>
                                        <InputError message={errors.referral_source} className="mt-2" />
                                    </div>

                                    {/* Student Card Upload for Negotiation Packages */}
                                    {isNegotiable(selectedPackage) && (
                                        <div className="md:col-span-2 mt-4 p-4 border-2 border-indigo-100 bg-indigo-50 rounded-xl">
                                            <InputLabel htmlFor="student_card" value="Student ID Card (Kartu Tanda Mahasiswa)" />
                                            <p className="text-xs text-indigo-600 mb-2">Required for Student Package verification.</p>
                                            <input type="file" id="student_card" onChange={e => {
                                                const file = e.target.files[0];
                                                if (file && file.size > 5 * 1024 * 1024) {
                                                    setShowSizeError(true);
                                                    e.target.value = null;
                                                    return;
                                                }
                                                setData('student_card', file);
                                            }} accept="image/*,application/pdf" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700" required />
                                            <InputError message={errors.student_card} className="mt-2" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Order Details Section */}
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]">
                                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-3">
                                    <span className="bg-yellow-400 text-slate-900 border-2 border-slate-900 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">2</span>
                                    Project Requirements
                                    {isNegotiable(selectedPackage) && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">Paket Pelajar</span>}
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <InputLabel htmlFor="description" value="Project Note / Description" />
                                        <textarea id="description" value={data.description} onChange={e => setData('description', e.target.value)} className="mt-1 block w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md shadow-sm h-24" placeholder="Explain your project details..." ></textarea>
                                        <InputError message={errors.description} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="deadline" value="Desired Deadline" />
                                        <TextInput id="deadline" type="date" value={data.deadline} onChange={e => setData('deadline', e.target.value)} className="mt-1 block w-full" required />
                                        {!isNegotiable(selectedPackage) && rushFee > 0 && <p className="text-xs text-amber-600 font-bold mt-1">⚡ RUSH ORDER: +Rp 25.000/day earlier</p>}
                                        <p className="text-xs text-gray-400 mt-1">Initial Recommendation: {selectedPackage?.duration_days || 3} days from now ({formatDuration(selectedPackage?.duration_days)})</p>
                                        <InputError message={errors.deadline} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="external_link" value="External Link (Google Drive / Figma / Etc)" />
                                        <TextInput id="external_link" type="url" value={data.external_link} onChange={e => setData('external_link', e.target.value)} className="mt-1 block w-full" placeholder="https://..." />
                                        <InputError message={errors.external_link} className="mt-2" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <InputLabel htmlFor="reference_file" value="Reference Brief" />
                                            <input type="file" onChange={e => {
                                                const file = e.target.files[0];
                                                if (file && file.size > 5 * 1024 * 1024) {
                                                    setShowSizeError(true);
                                                    e.target.value = null;
                                                    return;
                                                }
                                                setData('reference_file', file);
                                            }} accept="application/pdf" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                            <p className="text-xs text-gray-400 mt-1">PDF Only, Max 5MB.</p>
                                            <InputError message={errors.reference_file} className="mt-2" />
                                        </div>
                                        <div>
                                            <InputLabel htmlFor="previous_project_file">
                                                Previous Project / Assets <span className="text-gray-400 font-normal text-xs ml-1">(Opsional)</span>
                                            </InputLabel>
                                            <input type="file" onChange={e => {
                                                const file = e.target.files[0];
                                                if (file && file.size > 5 * 1024 * 1024) {
                                                    setShowSizeError(true);
                                                    e.target.value = null;
                                                    return;
                                                }
                                                setData('previous_project_file', file);
                                            }} accept="application/pdf" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                            <p className="text-xs text-gray-400 mt-1">PDF Only, Max 5MB.</p>
                                            <InputError message={errors.previous_project_file} className="mt-2" />
                                        </div>
                                    </div>

                                    {/* === NEGOTIATION SECTION FOR STUDENT PACKAGE === */}
                                    {isNegotiable(selectedPackage) && (() => {
                                        const featureList = getFeatureList(selectedPackage);
                                        const refPrice = computeReferencePrice();

                                        return (
                                            <div className="mt-6 pt-6 border-t-2 border-dashed border-indigo-200">
                                                {/* Negotiation Header */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="bg-indigo-500 text-white border-2 border-slate-900 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex-shrink-0">✦</span>
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-900">Negotiation &amp; Feature Selection</h4>
                                                        <p className="text-xs text-indigo-600">Pilih fitur yang kamu butuhkan — harga otomatis dihitung</p>
                                                    </div>
                                                </div>

                                                {featureList.length === 0 ? (
                                                    <div className="p-4 border border-indigo-100 rounded-xl bg-indigo-50 mb-4">
                                                        <p className="text-sm text-indigo-600 font-medium">💬 Fitur akan didiskusikan bersama Admin setelah proposal diajukan. Langsung isi budget yang kamu mampu di bawah.</p>
                                                    </div>
                                                ) : (
                                                    <div className="mb-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <label className="block font-bold text-sm text-slate-800">Pilih Fitur yang Dibutuhkan:</label>
                                                            {data.selected_features.length > 0 && (
                                                                <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-full border border-indigo-200">
                                                                    {data.selected_features.length} fitur dipilih
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {featureList.map((feature, idx) => {
                                                                const fName = feature.name || ('Fitur ' + (idx + 1));
                                                                const fPrice = Number(feature.price || 0);
                                                                const fDays = feature.estimate_days || 1;
                                                                const fDesc = feature.description || '';
                                                                const isSelected = data.selected_features.includes(fName);

                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        onClick={() => handleFeatureToggle(fName)}
                                                                        className={`relative flex items-start p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                                                                            isSelected
                                                                                ? 'border-indigo-500 bg-indigo-50 shadow-[3px_3px_0px_0px_rgba(99,102,241,1)]'
                                                                                : 'border-gray-200 hover:border-indigo-300 bg-white hover:shadow-sm'
                                                                        }`}
                                                                    >
                                                                        {/* Checkbox */}
                                                                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all ${
                                                                            isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white'
                                                                        }`}>
                                                                            {isSelected && (
                                                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                                </svg>
                                                                            )}
                                                                        </div>
                                                                        {/* Feature Info */}
                                                                        <div className="ml-3 flex-1 min-w-0">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <p className={`text-sm font-bold leading-snug ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>{fName}</p>
                                                                                <div className="flex-shrink-0 text-right">
                                                                                    {fPrice > 0 ? (
                                                                                        <p className={`text-sm font-black ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`}>
                                                                                            Rp {new Intl.NumberFormat('id-ID').format(fPrice)}
                                                                                        </p>
                                                                                    ) : (
                                                                                        <p className="text-xs text-gray-400 italic">Negotiable</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            {fDesc && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{fDesc}</p>}
                                                                            <div className="flex items-center gap-2 mt-1.5">
                                                                                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                                    ~{fDays} hari
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Running total from features */}
                                                        {data.selected_features.length > 0 && (
                                                            <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-200">
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Harga Referensi Fitur Dipilih</p>
                                                                        <p className="text-xs text-indigo-500 mt-0.5">{data.selected_features.length} fitur × total estimasi</p>
                                                                    </div>
                                                                    <p className="text-2xl font-black text-indigo-700">
                                                                        Rp {new Intl.NumberFormat('id-ID').format(refPrice)}
                                                                    </p>
                                                                </div>
                                                                <p className="text-xs text-indigo-400 mt-2">💡 Ini adalah harga standar. Isi budget kamu di bawah (boleh lebih rendah untuk negosiasi).</p>
                                                            </div>
                                                        )}
                                                        <InputError message={errors.selected_features} className="mt-2" />
                                                    </div>
                                                )}

                                                {/* Proposed Budget */}
                                                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="text-lg">💰</span>
                                                        <div>
                                                            <label htmlFor="proposed_price" className="block text-sm font-black text-slate-900">Your Proposed Budget (Rp)</label>
                                                            <p className="text-xs text-gray-500">Masukkan budget yang kamu mampu — admin akan meninjau dan merespons.</p>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">Rp</span>
                                                        <input
                                                            id="proposed_price"
                                                            type="number"
                                                            value={data.proposed_price}
                                                            onChange={e => setData('proposed_price', e.target.value)}
                                                            className="w-full pl-10 pr-4 py-3 text-xl font-black text-slate-900 border-2 border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 bg-white transition-all"
                                                            placeholder="contoh: 150000"
                                                            min="50000"
                                                        />
                                                    </div>
                                                    {refPrice > 0 && (
                                                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                                                            <p className="text-xs text-gray-500">
                                                                Harga referensi: <span className="font-bold text-indigo-600">Rp {new Intl.NumberFormat('id-ID').format(refPrice)}</span>
                                                            </p>
                                                            {data.proposed_price > 0 && data.proposed_price < refPrice && (
                                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">Di bawah referensi — admin akan negosiasi</span>
                                                            )}
                                                            {data.proposed_price >= refPrice && data.proposed_price > 0 && (
                                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">✓ Sesuai atau di atas referensi</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <InputError message={errors.proposed_price} className="mt-2" />
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: SUMMARY */}
                        <div className="md:col-span-1">
                            <div className="bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] sticky top-4">
                                <h3 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h3>

                                <div className="mb-6">
                                    <InputLabel htmlFor="package_id" value="Selected Package" className="mb-2" />
                                    <select id="package_id" value={data.package_id} onChange={e => setData('package_id', e.target.value)} className="w-full text-sm border-gray-300 rounded-lg">
                                        {packages.map(pkg => (
                                            <option key={pkg.id} value={pkg.id}>{pkg.name} - {pkg.service.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {selectedPackage && (
                                    <div className="space-y-4 mb-8 border-b border-gray-100 pb-6">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Service</span>
                                            <span className="font-medium">{selectedPackage.service.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Est. Time</span>
                                            <span className="font-medium">
                                                {isNegotiable(selectedPackage) ? (
                                                    (() => {
                                                        const features = getFeatureList(selectedPackage);
                                                        const selected = features.filter(f => data.selected_features.includes(f.name));
                                                        const days = 1 + selected.reduce((sum, f) => sum + (parseInt(f.estimate_days) || 1), 0);
                                                        return days + " - " + (days + 2) + " Days";
                                                    })()
                                                ) : (
                                                    rushFee > 0 ? (
                                                        <span className="text-indigo-600 font-bold">
                                                            <span className="line-through text-gray-400 mr-2">{formatDuration(selectedPackage.duration_days)}</span>
                                                            {Math.max(1, selectedPackage.duration_days - (rushFee / 25000))} Days
                                                        </span>
                                                    ) : (
                                                        <span>{formatDuration(selectedPackage.duration_days)}</span>
                                                    )
                                                )}
                                            </span>
                                        </div>

                                        {!isNegotiable(selectedPackage) ? (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-500">Base Price</span>
                                                    <span className="font-medium">Rp {new Intl.NumberFormat('id-ID').format(parseFloat(selectedPackage.price))}</span>

                                                </div>
                                                {rushFee > 0 && (
                                                    <div className="flex justify-between items-center text-sm text-amber-600 font-bold bg-amber-50 p-2 rounded">
                                                        <span>Rush Fee</span>
                                                        <span>+ Rp {new Intl.NumberFormat('id-ID').format(rushFee)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center text-sm text-slate-500">
                                                    <span>Operational Fee</span>
                                                    <span>+ Rp 5.000</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xl font-black text-slate-900 mt-6 pt-6 border-t-2 border-dashed border-slate-300">
                                                    <span>Total</span>
                                                    <span>Rp {new Intl.NumberFormat('id-ID').format(totalPrice)}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                {/* NEGOTIATION MODE Badge */}
                                                <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-2 border-indigo-300 shadow-[2px_2px_0px_0px_rgba(99,102,241,0.4)]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-black px-3 py-1 rounded-full border border-indigo-700">
                                                            🤝 NEGOTIATION MODE
                                                        </span>
                                                        <span className="text-xs text-indigo-500 font-medium">Paket Pelajar</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mb-3">Harga berdasarkan fitur yang kamu pilih di formulir.</p>

                                                    {/* Feature-based price breakdown */}
                                                    {(() => {
                                                        const featureList = getFeatureList(selectedPackage);
                                                        const selected = featureList.filter(f => data.selected_features.includes(f.name));
                                                        return selected.length > 0 ? (
                                                            <div className="space-y-1 mb-2">
                                                                {selected.map((f, i) => (
                                                                    <div key={i} className="flex justify-between text-xs text-indigo-700">
                                                                        <span className="truncate mr-2">• {f.name}</span>
                                                                        <span className="font-semibold flex-shrink-0">Rp {new Intl.NumberFormat('id-ID').format(Number(f.price || 0))}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-indigo-400 italic mb-2">Belum ada fitur dipilih</p>
                                                        );
                                                    })()}

                                                    {rushFee > 0 && (
                                                        <div className="flex justify-between items-center text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1.5 rounded border border-amber-200 mb-2">
                                                            <span>⚡ Express Fee</span>
                                                            <span>+ Rp {new Intl.NumberFormat('id-ID').format(rushFee)}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-center font-bold text-indigo-700 border-t border-indigo-200 pt-2">
                                                        <span className="text-sm">Harga Referensi</span>
                                                        <span className="text-lg">Rp {new Intl.NumberFormat('id-ID').format(totalPrice)}</span>
                                                    </div>
                                                </div>

                                                {/* Your Proposed Budget in Summary */}
                                                {data.proposed_price > 0 ? (
                                                    <div className="mt-4 p-3 bg-yellow-50 rounded-xl border-2 border-yellow-300">
                                                        <p className="text-xs text-yellow-700 font-bold uppercase mb-1">💰 Your Proposed Budget</p>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">Ajuan kamu</span>
                                                            <span className="text-xl font-black text-slate-900">Rp {new Intl.NumberFormat('id-ID').format(data.proposed_price)}</span>
                                                        </div>
                                                        {totalPrice > 0 && (
                                                            <p className={`text-xs mt-1 font-medium ${data.proposed_price < totalPrice ? 'text-amber-600' : 'text-green-600'}`}>
                                                                {data.proposed_price < totalPrice ? '↓ Di bawah referensi — admin akan negosiasi' : '✓ Sesuai / di atas referensi'}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 p-3 bg-yellow-50 rounded-xl border-2 border-dashed border-yellow-300">
                                                        <p className="text-xs text-yellow-600 font-medium text-center">💰 Isi budget ajuan kamu di formulir</p>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                    </div>
                                )}

                                {!isNegotiable(selectedPackage) ? (
                                    <div className="mb-8">
                                        <InputLabel value="Payment Method" className="mb-3" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                onClick={() => setData('payment_method', 'qris')}
                                                className={`cursor-pointer p-3 rounded-lg border text-center transition-all ${data.payment_method === 'qris' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-600' : 'border-gray-200 hover:border-indigo-300'}`}
                                            >
                                                QRIS
                                            </div>
                                            <div
                                                onClick={() => setData('payment_method', 'va')}
                                                className={`cursor-pointer p-3 rounded-lg border text-center transition-all ${data.payment_method === 'va' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-600' : 'border-gray-200 hover:border-indigo-300'}`}
                                            >
                                                Transfer / VA
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-8">
                                        <div className="p-3 bg-yellow-50 text-yellow-800 text-sm rounded border border-yellow-200">
                                            Payment will be processed after your negotiation is approved by Admin.
                                        </div>
                                    </div>
                                )}

                                <button
                                    className="w-full justify-center py-3 text-base flex items-center font-black rounded-xl bg-yellow-400 text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                    disabled={processing}
                                >
                                    {isNegotiable(selectedPackage) ? 'Submit Proposal 🤝' : 'Pay & Secure Slot 🔒'}
                                </button>

                                <p className="text-xs text-center text-gray-400 mt-4">
                                    By clicking {isNegotiable(selectedPackage) ? 'Submit' : 'Pay'}, you agree to our Terms of Service.
                                </p>
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            <Modal show={showSizeError} onClose={() => setShowSizeError(false)} maxWidth="sm">
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <svg className="w-6 h-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        File Terlalu Besar
                    </h2>
                    <p className="mt-1 text-base text-gray-600">
                        Maaf, ukuran file yang Anda pilih melebihi batas <strong>5MB</strong>.
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        Silakan kompres file PDF Anda atau pilih file yang lebih kecil agar proses upload berhasil.
                    </p>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => setShowSizeError(false)}
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
