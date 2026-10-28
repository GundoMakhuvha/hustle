import { useState } from "react";
import { useNavigate, Link, Navigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, ShieldCheck, Star, CreditCard } from "lucide-react";
import HustleLogo, { HustleMark } from "@/components/brand/HustleLogo";
import TaylorBadge from "@/components/brand/TaylorLogo";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/config/site";
import { authHeroImage } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type AuthMode = "signin" | "signup" | "forgot";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const safeRedirect = (r: string | null) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/");

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [params] = useSearchParams();
  const redirectTo = safeRedirect(params.get("redirect"));
  const [mode, setMode] = useState<AuthMode>(params.get("mode") === "signup" ? "signup" : "signin");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // Redirect if already logged in
  if (user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      if (mode === "forgot") {
        const parsed = z.string().email("Invalid email address").safeParse(formData.email);
        if (!parsed.success) {
          setErrors({ email: parsed.error.errors[0].message });
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) toast.error(error.message);
        else {
          toast.success("Check your inbox for a password reset link.");
          setMode("signin");
        }
        return;
      }

      if (mode === "signup") {
        const result = signUpSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Please sign in.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! Check your email to confirm your address.");
          navigate(redirectTo);
        }
      } else {
        const result = signInSchema.safeParse(formData);
        if (!result.success) {
          const fieldErrors: Record<string, string> = {};
          result.error.errors.forEach(err => {
            if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
          });
          setErrors(fieldErrors);
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Invalid email or password.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          navigate(redirectTo);
        }
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle(redirectTo);
    if (error) {
      toast.error(error.message.includes("provider is not enabled")
        ? "Google sign-in isn't switched on yet."
        : error.message);
      setGoogleLoading(false);
    }
    // On success the browser is redirected to Google, so there's nothing else to do here.
  };

  const titles: Record<AuthMode, [string, string]> = {
    signin: ["Welcome back", "Sign in to continue to Hustle"],
    signup: ["Create your account", "Book trusted hustlers — or become one"],
    forgot: ["Reset your password", "We'll email you a secure reset link"],
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel (desktop) */}
      <aside className="hidden lg:flex relative overflow-hidden bg-foreground text-background p-12 flex-col justify-between">
        <img src={authHeroImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/70 to-foreground/30" />
        <Link to="/" className="relative">
          <span className="inline-flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-background text-foreground flex items-center justify-center">
              <HustleMark className="w-6 h-6" />
            </span>
            <span className="text-xl font-extrabold">Hustle</span>
          </span>
        </Link>
        <div className="relative space-y-6 max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight">{SITE.tagline}</h2>
          <ul className="space-y-3 text-sm opacity-85">
            <li className="flex items-center gap-3"><ShieldCheck className="w-5 h-5" /> Every hustler is ID and police-clearance checked</li>
            <li className="flex items-center gap-3"><CreditCard className="w-5 h-5" /> Secure card payments through Stripe</li>
            <li className="flex items-center gap-3"><Star className="w-5 h-5" /> Honest reviews from real bookings</li>
          </ul>
        </div>
        <p className="relative text-xs opacity-60">© {new Date().getFullYear()} {SITE.company}</p>
      </aside>

      <div className="flex flex-col">
        <div className="px-6 pt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Hustle
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
          <div className="lg:hidden mb-8">
            <HustleLogo size="lg" />
          </div>

          <div className="w-full max-w-sm space-y-6">
            <div className="text-center lg:text-left">
              <h1 className="text-2xl font-bold text-foreground">{titles[mode][0]}</h1>
              <p className="text-sm text-muted-foreground mt-1">{titles[mode][1]}</p>
            </div>

            {mode !== "forgot" && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11 rounded-xl gap-3 font-medium"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                >
                  <GoogleIcon />
                  {googleLoading ? "Opening Google…" : "Continue with Google"}
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or with email
                  <span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="Enter your name"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10 h-11 rounded-xl"
                    />
                  </div>
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 h-11 rounded-xl"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setErrors({});
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      placeholder={mode === "signup" ? "At least 6 characters" : "Enter your password"}
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10 pr-10 h-11 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              )}

              <Button type="submit" className="w-full h-11 rounded-xl" disabled={isLoading}>
                {isLoading
                  ? "Please wait..."
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </Button>

              {mode === "signup" && (
                <p className="text-xs text-muted-foreground text-center">
                  By creating an account you agree to our{" "}
                  <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
                  <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                </p>
              )}
            </form>

            <div className="text-center text-sm">
              {mode === "forgot" ? (
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-foreground hover:underline font-medium"
                >
                  Back to sign in
                </button>
              ) : (
                <>
                  <span className="text-muted-foreground">
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setErrors({});
                    }}
                    className="text-foreground hover:underline font-semibold"
                  >
                    {mode === "signin" ? "Sign up" : "Sign in"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pb-8">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Continue as guest
          </Link>
          <TaylorBadge href={SITE.taylor.url} />
        </div>
      </div>
    </div>
  );
};

export default Auth;
