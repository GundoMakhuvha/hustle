import { useNavigate } from "react-router-dom";
import {
  Settings, Heart, Calendar, ChevronRight, LogOut, Briefcase, Shield, HelpCircle, FileText,
  LayoutDashboard, MessageCircle, Lock, type LucideIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  approved: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  rejected: "bg-destructive/15 text-destructive",
};

type MenuItem = { icon: LucideIcon; label: string; path: string; auth?: boolean; badge?: number };

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, isHustler, isAdmin, isApprovedHustler, hustlerProfile, signOut } = useAuth();
  const { favorites } = useFavorites();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const accountItems: MenuItem[] = [
    { icon: Calendar, label: "My bookings", path: "/my-bookings", auth: true },
    { icon: MessageCircle, label: "Messages", path: "/messages", auth: true },
    { icon: Heart, label: "Saved hustlers", path: "/favorites", badge: favorites.length || undefined },
    { icon: Settings, label: "Account settings", path: "/settings", auth: true },
  ];

  const supportItems: MenuItem[] = [
    { icon: HelpCircle, label: "Help & FAQ", path: "/help" },
    { icon: FileText, label: "Terms of Service", path: "/terms" },
    { icon: Lock, label: "Privacy Policy", path: "/privacy" },
  ];

  const initials = (profile?.full_name || "G")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const renderGroup = (title: string, items: MenuItem[]) => (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{title}</h2>
      <div className="rounded-2xl bg-secondary overflow-hidden divide-y divide-border">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.auth && !user ? `/auth?redirect=${item.path}` : item.path)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.badge ? (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-foreground text-background text-xs font-semibold flex items-center justify-center">
                  {item.badge}
                </span>
              ) : null}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-3xl font-bold text-foreground">Profile</h1>
          <ThemeToggle className="md:hidden" />
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-4 p-5 bg-secondary rounded-2xl">
          <div className="w-16 h-16 bg-foreground text-background rounded-full flex items-center justify-center overflow-hidden text-lg font-bold shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-lg text-foreground truncate">{profile?.full_name || "Guest"}</h2>
            <p className="text-sm text-muted-foreground truncate">
              {user ? user.email : "Sign in to book, chat and save hustlers"}
            </p>
            {isHustler && hustlerProfile && (
              <span
                className={cn(
                  "inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full capitalize",
                  statusStyles[hustlerProfile.status],
                )}
              >
                Hustler · {hustlerProfile.status}
              </span>
            )}
          </div>
          {user && (
            <Button variant="outline" size="sm" className="rounded-full shrink-0" onClick={() => navigate("/settings")}>
              Edit
            </Button>
          )}
        </div>

        {/* Hustler dashboard shortcut */}
        {isApprovedHustler && (
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-4 p-4 bg-foreground text-background rounded-2xl"
          >
            <div className="w-12 h-12 bg-background/15 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">Hustler dashboard</h3>
              <p className="text-sm opacity-70">Services, bookings, earnings and reviews</p>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70" />
          </button>
        )}

        {/* Become a Hustler CTA */}
        {!isHustler && (
          <button
            onClick={() => navigate(user ? "/become-hustler" : "/auth?mode=signup&redirect=/become-hustler")}
            className="w-full flex items-center gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/15 hover:bg-primary/10 transition-colors"
          >
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">Become a Hustler</h3>
              <p className="text-sm text-muted-foreground">Start earning by offering your services</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {/* Admin Panel Link */}
        {isAdmin && (
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-4 p-4 bg-destructive/10 rounded-2xl border border-destructive/20"
          >
            <div className="w-12 h-12 bg-destructive rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive-foreground" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-foreground">Admin panel</h3>
              <p className="text-sm text-muted-foreground">Review hustler applications</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        {renderGroup("Account", accountItems)}
        {renderGroup("Support", supportItems)}

        {/* Auth Actions */}
        {user ? (
          <Button variant="outline" className="w-full h-11 rounded-xl" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate("/auth")}>
              Sign in
            </Button>
            <Button className="h-11 rounded-xl" onClick={() => navigate("/auth?mode=signup")}>
              Create account
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
