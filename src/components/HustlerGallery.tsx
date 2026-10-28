import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImageOff, Images, Play, X, Star, BadgeCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatPriceType } from "@/lib/format";
import PillTabs from "@/components/PillTabs";
import { cn } from "@/lib/utils";

interface HustlerGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hustlerId: string;
  hustlerName?: string;
  hustlerAvatar?: string | null;
  rating?: number;
  /** Open on this service's photos first. */
  serviceId?: string;
  onBook?: (serviceId: string) => void;
}

interface Media {
  url: string;
  kind: "photo" | "video";
  serviceId: string;
  serviceTitle: string;
}

/** Every photo and video a hustler has uploaded across their active services. */
export function useHustlerMedia(hustlerId?: string, enabled = true) {
  return useQuery({
    queryKey: ["hustler-media", hustlerId],
    enabled: !!hustlerId && enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, title, price, price_type, photos, videos")
        .eq("hustler_id", hustlerId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const HustlerGallery = ({
  open,
  onOpenChange,
  hustlerId,
  hustlerName,
  hustlerAvatar,
  rating,
  serviceId,
  onBook,
}: HustlerGalleryProps) => {
  const { data: services, isLoading } = useHustlerMedia(hustlerId, open);
  const [filter, setFilter] = useState<string>("all");
  const [viewer, setViewer] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setFilter(serviceId ?? "all");
      setViewer(null);
    }
  }, [open, serviceId]);

  const media: Media[] = useMemo(
    () =>
      (services ?? []).flatMap((s) => [
        ...(s.photos ?? []).filter(Boolean).map((url) => ({ url, kind: "photo" as const, serviceId: s.id, serviceTitle: s.title })),
        ...(s.videos ?? []).filter(Boolean).map((url) => ({ url, kind: "video" as const, serviceId: s.id, serviceTitle: s.title })),
      ]),
    [services],
  );

  const shown = filter === "all" ? media : media.filter((m) => m.serviceId === filter);
  const servicesWithMedia = (services ?? []).filter((s) => media.some((m) => m.serviceId === s.id));
  const current = viewer !== null ? shown[viewer] : null;
  const activeService = services?.find((s) => s.id === (current?.serviceId ?? (filter !== "all" ? filter : undefined)));

  // Arrow keys in the viewer
  useEffect(() => {
    if (viewer === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setViewer((v) => (v === null ? v : (v + 1) % shown.length));
      if (e.key === "ArrowLeft") setViewer((v) => (v === null ? v : (v - 1 + shown.length) % shown.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, shown.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel sm:max-w-3xl w-[calc(100%-1.5rem)] max-h-[90vh] overflow-hidden p-0 rounded-3xl gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4">
          <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex items-center justify-center font-semibold shrink-0 ring-2 ring-background/70">
            {hustlerAvatar ? <img src={hustlerAvatar} alt="" className="w-full h-full object-cover" /> : (hustlerName || "H").charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-lg font-semibold flex items-center gap-1.5 truncate">
              {hustlerName || "Hustler"}
              <BadgeCheck className="w-4 h-4 shrink-0" aria-label="Verified hustler" />
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-sm">
              <Images className="w-3.5 h-3.5" />
              {isLoading ? "Loading work…" : `${media.length} photo${media.length === 1 ? "" : "s"} of their work`}
              {rating ? (
                <span className="inline-flex items-center gap-1">
                  · <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {Number(rating).toFixed(1)}
                </span>
              ) : null}
            </DialogDescription>
          </div>
        </div>

        {servicesWithMedia.length > 1 && (
          <div className="px-5 pb-3 overflow-x-auto no-scrollbar">
            <PillTabs
              size="sm"
              value={filter}
              onChange={(v) => {
                setFilter(v);
                setViewer(null);
              }}
              items={[{ value: "all", label: "All work" }, ...servicesWithMedia.map((s) => ({ value: s.id, label: s.title }))]}
            />
          </div>
        )}

        {/* Grid */}
        <div className="px-5 pb-5 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="py-14 text-center text-muted-foreground">
              <ImageOff className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium text-foreground">No photos yet</p>
              <p className="text-sm">This hustler hasn't uploaded photos of their work.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {shown.map((m, i) => (
                <button
                  key={m.url + i}
                  onClick={() => setViewer(i)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Open ${m.kind} ${i + 1} from ${m.serviceTitle}`}
                >
                  {m.kind === "photo" ? (
                    <img src={m.url} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <>
                      <video src={m.url} muted preload="metadata" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="w-10 h-10 rounded-full glass-chip flex items-center justify-center">
                          <Play className="w-4 h-4 fill-current" />
                        </span>
                      </span>
                    </>
                  )}
                  <span className="absolute left-2 bottom-2 right-2 truncate text-left text-[11px] font-medium px-2 py-1 rounded-full glass-chip opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.serviceTitle}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {onBook && activeService && (
          <div className="border-t border-border/60 p-4 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{activeService.title}</p>
              <p className="text-sm text-muted-foreground">
                {formatPrice(activeService.price)} · {formatPriceType(activeService.price_type)}
              </p>
            </div>
            <button
              onClick={() => onBook(activeService.id)}
              className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-md active:scale-95 transition-transform"
            >
              Book this
            </button>
          </div>
        )}

        {/* Full-screen viewer */}
        {current && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <button
              onClick={() => setViewer(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
              aria-label="Close photo"
            >
              <X className="w-5 h-5" />
            </button>
            {shown.length > 1 && (
              <>
                <button
                  onClick={() => setViewer((viewer! - 1 + shown.length) % shown.length)}
                  className="absolute left-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewer((viewer! + 1) % shown.length)}
                  className="absolute right-3 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25"
                  aria-label="Next"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {current.kind === "photo" ? (
              <img src={current.url} alt={current.serviceTitle} className="max-h-[78%] max-w-[86%] object-contain rounded-xl" />
            ) : (
              <video src={current.url} controls autoPlay className="max-h-[78%] max-w-[86%] rounded-xl" />
            )}
            <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-1 text-white">
              <span className="text-sm font-medium">{current.serviceTitle}</span>
              <span className="text-xs text-white/60">
                {viewer! + 1} / {shown.length}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Small "N photos" chip that opens the gallery. */
export const PhotoCountChip = ({ count, onClick, className }: { count: number; onClick: (e: React.MouseEvent) => void; className?: string }) =>
  count > 0 ? (
    <button
      onClick={onClick}
      className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-chip text-[11px] font-semibold", className)}
    >
      <Images className="w-3.5 h-3.5" />
      {count} photo{count === 1 ? "" : "s"}
    </button>
  ) : null;

export default HustlerGallery;
