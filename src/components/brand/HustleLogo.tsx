import { cn } from "@/lib/utils";
import { WING_PATH, WING_VIEWBOX } from "./wingPath";

interface HustleMarkProps {
  className?: string;
}

/** The Hustle wing mark. Inherits colour from `currentColor`. */
export const HustleMark = ({ className }: HustleMarkProps) => (
  <svg viewBox={WING_VIEWBOX} className={className} aria-hidden="true" focusable="false">
    <path fillRule="evenodd" fill="currentColor" d={WING_PATH} />
  </svg>
);

interface HustleLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
}

const sizes = {
  sm: { box: "w-8 h-8 rounded-lg", mark: "w-5 h-5", text: "text-lg" },
  md: { box: "w-9 h-9 rounded-xl", mark: "w-6 h-6", text: "text-xl" },
  lg: { box: "w-12 h-12 rounded-2xl", mark: "w-8 h-8", text: "text-2xl" },
};

const HustleLogo = ({ className, size = "md", showWordmark = true }: HustleLogoProps) => {
  const s = sizes[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("bg-foreground text-background flex items-center justify-center shrink-0", s.box)}>
        <HustleMark className={s.mark} />
      </span>
      {showWordmark && (
        <span className={cn("font-extrabold tracking-tight text-foreground", s.text)}>Hustle</span>
      )}
    </span>
  );
};

export default HustleLogo;
