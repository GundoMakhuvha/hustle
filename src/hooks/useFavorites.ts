import { useCallback, useSyncExternalStore } from "react";

export interface FavoriteService {
  id: string;
  title: string;
  price: number;
  price_type?: string | null;
  hustler_id: string;
  hustler_name?: string;
  hustler_avatar?: string | null;
  hustler_rating?: number;
  photo?: string | null;
  category?: string | null;
  saved_at: string;
}

const KEY = "hustle-favorites";
const listeners = new Set<() => void>();
let cache: FavoriteService[] | null = null;

function read(): FavoriteService[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as FavoriteService[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: FavoriteService[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — keep in memory */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Saved hustlers/services, stored on this device. */
export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, read, () => []);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteService, "saved_at">) => {
      const current = read();
      if (current.some((f) => f.id === item.id)) {
        write(current.filter((f) => f.id !== item.id));
        return false;
      }
      write([{ ...item, saved_at: new Date().toISOString() }, ...current]);
      return true;
    },
    [],
  );

  const removeFavorite = useCallback((id: string) => write(read().filter((f) => f.id !== id)), []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite };
}
