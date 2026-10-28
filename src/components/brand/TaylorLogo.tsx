import { useId } from "react";
import { cn } from "@/lib/utils";
import { WING_PATH } from "./wingPath";

interface TaylorMarkProps {
  className?: string;
  animated?: boolean;
}

/**
 * Taylor AI mark — the Capvtal wing inside a glowing energy-core ring.
 */
export const TaylorMark = ({ className, animated = true }: TaylorMarkProps) => {
  const uid = useId().replace(/:/g, "");
  const core = `taylor-core-${uid}`;
  const ring = `taylor-ring-${uid}`;
  const glow = `taylor-glow-${uid}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={cn(animated && "taylor-glow", className)}
      role="img"
      aria-label="Taylor AI"
    >
      <defs>
        <radialGradient id={core} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.7" stopColor="#0b0b1a" />
          <stop offset="1" stopColor="#05050d" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="0.5" stopColor="#818cf8" />
          <stop offset="1" stopColor="#e879f9" />
        </linearGradient>
        <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="60" cy="60" r="56" fill={`url(#${core})`} />
      <circle cx="60" cy="60" r="50" fill="none" stroke={`url(#${ring})`} strokeWidth="5" filter={`url(#${glow})`} />
      <circle
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke={`url(#${ring})`}
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeDasharray="3 5"
      />
      <g transform="translate(36 39.5) scale(0.0686)" filter={`url(#${glow})`}>
        <path fillRule="evenodd" fill="#fff" d={WING_PATH} />
      </g>
    </svg>
  );
};

interface TaylorBadgeProps {
  href?: string;
  className?: string;
}

/** "Powered by Taylor AI" badge used in the footer. */
const TaylorBadge = ({ href, className }: TaylorBadgeProps) => {
  const content = (
    <>
      <TaylorMark className="w-7 h-7" />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Powered by</span>
        <span className="text-sm font-bold bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
          Taylor AI
        </span>
      </span>
    </>
  );

  const cls = cn(
    "inline-flex items-center gap-2.5 rounded-full border border-border bg-background pl-1.5 pr-4 py-1.5 transition-colors hover:border-foreground/30",
    className,
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <span className={cls}>{content}</span>
  );
};

export default TaylorBadge;
