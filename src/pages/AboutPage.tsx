import {
  ArrowRight,
  Building2,
  Globe,
  Lightbulb,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const values = [
  {
    icon: Zap,
    title: "AI-First",
    description:
      "We don't bolt AI onto legacy systems. Every feature is built with intelligence at its core.",
  },
  {
    icon: Users,
    title: "Human-Centered",
    description:
      "Technology should serve people, not the other way around. We design for real operators doing real work.",
  },
  {
    icon: TrendingUp,
    title: "Scale-Ready",
    description:
      "Whether you manage 10 properties or 500, QonsApp grows with you — without growing your headcount.",
  },
  {
    icon: Lightbulb,
    title: "Continuous Innovation",
    description:
      "The property management industry deserves modern tools. We ship improvements every week.",
  },
];

const milestones = [
  {
    year: "2024",
    title: "The Idea",
    description:
      "After years at the intersection of finance and technology, Ernest Owusu identified a massive gap in property operations: the industry was still running on spreadsheets and phone calls.",
  },
  {
    year: "2025",
    title: "Building QonsApp",
    description:
      "Development begins on the AI-powered scheduling engine. The core thesis: if AI can optimize supply chains, it can optimize property staffing.",
  },
  {
    year: "2026",
    title: "Public Launch",
    description:
      "QonsApp launches with early adopters across the US. Full platform — scheduling, analytics, payroll, amenity booking, and HOA management — goes live.",
  },
  {
    year: "Next",
    title: "Scale & Impact",
    description:
      "Expanding to serve thousands of properties nationwide. Building the platform that becomes the operating system for property management.",
  },
];

export function AboutPage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal/5 rounded-full blur-3xl" />
        </div>
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-medium text-teal mb-3 tracking-wide uppercase">
              About QonsApp
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Bringing AI to{" "}
              <span className="text-teal">Property Operations</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              QonsApp was founded with a simple belief: the $88 billion property
              management industry deserves smarter tools. We're building the
              AI-powered platform that replaces spreadsheets, phone trees, and
              manual processes with intelligent automation.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            {/* Photo placeholder / Founder visual */}
            <div className="relative">
              <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-navy/10 to-teal/10 border flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="size-24 mx-auto rounded-full bg-navy/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-navy">EO</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Ernest Owusu</h3>
                    <p className="text-sm text-muted-foreground">
                      Founder & Lead Developer
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Story */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
                The Founder's Story
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Ernest Owusu comes from the intersection of finance and
                  technology — a background that gave him a unique lens on
                  operational inefficiency. Working alongside property management
                  and concierge companies, he saw the same pattern everywhere:
                  talented operators drowning in manual scheduling, disconnected
                  tools, and zero real-time visibility.
                </p>
                <p>
                  The math was staggering. Operations teams spending 20-30 hours
                  per week on scheduling alone. Companies losing $4,800+ per
                  employee annually to inefficiencies. Systems that broke down
                  once a portfolio grew past 10-15 properties.
                </p>
                <p>
                  The vision for QonsApp — Quantitative On-schedule Applications —
                  was born from a simple question:{" "}
                  <span className="text-foreground font-medium">
                    what if AI could handle the operations, so people could focus
                    on what actually matters?
                  </span>
                </p>
                <p>
                  Today, QonsApp is a comprehensive platform serving concierge
                  companies, luxury residential properties, and HOA communities
                  across the country. And we're just getting started.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <p className="text-sm font-medium text-teal mb-3 tracking-wide uppercase">
              Our Mission
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Make Property Operations Effortless
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We believe every concierge company, property manager, and HOA
              board deserves the same AI-powered tools that Fortune 500 companies
              use — without the Fortune 500 budget.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {values.map((value) => (
              <div
                key={value.title}
                className="text-center p-6 rounded-2xl border bg-card"
              >
                <div className="inline-flex size-12 items-center justify-center rounded-xl bg-teal/10 mb-4">
                  <value.icon className="size-5 text-teal" />
                </div>
                <h3 className="font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-24 bg-muted/20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-teal mb-3 tracking-wide uppercase">
              Our Journey
            </p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              From Idea to Impact
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-8">
            {milestones.map((milestone, index) => (
              <div key={milestone.year} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div
                    className={`size-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                      index === milestones.length - 1
                        ? "bg-teal text-white"
                        : "bg-navy/10 text-navy"
                    }`}
                  >
                    {milestone.year === "Next" ? "→" : milestone.year.slice(-2)}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <p className="text-xs font-medium text-teal uppercase tracking-wide mb-1">
                    {milestone.year}
                  </p>
                  <h3 className="font-semibold text-lg mb-2">
                    {milestone.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {milestone.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              A Massive Market Opportunity
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Property management is one of the largest, least-digitized
              industries in America.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              {
                icon: Globe,
                value: "$88B+",
                label: "US Property Management Market",
              },
              {
                icon: TrendingUp,
                value: "8.7%",
                label: "CAGR Through 2034",
              },
              {
                icon: Building2,
                value: "350K+",
                label: "Property Management Companies",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-6 rounded-2xl border bg-card"
              >
                <stat.icon className="size-6 text-teal mx-auto mb-3" />
                <p className="text-3xl font-bold text-navy mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-navy text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Join Us in Transforming Property Operations
          </h2>
          <p className="text-white/70 text-lg max-w-xl mx-auto mb-8">
            Be part of the AI revolution in property management. Start your free
            free trial today.
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
              <Link to="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
