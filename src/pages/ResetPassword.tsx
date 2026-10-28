import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import HustleLogo from "@/components/brand/HustleLogo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Supabase signs the user in from the recovery link, then fires PASSWORD_RECOVERY.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <HustleLogo size="lg" className="mb-8" />
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold">Choose a new password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {ready ? "Enter and confirm your new password." : "Open this page from the link in your reset email."}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { id: "password", label: "New password", value: password, set: setPassword },
            { id: "confirm", label: "Confirm password", value: confirm, set: setConfirm },
          ].map((f) => (
            <div key={f.id} className="space-y-2">
              <Label htmlFor={f.id}>{f.label}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id={f.id}
                  type="password"
                  autoComplete="new-password"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                  disabled={!ready}
                />
              </div>
            </div>
          ))}
          <Button type="submit" className="w-full h-11 rounded-xl" disabled={!ready || saving}>
            {saving ? "Saving..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
