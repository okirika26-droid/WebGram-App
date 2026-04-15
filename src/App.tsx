import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DarkModeProvider } from "@/contexts/DarkModeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import BottomTabBar from "@/components/BottomTabBar";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import SearchPage from "@/pages/SearchPage";
import CreatePage from "@/pages/CreatePage";
import ProfilePage from "@/pages/ProfilePage";
import EditProfilePage from "@/pages/EditProfilePage";
import UserProfilePage from "@/pages/UserProfilePage";
import MessagesPage from "@/pages/MessagesPage";
import ChatPage from "@/pages/ChatPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/not-found";
import { CallProvider } from "@/contexts/CallContext";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { getUserProfile } from "@/lib/firestore";

const queryClient = new QueryClient();

function NotificationManager() {
  useMessageNotifications();
  return null;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (location === "/edit-profile") {
      setOnboardingChecked(true);
      return;
    }
    
    // التعديل هنا باش الـ TypeScript ما يبقاش يوقف الـ Build
    getUserProfile(user.uid).then((profile: any) => {
      const done = (profile as Record<string, unknown> | null)?.onboardingDone as boolean | undefined;
      if (!done) {
        navigate("/edit-profile");
      }
      setOnboardingChecked(true);
    });
  }, [user, location, navigate]);

  if (loading || (user && !onboardingChecked && location !== "/edit-profile")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (location === "/edit-profile") {
    return (
      <ErrorBoundary>
        <EditProfilePage />
      </ErrorBoundary>
    );
  }

  return (
    <CallProvider>
      <NotificationManager />
      <div className="min-h-screen bg-background text-foreground">
        <Navbar navigate={navigate} />
        <ErrorBoundary>
          <Switch>
            <Route path="/" component={() => <HomePage navigate={navigate} />} />
            <Route path="/search" component={() => <SearchPage navigate={navigate} />} />
            <Route path="/create" component={CreatePage} />
            <Route path="/messages" component={() => <MessagesPage navigate={navigate} />} />
            <Route path="/chat/:chatId" component={() => <ChatPage navigate={navigate} />} />
            <Route path="/profile" component={ProfilePage} />
            <Route path="/profile/:uid" component={() => <UserProfilePage navigate={navigate} />} />
            <Route path="/settings" component={() => <SettingsPage navigate={navigate} />} />
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
        <BottomTabBar navigate={navigate} />
      </div>
    </CallProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DarkModeProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </DarkModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
