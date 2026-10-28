import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MessageCircle,
  Star,
  Loader2,
  CreditCard,
  Images,
  ShieldCheck,
  Hourglass,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import LoadingScreen from "@/components/LoadingScreen";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import PillTabs from "@/components/PillTabs";
import HustlerGallery from "@/components/HustlerGallery";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice } from "@/lib/format";
import { errorMessage, payments } from "@/lib/payments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Banner = { tone: "success" | "warning" | "info"; title: string; body: string } | null;

const CustomerBookings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("active");
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [galleryBooking, setGalleryBooking] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner>(null);
  const verifying = useRef(false);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["customer-bookings", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          service:services(title, price, price_type, photos),
          hustler:hustler_profiles(
            id,
            user_id,
            average_rating,
            profile:profiles!hustler_profiles_profile_fkey(full_name, avatar_url, phone)
          )
        `)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
  });

  // Coming back from Paystack: confirm the payment, then tidy the URL.
  useEffect(() => {
    const ref = searchParams.get("ref") || searchParams.get("reference");
    const cancelled = searchParams.get("payment") === "cancelled";
    if (cancelled) {
      setBanner({ tone: "warning", title: "Payment cancelled", body: "Nothing was charged. You can pay again whenever you're ready." });
      setSearchParams({}, { replace: true });
      return;
    }
    if (!ref || !user || verifying.current) return;
    verifying.current = true;
    setBanner({ tone: "info", title: "Confirming your payment…", body: "This only takes a moment." });
    payments
      .verify(ref)
      .then((r) => {
        setBanner(
          r.paid
            ? { tone: "success", title: "Payment received. You're booked!", body: "We've emailed your receipt and let your hustler know." }
            : { tone: "warning", title: "Payment not completed", body: "Your card wasn't charged. Tap Pay now to try again." },
        );
        queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      })
      .catch((e) => setBanner({ tone: "warning", title: "We couldn't confirm the payment yet", body: e.message }))
      .finally(() => setSearchParams({}, { replace: true }));
  }, [searchParams, user, queryClient, setSearchParams]);

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      toast.success("Booking cancelled");
    },
    onError: async (e) => toast.error(await errorMessage(e, "Failed to cancel booking")),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        booking_id: reviewBooking.id,
        hustler_id: reviewBooking.hustler.id,
        customer_id: user!.id,
        rating,
        comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      setReviewBooking(null);
      setRating(5);
      setComment("");
      toast.success("Review submitted!");
    },
    onError: async (e) => toast.error(await errorMessage(e, "Failed to submit review")),
  });

  const pay = async (bookingId: string) => {
    setPayingId(bookingId);
    try {
      const { url } = await payments.checkout(bookingId);
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message);
      setPayingId(null);
    }
  };

  const startConversation = async (hustlerId: string) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("customer_id", user.id)
      .eq("hustler_id", hustlerId)
      .maybeSingle();
    if (existing) return navigate(`/chat/${existing.id}`);

    const { data: newConvo, error } = await supabase
      .from("conversations")
      .insert({ customer_id: user.id, hustler_id: hustlerId })
      .select()
      .single();
    if (error) return toast.error("Failed to start conversation");
    navigate(`/chat/${newConvo.id}`);
  };

  const active = bookings?.filter((b) => ["pending", "accepted"].includes(b.status)) || [];
  const past = bookings?.filter((b) => ["completed", "cancelled", "declined"].includes(b.status)) || [];
  const toPay = active.filter((b) => b.status === "accepted" && b.payment_status !== "paid").length;
  const list = tab === "active" ? active : past;

  if (authLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth?redirect=/my-bookings" replace />;

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-5">
        <PageHeader title="My bookings" subtitle="Track requests, pay, chat with hustlers and leave reviews" />

        {banner && (
          <div
            className={cn(
              "glass-card flex items-start gap-3 p-4 rounded-3xl animate-fade-in",
              banner.tone === "success" && "ring-1 ring-success/30",
              banner.tone === "warning" && "ring-1 ring-warning/30",
            )}
          >
            {banner.tone === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
            ) : banner.tone === "warning" ? (
              <XCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-foreground">{banner.title}</p>
              <p className="text-sm text-muted-foreground">{banner.body}</p>
            </div>
          </div>
        )}

        <PillTabs
          fill
          value={tab}
          onChange={setTab}
          items={[
            { value: "active", label: "Active", badge: toPay ? `${toPay} to pay` : active.length },
            { value: "past", label: "Past", badge: past.length },
          ]}
        />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="glass-card rounded-3xl text-center py-12 px-6">
            <p className="text-muted-foreground">{tab === "active" ? "No active bookings" : "No past bookings"}</p>
            {tab === "active" && (
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate("/browse")}>
                Find a Hustler
              </Button>
            )}
          </div>
        ) : (
          <div key={tab} className="space-y-4 animate-fade-in">
            {list.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                paying={payingId === booking.id}
                onPay={() => pay(booking.id)}
                onCancel={() => cancelMutation.mutate(booking.id)}
                onReview={booking.status === "completed" ? () => setReviewBooking(booking) : undefined}
                onMessage={() => startConversation(booking.hustler.id)}
                onPhotos={() => setGalleryBooking(booking)}
              />
            ))}
          </div>
        )}
      </div>

      {galleryBooking && (
        <HustlerGallery
          open={!!galleryBooking}
          onOpenChange={(o) => !o && setGalleryBooking(null)}
          hustlerId={galleryBooking.hustler.id}
          hustlerName={galleryBooking.hustler.profile?.full_name}
          hustlerAvatar={galleryBooking.hustler.profile?.avatar_url}
          rating={galleryBooking.hustler.average_rating}
          serviceId={galleryBooking.service_id}
        />
      )}

      <Dialog open={!!reviewBooking} onOpenChange={(o) => !o && setReviewBooking(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave a review</DialogTitle>
            <DialogDescription>How was your experience with {reviewBooking?.hustler?.profile?.full_name}?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)} className="p-1" aria-label={`${star} star${star > 1 ? "s" : ""}`}>
                  <Star className={`w-8 h-8 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea placeholder="Tell us about your experience..." value={comment} onChange={(e) => setComment(e.target.value)} rows={4} />
            <Button className="w-full rounded-full" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? "Submitting..." : "Submit review"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const statusStyle: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  accepted: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
  declined: "bg-destructive/15 text-destructive",
};

const statusLabel = (b: any) => {
  if (b.status === "accepted") return b.payment_status === "paid" ? "Confirmed" : "Accepted · pay now";
  if (b.status === "pending") return "Waiting for hustler";
  return b.status.charAt(0).toUpperCase() + b.status.slice(1);
};

interface BookingCardProps {
  booking: any;
  paying: boolean;
  onPay: () => void;
  onCancel: () => void;
  onReview?: () => void;
  onMessage: () => void;
  onPhotos: () => void;
}

const BookingCard = ({ booking, paying, onPay, onCancel, onReview, onMessage, onPhotos }: BookingCardProps) => {
  const name = booking.hustler?.profile?.full_name || "Hustler";
  const paid = booking.payment_status === "paid";
  const needsPayment = booking.status === "accepted" && !paid;
  const canCancel = ["pending", "accepted"].includes(booking.status) && !paid;
  const photo = booking.service?.photos?.[0];

  return (
    <div className={cn("glass-card rounded-3xl overflow-hidden", needsPayment && "ring-2 ring-primary/80")}>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onPhotos}
              className="relative w-14 h-14 rounded-2xl bg-secondary overflow-hidden shrink-0"
              aria-label={`See ${name}'s work`}
            >
              {photo ? (
                <img src={photo} alt="" className="w-full h-full object-cover" />
              ) : booking.hustler?.profile?.avatar_url ? (
                <img src={booking.hustler.profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-lg font-semibold text-muted-foreground">{name[0]}</span>
              )}
              <span className="absolute bottom-0.5 right-0.5 w-5 h-5 rounded-full glass-chip flex items-center justify-center">
                <Images className="w-3 h-3" />
              </span>
            </button>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <p className="text-sm text-muted-foreground truncate">{booking.service?.title}</p>
            </div>
          </div>
          <span className={cn("shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold", statusStyle[booking.status])}>
            {statusLabel(booking)}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {format(new Date(booking.scheduled_date), "EEE, d MMM yyyy")}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {String(booking.scheduled_time).slice(0, 5)}
          </span>
        </div>

        {booking.status === "declined" && booking.decline_reason && (
          <p className="text-sm p-3 rounded-2xl glass-inset">
            <span className="text-muted-foreground">Hustler's note: </span>
            {booking.decline_reason}
          </p>
        )}

        <div className="glass-inset rounded-2xl p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service</span>
            <span>{formatPrice(booking.service_amount ?? booking.service?.price)}</span>
          </div>
          {Number(booking.tip_amount) > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tip</span>
              <span>{formatPrice(booking.tip_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold pt-1 border-t border-border/60">
            <span>{paid ? "Paid" : "Total"}</span>
            <span className="flex items-center gap-1.5">
              {paid && <ShieldCheck className="w-4 h-4 text-success" />}
              {formatPrice(booking.total_price)}
            </span>
          </div>
        </div>

        {booking.status === "pending" && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hourglass className="w-3.5 h-3.5" />
            You'll be asked to pay once {name.split(" ")[0]} accepts. Nothing is charged yet.
          </p>
        )}

        <div className="flex gap-2">
          {needsPayment && (
            <Button className="flex-[2] rounded-full" onClick={onPay} disabled={paying}>
              {paying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
              {paying ? "Opening secure checkout…" : `Pay ${formatPrice(booking.total_price)}`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onMessage} className="flex-1 rounded-full h-10">
            <MessageCircle className="w-4 h-4 mr-1" />
            Message
          </Button>
          {canCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="flex-1 rounded-full h-10 text-destructive hover:text-destructive">
              Cancel
            </Button>
          )}
          {onReview && (
            <Button size="sm" onClick={onReview} className="flex-1 rounded-full h-10">
              <Star className="w-4 h-4 mr-1" />
              Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerBookings;
