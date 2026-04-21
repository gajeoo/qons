import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Building2,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  FileSpreadsheet,
  Gavel,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  Map,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TreePalm,
  Users,
  UsersRound,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { APP_NAME } from "@/lib/constants";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { api } from "../../convex/_generated/api";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

// Each nav item maps to a feature for gating
const customerNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard" },
  { href: "/properties", label: "Properties", icon: Building2, feature: "properties" },
  { href: "/staff", label: "Staff Directory", icon: Users, feature: "staff" },
  { href: "/residents", label: "Residents", icon: Home, feature: "residents" },
  { href: "/schedule", label: "Shift Calendar", icon: Calendar, feature: "schedule" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, feature: "tasks" },
  { href: "/time-tracking", label: "Time Tracking", icon: Clock, feature: "time_tracking" },
  { href: "/payroll", label: "Payroll", icon: FileSpreadsheet, feature: "payroll_csv" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, feature: "basic_analytics" },
  { href: "/amenities", label: "Amenities", icon: TreePalm, feature: "amenities" },
  { href: "/hoa", label: "HOA Management", icon: Gavel, feature: "hoa" },
  { href: "/map", label: "Portfolio Map", icon: Map, feature: "map" },
  { href: "/team", label: "Team", icon: UsersRound, feature: "team_management" },
  { href: "/settings", label: "Settings", icon: Settings, feature: "dashboard" },
];

// Worker-specific nav (limited view)
const workerNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, feature: "dashboard" },
  { href: "/schedule", label: "My Shifts", icon: Calendar, feature: "schedule" },
  { href: "/time-tracking", label: "Clock In/Out", icon: Clock, feature: "time_tracking" },
  { href: "/settings", label: "Settings", icon: Settings, feature: "dashboard" },
];

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/leads", label: "Leads", icon: MessageSquare },
  { href: "/admin/chat", label: "Chat Management", icon: MessageSquare },
  { href: "/admin/subscribers", label: "Subscribers", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: UsersRound },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  locked,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  locked?: boolean;
}) {
  const { setOpenMobile } = useSidebar();

  if (locked) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={false} className="opacity-50 cursor-not-allowed">
          <Link to={href} onClick={() => setOpenMobile(false)}>
            <Icon />
            <span className="flex-1">{label}</span>
            <Lock className="size-3 text-muted-foreground" />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link to={href} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarNav() {
  const location = useLocation();
  const isAdmin = useQuery(api.admin.isAdmin);
  const { hasFeature, role, isOnTrial, trialDaysRemaining, planLabel } = useFeatureAccess();

  // Workers see a limited menu
  const navItems = role === "worker" ? workerNavItems : customerNavItems;

  return (
    <SidebarContent className="overflow-y-auto">
      <SidebarGroup>
        <SidebarGroupLabel className="flex items-center justify-between">
          <span>Operations</span>
          {isOnTrial && (
            <Badge variant="outline" className="text-[10px] h-5 border-teal/30 text-teal">
              <Sparkles className="size-2.5 mr-1" /> Trial: {trialDaysRemaining}d
            </Badge>
          )}
          {!isOnTrial && planLabel !== "No Plan" && planLabel !== "Admin" && (
            <Badge variant="outline" className="text-[10px] h-5">
              {planLabel}
            </Badge>
          )}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={location.pathname === item.href}
                locked={!hasFeature(item.feature)}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isAdmin && (
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-1.5">
            <Shield className="size-3" />
            Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={location.pathname === item.href}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>
  );
}

function SidebarUserMenu() {
  const user = useQuery(api.auth.currentUser);
  const { signOut } = useAuthActions();
  const { theme, toggleTheme, switchable } = useTheme();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarFooter className="border-t border-sidebar-border shrink-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium truncate">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="start"
              className="w-[--radix-dropdown-menu-trigger-width]"
            >
              <DropdownMenuItem asChild>
                <Link to="/settings" onClick={() => setOpenMobile(false)}>
                  <Settings className="size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              {switchable && (
                <DropdownMenuItem onClick={toggleTheme}>
                  {theme === "light" ? (
                    <Moon className="size-4" />
                  ) : (
                    <Sun className="size-4" />
                  )}
                  {theme === "light" ? "Dark mode" : "Light mode"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

function SidebarHeaderContent() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarHeader className="border-b border-sidebar-border shrink-0">
      <Link
        to="/"
        onClick={() => setOpenMobile(false)}
        className="flex items-center gap-2.5 px-2 py-1 font-semibold text-lg"
      >
        <div className="size-8 rounded-lg bg-teal flex items-center justify-center">
          <span className="text-white font-bold text-sm">Q</span>
        </div>
        <span>{APP_NAME}</span>
      </Link>
    </SidebarHeader>
  );
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeaderContent />
      <SidebarNav />
      <SidebarUserMenu />
    </Sidebar>
  );
}
