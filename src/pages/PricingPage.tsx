import { useAction, useConvexAuth, useQuery } from "convex/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { PayPalCheckoutButton } from "@/components/PayPalButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
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
/*  TIER DATA                                                          */
/* ------------------------------------------------------------------ */

interface PricingTier {
  id: "starter" | "pro" | "enterprise";
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  unitLimit: string;
  subAccounts: string;
  popular?: boolean;
  features: string[];
}

const tiers: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 45.99,
    annualPrice: 459.99,
    description: "Perfect for small landlords and single-building managers",
    unitLimit: "Up to 50 units",
    subAccounts: "Up to 3 sub-accounts",
    features: [
      "Property & resident management",
      "Staff directory",
      "Task management",
      "Basic analytics",
      "Amenity booking",
      "Chat widget",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    monthlyPrice: 95.99,
    annualPrice: 959.99,
    description: "For growing portfolios that need automation and AI",
    unitLimit: "Up to 200 units",
    subAccounts: "Up to 10 sub-accounts",
    popular: true,
    features: [
      "Everything in Starter, plus:",
      "AI-powered scheduling",
      "Automation engine",
      "Time tracking & payroll export",
      "Advanced analytics",
      "AI Assistant",
      "HOA management suite",
      "Rent collection",
      "Lease management",
      "Document storage",
      "Maintenance workflow",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Business",
    monthlyPrice: 140.99,
    annualPrice: 1409.99,
    description: "For large operations with advanced needs",
    unitLimit: "Unlimited units",
    subAccounts: "Unlimited sub-accounts",
    features: [
      "Everything in Professional, plus:",
      "Tenant screening",
      "Owner portal & statements",
      "API access",
      "Custom reports",
      "White-label option",
      "Dedicated account manager",
      "Phone support",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ DATA                                                           */
/* ------------------------------------------------------------------ */

const faqs = [
  {
    question: "Can I try before I buy?",
    answer:
      "Yes. Every new account gets a 14-day free trial with full Professional-tier access — no credit card required.",
  },
  {
    question: "What happens after my trial ends?",
    answer:
      "After 14 days, choose a plan to continue. You can pick Starter, Professional, or Business with monthly or annual billing. Your data is kept safe during the transition.",
  },
  {
    question: "Can I upgrade or downgrade later?",
    answer:
      "Absolutely. Switch plans at any time from your settings. Upgrades take effect immediately; downgrades apply at the end of your current billing cycle.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel from your settings dashboard. Access continues until the end of your current billing cycle — no penalties or hidden fees.",
  },
  {
    question: "Do team members need their own subscription?",
    answer:
      "No. Team members are sub-accounts linked to your primary subscription. Starter includes 3, Professional includes 10, and Business includes unlimited.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept PayPal for recurring subscriptions (monthly and annual). Additional payment methods are coming soon.",
  },
  {
    question: "Is there an enterprise plan?",
    answer:
      "Yes — if you manage 1,000+ units or need custom integrations, SLA guarantees, or dedicated infrastructure, contact us for enterprise pricing.",
  },
];

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */

export function PricingPage() {
  const { isAuthenticated } = useConvexAuth();
  const subscription = useQuery(
    api.subscriptions.getMine,
    isAuthenticated ? {} : "skip",
  );
  const {
    isSubAccount,
    isPaidSubscriber,
    isLoading: featureLoading,
  } = useFeatureAccess();
  const checkPayPal = useAction(api.paypal.isConfigured);
  const dynamicPlans = useQuery(api.pricing.getPlans) ?? [];
  const navigate = useNavigate();
  const [paypalClientId, setPaypalClientId] = useState<string | null>(
    import.meta.env.VITE_PAYPAL_CLIENT_ID || null,
  );
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [selectedTier, setSelectedTier] = useState<PricingTier["id"]>("pro");
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");

  const discountResult = useQuery(
    api.pricing.validateDiscount,
    appliedDiscountCode
      ? { code: appliedDiscountCode, plan: selectedTier }
      : "skip",
  );

  const dynamicPlanMap = new Map(
    ((dynamicPlans ?? []) as PricingPlanSummary[]).map(plan => [plan.plan, plan]),
  );
  const displayTiers = tiers.map(tier => {
    const dynamic = dynamicPlanMap.get(tier.id);
    if (!dynamic) return tier;
    return {
      ...tier,
      name: dynamic.name,
      monthlyPrice: dynamic.monthlyPrice / 100,
      annualPrice: (dynamic.annualPrice ?? Math.round(dynamic.monthlyPrice * 10)) / 100,
      unitLimit: dynamic.unitLimit,
      subAccounts: dynamic.subAccountLimit,
      description: dynamic.description,
    };
  });

  useEffect(() => {
    if (paypalClientId) return;
    checkPayPal({})
      .then(r => {
        if (r.configured && r.clientId) setPaypalClientId(r.clientId);
      })
      .catch(() => {});
  }, [paypalClientId, checkPayPal]);

  const now = Date.now();
  const hasActiveSub =
    !!subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    !(subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd <= now);

  if (isAuthenticated && !featureLoading && isSubAccount) {
    return <Navigate to="/dashboard" replace />;
  }

  if (
    isAuthenticated &&
    !featureLoading &&
    (isPaidSubscriber || hasActiveSub)
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  const applyDiscountToPrice = (basePrice: number) => {
    if (!discountResult?.valid) return basePrice;
    const discountValue = discountResult.value ?? 0;
    if (discountResult.type === "percentage") {
      return Math.max(0, basePrice * (1 - discountValue / 100));
    }
    return Math.max(0, basePrice - discountValue / 100);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* ===== HERO ===== */}
      <section className="relative py-20 md:py-28">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-500/5 rounded-full blur-3xl" />
        </div>
        <div className="container text-center">
          <Badge
            variant="outline"
            className="mb-4 text-sky-600 border-sky-500/30 bg-sky-500/5"
          >
            <Sparkles className="size-3 mr-1" />
            14-Day Free Trial — Full Access
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a 14-day free trial on any plan. No credit card required.
            Scale as your portfolio grows.
          </p>
        </div>
      </section>

      {/* ===== BILLING TOGGLE ===== */}
      <section className="pb-4">
        <div className="container">
          <div className="flex items-center justify-center gap-3">
            <div className="inline-flex rounded-xl border p-1 bg-white dark:bg-slate-900 shadow-sm">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                  billingCycle === "monthly"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                  billingCycle === "annual"
                    ? "bg-sky-500 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual
              </button>
            </div>
            {billingCycle === "annual" && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100">
                Save ~17%
              </Badge>
            )}
          </div>

          <div className="mt-4 max-w-md mx-auto flex items-center gap-2">
            <Input
              placeholder="Discount code"
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value.toUpperCase())}
            />
            <Button
              variant="outline"
              onClick={() => setAppliedDiscountCode(discountInput.trim())}
              disabled={!discountInput.trim()}
            >
              Apply
            </Button>
          </div>
          {appliedDiscountCode && (
            <p className="text-center text-xs mt-2 text-muted-foreground">
              {discountResult?.valid
                ? `Discount ${appliedDiscountCode} applied to selected plan`
                : discountResult?.error || "Checking discount code..."}
            </p>
          )}
        </div>
      </section>

      {/* ===== PRICING CARDS ===== */}
      <section className="pb-20 md:pb-28">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto items-start">
            {displayTiers.map(tier => {
              const baseMonthlyEquivalent =
                billingCycle === "annual"
                  ? tier.annualPrice / 12
                  : tier.monthlyPrice;
              const isSelected = selectedTier === tier.id;
              const effectiveMonthly =
                isSelected && discountResult?.valid
                  ? applyDiscountToPrice(baseMonthlyEquivalent)
                  : baseMonthlyEquivalent;
              const displayPrice = effectiveMonthly.toFixed(2);
              const whole = displayPrice.split(".")[0];
              const cents = displayPrice.split(".")[1];
              const effectiveAnnual =
                isSelected && discountResult?.valid
                  ? applyDiscountToPrice(tier.annualPrice)
                  : tier.annualPrice;

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-3xl border bg-white dark:bg-slate-900 p-7 md:p-8 transition-all duration-300 ${
                    tier.popular
                      ? "border-2 border-sky-500 shadow-xl shadow-sky-500/10 md:-mt-4 md:mb-4"
                      : "hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                        <Crown className="size-3.5" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="mb-6 pt-1">
                    <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {tier.description}
                    </p>

                    <div className="flex items-baseline gap-0.5">
                      <span className="text-5xl font-bold tracking-tight">
                        ${whole}
                      </span>
                      {cents !== "00" && (
                        <span className="text-2xl font-bold">.{cents}</span>
                      )}
                      <span className="text-muted-foreground ml-1">/mo</span>
                    </div>

                    {billingCycle === "annual" && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 font-medium">
                        Billed annually at ${effectiveAnnual.toLocaleString()}
                        /yr
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="flex flex-col gap-1.5 mb-5 pb-5 border-b">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Zap className="size-4 text-sky-500" />
                      {tier.unitLimit}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-4 text-sky-500" />
                      {tier.subAccounts}
                    </div>
                  </div>

                  {/* Feature list */}
                  <div className="space-y-2.5 mb-8">
                    {tier.features.map(feature => {
                      const isHeader = feature.endsWith(":");
                      return (
                        <div key={feature} className="flex items-start gap-2.5">
                          {isHeader ? (
                            <span className="text-sm font-medium text-sky-600 dark:text-sky-400">
                              {feature}
                            </span>
                          ) : (
                            <>
                              <CheckCircle2 className="size-4 text-sky-500 shrink-0 mt-0.5" />
                              <span className="text-sm">{feature}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA */}
                  {hasActiveSub ? (
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full h-12 text-base rounded-xl"
                      disabled
                    >
                      Subscribed
                    </Button>
                  ) : !isAuthenticated ? (
                    <Button
                      asChild
                      size="lg"
                      className={`w-full h-12 text-base font-semibold rounded-xl ${
                        tier.popular
                          ? "bg-sky-500 hover:bg-sky-600 text-white"
                          : ""
                      }`}
                      variant={tier.popular ? "default" : "outline"}
                    >
                      <Link to="/signup">
                        Start Free 14-Day Trial
                        <ArrowRight className="size-4 ml-2" />
                      </Link>
                    </Button>
                  ) : paypalClientId ? (
                    <div>
                      {isSelected ? (
                        <div className="pt-1">
                          <PayPalCheckoutButton
                            billingCycle={billingCycle}
                            plan={tier.id}
                            discountCode={
                              isSelected && discountResult?.valid
                                ? appliedDiscountCode
                                : undefined
                            }
                            clientId={paypalClientId}
                            onSuccess={() => navigate("/dashboard")}
                          />
                        </div>
                      ) : (
                        <Button
                          size="lg"
                          className={`w-full h-12 text-base font-semibold rounded-xl ${
                            tier.popular
                              ? "bg-sky-500 hover:bg-sky-600 text-white"
                              : ""
                          }`}
                          variant={tier.popular ? "default" : "outline"}
                          onClick={() => setSelectedTier(tier.id)}
                        >
                          Select Plan
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      className="w-full h-12 text-base font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white"
                      disabled
                    >
                      <Loader2 className="size-4 animate-spin mr-2" /> Loading
                      payment…
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> No credit card for trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> Switch plans any time
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> 14-day free trial
            </span>
          </div>
        </div>
      </section>

      {/* ===== ENTERPRISE CALLOUT ===== */}
      <section className="pb-20 md:pb-28">
        <div className="container">
          <div className="max-w-4xl mx-auto rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 mb-2">
                  <Crown className="size-4" />
                  Enterprise
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Need More? Let&apos;s Talk.
                </h3>
                <p className="text-muted-foreground">
                  Managing 1,000+ units? Need custom integrations, SLA
                  guarantees, or dedicated infrastructure? We&apos;ll build a
                  plan that fits.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-xl"
                >
                  <Link to="/contact">
                    <MessageSquare className="size-4 mr-2" />
                    Contact Sales
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PLAN COMPARISON TABLE ===== */}
      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Compare Plans
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every feature included in each tier at a glance.
            </p>
          </div>

          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold text-muted-foreground w-1/3">
                    Feature
                  </th>
                  <th className="text-center py-4 px-3 font-semibold w-1/5">
                    Starter
                  </th>
                  <th className="text-center py-4 px-3 font-semibold text-sky-600 w-1/5">
                    Professional
                  </th>
                  <th className="text-center py-4 px-3 font-semibold w-1/5">
                    Business
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Units", s: "50", p: "200", b: "Unlimited" },
                  { feature: "Sub-accounts", s: "3", p: "10", b: "Unlimited" },
                  {
                    feature: "Property & resident management",
                    s: true,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Task management",
                    s: true,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Amenity booking",
                    s: true,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Chat widget",
                    s: true,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Analytics",
                    s: "Basic",
                    p: "Advanced",
                    b: "Advanced + Custom",
                  },
                  {
                    feature: "AI-powered scheduling",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Automation engine",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Time tracking & payroll export",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "AI Assistant",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "HOA management suite",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Rent collection",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Lease management",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Document storage",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Maintenance workflow",
                    s: false,
                    p: true,
                    b: true,
                  },
                  {
                    feature: "Tenant screening",
                    s: false,
                    p: false,
                    b: true,
                  },
                  {
                    feature: "Owner portal & statements",
                    s: false,
                    p: false,
                    b: true,
                  },
                  {
                    feature: "API access",
                    s: false,
                    p: false,
                    b: true,
                  },
                  {
                    feature: "White-label option",
                    s: false,
                    p: false,
                    b: true,
                  },
                  {
                    feature: "Custom reports",
                    s: false,
                    p: false,
                    b: true,
                  },
                  {
                    feature: "Support",
                    s: "Email",
                    p: "Priority",
                    b: "Dedicated + Phone",
                  },
                ].map(row => (
                  <tr key={row.feature} className="border-b last:border-0">
                    <td className="py-3 px-4">{row.feature}</td>
                    {(["s", "p", "b"] as const).map(tier => {
                      const val = row[tier];
                      return (
                        <td key={tier} className="py-3 px-3 text-center">
                          {typeof val === "boolean" ? (
                            val ? (
                              <CheckCircle2 className="size-4 text-sky-500 inline-block" />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">
                                —
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-medium">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map(faq => (
              <div key={faq.question} className="border-b pb-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-600 to-violet-600" />
        <div className="relative container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
            Manage your portfolio, team, residents, and finances from one
            platform. Start free today.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="text-base h-12 px-8 bg-white text-sky-600 hover:bg-white/90 rounded-xl font-semibold"
              asChild
            >
              <Link to="/signup">
                Create Free Account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base h-12 px-8 border-white/30 text-white hover:bg-white/10 rounded-xl bg-transparent"
              asChild
            >
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
