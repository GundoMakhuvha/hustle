import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { Camera, Loader2, Moon, Sun, Monitor, Mail } from "lucide-react";
import { TaylorMark } from "@/components/brand/TaylorLogo";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const MAX_AVATAR_MB = 5;

const Settings = () => {
  const { user, profile, isLoading, refreshProfile, isApprovedHustler, hustlerProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [available, setAvailable] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(true);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setEmailUpdates(profile?.email_notifications !== false);
  }, [profile]);

  useEffect(() => {
    setAvailable(hustlerProfile?.is_available ?? true);
  }, [hustlerProfile]);

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth?redirect=/settings" replace />;

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) return toast.error("Name must be at least 2 characters");
    if (phone && !/^[+\d\s()-]{7,20}$/.test(phone)) return toast.error("Enter a valid phone number");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error("Couldn't save your profile");
    await refreshProfile();
    toast.success("Profile updated");
  };

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) return toast.error(`Images must be under ${MAX_AVATAR_MB}MB`);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Photo updated");
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const toggleAvailability = async (next: boolean) => {
    if (!hustlerProfile) return;
    setAvailable(next);
    const { error } = await supabase.from("hustler_profiles").update({ is_available: next }).eq("id", hustlerProfile.id);
    if (error) {
      setAvailable(!next);
      return toast.error("Couldn't update availability");
    }
    await refreshProfile();
    toast.success(next ? "You're now visible as available" : "You're marked as busy");
  };

  const toggleEmailUpdates = async (next: boolean) => {
    setEmailUpdates(next);
    const { error } = await supabase.from("profiles").update({ email_notifications: next }).eq("id", user.id);
    if (error) {
      setEmailUpdates(!next);
      return toast.error("Couldn't update your email preference");
    }
    await refreshProfile();
    toast.success(next ? "Email updates switched on" : "Email updates switched off");
  };

  const initials = (profile?.full_name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <Layout>
      <div className="px-4 sm:px-6 pt-4 md:pt-10 pb-6 space-y-8">
        <PageHeader title="Settings" subtitle="Manage your profile and preferences" backTo="/profile" />

        <section className="space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-foreground text-background overflow-hidden flex items-center justify-center text-xl font-bold group"
              aria-label="Change profile photo"
              disabled={uploading}
            >
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : initials}
              <span className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
              </span>
            </button>
            <div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "Change photo"}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5">JPG or PNG, up to {MAX_AVATAR_MB}MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
            />
          </div>

          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email || ""} disabled className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+27 82 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Shared with hustlers only once you have a confirmed booking.</p>
            </div>
            <Button type="submit" className="rounded-xl h-11 px-6" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </section>

        {isApprovedHustler && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hustler</h2>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary">
              <div>
                <p className="font-medium">Available for bookings</p>
                <p className="text-sm text-muted-foreground">Turn off when you're fully booked or away.</p>
              </div>
              <Switch checked={available} onCheckedChange={toggleAvailability} aria-label="Available for bookings" />
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h2>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary">
            <TaylorMark className="w-10 h-10 shrink-0" animated={false} />
            <div className="flex-1">
              <p className="font-medium flex items-center gap-1.5">
                <Mail className="w-4 h-4" /> Email updates from Taylor
              </p>
              <p className="text-sm text-muted-foreground">
                Booking updates and new messages. Important account and booking emails are always sent.
              </p>
            </div>
            <Switch checked={emailUpdates} onCheckedChange={toggleEmailUpdates} aria-label="Email updates from Taylor" />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h2>
          <div className="grid grid-cols-3 gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-colors",
                  theme === t.value ? "border-foreground bg-secondary" : "border-border hover:bg-secondary",
                )}
                aria-pressed={theme === t.value}
              >
                <t.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Settings;
