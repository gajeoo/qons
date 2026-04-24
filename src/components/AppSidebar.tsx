import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import {
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  ChevronDown,
  CheckSquare,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gavel,
  Gift,
  Home,
  LayoutDashboard,
  Lock,
  LogOut,
  Map as MapIcon,
  MessageSquare,
  Moon,
  Settings,
  Shield,
  Sparkles,
  Sun,
  TreePalm,
  UserSearch,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { APP_NAME } from "@/lib/constants";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";

/* ------------------------------------------------------------------
   NAV ITEM DEFINITIONS
   ------------------------------------------------------------------ */

interface NavEntry {
  type: "link";
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  feature: string;
  primaryOnly?: boolean;
}

interface NavDivider {
  type: "divider";
  label: string;
}

type NavItem = NavEntry | NavDivider;

const primaryNavItems: NavItem[] = [
  // — Dashboard (no divider above first item)
  {
    type: "link",
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    feature: "dashboard",
  },

  // — Management
  { type: "divider", label: "Management" },
  {
    type: "link",
    href: "/properties",
    label: "Properties",
    icon: Building2,
    feature: "properties",
  },
  {
    type: "link",
    href: "/residents",
    label: "Residents",
    icon: Home,
    feature: "residents",
  },
  {
    type: "link",
    href: "/staff",
    label: "Staff Directory",
    icon: Users,
    feature: "staff",
  },
  {
    type: "link",
    href: "/leases",
    label: "Leases",
    icon: FileText,
    feature: "leases",
  },

  // — Financial
  { type: "divider", label: "Financial" },
  {
    type: "link",
    href: "/rent",
    label: "Rent Collection",
    icon: DollarSign,
    feature: "rent_collection",
  },
  {
    type: "link",
    href: "/accounting",
    label: "Accounting",
    icon: Wallet,
    feature: "accounting",
  },
  {
    type: "link",
    href: "/payroll",
    label: "Payroll",
    icon: FileSpreadsheet,
    feature: "payroll_csv",
  },

  // — Operations
  { type: "divider", label: "Operations" },
  {
    type: "link",
    href: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    feature: "maintenance",
  },
  {
    type: "link",
    href: "/tasks",
    label: "Tasks",
    icon: CheckSquare,
    feature: "tasks",
  },
  {
    type: "link",
    href: "/automations",
    label: "Automations",
    icon: Bot,
    feature: "automations",
  },
  {
    type: "link",
    href: "/schedule",
    label: "Shift Calendar",
    icon: Calendar,
    feature: "schedule",
  },
  {
    type: "link",
    href: "/time-tracking",
    label: "Time Tracking",
    icon: Clock,
    feature: "time_tracking",
  },

  // — HOA & Amenities
  { type: "divider", label: "HOA & Amenities" },
  {
    type: "link",
    href: "/hoa",
    label: "HOA Management",
    icon: Gavel,
    feature: "hoa",
  },
  {
    type: "link",
    href: "/amenities",
    label: "Amenities",
    icon: TreePalm,
    feature: "amenities",
  },

  // — Communications
  { type: "divider", label: "Communications" },
  {
    type: "link",
    href: "/messaging",
    label: "Send Messages",
    icon: MessageSquare,
    feature: "notifications",
  },
  {
    type: "link",
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    feature: "notifications",
  },
  {
    type: "link",
    href: "/applications",
    label: "Applications",
    icon: UserSearch,
    feature: "tenant_screening",
  },
  {
    type: "link",
    href: "/templates",
    label: "Templates",
    icon: FileText,
    feature: "documents",
  },

  // — Tools & Reports
  { type: "divider", label: "Tools & Reports" },
  {
    type: "link",
    href: "/tenant-screening",
    label: "Tenant Screening",
    icon: UserSearch,
    feature: "tenant_screening",
  },
  {
    type: "link",
    href: "/documents",
    label: "Documents",
    icon: FolderOpen,
    feature: "documents",
  },
  {
    type: "link",
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    feature: "basic_analytics",
  },
  {
    type: "link",
    href: "/map",
    label: "Portfolio Map",
    icon: MapIcon,
    feature: "map",
  },

  // — Account
  { type: "divider", label: "Account" },
  {
    type: "link",
    href: "/team",
    label: "Team",
    icon: UsersRound,
    feature: "team_management",
  },
  {
    type: "link",
    href: "/referrals",
    label: "Referrals",
    icon: Gift,
    feature: "referrals",
  },
  {
    type: "link",
    href: "/pricing",
    label: "Billing & Plan",
    icon: CreditCard,
    feature: "billing_management",
    primaryOnly: true,
  },
  {
    type: "link",
    href: "/settings",
    label: "Settings",
    icon: Settings,
    feature: "settings",
  },
];

const workerNavItems: NavItem[] = [
  {
    type: "link",
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    feature: "dashboard",
  },
  { type: "divider", label: "My Work" },
  {
    type: "link",
    href: "/schedule",
    label: "My Shifts",
    icon: Calendar,
    feature: "schedule",
  },
  {
    type: "link",
    href: "/time-tracking",
    label: "Clock In/Out",
    icon: Clock,
    feature: "time_tracking",
  },
  {
    type: "link",
    href: "/tasks",
    label: "My Tasks",
    icon: CheckSquare,
    feature: "tasks",
  },
  {
    type: "link",
    href: "/maintenance",
    label: "Maintenance",
    icon: Wrench,
    feature: "maintenance",
  },
  { type: "divider", label: "Other" },
  {
    type: "link",
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    feature: "notifications",
  },
  {
    type: "link",
    href: "/settings",
    label: "Settings",
    icon: Settings,
    feature: "settings",
  },
];

const tenantNavItems: NavItem[] = [
  {
    type: "link",
    href: "/tenant-portal",
    label: "My Portal",
    icon: Home,
    feature: "dashboard",
  },
  { type: "divider", label: "My Tenancy" },
  {
    type: "link",
    href: "/rent",
    label: "Pay Rent",
    icon: DollarSign,
    feature: "rent_collection",
  },
  {
    type: "link",
    href: "/maintenance",
    label: "Report Issue",
    icon: Wrench,
    feature: "maintenance",
  },
  {
    type: "link",
    href: "/leases",
    label: "My Lease",
    icon: FileText,
    feature: "leases",
  },
  {
    type: "link",
    href: "/documents",
    label: "Documents",
    icon: FolderOpen,
    feature: "documents",
  },
  { type: "divider", label: "Other" },
  {
    type: "link",
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    feature: "notifications",
  },
  {
    type: "link",
    href: "/settings",
    label: "Settings",
    icon: Settings,
    feature: "settings",
  },
];

const maintenanceNavItems: NavItem[] = [
  {
    type: "link",
    href: "/maintenance-portal",
    label: "My Portal",
    icon: Wrench,
    feature: "dashboard",
  },
  { type: "divider", label: "Work" },
  {
    type: "link",
    href: "/maintenance",
    label: "Repair Requests",
    icon: Wrench,
    feature: "maintenance",
  },
  {
    type: "link",
    href: "/tasks",
    label: "Tasks",
    icon: CheckSquare,
    feature: "tasks",
  },
  {
    type: "link",
    href: "/schedule",
    label: "Schedule",
    icon: Calendar,
    feature: "schedule",
  },
  {
    type: "link",
    href: "/time-tracking",
    label: "Time Tracking",
    icon: Clock,
    feature: "time_tracking",
  },
  { type: "divider", label: "Other" },
  {
    type: "link",
    href: "/documents",
    label: "Documents",
    icon: FolderOpen,
    feature: "documents",
  },
  {
    type: "link",
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    feature: "notifications",
  },
  {
    type: "link",
    href: "/settings",
    label: "Settings",
    icon: Settings,
    feature: "settings",
  },
];

const adminNavItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/leads", label: "Leads", icon: MessageSquare },
  { href: "/admin/chat", label: "Chat", icon: MessageSquare },
  { href: "/admin/subscribers", label: "Subscribers", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: UsersRound },
];

/* ------------------------------------------------------------------
   NAV LINK COMPONENT
   ------------------------------------------------------------------ */

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  locked,
  requiredPlan,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  locked?: boolean;
  requiredPlan?: string;
}) {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={!locked && isActive}
        className={locked ? "opacity-50" : undefined}
        tooltip={
          locked && requiredPlan ? `Requires ${requiredPlan}` : undefined
        }
      >
        <Link to={href} onClick={() => setOpenMobile(false)}>
          <Icon className="size-4 shrink-0" />
          <span className="truncate">{label}</span>
          {locked && (
            <Lock className="size-3 ml-auto shrink-0 text-muted-foreground" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/* ------------------------------------------------------------------
   SIDEBAR NAV – FLAT LIST WITH INLINE DIVIDERS
   ------------------------------------------------------------------ */

function SidebarNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();
  const isAdmin = useQuery(api.admin.isAdmin);
  const {
    hasFeature,
    role,
    isOnTrial,
    trialDaysRemaining,
    planLabel,
    isSubAccount,
    getRequiredPlan,
  } = useFeatureAccess();

  // Pick the right item set based on role
  let items: NavItem[] = primaryNavItems;
  if (role === "worker") items = workerNavItems;
  else if (role === "tenant") items = tenantNavItems;
  else if (role === "maintenance") items = maintenanceNavItems;

  // Sub-accounts: remove billing
  if (isSubAccount) {
    items = items.filter(item => {
      if (item.type === "link" && item.primaryOnly) return false;
      return true;
    });
  }

  return (
    <SidebarContent>
      {/* Trial / plan badge */}
      {(isOnTrial || (planLabel !== "No Plan" && planLabel !== "Admin")) && (
        <div className="px-4 pt-2 pb-0">
          {isOnTrial ? (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-teal/30 text-teal"
            >
              <Sparkles className="size-2.5 mr-1" /> Trial: {trialDaysRemaining}
              d left
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] h-5">
              {planLabel}
            </Badge>
          )}
        </div>
      )}

      {/* Single flat menu — no nested groups */}
      <SidebarMenu className="px-2 pb-2 pt-1 gap-0.5">
        {items.map(item => {
          if (item.type === "divider") {
            return (
              <SidebarMenuItem key={`divider-${item.label}`}>
                <div className="px-2 mt-5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none leading-tight">
                  {item.label}
                </div>
              </SidebarMenuItem>
            );
          }

          const locked = !hasFeature(item.feature);
          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              isActive={location.pathname === item.href}
              locked={locked}
              requiredPlan={locked ? getRequiredPlan(item.feature) : undefined}
            />
          );
        })}
      </SidebarMenu>

      {/* Admin section */}
      {isAdmin && (
        <SidebarMenu className="px-2 pb-2 gap-0.5">
          <SidebarMenuItem>
            <div className="px-2 mt-5 mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none leading-tight">
              <Shield className="size-3" />
              Admin
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  isActive={adminNavItems.some(item => location.pathname === item.href)}
                  tooltip="Admin-only tools"
                >
                  <Shield className="size-4 shrink-0" />
                  <span className="truncate">Admin Tools</span>
                  <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="right" className="w-56">
                {adminNavItems.map(item => {
                  const Icon = item.icon;

                  return (
                    <DropdownMenuItem asChild key={item.href}>
                      <Link to={item.href} onClick={() => setOpenMobile(false)}>
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      )}
    </SidebarContent>
  );
}

/* ------------------------------------------------------------------
   USER MENU FOOTER
   ------------------------------------------------------------------ */

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
                <div className="flex flex-col items-start text-left min-w-0">
                  <span className="text-sm font-medium truncate max-w-full">
                    {user?.name || "User"}
                  </span>
                  <span className="text-xs text-muted-foreground truncate max-w-full">
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

/* ------------------------------------------------------------------
   HEADER
   ------------------------------------------------------------------ */

function SidebarHeaderContent() {
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarHeader className="border-b border-sidebar-border shrink-0">
      <Link
        to="/"
        onClick={() => setOpenMobile(false)}
        className="flex items-center gap-2.5 px-2 py-1 font-semibold text-lg"
      >
        <div className="size-8 rounded-lg bg-teal flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">Q</span>
        </div>
        <span>{APP_NAME}</span>
      </Link>
    </SidebarHeader>
  );
}

/* ------------------------------------------------------------------
   EXPORT
   ------------------------------------------------------------------ */

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeaderContent />
      <SidebarNav />
      <SidebarUserMenu />
    </Sidebar>
  );
}
