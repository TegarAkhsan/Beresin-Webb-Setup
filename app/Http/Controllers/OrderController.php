<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Package;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    public function create(Request $request)
    {
        $packages = Package::with([
            'service',
            'addons' => function ($query) {
                // Use whereRaw to prevent SQLite-style boolean integer casting causing errors in Postgres
                $query->whereRaw('is_active = true');
            }
        ])->get();
        $selectedPackageId = $request->query('package_id');

        return Inertia::render('Orders/Create', [
            'packages' => $packages,
            'selectedPackageId' => $selectedPackageId,
        ]);
    }

    public function store(Request $request)
    {
        // First validate package existence to determine validation rules
        $request->validate(['package_id' => 'required|exists:packages,id']);
        $package = Package::find($request->package_id);

        $rules = [
            'package_id' => 'required|exists:packages,id',
            'payment_method' => 'required|in:qris,va',
            // User Profile Fields
            'name' => 'required|string|max:255',
            'gender' => 'required|in:L,P',
            'email' => 'required|email',
            'phone' => 'required|string|max:20',
            'address' => 'required|string',
            'university' => 'required|string',
            'referral_source' => 'required|string',

            // Order Fields
            'description' => 'nullable|string',
            'deadline' => 'required|date|after:today',
            'notes' => 'nullable|string',
            'external_link' => 'nullable|url',

            // File Uploads
            'reference_file' => 'nullable|file|mimes:pdf|max:5120',
            'previous_project_file' => 'nullable|file|mimes:pdf|max:5120',
        ];

        // Conditional Validation for Negotiation
        if ($package->is_negotiable) {
            $rules['student_card'] = 'required|file|mimes:jpg,jpeg,png,pdf|max:5120';
            $rules['proposed_price'] = 'required|numeric|min:50000';
            $rules['selected_features'] = 'nullable|array';
            // Disable strict payment method check if negotiation? Actually still needed for later.
        }

        $validated = $request->validate($rules);

        $user = Auth::user();

        // Update User Profile
        $user->update([
            'name' => $validated['name'],
            'gender' => $validated['gender'],
            'phone' => $validated['phone'],
            'address' => $validated['address'],
            'university' => $validated['university'],
            'referral_source' => $validated['referral_source'],
        ]);

        $amount = 0;
        $status = 'pending_payment';
        $studentCardPath = null;

        if ($package->is_negotiable) {
            // Negotiation Flow
            $amount = $validated['proposed_price']; // Set initial amount to proposed
            $status = 'waiting_approval'; // Skip payment, go to admin approval/negotiation

            if ($request->hasFile('student_card')) {
                $studentCardPath = $request->file('student_card')->store('student_cards', 'public');
            }
        } else {
            // Standard Flow
            // Calculate Fee (Rush Fee Logic)
            $standardDeadline = now()->addDays($package->duration_days ?? 3)->startOfDay();
            $userDeadline = \Carbon\Carbon::parse($validated['deadline']);

            $amount = $package->price;

            // If user wants it sooner than standard duration (and standard is not in the past)
            if ($userDeadline->lt($standardDeadline) && $standardDeadline->isFuture()) {
                $daysSaved = $userDeadline->diffInDays($standardDeadline);
                // Charge 25k per day saved
                $rushFee = max(0, ceil($daysSaved) * 25000);
                $amount += $rushFee;
            }

            // Add Operational Fee
            $amount += 5000;
        }

        // Handle Common File Uploads
        $referenceFilePath = null;
        if ($request->hasFile('reference_file')) {
            $referenceFilePath = $request->file('reference_file')->store('order_refs', 'public');
        }

        $projectFilePath = null;
        if ($request->hasFile('previous_project_file')) {
            $projectFilePath = $request->file('previous_project_file')->store('order_projects', 'public');
        }

        $order = Order::create([
            'order_number' => 'ORD-' . strtoupper(Str::random(10)),
            'user_id' => $user->id,
            'package_id' => $package->id,
            'amount' => $amount,

            // Financial Breakdown
            'base_price' => $package->is_negotiable ? $amount : $package->price,
            'rush_fee' => $package->is_negotiable ? 0 : ($rushFee ?? 0),
            'platform_fee' => $package->is_negotiable ? 0 : 5000,
            // Note: Negotiation assumes inclusive price or 0 platform fee for now unless specified.
            // If negotiation needs breakdown, we need frontend to send it. Assuming simple total for negotiation.

            'description' => $validated['description'] ?? 'No description provided.',
            'deadline' => $validated['deadline'],
            'notes' => $validated['notes'] ?? null,
            'external_link' => $validated['external_link'] ?? null,
            'reference_file' => $referenceFilePath,
            'previous_project_file' => $projectFilePath,
            'payment_method' => $validated['payment_method'],
            'status' => $status,

            // Negotiation Fields
            'is_negotiation' => $package->is_negotiable,
            'proposed_price' => $package->is_negotiable ? $validated['proposed_price'] : null,
            'student_card' => $studentCardPath,
            'selected_features' => $package->is_negotiable ? ($validated['selected_features'] ?? []) : null,
            'negotiation_deadline' => $package->is_negotiable ? $validated['deadline'] : null, // Same as deadline for now
        ]);

        $message = $package->is_negotiable
            ? 'Order proposal submitted! Waiting for admin approval for negotiation.'
            : 'Order placed successfully! Please complete payment.';
        
        // Notify Admins
        $admins = \App\Models\User::where('role', 'admin')->get();
        // Only notify if status is waiting_approval (Negotiation)
        if ($status === 'waiting_approval') {
             \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewOrderNotification($order));
        }

        return redirect()->route('orders.show', $order)->with('message', $message);
    }

    public function show(Order $order)
    {
        if ($order->user_id !== Auth::id() && Auth::user()->role !== 'admin') {
            abort(403);
        }

        $order->load(['package.service', 'joki', 'user', 'milestones']);
        $settings = \App\Models\Setting::whereIn('key', ['whatsapp_number', 'qris_image'])->pluck('value', 'key');

        return Inertia::render('Orders/Show', [
            'order' => $order,
            'whatsapp_number' => $settings['whatsapp_number'] ?? null,
            'qris_image' => $settings['qris_image'] ?? null,
        ]);
    }

    public function review(Order $order)
    {
        if ($order->user_id !== Auth::id()) {
            abort(403);
        }

        // Check for active milestones requiring review
        $hasPendingMilestoneReview = $order->milestones()->whereIn('status', ['submitted', 'customer_review'])->exists();

        if (!in_array($order->status, ['review', 'completed', 'revision']) && !$order->result_file && !$hasPendingMilestoneReview) {
            return redirect()->route('orders.show', $order);
        }

        $order->load(['package.service', 'joki', 'user', 'files', 'milestones']);

        $settings = \App\Models\Setting::whereIn('key', ['whatsapp_number', 'qris_image'])->pluck('value', 'key');

        return Inertia::render('Orders/Review', [
            'order' => $order,
            'whatsapp_number' => $settings['whatsapp_number'] ?? null,
            'qris_image' => $settings['qris_image'] ?? null,
        ]);
    }

    public function update(Request $request, Order $order)
    {
        if ($order->user_id !== Auth::id() && Auth::user()->role !== 'admin' && Auth::user()->role !== 'joki') {
            abort(403);
        }

        if ($request->hasFile('payment_proof')) {
            $path = $request->file('payment_proof')->store('payments', 'public');
            $order->update([
                'payment_proof' => $path,
            ]);
            return back()->with('message', 'Payment proof uploaded! Please confirm sending to admin.');
        }

        if ($request->input('action') === 'confirm_payment') {
            $order->update([
                'payment_status' => 'pending_verification',
                'status' => 'waiting_approval',
            ]);

            // Notify Admins
            $admins = \App\Models\User::where('role', 'admin')->get();
            \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\NewOrderNotification($order));

            return back()->with('message', 'Payment confirmed! Waiting for admin verification.');
        }

        if ($request->hasFile('result_file')) {
            $path = $request->file('result_file')->store('results', 'public');
            $order->update([
                'result_file' => $path,
                'status' => 'completed', // Or review
            ]);
            return back()->with('message', 'Result uploaded!');
        }

        // Status update for Joki?
        if ($request->has('status') && Auth::user()->role === 'joki') {
            $order->update(['status' => $request->input('status')]);
            return back()->with('message', 'Status updated.');
        }

        return back();
    }

    public function cancel(Order $order)
    {
        if ($order->user_id !== Auth::id() && Auth::user()->role !== 'admin') {
            abort(403);
        }

        if ($order->status !== 'pending_payment') {
            return back()->with('error', 'Order cannot be cancelled.');
        }

        $order->update(['status' => 'cancelled']);

        return back()->with('message', 'Order cancelled successfully.');
    }

    public function downloadInvoice(Order $order)
    {
        if ($order->user_id !== Auth::id() && Auth::user()->role !== 'admin') {
            abort(403);
        }

        $order->load(['user', 'package.service']);

        $settings = \App\Models\Setting::whereIn('key', [
            'whatsapp_number',
            'invoice_name',
            'invoice_address',
            'invoice_logo'
        ])->pluck('value', 'key');

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('invoices.pdf', compact('order', 'settings'));

        return $pdf->download('Invoice-' . ($order->invoice_number ?? $order->order_number) . '.pdf');
    }

    public function acceptResult(Request $request, Order $order)
    {
        if ($order->user_id !== Auth::id()) {
            abort(403);
        }

        // Payment gate: block acceptance if there are unpaid extra revision fees
        if ($order->additional_revision_fee > 0 && $order->additional_payment_status !== 'paid') {
            return back()->with('error', 'Anda memiliki tagihan revisi tambahan sebesar Rp ' . number_format($order->additional_revision_fee, 0, ',', '.') . ' yang belum dilunasi. Harap selesaikan pembayaran terlebih dahulu sebelum menerima hasil.');
        }

        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string'
        ]);

        // Milestone Logic
        $order->load('milestones');
        if ($order->milestones->isNotEmpty()) {
            // Find current active milestone (that is in review/submitted stage)
            // Assuming Admin has approved it to 'customer_review', OR if we allow customer to approve 'submitted' directly (if admin hasn't intervened).
            // Let's safe check for 'customer_review', 'submitted', or 'admin_review' (if admin didn't act).
            // But ideally it should be 'customer_review'.

            // For now, let's find the first one that is NOT completed.
            $currentMilestone = $order->milestones->whereIn('status', ['submitted', 'customer_review'])->first();

            if ($currentMilestone) {
                // Complete this milestone
                $currentMilestone->update([
                    'status' => 'completed',
                    'completed_at' => now(),
                    'customer_feedback' => $validated['comment'] // Save feedback here too?
                ]);

                // Check for next milestone
                $nextMilestone = $order->milestones->where('sort_order', '>', $currentMilestone->sort_order)->sortBy('sort_order')->first();

                if ($nextMilestone) {
                    $nextMilestone->update(['status' => 'in_progress']);

                    // Order goes back to in_progress
                    $order->update(['status' => 'in_progress']);

                    // Create review log but don't finalize order
                    \App\Models\Review::create([
                        'order_id' => $order->id,
                        'user_id' => Auth::id(),
                        'rating' => $validated['rating'],
                        'comment' => "Milestone '{$currentMilestone->name}' Approved: " . $validated['comment']
                    ]);

                    return back()->with('message', "Milestone '{$currentMilestone->name}' approved! Next milestone started.");
                }
            }
        }

        // If no milestones OR it was the last milestone: Move to Finalization Phase
        $order->update([
            'status' => 'finalization'
        ]);

        \App\Models\Review::create([
            'order_id' => $order->id,
            'user_id' => Auth::id(),
            'rating' => $validated['rating'],
            'comment' => $validated['comment']
        ]);

        return back()->with('message', 'Review submitted! Order moved to finalization phase by Joki.');
    }

    public function requestRevision(Request $request, Order $order)
    {
        if ($order->user_id !== Auth::id()) {
            abort(403);
        }

        $order->load('package');

        if ($order->revision_count >= $order->package->max_revisions) {
            if (!$request->boolean('paid_revision')) {
                return back()->with('error', 'Anda telah menggunakan seluruh jatah revisinya.');
            }
            // Add fee for additional revision
            $order->increment('additional_revision_fee', 20000);
        }

        $request->validate([
            'reason' => 'required|string|max:1000',
            'revision_file' => 'nullable|file|max:5120' // 5MB
        ]);

        $path = null;
        if ($request->hasFile('revision_file')) {
            $path = $request->file('revision_file')->store('revisions', 'public');
        }

        $order->update([
            'status' => 'revision',
            'revision_reason' => $request->input('reason'),
            'revision_file' => $path,
            'revision_count' => $order->revision_count + 1
        ]);

        // Also update the latest submitted milestone to revision status
        if ($order->milestones()->exists()) {
            $latestMilestone = $order->milestones()
                ->whereIn('status', ['submitted', 'customer_review'])
                ->orderBy('sort_order', 'desc')
                ->first();

            if ($latestMilestone) {
                $latestMilestone->update(['status' => 'revision']);
            }
        }

        return back()->with('message', 'Revision requested. The Joki has been notified.');
    }

    public function requestRefund(Request $request, Order $order)
    {
        if ($order->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        // Ensure order is eligible for refund (not completed)
        if ($order->status === 'completed') {
            return back()->with('error', 'Order already completed. Cannot request refund.');
        }

        $order->update([
            'status' => 'refund_requested',
            'refund_reason' => $request->input('reason'),
        ]);

        return back()->with('message', 'Permintaan refund telah dikirim ke Admin untuk verifikasi.');
    }

    public function uploadAdditionalPayment(Request $request, Order $order)
    {
        if ($order->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'payment_proof' => 'required|file|mimes:jpg,jpeg,png,pdf|max:2048',
        ]);

        $path = $request->file('payment_proof')->store('additional_payments', 'public');

        $order->update([
            'additional_payment_proof' => $path,
            'additional_payment_status' => 'pending',
        ]);

        // Send notification to admin (Revision Charge Approval)
        $admins = \App\Models\User::where('role', 'admin')->get();
        \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\RevisionPaymentNotification($order));

        return back()->with('message', 'Bukti pembayaran tambahan berhasil diupload. Mohon tunggu konfirmasi admin.');
    }
}
