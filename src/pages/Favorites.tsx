import { useNavigate } from "react-router-dom";
import { Heart, Star, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { formatPrice, formatPriceType } from "@/lib/format";

const Favorites = () => {
  const navigate = useNavigate();
  const { favorites, removeFavorite } = useFavorites();

  return (
    <Layout width="medium">
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-6">
        <PageHeader title="Saved hustlers" subtitle="Your shortlist, saved on this device" />

        {favorites.length === 0 ? (
          <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-border">
            <Heart className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap the heart on any hustler to save them here.</p>
            <Button className="mt-5 rounded-full" onClick={() => navigate("/browse")}>
              Browse hustlers
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {favorites.map((f) => (
              <div key={f.id} className="flex gap-3 p-3 rounded-2xl border border-border bg-card">
                <div className="w-20 h-20 rounded-xl bg-secondary overflow-hidden shrink-0 flex items-center justify-center font-semibold">
                  {f.photo ? <img src={f.photo} alt="" className="w-full h-full object-cover" /> : (f.hustler_name || "H")[0]}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <p className="font-semibold truncate">{f.hustler_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{f.title}</p>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-semibold">{formatPrice(f.price)}</span>
                    <span className="text-xs text-muted-foreground">{formatPriceType(f.price_type)}</span>
                    {!!f.hustler_rating && (
                      <span className="flex items-center gap-0.5 ml-auto">
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                        {f.hustler_rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto pt-2">
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg h-8"
                      onClick={() => navigate(`/browse?q=${encodeURIComponent(f.title)}`)}
                    >
                      Book again
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg h-8 w-8 p-0"
                      onClick={() => removeFavorite(f.id)}
                      aria-label={`Remove ${f.hustler_name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Favorites;
