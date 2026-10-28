import { useState } from "react";
import { Heart, MapPin, Star, BadgeCheck, Images } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SmartImage from "@/components/SmartImage";
import { useFavorites } from "@/hooks/useFavorites";
import { getCategoryIcon, getCategoryImage } from "@/lib/categories";
import { formatPrice, formatPriceType } from "@/lib/format";
import type { ServiceWithDistance } from "@/types/database";
import { cn } from "@/lib/utils";
import HustlerGallery, { useHustlerMedia } from "@/components/HustlerGallery";

interface ServiceCardProps {
  service: ServiceWithDistance;
  onBook: (service: ServiceWithDistance) => void;
  showDescription?: boolean;
  className?: string;
}

const ServiceCard = ({ service, onBook, showDescription = false, className }: ServiceCardProps) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const saved = isFavorite(service.id);
  const photo = service.photos?.[0] || getCategoryImage(service.category);
  const CategoryIcon = getCategoryIcon(service.category?.icon);
  const rating = Number(service.hustler_rating || 0);
  const reviews = service.hustler?.total_reviews || 0;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { data: hustlerServices } = useHustlerMedia(service.hustler_id, galleryOpen);
  const photoCount = (service.photos?.length || 0) + (service.videos?.length || 0);

  const openGallery = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setGalleryOpen(true);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    const added = toggleFavorite({
      id: service.id,
      title: service.title,
      price: service.price,
      price_type: service.price_type,
      hustler_id: service.hustler_id,
      hustler_name: service.hustler_name,
      hustler_avatar: service.hustler_avatar,
      hustler_rating: rating,
      photo: service.photos?.[0] ?? null,
      category: service.category?.name ?? null,
    });
    toast.success(added ? "Saved to your favourites" : "Removed from favourites", {
      action: added ? { label: "View", onClick: () => navigate("/favorites") } : undefined,
    });
  };

  return (
    <article
      className={cn(
        "group glass-card rounded-3xl overflow-hidden flex flex-col card-hover",
        className,
      )}
    >
      <div
        className="relative h-44 m-2 mb-0 rounded-2xl bg-secondary overflow-hidden cursor-zoom-in"
        onClick={() => openGallery()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openGallery()}
        aria-label={`See ${service.hustler_name}'s work`}
      >
        <SmartImage
          src={photo}
          alt={service.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <CategoryIcon className="w-10 h-10 text-muted-foreground" />
            </div>
          }
        />
        <div className="absolute inset-x-0 top-0 p-3 flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 glass-chip rounded-full text-[11px] font-semibold text-foreground">
            <span className={cn("w-1.5 h-1.5 rounded-full", service.hustler?.is_available === false ? "bg-muted-foreground" : "bg-success")} />
            {service.hustler?.is_available === false ? "Busy" : "Available"}
          </span>
          <button
            onClick={handleFavorite}
            className="w-9 h-9 rounded-full glass-chip flex items-center justify-center transition-transform active:scale-90"
            aria-label={saved ? "Remove from favourites" : "Save to favourites"}
            aria-pressed={saved}
          >
            <Heart className={cn("w-4 h-4", saved ? "fill-red-500 text-red-500" : "text-foreground")} />
          </button>
        </div>
        <button
          onClick={openGallery}
          className="absolute left-3 bottom-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-chip text-[11px] font-semibold text-foreground transition-transform active:scale-95"
        >
          <Images className="w-3.5 h-3.5" />
          {photoCount > 1 ? `${photoCount} photos · See all work` : "See their work"}
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0">
              {service.hustler_avatar ? (
                <img src={service.hustler_avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                (service.hustler_name || "H").charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate flex items-center gap-1">
                {service.hustler_name}
                <BadgeCheck className="w-4 h-4 text-foreground shrink-0" aria-label="Verified hustler" />
              </h3>
              <p className="text-sm text-muted-foreground truncate">{service.title}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-bold text-foreground">{formatPrice(service.price)}</div>
            <div className="text-[11px] text-muted-foreground">{formatPriceType(service.price_type)}</div>
          </div>
        </div>

        {showDescription && service.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{service.description}</p>
        )}

        <div className="flex items-center gap-3 mt-3 mb-4 text-sm">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{rating > 0 ? rating.toFixed(1) : "New"}</span>
            {reviews > 0 && <span className="text-muted-foreground">({reviews})</span>}
          </span>
          {service.distance !== undefined && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {service.distance < 1 ? "< 1" : service.distance.toFixed(1)} km
            </span>
          )}
        </div>

        <Button className="w-full mt-auto rounded-full" onClick={() => onBook(service)}>
          Book now
        </Button>
      </div>

      <HustlerGallery
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        hustlerId={service.hustler_id}
        hustlerName={service.hustler_name}
        hustlerAvatar={service.hustler_avatar}
        rating={rating}
        serviceId={photoCount > 0 ? service.id : undefined}
        onBook={(id) => {
          const picked = hustlerServices?.find((s) => s.id === id);
          setGalleryOpen(false);
          onBook(picked ? { ...service, id: picked.id, title: picked.title, price: picked.price, price_type: picked.price_type } : service);
        }}
      />
    </article>
  );
};

export default ServiceCard;
