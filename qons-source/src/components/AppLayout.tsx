import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { AiAssistant } from "./AiAssistant";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "./ui/sidebar";

export function AppLayout() {
  const { hasAccess, isLoading, currentPlan, role, isSubAccount } =
    useFeatureAccess();
  const location = useLocation();

  // Wait until feature access is loaded
  if (isLoading) {
    return null;
  }

  // If no access, redirect to account-paused page
  // Admins are exempt — they always have access
  // Allow settings page for independent users to manage their account
  // Sub-accounts don't get settings exemption (they can't subscribe themselves)
  if (
    !hasAccess &&
    currentPlan === "none" &&
    role !== "admin" &&
    (isSubAccount || location.pathname !== "/settings")
  ) {
    return <Navigate to="/account-paused" replace />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center px-4 md:hidden">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <AiAssistant />
    </SidebarProvider>
  );
}
