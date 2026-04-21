import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Home,
  Laptop,
  MapPin,
  Shield,
  Smartphone,
  Sparkles,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface FeatureSection {
  id: string;
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle: string;
  description: string;
  benefits: string[];
  highlight?: string;
}

const featureSections: FeatureSection[] = [
  {
    id: "ai-scheduling",
    icon: Sparkles,
    iconColor: "text-teal bg-teal/10",
    title: "AI-Powered Scheduling",
    subtitle: "Fill shifts in seconds, not hours",
    description:
      "Our AI engine analyzes staff availability, certifications, building preferences, proximity, and cost targets to produce optimal schedules automatically. When emergencies hit — a no-show at 6 AM, an unexpected vacancy — QonsApp's smart matching finds qualified replacements instantly.",
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
    id: "multi-property",
    icon: Building2,
    iconColor: "text-chart-2 bg-chart-2/10",
    title: "Multi-Property Dashboard",
    subtitle: "10 buildings or 500 — one command center",
    description:
      "Most property management tools break down beyond 10-15 properties. QonsApp is built from the ground up for scale. Manage your entire portfolio from a single dashboard with interactive maps, regional grouping, and real-time status updates across every building.",
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
    id: "analytics",
    icon: BarChart3,
    iconColor: "text-chart-4 bg-chart-4/10",
    title: "Executive Analytics",
    subtitle: "CFO-ready dashboards, not spreadsheet reports",
    description:
      "Give your leadership team the visibility they need. Real-time dashboards show utilization rates, payroll breakdowns, profitability by property, and operational trends. No more waiting for monthly reports or manually building spreadsheets.",
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
    id: "mobile",
    icon: Smartphone,
    iconColor: "text-chart-3 bg-chart-3/10",
    title: "Mobile-First Platform",
    subtitle: "Built for teams in the field",
    description:
      "Your staff aren't sitting at desks. QonsApp is designed mobile-first so field teams can clock in via GPS, receive real-time notifications, track time, and manage their schedules — all from their phone. Managers get mobile oversight of every property.",
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
    id: "payroll",
    icon: DollarSign,
    iconColor: "text-chart-5 bg-chart-5/10",
    title: "Payroll Integration",
    subtitle: "Export to ADP, Paychex, QuickBooks — and more",
    description:
      "Stop manually entering hours into your payroll system. QonsApp automatically calculates overtime, shift differentials, and compliance adjustments, then exports directly to your payroll provider. Supports ADP, Paychex, QuickBooks, and standard CSV/Excel/PDF formats.",
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
    id: "amenity-booking",
    icon: Calendar,
    iconColor: "text-chart-1 bg-chart-1/10",
    title: "Amenity Booking",
    subtitle: "Residents book amenities with ease",
    description:
      "Pools, gyms, party rooms, parking spaces, tennis courts — let residents see availability and book directly. Automated approvals, waitlists, and capacity management keep everything running smoothly without staff intervention.",
    benefits: [
      "Self-service booking portal for residents",
      "Availability calendars with real-time updates",
      "Automated approval workflows",
      "Capacity limits and waitlist management",
      "Recurring reservations",
      "Usage analytics for management",
    ],
  },
  {
    id: "hoa-management",
    icon: Home,
    iconColor: "text-navy bg-navy/10",
    title: "HOA Management",
    subtitle: "Streamline every aspect of community operations",
    description:
      "Manage violations, board voting, dues collection, architectural review requests, reserve funds, and resident communications — all in one platform. Give board members the tools they need and residents the transparency they want.",
    benefits: [
      "Violation tracking and automated notices",
      "Board voting and meeting management",
      "Dues collection and payment tracking",
      "Architectural Review Committee (ARC) requests",
      "Reserve fund management and reporting",
      "Resident messaging and announcements",
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
];

export function FeaturesPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal/5 rounded-full blur-3xl" />
        </div>
        <div className="container text-center">
          <p className="text-sm font-medium text-teal mb-3 tracking-wide uppercase">
            Features
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            One Platform for{" "}
            <span className="text-teal">Everything</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From AI scheduling to HOA management, QonsApp replaces your
            entire toolkit with one intelligent, connected platform.
          </p>
        </div>
      </section>

      {/* Feature Sections */}
      {featureSections.map((feature, index) => (
        <section
          key={feature.id}
          id={feature.id}
          className={`py-16 md:py-24 ${index % 2 === 0 ? "" : "bg-muted/20"}`}
        >
          <div className="container">
            <div
              className={`max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""
              }`}
            >
              {/* Content */}
              <div>
                <div
                  className={`inline-flex size-12 items-center justify-center rounded-xl ${feature.iconColor} mb-5`}
                >
                  <feature.icon className="size-6" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                  {feature.title}
                </h2>
                <p className="text-teal font-medium text-sm mb-4">
                  {feature.subtitle}
                </p>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  {feature.description}
                </p>
                {feature.highlight && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal/10 text-teal text-sm font-medium mb-6">
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
                      <CheckCircle2 className="size-4 text-teal mt-0.5 shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Additional Features */}
      <section className="py-16 md:py-24 border-t">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Plus Everything Else You Need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enterprise features that come standard with every QonsApp account.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {additionalFeatures.map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card"
              >
                <f.icon className="size-5 text-teal shrink-0" />
                <span className="text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-navy text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            See QonsApp in Action
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
            Start your free trial today — full access for 14 days. No credit
            card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="text-base h-12 px-8 bg-teal text-white hover:bg-teal-dark"
              asChild
            >
              <Link to="/contact">
                Start Free Trial
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 border-white/30 text-white hover:bg-white/10"
              asChild
            >
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
