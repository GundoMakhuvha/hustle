import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import Home from "./pages/Home";

// Route-level code splitting keeps the first load fast.
const Browse = lazy(() => import("./pages/Browse"));
const Messages = lazy(() => import("./pages/Messages"));
const ChatView = lazy(() => import("./pages/ChatView"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const BecomeHustler = lazy(() => import("./pages/BecomeHustler"));
const Admin = lazy(() => import("./pages/Admin"));
const HustlerDashboard = lazy(() => import("./pages/HustlerDashboard"));
const CustomerBookings = lazy(() => import("./pages/CustomerBookings"));
const Help = lazy(() => import("./pages/Help"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const titles: Record<string, string> = {
  "/": "Hustle — Trusted local services, booked in minutes",
  "/browse": "Browse services · Hustle",
  "/messages": "Messages · Hustle",
  "/profile": "Profile · Hustle",
  "/settings": "Settings · Hustle",
  "/favorites": "Saved hustlers · Hustle",
  "/auth": "Sign in · Hustle",
  "/become-hustler": "Become a Hustler · Hustle",
  "/dashboard": "Dashboard · Hustle",
  "/my-bookings": "My bookings · Hustle",
  "/admin": "Admin · Hustle",
  "/help": "Help & FAQ · Hustle",
  "/terms": "Terms of Service · Hustle",
  "/privacy": "Privacy Policy · Hustle",
};

/** Scroll to top and set the document title on navigation. */
const RouteEffects = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0 });
    document.title = titles[pathname] ?? (pathname.startsWith("/chat") ? "Chat · Hustle" : "Hustle");
  }, [pathname, hash]);
  return null;
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="hustle-theme" disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <RouteEffects />
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/chat/:conversationId" element={<ChatView />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/become-hustler" element={<BecomeHustler />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/dashboard" element={<HustlerDashboard />} />
                <Route path="/my-bookings" element={<CustomerBookings />} />
                <Route path="/help" element={<Help />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
