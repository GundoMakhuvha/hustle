import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon, X, MapPin, SlidersHorizontal } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useServices } from "@/hooks/useServices";
import { useLocation } from "@/hooks/useLocation";
import { useAuth } from "@/contexts/AuthContext";
import BookingModal from "@/components/BookingModal";
import CategoryPill from "@/components/CategoryPill";
import ServiceCard from "@/components/ServiceCard";
import SkeletonCard from "@/components/SkeletonCard";
import { getCategoryIcon } from "@/lib/categories";
import type { ServiceWithDistance } from "@/types/database";
import { useSlidingPill } from "@/hooks/useSlidingPill";

type SortKey = "recommended" | "nearest" | "rating" | "price-asc" | "price-desc";

const sortLabels: Record<SortKey, string> = {
  recommended: "Recommended",
  nearest: "Nearest",
  rating: "Top rated",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};

const Browse = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const urlQuery = searchParams.get("q") || "";

  const [input, setInput] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [selectedService, setSelectedService] = useState<ServiceWithDistance | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Debounce typing, and keep the URL shareable.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(input);
      const next = new URLSearchParams(searchParams);
      if (input.trim()) next.set("q", input.trim());
      else next.delete("q");
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const setCategory = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === "all") next.delete("category");
    else next.set("category", id);
    setSearchParams(next, { replace: true });
  };

  const { location, requestLocation, isLoading: locating } = useLocation();
  const { user } = useAuth();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: services, isLoading: loadingServices, isFetching } = useServices({
    categoryId: activeCategory,
    searchQuery: debounced,
    userLat: location?.latitude,
    userLon: location?.longitude,
  });

  const sorted = useMemo(() => {
    const list = [...(services || [])];
    switch (sort) {
      case "nearest":
        return list.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
      case "rating":
        return list.sort((a, b) => (b.hustler_rating || 0) - (a.hustler_rating || 0));
      case "price-asc":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "price-desc":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      default:
        return list;
    }
  }, [services, sort]);

  const pillRowRef = useRef<HTMLDivElement>(null);
  const categoryPill = useSlidingPill(pillRowRef, '[aria-pressed="true"]', [categories?.length]);

  const activeCategoryName = categories?.find((c) => c.id === activeCategory)?.name;

  const handleBook = (service: ServiceWithDistance) => {
    if (!user) {
      navigate("/auth?redirect=/browse");
      return;
    }
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const clearAll = () => {
    setInput("");
    setSearchParams({}, { replace: true });
    setSort("recommended");
  };

  return (
    <Layout width="wide">
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 md:hidden" aria-label="Go back">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-foreground">Browse services</h1>
            <p className="hidden md:block text-muted-foreground mt-1">Verified hustlers, ready when you are.</p>
          </div>
        </div>

        {/* Search + sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search services..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus={!!urlQuery}
              className="w-full pl-12 pr-10 py-3 glass-card rounded-full text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              aria-label="Search services"
            />
            {input && (
              <button
                onClick={() => setInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-12 sm:w-52 rounded-full glass-card gap-2">
                <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k} disabled={k === "nearest" && !location}>
                    {sortLabels[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!location && (
              <Button
                variant="outline"
                className="h-12 rounded-full shrink-0 glass-card border-0"
                onClick={requestLocation}
                disabled={locating}
              >
                <MapPin className="w-4 h-4 mr-1.5" />
                {locating ? "Locating…" : "Near me"}
              </Button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div ref={pillRowRef} className="relative flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1">
          <span aria-hidden className="pill-indicator absolute left-0 top-0 rounded-full" style={categoryPill} />
          <CategoryPill glide label="All" isActive={activeCategory === "all"} onClick={() => setCategory("all")} />
          {categories?.map((category) => (
            <CategoryPill
              glide
              key={category.id}
              icon={getCategoryIcon(category.icon)}
              label={category.name}
              isActive={activeCategory === category.id}
              onClick={() => setCategory(category.id)}
            />
          ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold text-foreground">
              {loadingServices ? "Finding hustlers…" : `${sorted.length} hustler${sorted.length === 1 ? "" : "s"}`}
              {activeCategoryName && <span className="font-normal text-muted-foreground"> in {activeCategoryName}</span>}
              {debounced && <span className="font-normal text-muted-foreground"> for “{debounced}”</span>}
            </h2>
            {isFetching && !loadingServices && <span className="text-xs text-muted-foreground">Updating…</span>}
          </div>

          {loadingServices || loadingCategories ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : sorted.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sorted.map((service) => (
                <ServiceCard key={service.id} service={service} onBook={handleBook} showDescription />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border">
              <SearchIcon className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">No hustlers match that yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Try another search or category — or offer this service yourself.</p>
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                <Button variant="outline" className="rounded-full" onClick={clearAll}>
                  Clear filters
                </Button>
                <Button className="rounded-full" onClick={() => navigate("/become-hustler")}>
                  Become a Hustler
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedService && (
        <BookingModal
          open={isBookingOpen}
          onOpenChange={(open) => {
            setIsBookingOpen(open);
            if (!open) setSelectedService(null);
          }}
          service={{
            id: selectedService.id,
            title: selectedService.title,
            price: selectedService.price,
            price_type: selectedService.price_type,
            hustler_id: selectedService.hustler_id,
            hustler_name: selectedService.hustler_name,
          }}
        />
      )}
    </Layout>
  );
};

export default Browse;
