import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, CheckCircle, Heart, ShieldCheck } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import { errorMessage } from "@/lib/payments";
import { useNavigate } from "react-router-dom";

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: {
    id: string;
    title: string;
    price: number;
    price_type?: string;
    hustler_id: string;
    hustler_name?: string;
  } | null;
}

const BookingModal = ({ open, onOpenChange, service }: BookingModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("10:00");
  const [notes, setNotes] = useState("");
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [step, setStep] = useState<"datetime" | "confirm" | "success">("datetime");

  // Hourly slots from 07:00 to 20:00. For same-day bookings, only slots at least
  // LEAD_MINUTES from now are offered so the hustler has time to get there.
  const LEAD_MINUTES = 60;
  const times = Array.from({ length: 14 }, (_, i) => `${String(7 + i).padStart(2, "0")}:00`);

  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const isToday = !!date && isSameDay(date, today);

  const availableTimes = useMemo(() => {
    if (!date || !isSameDay(date, new Date())) return times;
    const cutoff = Date.now() + LEAD_MINUTES * 60_000;
    return times.filter((t) => {
      const [h, m] = t.split(":").map(Number);
      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);
      return slot.getTime() >= cutoff;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, open]);

  // Keep the selected time valid when the date changes (e.g. switching to today).
  useEffect(() => {
    if (availableTimes.length && !availableTimes.includes(selectedTime)) {
      setSelectedTime(availableTimes[0]);
    }
  }, [availableTimes, selectedTime]);

  const tipPresets = [0, 10, 20, 50];

  const totalAmount = service ? service.price + tipAmount : 0;

  // Reset the flow each time the modal opens.
  useEffect(() => {
    if (open) {
      setStep("datetime");
      setNotes("");
      setTipAmount(0);
    }
  }, [open]);

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !service || !date) throw new Error("Missing data");

      // Prices and the 10% fee are worked out by the database, so only the
      // customer's choices are sent. Payment happens once the hustler accepts.
      const { error } = await supabase.from("bookings").insert({
        customer_id: user.id,
        service_id: service.id,
        hustler_id: service.hustler_id,
        scheduled_date: format(date, "yyyy-MM-dd"),
        scheduled_time: selectedTime,
        tip_amount: tipAmount,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      setStep("success");
    },
    onError: async (error) => {
      console.error("Booking error:", error);
      toast.error(await errorMessage(error, "We couldn't send your booking. Please try again."));
    },
  });

  const handleConfirm = () => {
    bookingMutation.mutate();
  };

  const formatTime = (time: string) => {
    const [hours] = time.split(":");
    const hour = parseInt(hours);
    return hour >= 12 ? `${hour === 12 ? 12 : hour - 12}:00 PM` : `${hour}:00 AM`;
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto glass-panel rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === "datetime" && "Select Date & Time"}
            {step === "confirm" && "Review your request"}
            {step === "success" && "Booking Requested!"}
          </DialogTitle>
        </DialogHeader>

        {step === "datetime" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="font-medium">Choose Date</span>
              </div>
              <div className="flex gap-2 mb-3">
                {[
                  { label: "Today", value: today },
                  { label: "Tomorrow", value: tomorrow },
                ].map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => setDate(q.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      date && isSameDay(date, q.value)
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "glass-chip hover:bg-background/80"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              <CalendarComponent
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-xl border"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-medium">Choose Time</span>
              </div>
              {isToday && availableTimes.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  Same day booking: showing times from about an hour from now.
                </p>
              )}
              {availableTimes.length === 0 ? (
                <div className="p-4 rounded-xl bg-secondary text-sm text-center">
                  No more slots today.{" "}
                  <button type="button" className="font-semibold underline" onClick={() => setDate(tomorrow)}>
                    Book for tomorrow
                  </button>
                </div>
              ) : (
              <div className="grid grid-cols-3 gap-2">
                {availableTimes.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                      selectedTime === time
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "glass-chip hover:bg-background/80"
                    }`}
                  >
                    {formatTime(time)}
                  </button>
                ))}
              </div>
              )}
            </div>

            <div>
              <label className="block font-medium mb-2">Notes (optional)</label>
              <Textarea
                placeholder="Any special requests or instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              className="w-full"
              size="lg"
              onClick={() => setStep("confirm")}
              disabled={!date || availableTimes.length === 0}
            >
              Continue
            </Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-inset rounded-2xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{service.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span className="font-medium">{service.hustler_name || "Hustler"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{date?.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{formatTime(selectedTime)}</span>
              </div>
              {notes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="font-medium text-right max-w-[60%]">{notes}</span>
                </div>
              )}
              <div className="border-t border-border pt-3 flex justify-between">
                <span className="text-muted-foreground">Service Price</span>
                <span className="font-medium">{formatPrice(service.price)}</span>
              </div>
            </div>

            {/* Tip Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" />
                <span className="font-medium">Add a Tip</span>
              </div>
              <div className="flex gap-2">
                {tipPresets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setTipAmount(preset)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                      tipAmount === preset
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "glass-chip hover:bg-background/80"
                    }`}
                  >
                    {preset === 0 ? "None" : `R${preset}`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Custom:</span>
                <Input
                  type="number"
                  min="0"
                  placeholder="R0"
                  value={tipAmount || ""}
                  onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                  className="w-24"
                />
              </div>
            </div>

            {/* Total */}
            <div className="glass-inset rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span>{formatPrice(service.price)}</span>
              </div>
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip</span>
                  <span>{formatPrice(tipAmount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatPrice(totalAmount)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                No charge yet. You'll pay securely once the hustler accepts. 100% of your tip goes to them.
              </span>
            </p>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1"
                onClick={() => setStep("datetime")}
              >
                Back
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConfirm}
                disabled={bookingMutation.isPending}
              >
                {bookingMutation.isPending ? "Sending..." : "Send request"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center animate-scale-in">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Sent!</h3>
            <p className="text-muted-foreground">
              Your booking request has been sent to {service.hustler_name || "the hustler"}.
              We'll email you when they respond, and you can pay from My bookings once they accept.
            </p>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1 rounded-full" onClick={() => onOpenChange(false)}>
                Keep browsing
              </Button>
              <Button
                className="flex-1 rounded-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/my-bookings");
                }}
              >
                My bookings
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
