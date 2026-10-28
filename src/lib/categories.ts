import {
  Sparkles, Baby, Flower2, Music, Camera, GraduationCap, PawPrint, Wrench, Truck, ChefHat,
  Dumbbell, Scissors, PartyPopper, Car, Home, Briefcase, type LucideIcon,
} from "lucide-react";

/** Icon name (as stored in service_categories.icon) → Lucide icon. */
export const categoryIcons: Record<string, LucideIcon> = {
  Sparkles, Baby, Flower2, Music, Camera, GraduationCap, PawPrint, Wrench, Truck, ChefHat,
  Dumbbell, Scissors, PartyPopper, Car, Home,
};

/** Free-to-use photos from Unsplash (https://unsplash.com/license), served from their CDN. */
const unsplash = (id: string, w = 600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const photoIds: Record<string, string> = {
  cleaning: "1563453392212-326f5e854473",
  babysitting: "1504151997199-b6438e7df5d6",
  gardening: "1611843467160-25afb8df1074",
  djing: "1571266028243-d220c6a7edbf",
  photography: "1493863641943-9b68992a8d07",
  tutoring: "1583468991267-3f068b607ae1",
  "pet care": "1530700131180-d43d9b8cc41f",
  handyman: "1562259929-b4e1fd3aef09",
  moving: "1714647211902-bb711d643a17",
  cooking: "1622021142947-da7dedc7c39a",
  fitness: "1534258936925-c58bed479fcb",
  beauty: "1572955304332-bf714bd49add",
  entertainment: "1492684223066-81342ee5ff30",
};

/** Same photos keyed by icon name, for categories added later with a known icon. */
const iconToName: Record<string, string> = {
  Sparkles: "cleaning", Baby: "babysitting", Flower2: "gardening", Music: "djing", Camera: "photography",
  GraduationCap: "tutoring", PawPrint: "pet care", Wrench: "handyman", Truck: "moving", ChefHat: "cooking",
  Dumbbell: "fitness", Scissors: "beauty", PartyPopper: "entertainment",
};

export function getCategoryImage(
  category?: { name?: string | null; icon?: string | null } | null,
  width = 600,
) {
  if (!category) return undefined;
  const key = (category.name || "").toLowerCase();
  const id = photoIds[key] ?? photoIds[iconToName[category.icon || ""] ?? ""];
  return id ? unsplash(id, width) : undefined;
}

export function getCategoryIcon(icon?: string | null): LucideIcon {
  return (icon && categoryIcons[icon]) || Briefcase;
}

export const authHeroImage = unsplash(photoIds.cleaning, 1400);
