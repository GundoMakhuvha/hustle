import { useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { useSlidingPill } from "@/hooks/useSlidingPill";
import { cn } from "@/lib/utils";

export interface PillTabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

interface PillTabsProps {
  items: PillTabItem[];
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  /** Stretch items to fill the width. */
  fill?: boolean;
}

/** Glass segmented control with a dark pill that glides to the selected item. */
const PillTabs = ({ items, value, onChange, size = "md", className, fill }: PillTabsProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const pill = useSlidingPill(ref, '[data-active="true"]', [items.length]);

  return (
    <div
      ref={ref}
      role="tablist"
      className={cn("pill-track relative inline-flex items-center gap-0.5 p-1 rounded-full", fill && "flex w-full", className)}
    >
      <span aria-hidden className="pill-indicator absolute left-0 top-0 rounded-full" style={pill} />
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors duration-300",
              size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
              fill && "flex-1",
              active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.icon && <item.icon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />}
            <span className="truncate max-w-[12rem]">{item.label}</span>
            {item.badge !== undefined && item.badge !== 0 && (
              <span
                className={cn(
                  "min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-semibold inline-flex items-center justify-center transition-colors",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PillTabs;
