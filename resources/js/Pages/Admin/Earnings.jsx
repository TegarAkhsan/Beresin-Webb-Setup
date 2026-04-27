import AdminLayout from '@/Layouts/AdminLayout';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';

export default function Earnings({ auth, totalEarnings = 0, revenueAdmin = 0, revenueOps = 0, totalAdminWithdrawn = 0, totalOpsWithdrawn = 0, availableAdmin = 0, availableOps = 0, history = [], bank_details = {} }) {
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [withdrawType, setWithdrawType] = useState('admin'); // 'admin' or 'ops'
 
    // Withdraw Form
    const { data: withdrawData, setData: setWithdrawData, post: postWithdraw, processing: withdrawProcessing, reset: resetWithdraw, errors: withdrawErrors } = useForm({
        amount: '',
        notes: '',
        type: 'admin'
    });

    // Validated Bank Details (for withdraw check)
    const hasBankDetails = bank_details?.bank_name && bank_details?.account_number && bank_details?.account_holder;

    // Settings Form
    const { data: settingsData, setData: setSettingsData, post: postSettings, processing: settingsProcessing, recentlySuccessful: settingsSuccess } = useForm({
        bank_name: bank_details?.bank_name || '',
        account_number: bank_details?.account_number || '',
        account_holder: bank_details?.account_holder || '',
    });

    const openWithdrawModal = (type) => {
        setWithdrawType(type);
        setWithdrawData('type', type);
        setWithdrawModalOpen(true);
    };

    const handleWithdraw = (e) => {
        e.preventDefault();
        postWithdraw(route('admin.earnings.withdraw'), {
            onSuccess: () => {
                setWithdrawModalOpen(false);
                resetWithdraw();
            }
        });
    };

    const handleUpdateSettings = (e) => {
        e.preventDefault();
        postSettings(route('admin.earnings.settings'));
    };

    return (
        <AdminLayout
            user={auth.user}
            header="Earnings & Finances"
        >
            <Head title="Admin Earnings" />
 
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* 1. FINANCIAL SUMMARY */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Admin Profit Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-indigo-100 font-medium uppercase tracking-wider text-xs mb-2">Available Admin Profit</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold">20% SHARE</span>
                                </div>
                                <div className="text-4xl font-bold mb-4">
                                    <span className="text-xl opacity-80 align-top mr-1">Rp</span>
                                    {new Intl.NumberFormat('id-ID').format(availableAdmin)}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-indigo-200 text-xs">Total Earned: Rp {new Intl.NumberFormat('id-ID').format(revenueAdmin)}</p>
                                    <p className="text-indigo-200 text-xs">Total Withdrawn: Rp {new Intl.NumberFormat('id-ID').format(totalAdminWithdrawn)}</p>
                                </div>
                            </div>
                            
                            <div className="relative z-10 mt-8">
                                <button
                                    onClick={() => openWithdrawModal('admin')}
                                    disabled={!hasBankDetails || availableAdmin < 10000}
                                    className={`w-full py-3.5 rounded-2xl font-bold shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${hasBankDetails && availableAdmin >= 10000
                                        ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                                        : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                                        }`}
                                >
                                    Withdraw Profit
                                </button>
                            </div>
                            {/* Decorative */}
                            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                        </div>

                        {/* Ops Fund Card */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <h2 className="text-gray-400 font-medium uppercase tracking-wider text-xs mb-2">Ops Fund Balance</h2>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500 text-[10px] font-bold">5% + PLATFORM FEE</span>
                                </div>
                                <div className="text-4xl font-bold text-gray-900 mb-4">
                                    <span className="text-xl opacity-40 align-top mr-1 text-gray-400 font-normal">Rp</span>
                                    {new Intl.NumberFormat('id-ID').format(availableOps)}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-gray-400 text-xs font-medium">Total Earned: Rp {new Intl.NumberFormat('id-ID').format(revenueOps)}</p>
                                    <p className="text-gray-400 text-xs font-medium">Total Withdrawn: Rp {new Intl.NumberFormat('id-ID').format(totalOpsWithdrawn)}</p>
                                </div>
                            </div>
                            
                            <div className="relative z-10 mt-8">
                                <button
                                    onClick={() => openWithdrawModal('ops')}
                                    disabled={!hasBankDetails || availableOps < 10000}
                                    className={`w-full py-3.5 rounded-2xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 ${hasBankDetails && availableOps >= 10000
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100 shadow-lg'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    Withdraw Ops Fund
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </div>
                        <div>
                            <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest">Total Platform Net</p>
                            <p className="text-xl font-bold text-indigo-900">Rp {new Intl.NumberFormat('id-ID').format(totalEarnings)}</p>
                        </div>
                    </div>
                </div>

                {/* 2. PAYOUT SETTINGS */}
                <div className="xl:col-span-1 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm h-fit">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-50 pb-2">Payout Settings</h3>
                    <form onSubmit={handleUpdateSettings} className="space-y-4">
                        <div>
                            <InputLabel value="Bank Name" />
                            <TextInput
                                className="w-full mt-1"
                                value={settingsData.bank_name}
                                onChange={(e) => setSettingsData('bank_name', e.target.value)}
                                placeholder="e.g. BCA, Mandiri"
                                required
                            />
                        </div>
                        <div>
                            <InputLabel value="Account Number" />
                            <TextInput
                                className="w-full mt-1"
                                value={settingsData.account_number}
                                onChange={(e) => setSettingsData('account_number', e.target.value)}
                                placeholder="e.g. 1234567890"
                                required
                            />
                        </div>
                        <div>
                            <InputLabel value="Account Holder Name" />
                            <TextInput
                                className="w-full mt-1"
                                value={settingsData.account_holder}
                                onChange={(e) => setSettingsData('account_holder', e.target.value)}
                                placeholder="Name on bank account"
                                required
                            />
                        </div>

                        <div className="pt-2">
                            <PrimaryButton className="w-full justify-center" disabled={settingsProcessing}>
                                {settingsProcessing ? 'Saving...' : 'Save Settings'}
                            </PrimaryButton>
                            {settingsSuccess && <p className="text-emerald-600 text-xs text-center mt-2 font-medium">Settings saved successfully.</p>}
                        </div>
                    </form>
                </div>
            </div>

            {/* 3. HISTORY TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
                    <span className="px-3 py-1 bg-gray-50 text-xs font-semibold text-gray-500 rounded-full">
                        {history.length} Transactions
                    </span>
                </div>

                {/* Mobile Transaction Cards */}
                <div className="lg:hidden">
                    {history.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 text-sm">No transactions yet.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {history.map((item) => (
                                <div key={item.id} className="p-4 bg-white hover:bg-gray-50 transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-xs text-gray-500">{item.date}</p>
                                            <h4 className="font-bold text-gray-900 mt-1">{item.order_number}</h4>
                                        </div>
                                        {item.type === 'income' ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold uppercase">
                                                INCOME
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-100 font-bold uppercase">
                                                WITHDRAWAL
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <p className="text-sm text-gray-500 italic max-w-[60%] truncate">{item.source}</p>
                                        <p className={`text-right font-bold text-lg ${item.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {item.type === 'income' ? '+' : ''} Rp {new Intl.NumberFormat('id-ID').format(item.amount)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Reference</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Description</th>
                                <th className="px-6 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {history.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No transactions yet.</td></tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4 text-gray-600">{item.date}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.order_number}</td>
                                        <td className="px-6 py-4">
                                            {item.type === 'income' ? (
                                                <span className="px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold">
                                                    INCOME
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-100 font-bold">
                                                    WITHDRAWAL
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate" title={item.source}>{item.source}</td>
                                        <td className={`px-6 py-4 text-right font-bold ${item.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {item.type === 'income' ? '+' : ''} Rp {new Intl.NumberFormat('id-ID').format(item.amount)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* WITHDRAW MODAL */}
            <Modal show={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)}>
                <form onSubmit={handleWithdraw} className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Withdraw {withdrawType === 'ops' ? 'Ops Fund' : 'Admin Profit'}</h2>
                    <p className="text-sm text-gray-500 mb-6">Penarikan dana dari saldo {withdrawType === 'ops' ? 'operasional platform' : 'keuntungan admin'}.</p>

                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6 relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2">Transfer Destination</p>
                            <p className="font-bold text-gray-900 text-lg">{settingsData.bank_name || '-'}</p>
                            <p className="text-gray-600 font-medium tracking-wider">{settingsData.account_number || '-'}</p>
                            <p className="text-gray-500 text-sm mt-1">{settingsData.account_holder || '-'}</p>
                        </div>
                        <svg className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-500/5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V6a2 2 0 00-2-2H4zm2 6a1 1 0 100-2 1 1 0 000 2zM2 12a2 2 0 002 2h4a2 2 0 002-2v-4a2 2 0 00-2-2H4a2 2 0 00-2 2v4zm10-4a2 2 0 012-2h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V8zm2 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    </div>

                    <div className="mb-4">
                        <InputLabel value={`Amount (Max: Rp ${new Intl.NumberFormat('id-ID').format(withdrawType === 'ops' ? availableOps : availableAdmin)})`} />
                        <TextInput
                            type="number"
                            className="w-full mt-1"
                            value={withdrawData.amount}
                            onChange={(e) => setWithdrawData('amount', e.target.value)}
                            placeholder="Min 10.000"
                            required
                        />
                        {withdrawErrors.amount && <div className="text-red-500 text-xs mt-1">{withdrawErrors.amount}</div>}
                    </div>

                    <div className="mb-4">
                        <InputLabel value="Notes (Optional)" />
                        <TextInput
                            className="w-full mt-1"
                            value={withdrawData.notes}
                            onChange={(e) => setWithdrawData('notes', e.target.value)}
                            placeholder={withdrawType === 'ops' ? 'e.g. Server maintenance' : 'e.g. Monthly profit'}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <SecondaryButton onClick={() => setWithdrawModalOpen(false)} className="rounded-xl">Cancel</SecondaryButton>
                        <PrimaryButton disabled={withdrawProcessing} className="rounded-xl px-8">Confirm Withdraw</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
