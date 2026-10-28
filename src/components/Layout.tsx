import { ReactNode, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Search, MessageCircle, User, LayoutDashboard, Heart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import HustleLogo from "@/components/brand/HustleLogo";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useSlidingPill } from "@/hooks/useSlidingPill";

interface LayoutProps {
  children: ReactNode;
  /** Hide all app chrome (header, bottom nav, footer). Used by focused tools like the dashboard. */
  hideNav?: boolean;
  hideFooter?: boolean;
  /** Content width on larger screens. */
  width?: "narrow" | "medium" | "wide";
}

const widths = {
  narrow: "max-w-2xl",
  medium: "max-w-4xl",
  wide: "max-w-6xl",
};

const Layout = ({ children, hideNav = false, hideFooter = false, width = "narrow" }: LayoutProps) => {
  const { user, profile, isApprovedHustler } = useAuth();
  const navigate = useNavigate();
  const desktopNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const desktopPill = useSlidingPill(desktopNavRef, '[aria-current="page"]', [user?.id, isApprovedHustler]);
  const mobilePill = useSlidingPill(mobileNavRef, '[aria-current="page"]', [user?.id, isApprovedHustler]);

  if (hideNav) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 w-full max-w-4xl mx-auto">{children}</main>
      </div>
    );
  }

  const mobileItems = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/browse", label: "Browse", icon: Search },
    ...(isApprovedHustler ? [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    { to: "/messages", label: "Messages", icon: MessageCircle },
    { to: "/profile", label: "Profile", icon: User },
  ];

  const desktopItems = [
    { to: "/browse", label: "Browse" },
    ...(user ? [{ to: "/my-bookings", label: "Bookings" }, { to: "/messages", label: "Messages" }] : []),
    ...(isApprovedHustler
      ? [{ to: "/dashboard", label: "Dashboard" }]
      : [{ to: "/become-hustler", label: "Become a Hustler" }]),
  ];

  const initials = (profile?.full_name || user?.email || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop header: floating glass bar with a gliding pill nav */}
      <header className="hidden md:block sticky top-0 z-50 px-6 pt-4">
        <div className="max-w-6xl mx-auto h-16 px-3 pl-5 flex items-center gap-6 rounded-full glass-panel">
          <Link to="/" aria-label="Hustle home" className="shrink-0">
            <HustleLogo size="sm" />
          </Link>
          <nav ref={desktopNavRef} className="pill-track relative flex items-center gap-0.5 p-1 rounded-full mx-auto">
            <span aria-hidden className="pill-indicator absolute left-0 top-0 rounded-full" style={desktopPill} />
            {desktopItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="relative z-10 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300"
                activeClassName="!text-primary-foreground"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <Link
                to="/favorites"
                className="w-10 h-10 rounded-full glass-chip flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Saved hustlers"
              >
                <Heart className="w-[18px] h-[18px]" />
              </Link>
            )}
            <ThemeToggle className="w-10 h-10 glass-chip" />
            {user ? (
              <Link
                to="/profile"
                className="ml-1 w-10 h-10 rounded-full glass-chip overflow-hidden flex items-center justify-center text-xs font-semibold"
                aria-label="Your profile"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </Link>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate("/auth")}>
                  Sign in
                </Button>
                <Button size="sm" className="rounded-full" onClick={() => navigate("/auth?mode=signup")}>
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={cn("flex-1 w-full mx-auto", widths[width])}>{children}</main>

      {!hideFooter && <Footer />}

      {/* Spacer so the fixed mobile nav never covers the footer */}
      <div className="h-24 md:hidden" aria-hidden="true" />

      {/* Mobile: floating glass dock with a gliding pill */}
      <nav className="md:hidden fixed bottom-3 left-0 right-0 z-50 px-4 pb-safe pointer-events-none">
        <div
          ref={mobileNavRef}
          className="relative max-w-md mx-auto flex items-center justify-between p-1.5 rounded-full glass-panel pointer-events-auto"
        >
          <span aria-hidden className="pill-indicator absolute left-0 top-0 rounded-full" style={mobilePill} />
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="group relative z-10 flex-1 flex flex-col items-center gap-0.5 py-2 rounded-full transition-colors duration-300 text-muted-foreground"
              activeClassName="!text-primary-foreground"
            >
              <item.icon className="w-5 h-5 transition-transform duration-300 group-aria-[current=page]:scale-110" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
