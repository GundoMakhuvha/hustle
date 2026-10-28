import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  icon?: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  /** Active fill comes from a sliding indicator in the parent row (see Browse). */
  glide?: boolean;
}

const CategoryPill = ({ icon: Icon, label, isActive = false, onClick, glide = false }: CategoryPillProps) => {
  return (
    <button
      onClick={onClick}
      aria-pressed={isActive}
      className={cn(
        "relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 active:scale-95",
        isActive
          ? glide
            ? "text-primary-foreground border border-transparent"
            : "bg-primary text-primary-foreground shadow-md animate-pill-pop"
          : "glass-chip text-foreground hover:bg-background/80",
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  );
};

export default CategoryPill;
