<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class RevisionPaymentNotification extends Notification
{
    use Queueable;

    public function __construct(public $order)
    {
    }

    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }

    public function toWebPush($notifiable, $notification)
    {
        return (new WebPushMessage)
            ->title('Revision Charge Approval Required')
            ->icon('/logo-192x192.png')
            ->body('Customer ' . $this->order->user->name . ' has uploaded payment proof for additional revisions on Order #' . $this->order->order_number . '.')
            ->action('Verify Payment', route('admin.orders.verify'));
    }
}
