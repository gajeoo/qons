import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileCheck,
  FileSearch,
  FileText,
  FolderOpen,
  Gift,
  Globe,
  Gavel,
  Home,
  Laptop,
  MapPin,
  MessageSquare,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  UserSearch,
  Vote,
  Wrench,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */

interface FeatureCategory {
  id: string;
  category: string;
  categoryIcon: React.ElementType;
  categoryColor: string;
  items: FeatureItem[];
}

interface FeatureItem {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  highlight?: string;
  isNew?: boolean;
}

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const featureCategories: FeatureCategory[] = [
  {
    id: "property-tenant",
    category: "Property & Tenant Management",
    categoryIcon: Building2,
    categoryColor: "text-blue-600 bg-blue-500/10",
    items: [
      {
        id: "multi-property",
        icon: Building2,
        iconColor: "text-blue-600 bg-blue-500/10",
        title: "Multi-Property Dashboard",
        subtitle: "10 buildings or 500 — one command center",
        description:
          "Manage your entire real estate portfolio from a single dashboard. Interactive maps, regional grouping, real-time status, and cross-property staff deployment built for scale.",
        benefits: [
          "Centralized view of all properties and staff",
          "Interactive map with building locations and status",
          "Regional and portfolio grouping",
          "Real-time occupancy and staffing status",
          "Cross-property staff deployment",
          "Building-specific configurations and rules",
        ],
      },
      {
        id: "resident-management",
        icon: Users,
        iconColor: "text-emerald-600 bg-emerald-500/10",
        title: "Resident & Tenant Management",
        subtitle: "Complete tenant lifecycle in one place",
        description:
          "Track tenants from application to move-out. Manage contacts, lease assignments, communication preferences, and unit history with a full audit trail.",
        benefits: [
          "Tenant profiles with contact info and lease details",
          "Unit assignment and move-in/move-out tracking",
          "Communication preferences and messaging",
          "Resident portal for self-service",
          "Amenity access management",
          "Tenant history and notes",
        ],
      },
      {
        id: "amenity-booking",
        icon: Calendar,
        iconColor: "text-teal-600 bg-teal-500/10",
        title: "Amenity Booking",
        subtitle: "Residents book amenities with ease",
        description:
          "Pools, gyms, party rooms, parking spaces — let residents see availability and book directly. Automated approvals, waitlists, and capacity management keep everything running smoothly.",
        benefits: [
          "Self-service booking portal for residents",
          "Availability calendars with real-time updates",
          "Automated approval workflows",
          "Capacity limits and waitlist management",
          "Recurring reservations",
          "Usage analytics for management",
        ],
      },
    ],
  },
  {
    id: "financial",
    category: "Financial Management",
    categoryIcon: DollarSign,
    categoryColor: "text-emerald-600 bg-emerald-500/10",
    items: [
      {
        id: "rent-collection",
        icon: CreditCard,
        iconColor: "text-emerald-600 bg-emerald-500/10",
        title: "Rent Collection & Online Payments",
        subtitle: "Get paid faster, automatically",
        description:
          "Collect rent online with automated reminders, late-fee calculations, and real-time payment tracking. Tenants pay through a simple portal — you see every payment instantly.",
        benefits: [
          "Online payment portal for tenants",
          "Automated rent reminders and late-fee notices",
          "Real-time payment status and history",
          "Partial payment tracking",
          "Recurring payment setup",
          "Payment receipts and confirmations",
        ],
        highlight: "Reduce late payments by up to 40%",
        isNew: true,
      },
      {
        id: "accounting",
        icon: BarChart3,
        iconColor: "text-pink-600 bg-pink-500/10",
        title: "Accounting & Financial Reports",
        subtitle: "Full general ledger, zero spreadsheets",
        description:
          "Complete accounting built for property management — general ledger, income/expense tracking, P&L statements, and owner distributions. Export to QuickBooks or generate reports for tax season.",
        benefits: [
          "General ledger with chart of accounts",
          "Income and expense tracking per property",
          "Profit & Loss statements",
          "Owner distribution calculations",
          "Bank reconciliation",
          "Tax-ready financial reports",
        ],
        isNew: true,
      },
      {
        id: "payroll",
        icon: DollarSign,
        iconColor: "text-violet-600 bg-violet-500/10",
        title: "Payroll Integration",
        subtitle: "Export to ADP, Paychex, QuickBooks — and more",
        description:
          "Stop manually entering hours into your payroll system. Automatically calculate overtime, shift differentials, and compliance adjustments, then export directly to your payroll provider.",
        benefits: [
          "Direct exports to ADP, Paychex, QuickBooks",
          "CSV, Excel, and PDF export options",
          "Auto-calculated overtime and shift differentials",
          "Compliance checks for labor regulations",
          "Payroll preview and approval workflow",
          "Historical payroll data and audit trails",
        ],
      },
      {
        id: "owner-statements",
        icon: FileText,
        iconColor: "text-sky-600 bg-sky-500/10",
        title: "Owner Portal & Statements",
        subtitle: "Keep owners informed, automatically",
        description:
          "Generate professional owner statements with income, expenses, and net distributions. Owners get their own portal to view statements, documents, and property performance.",
        benefits: [
          "Automated monthly/quarterly owner statements",
          "Owner portal with real-time access",
          "Income and expense breakdowns per property",
          "Distribution calculations and tracking",
          "Document sharing with owners",
          "Year-end tax summaries (1099-ready)",
        ],
        isNew: true,
      },
    ],
  },
  {
    id: "operations",
    category: "Operations & Maintenance",
    categoryIcon: Wrench,
    categoryColor: "text-amber-600 bg-amber-500/10",
    items: [
      {
        id: "maintenance",
        icon: Wrench,
        iconColor: "text-amber-600 bg-amber-500/10",
        title: "Maintenance Request System",
        subtitle: "From request to resolution, fully tracked",
        description:
          "Tenants submit maintenance requests through the portal. Assign vendors, set priorities, track progress, and close work orders — all with a full audit trail and photo documentation.",
        benefits: [
          "Tenant self-service request submission",
          "Priority-based assignment and routing",
          "Vendor management and assignment",
          "Photo and document attachments",
          "Status tracking and tenant notifications",
          "Work order history and analytics",
        ],
        highlight: "Resolve requests 50% faster",
        isNew: true,
      },
      {
        id: "lease-management",
        icon: FileCheck,
        iconColor: "text-blue-600 bg-blue-500/10",
        title: "Lease Management & eSignatures",
        subtitle: "Create, track, and renew leases effortlessly",
        description:
          "Manage the full lease lifecycle — from template creation and customization to e-signatures, renewals, and expiration tracking. Never miss a renewal date again.",
        benefits: [
          "Lease templates with custom clauses",
          "E-signature collection",
          "Automated renewal reminders",
          "Expiration tracking and calendar view",
          "Rent escalation scheduling",
          "Lease document version history",
        ],
        isNew: true,
      },
      {
        id: "document-storage",
        icon: FolderOpen,
        iconColor: "text-indigo-600 bg-indigo-500/10",
        title: "Document Storage",
        subtitle: "All your property documents, organized",
        description:
          "Securely store and organize leases, inspection reports, insurance certificates, vendor contracts, and any document tied to your properties. Full-text search and version control included.",
        benefits: [
          "Organized by property, unit, or tenant",
          "Full-text search across all documents",
          "Version control and audit trail",
          "Secure sharing with tenants and owners",
          "Bulk upload and categorization",
          "Automatic lease and insurance document linking",
        ],
        isNew: true,
      },
      {
        id: "tenant-screening",
        icon: UserSearch,
        iconColor: "text-red-600 bg-red-500/10",
        title: "Tenant Screening",
        subtitle: "Screen applicants with confidence",
        description:
          "Run comprehensive background checks, credit reports, and rental history verification directly from the platform. Make informed decisions with a complete applicant profile.",
        benefits: [
          "Credit report and score check",
          "Criminal background check",
          "Eviction history search",
          "Rental history verification",
          "Income and employment verification",
          "Customizable screening criteria",
        ],
        isNew: true,
      },
    ],
  },
  {
    id: "team-scheduling",
    category: "Team & Scheduling",
    categoryIcon: Clock,
    categoryColor: "text-violet-600 bg-violet-500/10",
    items: [
      {
        id: "ai-scheduling",
        icon: Sparkles,
        iconColor: "text-violet-600 bg-violet-500/10",
        title: "AI-Powered Scheduling",
        subtitle: "Fill shifts in seconds, not hours",
        description:
          "Our AI engine analyzes staff availability, certifications, building preferences, proximity, and cost targets to produce optimal schedules automatically. Emergency coverage in seconds.",
        benefits: [
          "Automatic staff-to-property matching based on 6+ criteria",
          "Emergency coverage filled in seconds via smart matching",
          "Overtime optimization to reduce payroll costs",
          "Shift differential calculations built in",
          "Recurring schedule templates with AI refinement",
          "Conflict detection and resolution",
        ],
        highlight: "Save 20-30 hours per week on scheduling alone",
      },
      {
        id: "time-tracking",
        icon: Clock,
        iconColor: "text-orange-600 bg-orange-500/10",
        title: "Time Tracking & GPS Clock-In",
        subtitle: "Built for teams in the field",
        description:
          "GPS-verified clock-in/out, automated timesheets, overtime calculations, and real-time location tracking. Managers get mobile oversight of every property.",
        benefits: [
          "GPS-verified clock-in and clock-out",
          "Real-time push notifications for schedule changes",
          "Mobile time tracking with automatic calculations",
          "Staff self-service for shift swaps and availability",
          "Manager mobile dashboard for on-the-go oversight",
          "Works on any device — no app download required",
        ],
      },
      {
        id: "team-management",
        icon: Users,
        iconColor: "text-cyan-600 bg-cyan-500/10",
        title: "Team & Sub-Accounts",
        subtitle: "Invite, assign, and manage your team",
        description:
          "Invite staff, managers, and workers via invitation links. Sub-accounts auto-link to your subscription with role-based access controls for every level of your organization.",
        benefits: [
          "Invitation link onboarding for new team members",
          "Role-based access control (admin, manager, staff)",
          "Sub-accounts linked to primary subscription",
          "Task delegation and assignment",
          "Shift swap management between staff",
          "Team directory with contact details",
        ],
      },
    ],
  },
  {
    id: "hoa",
    category: "HOA Management",
    categoryIcon: Gavel,
    categoryColor: "text-amber-600 bg-amber-500/10",
    items: [
      {
        id: "hoa-management",
        icon: Gavel,
        iconColor: "text-amber-600 bg-amber-500/10",
        title: "Complete HOA Suite",
        subtitle: "Streamline every aspect of community operations",
        description:
          "Manage violations, board voting, dues collection, architectural review requests, reserve funds, and resident communications — all in one platform designed for HOA boards and managers.",
        benefits: [
          "Violation tracking and automated notices",
          "Board voting and meeting management",
          "Dues collection and payment tracking",
          "Architectural Review Committee (ARC) requests",
          "Reserve fund management and reporting",
          "Resident messaging and announcements",
        ],
      },
    ],
  },
  {
    id: "ai-automation",
    category: "AI & Automation",
    categoryIcon: Bot,
    categoryColor: "text-sky-600 bg-sky-500/10",
    items: [
      {
        id: "automation-engine",
        icon: Zap,
        iconColor: "text-indigo-600 bg-indigo-500/10",
        title: "Automation Engine",
        subtitle: "Set it and forget it",
        description:
          "Build custom automations for repetitive tasks — late-fee notices, lease renewal reminders, maintenance routing, notification triggers, and more. Define rules once, let the system handle the rest.",
        benefits: [
          "Visual automation builder with triggers and actions",
          "Pre-built templates for common workflows",
          "Scheduled and event-based triggers",
          "Multi-step automation chains",
          "Conditional logic and branching",
          "Automation logs and audit trail",
        ],
        highlight: "Automate 80% of routine admin tasks",
      },
      {
        id: "ai-assistant",
        icon: Bot,
        iconColor: "text-sky-600 bg-sky-500/10",
        title: "AI Assistant",
        subtitle: "Ask questions, get instant answers",
        description:
          "Chat with an AI that knows your portfolio. Ask about occupancy rates, overdue rent, upcoming lease expirations, maintenance backlogs — get instant, accurate answers in plain English.",
        benefits: [
          "Natural language queries about your portfolio",
          "Instant summaries and insights",
          "Data-driven recommendations",
          "Automated report generation",
          "Context-aware responses based on your data",
          "Available 24/7 for quick lookups",
        ],
        isNew: true,
      },
      {
        id: "ai-chat-widget",
        icon: MessageSquare,
        iconColor: "text-teal-600 bg-teal-500/10",
        title: "AI Chat Widget & Inbox",
        subtitle: "Instant support for tenants and prospects",
        description:
          "Embed an AI-powered chat widget on your site. Tenants and prospects get instant answers. Your admin inbox captures every conversation for follow-up and escalation.",
        benefits: [
          "Embeddable chat widget for your website",
          "AI-powered responses for common questions",
          "Admin inbox with full conversation history",
          "Escalation to human agents when needed",
          "Customizable widget branding",
          "Lead capture from prospect conversations",
        ],
      },
    ],
  },
  {
    id: "analytics-reporting",
    category: "Analytics & Reporting",
    categoryIcon: BarChart3,
    categoryColor: "text-pink-600 bg-pink-500/10",
    items: [
      {
        id: "analytics",
        icon: BarChart3,
        iconColor: "text-pink-600 bg-pink-500/10",
        title: "Executive Analytics",
        subtitle: "CFO-ready dashboards, not spreadsheet reports",
        description:
          "Real-time dashboards show utilization rates, payroll breakdowns, profitability by property, and operational trends. No more waiting for monthly reports or manually building spreadsheets.",
        benefits: [
          "Real-time utilization rates across your portfolio",
          "Payroll breakdowns by property, region, and department",
          "Profitability analysis per building",
          "Trend tracking and forecasting",
          "Exportable reports for board meetings",
          "Custom KPI dashboards for different roles",
        ],
      },
      {
        id: "notifications",
        icon: Bell,
        iconColor: "text-orange-600 bg-orange-500/10",
        title: "Notification System",
        subtitle: "Stay informed, stay in control",
        description:
          "Configurable notifications for every event that matters — rent payments, maintenance updates, lease expirations, staff schedules, and more. Email, in-app, and push notification channels.",
        benefits: [
          "Customizable notification preferences per user",
          "Email, in-app, and push notification channels",
          "Event-based triggers for all major actions",
          "Digest options (real-time, daily, weekly)",
          "Role-based notification routing",
          "Quiet hours and do-not-disturb settings",
        ],
        isNew: true,
      },
      {
        id: "referral-program",
        icon: Gift,
        iconColor: "text-rose-600 bg-rose-500/10",
        title: "Referral Program",
        subtitle: "Grow your network, earn rewards",
        description:
          "Refer other property managers to the platform and earn rewards. Track referrals, see conversion status, and redeem credits — all from your dashboard.",
        benefits: [
          "Unique referral link per account",
          "Referral tracking and status dashboard",
          "Credit rewards for successful referrals",
          "Automated referral notifications",
          "Tiered rewards for top referrers",
          "Easy sharing via email and social media",
        ],
        isNew: true,
      },
    ],
  },
];

const additionalFeatures = [
  { icon: Shield, text: "Enterprise-grade security and data encryption" },
  { icon: Globe, text: "Cloud-based — access from anywhere" },
  { icon: Clock, text: "99.9% uptime with real-time sync" },
  { icon: Users, text: "Role-based access control" },
  { icon: Bell, text: "Customizable notification preferences" },
  { icon: FileText, text: "Comprehensive audit trails" },
  { icon: Vote, text: "Dedicated onboarding support" },
  { icon: MapPin, text: "Multi-region and multi-timezone" },
  { icon: Laptop, text: "Works on desktop, tablet, and phone" },
  { icon: Smartphone, text: "Mobile-first responsive design" },
  { icon: FileSearch, text: "Full-text search across all data" },
  { icon: Home, text: "Interactive property maps" },
];

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

export function FeaturesPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* ===== HERO ===== */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-500/5 rounded-full blur-3xl" />
        </div>
        <div className="container text-center">
          <p className="text-sm font-medium text-sky-600 mb-3 tracking-wide uppercase">
            Features
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            One Platform for{" "}
            <span className="bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
              Everything
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From rent collection and AI scheduling to HOA management and tenant
            screening, {APP_NAME} replaces your entire toolkit with one
            intelligent, connected platform.
          </p>
        </div>
      </section>

      {/* ===== CATEGORY NAVIGATION ===== */}
      <section className="border-b sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="container">
          <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide">
            {featureCategories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors whitespace-nowrap"
              >
                <cat.categoryIcon className="size-3.5" />
                {cat.category}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE SECTIONS BY CATEGORY ===== */}
      {featureCategories.map((category) => (
        <div key={category.id} id={category.id}>
          {/* Category header */}
          <section className="pt-16 md:pt-24 pb-4">
            <div className="container">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className={`inline-flex size-10 items-center justify-center rounded-xl ${category.categoryColor}`}
                >
                  <category.categoryIcon className="size-5" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {category.category}
                </h2>
              </div>
            </div>
          </section>

          {/* Features in category */}
          {category.items.map((feature, index) => (
            <section
              key={feature.id}
              id={feature.id}
              className={`py-12 md:py-16 ${
                index % 2 === 0 ? "" : "bg-muted/20"
              }`}
            >
              <div className="container">
                <div
                  className={`max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                    index % 2 === 1
                      ? "lg:[&>div:first-child]:order-2"
                      : ""
                  }`}
                >
                  {/* Content */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className={`inline-flex size-12 items-center justify-center rounded-xl ${feature.iconColor}`}
                      >
                        <feature.icon className="size-6" />
                      </div>
                      {feature.isNew && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                          NEW
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sky-600 dark:text-sky-400 font-medium text-sm mb-4">
                      {feature.subtitle}
                    </p>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {feature.description}
                    </p>
                    {feature.highlight && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-sm font-medium mb-4">
                        <Zap className="size-4" />
                        {feature.highlight}
                      </div>
                    )}
                  </div>

                  {/* Benefits */}
                  <div className="bg-card rounded-2xl border p-6 md:p-8">
                    <h4 className="font-semibold text-sm text-muted-foreground mb-4 uppercase tracking-wide">
                      Key Capabilities
                    </h4>
                    <div className="space-y-3">
                      {feature.benefits.map((benefit) => (
                        <div
                          key={benefit}
                          className="flex gap-3 items-start text-sm"
                        >
                          <CheckCircle2 className="size-4 text-sky-500 mt-0.5 shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      ))}

      {/* ===== ADDITIONAL FEATURES ===== */}
      <section className="py-16 md:py-24 border-t">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Plus Everything Else You Need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enterprise features that come standard with every {APP_NAME}{" "}
              account.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {additionalFeatures.map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
              >
                <f.icon className="size-5 text-sky-500 shrink-0" />
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-600 to-violet-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />

        <div className="relative container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
            See {APP_NAME} in Action
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
            Start your free trial today — full access for 14 days. No credit
            card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="text-base h-12 px-8 bg-white text-sky-600 hover:bg-white/90 rounded-xl font-semibold shadow-lg"
              asChild
            >
              <Link to="/signup">
                Start Free Trial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent"
              asChild
            >
              <Link to="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
