import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, ArrowRight, Briefcase } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCategories, useServices } from "@/hooks/useServices";
import { useLocation } from "@/hooks/useLocation";
import { useAuth } from "@/contexts/AuthContext";
import BookingModal from "@/components/BookingModal";
import ServiceCard from "@/components/ServiceCard";
import SmartImage from "@/components/SmartImage";
import SkeletonCard from "@/components/SkeletonCard";
import HustleLogo from "@/components/brand/HustleLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { getCategoryIcon, getCategoryImage } from "@/lib/categories";
import { greeting } from "@/lib/format";
import type { ServiceWithDistance } from "@/types/database";

const Home = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selectedService, setSelectedService] = useState<ServiceWithDistance | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const { location } = useLocation();
  const { user, profile, isHustler } = useAuth();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: services, isLoading: loadingServices } = useServices({
    userLat: location?.latitude,
    userLon: location?.longitude,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/browse?q=${encodeURIComponent(q)}` : "/browse");
  };

  const handleBook = (service: ServiceWithDistance) => {
    if (!user) {
      navigate("/auth?redirect=/browse");
      return;
    }
    setSelectedService(service);
    setIsBookingOpen(true);
  };

  const topServices = services?.slice(0, 6) || [];
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <Layout width="wide">
      {/* Mobile top bar */}
      <div className="md:hidden px-4 pt-4 flex items-center justify-between">
        <HustleLogo size="sm" />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!user && (
            <Button size="sm" variant="outline" className="rounded-full h-8" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
          )}
        </div>
      </div>

      {/* Hero */}
      <section className="px-4 sm:px-6 pt-6 md:pt-20 pb-8 md:pb-14 md:text-center">
        <div className="space-y-5 max-w-2xl md:mx-auto animate-fade-in">
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-foreground leading-[1.08] text-balance">
            What do you need done today?
          </h1>

          <form onSubmit={handleSearch} className="relative md:mx-auto" role="search">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search services..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-28 py-4 bg-secondary rounded-2xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
              aria-label="Search services"
            />
            <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl h-10 px-5">
              Search
            </Button>
          </form>

          <p className="flex items-center md:justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Every hustler is ID and police-clearance checked
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="px-4 sm:px-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">Categories</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/browse")}>
            See all
          </Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {loadingCategories
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-secondary rounded-2xl animate-pulse" />
              ))
            : categories?.map((category) => {
                const image = getCategoryImage(category);
                const Icon = getCategoryIcon(category.icon);
                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/browse?category=${category.id}`)}
                    className="relative aspect-square rounded-2xl overflow-hidden group bg-secondary"
                  >
                    <SmartImage
                      src={image}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      fallback={
                        <div className="absolute inset-0 flex items-center justify-center pb-5">
                          <Icon className="w-7 h-7 text-muted-foreground" />
                        </div>
                      }
                    />
                    {image && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />}
                    <span
                      className={`absolute left-2.5 bottom-2.5 text-xs sm:text-sm font-semibold ${
                        image ? "text-white" : "text-foreground"
                      }`}
                    >
                      {category.name}
                    </span>
                  </button>
                );
              })}
        </div>
      </section>

      {/* Available hustlers */}
      <section className="px-4 sm:px-6 pt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-foreground">Available hustlers</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/browse")}>
            See all
          </Button>
        </div>

        {loadingServices ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : topServices.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topServices.map((service) => (
              <ServiceCard key={service.id} service={service} onBook={handleBook} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hustlers available yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to offer your services!</p>
          </div>
        )}
      </section>

      {/* Hustler CTA */}
      {!isHustler && (
        <section className="px-4 sm:px-6 pt-10">
          <button
            onClick={() => navigate(user ? "/become-hustler" : "/auth?mode=signup&redirect=/become-hustler")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-secondary hover:bg-muted transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Become a Hustler</h3>
              <p className="text-sm text-muted-foreground">Offer your skills and get booked by people nearby.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </section>
      )}

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

export default Home;
