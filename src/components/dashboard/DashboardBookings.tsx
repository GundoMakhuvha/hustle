import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar, Clock, User, Check, X, MessageCircle, ShieldCheck, Hourglass, Inbox, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHustlerBookings } from '@/hooks/useHustlerData';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateConversation } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PillTabs from '@/components/PillTabs';
import PayoutSettings, { usePayoutAccount } from '@/components/dashboard/PayoutSettings';
import { formatPrice } from '@/lib/format';
import { errorMessage } from '@/lib/payments';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type BookingStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

const statusStyle: Record<BookingStatus, string> = {
  pending: 'bg-warning/15 text-warning',
  accepted: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  declined: 'bg-destructive/15 text-destructive',
  completed: 'bg-success/15 text-success',
  cancelled: 'bg-muted text-muted-foreground',
};

const label = (b: any) => {
  if (b.status === 'pending') return 'New request';
  if (b.status === 'accepted') return b.payment_status === 'paid' ? 'Paid · confirmed' : 'Awaiting payment';
  return b.status.charAt(0).toUpperCase() + b.status.slice(1);
};

const QUICK_REASONS = ["I'm fully booked at that time", "That's outside my area", "I don't offer that service anymore"];

export default function DashboardBookings() {
  const navigate = useNavigate();
  const { hustlerProfile, user } = useAuth();
  const { data: bookings, isLoading } = useHustlerBookings();
  const { data: payout, isLoading: loadingPayout } = usePayoutAccount();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('requests');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declining, setDeclining] = useState<any>(null);
  const [reason, setReason] = useState('');

  const updateStatus = async (bookingId: string, status: BookingStatus, decline_reason?: string) => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from('bookings')
        .update(decline_reason !== undefined ? { status, decline_reason: decline_reason || null } : { status })
        .eq('id', bookingId);
      if (error) throw error;

      const messages: Partial<Record<BookingStatus, string>> = {
        accepted: "Accepted. We've emailed the customer to pay.",
        declined: "Declined. We've let the customer know.",
        completed: 'Marked complete. Nice work!',
      };
      toast.success(messages[status] ?? `Booking ${status}`);
      queryClient.invalidateQueries({ queryKey: ['hustler-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['hustler-earnings'] });
    } catch (e) {
      toast.error(await errorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDecline = async () => {
    if (!declining) return;
    await updateStatus(declining.id, 'declined', reason.trim());
    setDeclining(null);
    setReason('');
  };

  const handleMessageCustomer = async (customerId: string) => {
    if (!user || !hustlerProfile) return;
    try {
      const conversation = await getOrCreateConversation(customerId, hustlerProfile.id);
      navigate(`/chat/${conversation.id}`);
    } catch {
      toast.error('Could not start conversation');
    }
  };

  const all = (bookings || []) as any[];
  const groups: Record<string, any[]> = {
    requests: all.filter((b) => b.status === 'pending'),
    upcoming: all.filter((b) => b.status === 'accepted'),
    done: all.filter((b) => b.status === 'completed'),
    closed: all.filter((b) => ['declined', 'cancelled'].includes(b.status)),
  };
  const list = groups[tab] ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!loadingPayout && !payout && <PayoutSettings compact />}

      <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
        <PillTabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'requests', label: 'Requests', badge: groups.requests.length },
            { value: 'upcoming', label: 'Upcoming', badge: groups.upcoming.length },
            { value: 'done', label: 'Done' },
            { value: 'closed', label: 'Closed' },
          ]}
        />
      </div>

      <div key={tab} className="space-y-3 animate-fade-in">
        {list.length === 0 ? (
          <div className="glass-card rounded-3xl text-center py-12 text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>{tab === 'requests' ? 'No new requests right now' : `Nothing in ${tab} yet`}</p>
          </div>
        ) : (
          list.map((booking) => {
            const busy = actionLoading === booking.id;
            const paid = booking.payment_status === 'paid';
            return (
              <div key={booking.id} className={cn('glass-card rounded-3xl p-4 space-y-3', booking.status === 'pending' && 'ring-2 ring-primary/80')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-secondary rounded-full flex items-center justify-center overflow-hidden shrink-0">
                      {booking.customer?.avatar_url ? (
                        <img src={booking.customer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{booking.customer?.full_name || 'Customer'}</p>
                      <p className="text-sm text-muted-foreground truncate">{booking.service?.title}</p>
                    </div>
                  </div>
                  <span className={cn('shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold', statusStyle[booking.status as BookingStatus])}>
                    {label(booking)}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(booking.scheduled_date), 'EEE, d MMM yyyy')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {String(booking.scheduled_time).slice(0, 5)}
                  </span>
                </div>

                {booking.notes && <p className="text-sm p-3 rounded-2xl glass-inset">“{booking.notes}”</p>}

                <div className="glass-inset rounded-2xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Customer pays</span>
                    <span>{formatPrice(booking.total_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hustle fee (10% of service)</span>
                    <span>− {formatPrice(booking.platform_fee)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/60">
                    <span>You earn</span>
                    <span className="flex items-center gap-1.5">
                      {paid && <ShieldCheck className="w-4 h-4 text-success" />}
                      {formatPrice(booking.hustler_amount)}
                    </span>
                  </div>
                </div>

                {booking.status === 'accepted' && !paid && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Hourglass className="w-3.5 h-3.5" />
                    Waiting for the customer to pay. You'll get an email the moment they do.
                  </p>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => handleMessageCustomer(booking.customer_id)} aria-label="Message customer">
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                  {booking.status === 'pending' && (
                    <>
                      <Button variant="outline" className="flex-1 rounded-full" onClick={() => setDeclining(booking)} disabled={busy}>
                        <X className="w-4 h-4 mr-1" /> Decline
                      </Button>
                      <Button className="flex-1 rounded-full" onClick={() => updateStatus(booking.id, 'accepted')} disabled={busy}>
                        {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Accept
                      </Button>
                    </>
                  )}
                  {booking.status === 'accepted' && !paid && (
                    <Button variant="ghost" className="flex-1 rounded-full text-destructive hover:text-destructive" onClick={() => setDeclining(booking)} disabled={busy}>
                      Can't make it
                    </Button>
                  )}
                  {booking.status === 'accepted' && paid && (
                    <Button className="flex-1 rounded-full" onClick={() => updateStatus(booking.id, 'completed')} disabled={busy}>
                      <Check className="w-4 h-4 mr-1" /> Mark job complete
                    </Button>
                  )}
                </div>

                {booking.decline_reason && booking.status === 'declined' && (
                  <p className="text-xs text-muted-foreground">Your note: {booking.decline_reason}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={!!declining} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline this booking?</DialogTitle>
            <DialogDescription>
              {declining?.customer?.full_name || 'The customer'} will get an email straight away. Add a short note if you like.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  reason === r ? 'bg-primary text-primary-foreground animate-pill-pop' : 'glass-chip',
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value.slice(0, 300))} placeholder="Optional note to the customer" rows={3} />
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => setDeclining(null)}>
              Keep it
            </Button>
            <Button variant="destructive" className="flex-1 rounded-full" onClick={confirmDecline} disabled={actionLoading === declining?.id}>
              Decline booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
