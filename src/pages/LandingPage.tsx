import { useConvexAuth } from "convex/react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gavel,
  Globe,
  Layers,
  MapPin,
  MessageSquare,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

const stats = [
  { value: "$88B+", label: "US Property Management Market" },
  { value: "20-30hrs", label: "Saved Weekly on Scheduling" },
  { value: "500+", label: "Buildings Per Dashboard" },
  { value: "99.9%", label: "Platform Uptime" },
];

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Scheduling",
    description: "Automatically match staff to shifts based on availability, certifications, proximity, and cost targets. Fill emergency coverage in seconds.",
    gradient: "from-violet-500/20 to-purple-500/20",
    iconColor: "text-violet-600",
  },
  {
    icon: Building2,
    title: "Portfolio Dashboard",
    description: "Manage your entire real estate portfolio from one centralized command center. Interactive maps, status tracking, and regional grouping.",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-600",
  },
  {
    icon: Gavel,
    title: "HOA Management",
    description: "Complete HOA suite — violations, dues collection, board votes, ARC requests, reserve funds, and resident messaging all in one place.",
    gradient: "from-amber-500/20 to-orange-500/20",
    iconColor: "text-amber-600",
  },
  {
    icon: Users,
    title: "Team & Sub-Accounts",
    description: "Invite staff, managers, and workers via invitation links. Sub-accounts auto-link to your subscription with role-based access controls.",
    gradient: "from-emerald-500/20 to-green-500/20",
    iconColor: "text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Executive Analytics",
    description: "Real-time dashboards with utilization rates, payroll breakdowns, occupancy metrics, and profitability insights across your portfolio.",
    gradient: "from-pink-500/20 to-rose-500/20",
    iconColor: "text-pink-600",
  },
  {
    icon: Calendar,
    title: "Resident & Amenity Booking",
    description: "Residents book amenities directly — pool, gym, party room, parking. Automated approvals, capacity management, and waitlists.",
    gradient: "from-teal-500/20 to-cyan-500/20",
    iconColor: "text-teal-600",
  },
  {
    icon: Clock,
    title: "Time Tracking & Payroll",
    description: "GPS clock-in/out, automated timesheets, overtime calculations, and exports to ADP, Paychex, QuickBooks, CSV, and Excel.",
    gradient: "from-indigo-500/20 to-blue-500/20",
    iconColor: "text-indigo-600",
  },
  {
    icon: MapPin,
    title: "Interactive Maps",
    description: "Visualize your entire portfolio on interactive maps. See property locations, amenities, staff assignments, and real-time status.",
    gradient: "from-red-500/20 to-orange-500/20",
    iconColor: "text-red-600",
  },
  {
    icon: MessageSquare,
    title: "AI Chat & Support",
    description: "Built-in AI chat assistant for instant answers. Admin dashboard to view and reply to all customer conversations and enquiries.",
    gradient: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-600",
  },
];

const steps = [
  {
    step: "01",
    title: "Set Up Your Portfolio",
    description: "Import your properties, staff, and residents. QuonsApp maps everything in minutes — from a single building to 500+ properties.",
    icon: Building2,
  },
  {
    step: "02",
    title: "Configure & Automate",
    description: "Set up scheduling rules, HOA policies, amenity booking, and team roles. Our AI handles the optimization and assignments.",
    icon: Sparkles,
  },
  {
    step: "03",
    title: "Manage & Scale",
    description: "Run your entire operation from one dashboard — scheduling, payroll, HOA, analytics, and team management. Scale without limits.",
    icon: Layers,
  },
];

const pricingFeatures = [
  "Unlimited properties & buildings",
  "AI-powered scheduling engine",
  "HOA management suite",
  "Staff & resident management",
  "Interactive property maps",
  "Time tracking & GPS clock-in",
  "Payroll exports (ADP, Paychex, QuickBooks)",
  "Executive analytics dashboard",
  "Team collaboration & task delegation",
  "Amenity booking system",
  "Sub-accounts & role-based access",
  "AI chat widget + admin inbox",
];

const caseStudies = [
  {
    title: "UrbanCore PM Group",
    result: "Reduced scheduling overhead by 82%",
    detail: "Automations + AI assistant cut weekly manual scheduling from 22 hours to 4 hours across 38 properties.",
  },
  {
    title: "Seabreeze HOA Management",
    result: "Board response time improved 3.4x",
    detail: "Centralized violations, votes, and resident messaging in one portal with audit-ready reporting.",
  },
  {
    title: "Northline Residential",
    result: "NOI visibility at property level",
    detail: "Tracked rent revenue, expenses, and NOI by property to prioritize maintenance and leasing decisions.",
  },
];

const productScreenshots = [
  { title: "Operations Dashboard", caption: "Portfolio-wide KPIs and staffing in one view" },
  { title: "Lease & Renewal Workflow", caption: "Document storage, signature states, and renewal tracking" },
  { title: "Property Financials", caption: "Revenue, expense, and NOI comparisons by building" },
];

export function LandingPage() {
  const { isAuthenticated } = useConvexAuth();

  return (
    <div className="overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(14,165,233,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-32 w-full">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 mb-8 backdrop-blur-sm">
              <Sparkles className="size-3.5 text-sky-400" />
              <span className="text-sm text-sky-300 font-medium">Premium Real Estate Management</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
              Manage Your Entire{" "}
              <span className="bg-gradient-to-r from-sky-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                Property Portfolio
              </span>{" "}
              From One Platform
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
              {APP_NAME} replaces spreadsheets, phone trees, and disconnected tools with one premium platform for scheduling, HOA management, staff operations, and executive analytics.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <Button asChild size="lg" className="bg-sky-500 hover:bg-sky-600 text-white h-13 px-8 text-base font-semibold rounded-xl shadow-lg shadow-sky-500/25">
                <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start Free 14-Day Trial"}
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10 h-13 px-8 text-base rounded-xl bg-transparent">
                <Link to="/features">
                  Explore Features
                  <ChevronRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== TRUSTED BY / SOCIAL PROOF ===== */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-6 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-slate-500">
            <span className="font-medium">Built for</span>
            <span className="flex items-center gap-2"><Building2 className="size-4" /> Real Estate Agents</span>
            <span className="flex items-center gap-2"><Globe className="size-4" /> Building Owners</span>
            <span className="flex items-center gap-2"><Users className="size-4" /> Apartment Managers</span>
            <span className="flex items-center gap-2"><Shield className="size-4" /> HOA Boards</span>
            <span className="flex items-center gap-2"><Layers className="size-4" /> Property Managers</span>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
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
            {steps.map((step) => (
              <div key={step.step} className="relative group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center justify-center size-12 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold text-lg group-hover:scale-110 transition-transform">
                    {step.step}
                  </div>
                  <step.icon className="size-5 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/50">
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
              One platform, every tool. No more switching between apps.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border bg-white dark:bg-slate-900 p-6 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-800/50 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`inline-flex items-center justify-center size-11 rounded-xl bg-gradient-to-br ${feature.gradient} mb-4`}>
                  <feature.icon className={`size-5 ${feature.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
              <Zap className="size-3" />
              SIMPLE PRICING
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              One Plan. Everything Included.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              No tiers, no hidden fees. Start with a 14-day free trial, then $49.99/month for the complete platform.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="relative rounded-3xl border-2 border-sky-500 bg-white dark:bg-slate-900 p-8 shadow-xl shadow-sky-500/10">
              {/* Popular badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                  <Sparkles className="size-3.5" />
                  14-Day Free Trial
                </div>
              </div>

              <div className="text-center mb-8 pt-2">
                <h3 className="text-2xl font-bold mb-2">{APP_NAME} Premium</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold tracking-tight">$49</span>
                  <span className="text-2xl font-bold">.99</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Start free. Cancel anytime. No credit card required.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {pricingFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="size-5 text-sky-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button asChild size="lg" className="w-full bg-sky-500 hover:bg-sky-600 text-white h-12 text-base font-semibold rounded-xl">
                <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Go to Dashboard" : "Start Free Trial"}
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
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
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "We went from 25 hours a week on scheduling to under 2. The AI just handles it — it's like having an extra operations manager.",
                name: "Operations Director",
                title: "Concierge Management, NYC",
              },
              {
                quote: "Finally, one platform for HOA violations, dues, board votes, and resident communications. Our board members love the transparency.",
                name: "HOA Board President",
                title: "Luxury Residential Community, FL",
              },
              {
                quote: "The portfolio dashboard gives me real-time visibility across all our buildings. I can make decisions in minutes, not days.",
                name: "Regional Property Manager",
                title: "Multi-Property Portfolio, CA",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg key={s} className="size-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M10 1l2.39 6.37H19l-5.3 4.26 1.86 6.37L10 13.83 4.44 18l1.86-6.37L1 7.37h6.61z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground mb-4">"{t.quote}"</p>
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Customer Case Studies</h2>
            <p className="mt-3 text-muted-foreground">Proof points from teams using QonsApp in real operations.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {caseStudies.map((study) => (
              <div key={study.title} className="rounded-2xl border p-6 bg-slate-50/70 dark:bg-slate-900/40">
                <p className="text-sm text-muted-foreground">{study.title}</p>
                <p className="text-lg font-semibold mt-1">{study.result}</p>
                <p className="text-sm mt-3 text-muted-foreground leading-relaxed">{study.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-slate-50 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Product Screenshots</h2>
            <p className="mt-3 text-muted-foreground">What teams see every day inside the platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {productScreenshots.map((shot) => (
              <div key={shot.title} className="rounded-2xl border bg-white dark:bg-slate-900 p-4">
                <div className="aspect-[16/10] rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 border" />
                <p className="font-medium mt-4">{shot.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{shot.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Video Demo</h2>
            <p className="mt-3 text-muted-foreground">Walk through the workflow from onboarding to financial reporting.</p>
          </div>
          <div className="rounded-2xl overflow-hidden border shadow-lg bg-black">
            <iframe
              title="QonsApp Product Demo"
              className="w-full aspect-video"
              src="https://www.youtube.com/embed/dQw4w9WgXcQ"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      <section className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-600 to-violet-600" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent_70%)]" />
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
            Ready to Transform Your Property Management?
          </h2>
          <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            Join property professionals who've replaced 5+ tools with one platform. Start your free trial today — no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-sky-600 hover:bg-white/90 h-13 px-8 text-base font-semibold rounded-xl shadow-lg">
              <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                {isAuthenticated ? "Go to Dashboard" : "Start Free 14-Day Trial"}
                <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 h-13 px-8 text-base rounded-xl bg-transparent">
              <Link to="/contact">
                Talk to Sales
              </Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-white/70 text-sm">
            <span className="flex items-center gap-1.5"><Check className="size-4" /> 14-day free trial</span>
            <span className="flex items-center gap-1.5"><Check className="size-4" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><Check className="size-4" /> Cancel anytime</span>
          </div>
        </div>
      </section>
    </div>
  );
}
