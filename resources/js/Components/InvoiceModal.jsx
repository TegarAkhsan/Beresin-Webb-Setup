import { Fragment, useState, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import html2pdf from 'html2pdf.js';

export default function InvoiceModal({ isOpen, onClose, order }) {
    const [isDownloading, setIsDownloading] = useState(false);
    const invoiceRef = useRef(null);

    if (!order) return null;

    const user = order.user || {};
    const pkg = order.package || {};
    const service = pkg.service || {};

    // Determine Status
    const isPaid = order.payment_status === 'paid' || order.status === 'completed';
    const statusText = isPaid ? 'LUNAS' : 'BELUM LUNAS';
    const statusColor = isPaid ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600';

    const handleDownload = () => {
        setIsDownloading(true);
        const element = invoiceRef.current;
        
        // Configuration for html2pdf
        const opt = {
            margin:       [0.5, 0.5, 0.5, 0.5],
            filename:     `Invoice-${order.order_number}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            setIsDownloading(false);
        });
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-xl font-black text-slate-900 uppercase tracking-wider">
                                        Preview Invoice
                                    </Dialog.Title>
                                    <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>

                                {/* INVOICE PREVIEW CONTAINER */}
                                <div className="border-2 border-slate-200 rounded-xl bg-gray-50 p-4 sm:p-8 overflow-x-auto relative">
                                    {/* The Actual Invoice Element to be printed */}
                                    <div 
                                        ref={invoiceRef} 
                                        className="bg-white p-8 md:p-12 shadow-sm mx-auto min-w-[800px] relative overflow-hidden" 
                                        style={{ width: '800px', minHeight: '1000px', fontFamily: 'Arial, sans-serif' }}
                                    >
                                        {/* Watermark */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                                            <svg className="w-96 h-96 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                                            </svg>
                                        </div>

                                        <div className="relative z-10">
                                            {/* Header */}
                                            <div className="flex justify-between items-start border-b-2 border-gray-100 pb-8 mb-8">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                                                            <span className="font-black text-2xl text-slate-900">B.</span>
                                                        </div>
                                                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Beresin.</h1>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-500">Beresin Jasa Digital</p>
                                                    <p className="text-sm text-slate-500 mt-1">Jalan Ketintang, Surabaya, Indonesia</p>
                                                    <p className="text-sm text-slate-500">admin@beresin.com</p>
                                                </div>
                                                <div className="text-right">
                                                    <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest mb-4">INVOICE</h2>
                                                    <p className="text-sm text-slate-600 mb-1"><strong>No. Invoice:</strong> {order.order_number}</p>
                                                    <p className="text-sm text-slate-600"><strong>Tanggal:</strong> {new Date(order.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                            </div>

                                            {/* Customer Info */}
                                            <div className="mb-10">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ditagihkan Kepada</p>
                                                <h3 className="text-lg font-black text-slate-900 mb-1">{user.name || '-'}</h3>
                                                <p className="text-sm text-slate-600 mb-1">{user.email || '-'}</p>
                                                <p className="text-sm text-slate-600">{user.phone || '-'}</p>
                                                <p className="text-sm text-slate-600">{user.university || '-'}</p>
                                            </div>

                                            {/* Items Table */}
                                            <table className="w-full mb-8">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-900">
                                                        <th className="text-left py-3 text-sm font-bold text-slate-900 uppercase">Deskripsi Layanan</th>
                                                        <th className="text-center py-3 text-sm font-bold text-slate-900 uppercase">Paket</th>
                                                        <th className="text-right py-3 text-sm font-bold text-slate-900 uppercase">Jumlah</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr className="border-b border-gray-100">
                                                        <td className="py-4">
                                                            <p className="font-bold text-slate-900">{service.name || '-'}</p>
                                                            <p className="text-sm text-slate-500 max-w-sm truncate">{order.description || '-'}</p>
                                                        </td>
                                                        <td className="py-4 text-center font-medium text-slate-700">
                                                            {pkg.name || '-'}
                                                        </td>
                                                        <td className="py-4 text-right font-bold text-slate-900">
                                                            Rp {new Intl.NumberFormat('id-ID').format(order.amount)}
                                                        </td>
                                                    </tr>
                                                    {/* Total Row */}
                                                    <tr>
                                                        <td colSpan="2" className="py-6 text-right font-bold text-slate-900 text-lg">Total Tagihan</td>
                                                        <td className="py-6 text-right font-black text-slate-900 text-xl border-t-2 border-slate-900">
                                                            Rp {new Intl.NumberFormat('id-ID').format(order.amount)}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            {/* Footer area with Stamp & Signature */}
                                            <div className="flex justify-between items-end mt-16">
                                                <div>
                                                    <div className={`inline-block px-6 py-2 border-4 ${statusColor} rounded-lg transform -rotate-6`}>
                                                        <span className="text-2xl font-black uppercase tracking-widest">{statusText}</span>
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm text-slate-600 mb-12">Hormat Kami,</p>
                                                    <p className="font-black text-slate-900 border-t border-slate-300 pt-2">Admin Beresin</p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-16 pt-6 border-t border-gray-200 text-center text-xs text-gray-400">
                                                Invoice ini sah dan digenerate secara otomatis oleh sistem Beresin.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition"
                                    >
                                        Tutup
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        disabled={isDownloading}
                                        className="px-8 py-3 bg-slate-900 text-white font-black rounded-xl border-2 border-slate-900 hover:bg-slate-800 transition shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-70 flex items-center gap-2"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                Download PDF
                                            </>
                                        )}
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
