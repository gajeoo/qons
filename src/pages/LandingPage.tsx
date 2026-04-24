import { useConvexAuth, useQuery } from "convex/react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  FileText,
  Gavel,
  Layers,
  Play,
  Shield,
  Sparkles,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

type PricingPlanSummary = {
  plan: "starter" | "pro" | "enterprise";
  name: string;
  monthlyPrice: number;
  annualPrice?: number;
  unitLimit?: string;
  subAccountLimit?: string;
  description?: string;
};

/* ------------------------------------------------------------------ */
/*  DATA                                                               */
/* ------------------------------------------------------------------ */

const trustBadges = [
  "No credit card required",
  "14-day free trial",
  "Cancel anytime",
];

const stats = [
  { value: "500+", label: "Properties Managed" },
  { value: "50+", label: "Property Managers Trust Us" },
  { value: "99.9%", label: "Platform Uptime" },
  { value: "$2M+", label: "Rent Collected" },
];

const featureHighlights = [
  {
    icon: CreditCard,
    title: "Rent Collection & Online Payments",
    description:
      "Collect rent online with automated reminders, late-fee tracking, and real-time payment status across every unit.",
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-600",
  },
  {
    icon: Sparkles,
    title: "AI-Powered Scheduling",
    description:
      "Automatically match staff to shifts based on availability, certifications, proximity, and cost targets in seconds.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600",
  },
  {
    icon: FileText,
    title: "Lease Management",
    description:
      "Create, track, and renew leases with built-in e-signature support, automated renewal reminders, and document templates.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Accounting & Financial Reports",
    description:
      "Full general ledger, income/expense tracking, P&L statements, and owner distributions — all in one place.",
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-600",
  },
  {
    icon: Wrench,
    title: "Maintenance Request System",
    description:
      "Tenants submit requests online. Assign vendors, track progress, and close work orders with full audit trails.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600",
  },
  {
    icon: Gavel,
    title: "HOA Management Suite",
    description:
      "Violations, board voting, dues collection, ARC requests, reserve funds, and resident communications in one platform.",
    gradient: "from-teal-500/20 to-cyan-500/20",
    iconColor: "text-teal-600",
  },
  {
    icon: Zap,
    title: "Automation Engine",
    description:
      "Automate repetitive tasks — late-fee notices, lease renewals, maintenance routing, and custom workflows you define.",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-600",
  },
  {
    icon: Bot,
    title: "AI Assistant",
    description:
      "Ask questions about your portfolio in plain English. Get instant answers, summaries, and actionable insights.",
    gradient: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-600",
  },
];

const howItWorks = [
  {
    step: "01",
    icon: Users,
    title: "Sign Up",
    description:
      "Create your account in under a minute. No credit card required — your 14-day free trial starts immediately with full access.",
  },
  {
    step: "02",
    icon: Building2,
    title: "Set Up Properties",
    description:
      "Add your buildings, units, tenants, and staff. Import data or start fresh — our onboarding wizard walks you through everything.",
  },
  {
    step: "03",
    icon: Layers,
    title: "Manage Everything",
    description:
      "Run your entire operation from one dashboard — rent, leases, maintenance, scheduling, accounting, and more. Scale without limits.",
  },
];

const comparisonRows = [
  { feature: "Unlimited properties", qons: true, others: false },
  { feature: "AI-powered scheduling", qons: true, others: false },
  { feature: "Built-in HOA management", qons: true, others: false },
  { feature: "Online rent collection", qons: true, others: true },
  { feature: "Automation engine", qons: true, others: false },
  { feature: "AI assistant", qons: true, others: false },
  { feature: "Maintenance workflows", qons: true, others: true },
  { feature: "Affordable all-in-one pricing", qons: true, others: false },
];

const testimonials = [
  {
    quote:
      "QonsApp streamlined our entire operation. We went from juggling five tools to one dashboard that does everything.",
    name: "Sarah K.",
    title: "Property Manager, 120 Units",
  },
  {
    quote:
      "The automation features save us hours every week. Late-fee notices, lease renewals — it all just happens.",
    name: "Michael R.",
    title: "HOA Board Member",
  },
  {
    quote:
      "Finally, an affordable all-in-one solution. The AI scheduling alone paid for itself in the first month.",
    name: "David L.",
    title: "Independent Landlord",
  },
];

const pricingTiers = [
  {
    plan: "starter" as const,
    name: "Starter",
    price: 45.99,
    description: "For small portfolios",
    features: [
      "Up to 50 units",
      "Property & resident management",
      "Task management",
      "Amenity booking",
      "Email support",
    ],
  },
  {
    plan: "pro" as const,
    name: "Professional",
    price: 95.99,
    popular: true,
    description: "For growing teams",
    features: [
      "Up to 200 units",
      "Everything in Starter",
      "AI scheduling & automations",
      "Rent collection & accounting",
      "HOA management suite",
    ],
  },
  {
    plan: "enterprise" as const,
    name: "Business",
    price: 140.99,
    description: "For large operations",
    features: [
      "Unlimited units",
      "Everything in Professional",
      "Tenant screening",
      "API access & white-label",
      "Dedicated account manager",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

/**
 * Animated product demo — cycles through app screens automatically.
 * CSS-only animation with no external dependencies.
 */
function DemoVideo() {
  const [activeScreen, setActiveScreen] = useState(0);
  const sidebarItems = [
    "Dashboard",
    "Properties",
    "Residents",
    "Rent",
    "Maintenance",
    "Leases",
    "Accounting",
    "Analytics",
  ];

  const screens = [
    {
      title: "Dashboard",
      url: "app.quonsapp.com/dashboard",
      stats: [
        { label: "Properties", value: "24", color: "text-sky-400" },
        { label: "Occupancy", value: "94%", color: "text-emerald-400" },
        { label: "Revenue", value: "$47.2K", color: "text-amber-400" },
        { label: "Tasks", value: "12", color: "text-violet-400" },
      ],
      rows: [
        {
          text: "Rent payment received — Unit 4B",
          badge: "$1,450",
          cls: "bg-emerald-500/20 text-emerald-400",
        },
        {
          text: "Maintenance — Plumbing issue",
          badge: "Urgent",
          cls: "bg-red-500/20 text-red-400",
        },
        {
          text: "Lease renewal — Sarah J.",
          badge: "Pending",
          cls: "bg-amber-500/20 text-amber-400",
        },
        {
          text: "New tenant application",
          badge: "Review",
          cls: "bg-sky-500/20 text-sky-400",
        },
      ],
    },
    {
      title: "Rent Collection",
      url: "app.quonsapp.com/rent",
      stats: [
        { label: "Collected", value: "$38.4K", color: "text-emerald-400" },
        { label: "Pending", value: "$8.8K", color: "text-amber-400" },
        { label: "Overdue", value: "$2.1K", color: "text-red-400" },
        { label: "Rate", value: "96%", color: "text-sky-400" },
      ],
      rows: [
        {
          text: "Unit 4B — John M. paid",
          badge: "$1,450",
          cls: "bg-emerald-500/20 text-emerald-400",
        },
        {
          text: "Unit 2A — Lisa R. paid",
          badge: "$1,200",
          cls: "bg-emerald-500/20 text-emerald-400",
        },
        {
          text: "Unit 7C — Mark P. overdue",
          badge: "3 days",
          cls: "bg-red-500/20 text-red-400",
        },
        {
          text: "Unit 1D — Auto-reminder sent",
          badge: "Sent",
          cls: "bg-sky-500/20 text-sky-400",
        },
      ],
    },
    {
      title: "Maintenance",
      url: "app.quonsapp.com/maintenance",
      stats: [
        { label: "Open", value: "8", color: "text-amber-400" },
        { label: "In Progress", value: "5", color: "text-sky-400" },
        { label: "Completed", value: "47", color: "text-emerald-400" },
        { label: "Avg Time", value: "1.3d", color: "text-violet-400" },
      ],
      rows: [
        {
          text: "Unit 3A — HVAC not working",
          badge: "Urgent",
          cls: "bg-red-500/20 text-red-400",
        },
        {
          text: "Unit 5B — Leaky faucet",
          badge: "Assigned",
          cls: "bg-sky-500/20 text-sky-400",
        },
        {
          text: "Unit 2C — Door lock replaced",
          badge: "Done",
          cls: "bg-emerald-500/20 text-emerald-400",
        },
        {
          text: "Unit 8A — Paint touch-up",
          badge: "Scheduled",
          cls: "bg-amber-500/20 text-amber-400",
        },
      ],
    },
    {
      title: "Analytics",
      url: "app.quonsapp.com/analytics",
      stats: [
        { label: "NOI", value: "$31.2K", color: "text-emerald-400" },
        { label: "Expenses", value: "$16K", color: "text-red-400" },
        { label: "Vacancy", value: "6%", color: "text-amber-400" },
        { label: "Growth", value: "+12%", color: "text-sky-400" },
      ],
      rows: [
        {
          text: "Monthly P&L report ready",
          badge: "Download",
          cls: "bg-sky-500/20 text-sky-400",
        },
        {
          text: "Revenue up 12% vs last month",
          badge: "+12%",
          cls: "bg-emerald-500/20 text-emerald-400",
        },
        {
          text: "Maintenance costs down 8%",
          badge: "-8%",
          cls: "bg-emerald-500/20 text-emerald-400",
        },
        {
          text: "3 leases expiring this month",
          badge: "Action",
          cls: "bg-amber-500/20 text-amber-400",
        },
      ],
    },
  ];

  useEffect(() => {
    const timer = setInterval(
      () => setActiveScreen(s => (s + 1) % screens.length),
      4000,
    );
    return () => clearInterval(timer);
  }, [screens.length]);

  const screen = screens[activeScreen];
  const sidebarIdx =
    sidebarItems.findIndex(
      s => s.toLowerCase() === screen.title.toLowerCase(),
    ) ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative aspect-video rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50">
        <div className="absolute inset-0 p-3 md:p-6 flex flex-col">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-400" />
              <div className="size-2.5 rounded-full bg-amber-400" />
              <div className="size-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 h-5 rounded-full bg-white/10 max-w-xs mx-auto flex items-center px-3">
              <span className="text-[9px] text-white/40 font-mono transition-all duration-500">
                {screen.url}
              </span>
            </div>
          </div>

          {/* Sidebar + Content */}
          <div className="flex-1 flex gap-2 overflow-hidden">
            {/* Sidebar */}
            <div className="w-36 shrink-0 rounded-lg bg-white/5 p-2.5 hidden md:flex flex-col gap-1.5">
              {sidebarItems.map((item, i) => (
                <div
                  key={item}
                  className={`h-6 rounded-md px-2 flex items-center text-[10px] font-medium transition-all duration-500 ${i === sidebarIdx ? "bg-teal/20 text-teal" : "text-white/40"}`}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="flex-1 flex flex-col gap-2 overflow-hidden">
              {/* Stat cards */}
              <div className="grid grid-cols-4 gap-1.5">
                {screen.stats.map((s, i) => (
                  <div
                    key={`${activeScreen}-${i}`}
                    className="rounded-lg bg-white/[0.06] p-2 transition-all duration-500"
                    style={{
                      animation: `fadeSlideUp 0.5s ease-out ${i * 0.1}s both`,
                    }}
                  >
                    <p className="text-white/40 text-[8px] md:text-[9px]">
                      {s.label}
                    </p>
                    <p className={`font-bold text-xs md:text-base ${s.color}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Activity rows */}
              <div className="flex-1 rounded-lg bg-white/5 p-2.5 overflow-hidden">
                <p className="text-white/40 text-[9px] font-semibold mb-1.5 uppercase tracking-wider">
                  {screen.title === "Dashboard"
                    ? "Recent Activity"
                    : screen.title}
                </p>
                <div className="space-y-1.5">
                  {screen.rows.map((row, i) => (
                    <div
                      key={`${activeScreen}-row-${i}`}
                      className="flex items-center justify-between py-1.5 px-2 rounded-md bg-white/[0.03]"
                      style={{
                        animation: `fadeSlideUp 0.4s ease-out ${0.15 + i * 0.1}s both`,
                      }}
                    >
                      <span className="text-white/60 text-[9px] md:text-[11px] truncate mr-2">
                        {row.text}
                      </span>
                      <span
                        className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-full ${row.cls} shrink-0 font-medium`}
                      >
                        {row.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="absolute top-2 right-2 md:top-3 md:right-3 flex items-center gap-1.5 z-10 pointer-events-none">
          <div className="size-6 rounded-md bg-teal flex items-center justify-center">
            <span className="text-white font-bold text-[10px]">Q</span>
          </div>
          <span className="text-[10px] font-semibold text-white/70 hidden md:block">
            {APP_NAME}
          </span>
        </div>

        {/* Screen indicator dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {screens.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveScreen(i)}
              aria-label={`Show demo screen ${i + 1}`}
              title={`Show demo screen ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${i === activeScreen ? "w-5 h-1.5 bg-teal" : "size-1.5 bg-white/30 hover:bg-white/50"}`}
            />
          ))}
        </div>

        {/* Autoplay indicator */}
        <div className="absolute bottom-2 right-2 md:bottom-3 md:right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm pointer-events-none z-10 flex items-center gap-1.5">
          <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <p className="text-[10px] font-medium text-white/80">Live Demo</p>
        </div>
      </div>

      {/* CSS keyframes for slide-up animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function LandingPage() {
  const { isAuthenticated } = useConvexAuth();
  const dynamicPlans =
    ((useQuery(api.pricing.getPlans) ?? []) as PricingPlanSummary[]);

  const dynamicPlanMap = new Map(dynamicPlans.map(plan => [plan.plan, plan]));
  const displayPricingTiers = pricingTiers.map(tier => {
    const dynamic = dynamicPlanMap.get(tier.plan);
    if (!dynamic) return tier;
    return {
      ...tier,
      name: dynamic.name,
      price: dynamic.monthlyPrice / 100,
      description: dynamic.description,
      features: [dynamic.unitLimit, dynamic.subAccountLimit, ...tier.features.slice(2)],
    };
  });

  return (
    <div className="overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[90vh] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 w-full">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-sky-400" />
              <span className="text-sm text-sky-300 font-medium">
                The All-in-One Property Management Platform
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
              Manage Properties,{" "}
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Tenants & Finances
              </span>{" "}
              From One Platform
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
              {APP_NAME} replaces spreadsheets, disconnected apps, and manual
              processes with one intelligent platform for rent collection,
              scheduling, accounting, maintenance, HOA management, and more.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Button
                asChild
                size="lg"
                className="bg-sky-500 hover:bg-sky-600 text-white h-13 px-8 text-base font-semibold rounded-xl shadow-lg shadow-sky-500/25"
              >
                <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-white/20 text-white hover:bg-white/10 h-13 px-8 text-base rounded-xl bg-transparent"
              >
                <a href="#demo">
                  Watch Demo
                  <Play className="size-4 ml-1" />
                </a>
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500">
              {trustBadges.map(badge => (
                <span key={badge} className="flex items-center gap-1.5">
                  <Check className="size-4 text-sky-400" />
                  <span className="text-slate-400">{badge}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== VIDEO DEMO ===== */}
      <section id="demo" className="py-20 sm:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <Badge
              variant="outline"
              className="mb-4 text-sky-600 border-sky-500/30 bg-sky-500/5"
            >
              <Play className="size-3 mr-1" />
              Product Tour
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              See {APP_NAME} in Action
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Watch how property managers use {APP_NAME} to save 20+ hours a
              week and streamline every part of their operation.
            </p>
          </div>

          <DemoVideo />
        </div>
      </section>

      {/* ===== STATS / SOCIAL PROOF BAR ===== */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-sky-500 to-violet-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE HIGHLIGHTS ===== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Sparkles className="size-3" />
              FEATURES
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything You Need to Manage Properties
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              One platform replaces your entire toolkit — from rent collection
              to AI-powered scheduling.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureHighlights.map(feature => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-white dark:bg-slate-900 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-800/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div
                  className={`inline-flex items-center justify-center size-11 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}
                >
                  <feature.icon className={`size-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Button asChild variant="outline" size="lg" className="rounded-xl">
              <Link to="/features">
                View All Features
                <ChevronRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Zap className="size-3" />
              HOW IT WORKS
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Up and Running in Minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to transform how you manage properties
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {howItWorks.map((step, index) => (
              <div key={step.step} className="relative group">
                {/* Connector line */}
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-sky-300 to-sky-100 dark:from-sky-700 dark:to-sky-900" />
                )}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center size-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-lg group-hover:scale-110 transition-transform">
                    {step.step}
                  </div>
                  <step.icon className="size-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARISON SECTION ===== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Shield className="size-3" />
              COMPARISON
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Why Choose {APP_NAME}?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              See how {APP_NAME} stacks up against generic property management
              tools.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] bg-slate-50 dark:bg-slate-900 border-b">
                <div className="px-5 py-4 text-sm font-semibold text-muted-foreground">
                  Feature
                </div>
                <div className="px-3 py-4 text-sm font-semibold text-center text-sky-600">
                  {APP_NAME}
                </div>
                <div className="px-3 py-4 text-sm font-semibold text-center text-muted-foreground">
                  Others
                </div>
              </div>

              {/* Rows */}
              {comparisonRows.map((row, i) => (
                <div
                  key={row.feature}
                  className={`grid grid-cols-[1fr_100px_100px] sm:grid-cols-[1fr_120px_120px] ${
                    i < comparisonRows.length - 1 ? "border-b" : ""
                  }`}
                >
                  <div className="px-5 py-3.5 text-sm">{row.feature}</div>
                  <div className="px-3 py-3.5 flex items-center justify-center">
                    {row.qons ? (
                      <CheckCircle2 className="size-5 text-sky-500" />
                    ) : (
                      <X className="size-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                  <div className="px-3 py-3.5 flex items-center justify-center">
                    {row.others ? (
                      <CheckCircle2 className="size-5 text-slate-400" />
                    ) : (
                      <X className="size-5 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Trusted by Property Professionals
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from managers, landlords, and HOA boards who switched to{" "}
              {APP_NAME}.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map(t => (
              <div
                key={t.name}
                className="rounded-2xl border bg-white dark:bg-slate-900 p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg
                      key={s}
                      className="size-4 text-amber-400 fill-amber-400"
                      viewBox="0 0 20 20"
                      role="img"
                      aria-label="star"
                    >
                      <path d="M10 1l2.39 6.37H19l-5.3 4.26 1.86 6.37L10 13.83 4.44 18l1.86-6.37L1 7.37h6.61z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING PREVIEW ===== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Zap className="size-3" />
              PRICING
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your portfolio. All plans include a
              14-day free trial.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayPricingTiers.map(tier => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 ${
                  tier.popular
                    ? "border-sky-500 border-2 shadow-xl shadow-sky-500/10 bg-white dark:bg-slate-900"
                    : "bg-white dark:bg-slate-900"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-sky-500 text-white hover:bg-sky-500 shadow-lg">
                      <Sparkles className="size-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className="text-center mb-6 pt-1">
                  <h3 className="text-lg font-bold">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {tier.description}
                  </p>
                  <div className="flex items-baseline justify-center gap-0.5">
                    <span className="text-4xl font-bold tracking-tight">
                      ${tier.price}
                    </span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                </div>

                <div className="space-y-2.5 mb-6">
                  {tier.features.map(feature => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="size-4 text-sky-500 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  size="lg"
                  className={`w-full rounded-xl text-sm font-semibold ${
                    tier.popular ? "bg-sky-500 hover:bg-sky-600 text-white" : ""
                  }`}
                  variant={tier.popular ? "default" : "outline"}
                >
                  <Link to={isAuthenticated ? "/pricing" : "/signup"}>
                    Start Free Trial
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button asChild variant="link" className="text-sky-600">
              <Link to="/pricing">
                View Full Pricing & Compare Plans
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-600 to-violet-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Join property professionals who&apos;ve replaced 5+ tools with one
            platform. Start your free trial today — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-sky-600 hover:bg-white/90 h-13 px-8 text-base font-semibold rounded-xl shadow-lg"
            >
              <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                {isAuthenticated
                  ? "Go to Dashboard"
                  : "Start Free 14-Day Trial"}
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/30 text-white hover:bg-white/10 h-13 px-8 text-base rounded-xl bg-transparent"
            >
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-white/70 text-sm">
            {trustBadges.map(badge => (
              <span key={badge} className="flex items-center gap-1.5">
                <Check className="size-4" /> {badge}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
