import { useAction, useQuery } from "convex/react";
import { useConvexAuth } from "convex/react";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PayPalCheckoutButton } from "@/components/PayPalButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { APP_NAME } from "@/lib/constants";
import { api } from "../../convex/_generated/api";

const allFeatures = [
  "Unlimited properties & buildings",
  "AI-powered scheduling engine",
  "Complete HOA management suite",
  "Staff & resident management",
  "Interactive property maps",
  "GPS time tracking & clock-in",
  "Payroll exports (ADP, Paychex, QuickBooks, CSV)",
  "Executive analytics dashboard",
  "Team collaboration & task delegation",
  "Amenity booking system",
  "Sub-accounts with role-based access",
  "AI chat widget + admin inbox",
  "Shift swap management",
  "Reserve fund tracking",
  "Board vote management",
  "Resident messaging & announcements",
  "Custom reports & data export",
  "Priority support",
  "Multi-property portfolio view",
  "Automated duty assignment",
  "Real-time notifications",
  "Maintenance request tracking",
];

const faqs = [
  {
    question: "Can I try before I buy?",
    answer:
      "Yes. Every new account gets a 14-day free trial with full access to all features and no credit card required.",
  },
  {
    question: "What happens after my trial ends?",
    answer:
      "After 14 days, subscribe to continue using the platform. You can choose monthly ($49.99) or annual ($599.88) billing.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Cancel from your settings dashboard. Access continues until the end of your current billing cycle.",
  },
  {
    question: "Do team members need their own subscription?",
    answer:
      "No. Team members are sub-accounts linked to your primary subscription.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept recurring PayPal subscriptions for both monthly and annual billing cycles.",
  },
];

export function PricingPage() {
  const { isAuthenticated } = useConvexAuth();
  const subscription = useQuery(
    api.subscriptions.getMine,
    isAuthenticated ? {} : "skip",
  );
  const { isSubAccount, isLoading: featureLoading } = useFeatureAccess();
  const checkPayPal = useAction(api.paypal.isConfigured);
  const [paypalClientId, setPaypalClientId] = useState<string | null>(
    import.meta.env.VITE_PAYPAL_CLIENT_ID || null,
  );
  const [checkingPayPal, setCheckingPayPal] = useState(!paypalClientId);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );

  useEffect(() => {
    if (paypalClientId) {
      setCheckingPayPal(false);
      return;
    }
    checkPayPal({})
      .then((r) => {
        if (r.configured && r.clientId) setPaypalClientId(r.clientId);
      })
      .catch(() => {})
      .finally(() => setCheckingPayPal(false));
  }, [paypalClientId, checkPayPal]);

  const now = Date.now();
  const hasActiveSub =
    !!subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    !(subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd <= now);

  if (isAuthenticated && !featureLoading && isSubAccount) {
    return <Navigate to="/dashboard" replace />;
  }

  const displayPrice = billingCycle === "annual" ? 49.99 * 12 : 49.99;
  const whole = Math.floor(displayPrice);
  const cents = Math.round((displayPrice % 1) * 100)
    .toString()
    .padStart(2, "0");

  return (
    <div className="flex-1 flex flex-col">
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
            14-Day Free Trial - Full Access
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            One Plan. Everything Included.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start with a full 14-day trial. Choose monthly or annual recurring
            membership.
          </p>
        </div>
      </section>

      <section className="pb-20 md:pb-28">
        <div className="container">
          <div className="max-w-xl mx-auto">
            <div className="relative rounded-3xl border-2 border-sky-500 bg-white dark:bg-slate-900 p-8 md:p-10 shadow-xl shadow-sky-500/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-white shadow-lg">
                  <Sparkles className="size-3.5" />
                  Start Free - No Credit Card
                </div>
              </div>

              <div className="text-center mb-8 pt-2">
                <h3 className="text-2xl font-bold mb-3">{APP_NAME} Premium</h3>
                <div className="inline-flex rounded-lg border p-1 mb-4">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`px-3 py-1.5 text-sm rounded-md ${billingCycle === "monthly" ? "bg-sky-500 text-white" : "text-muted-foreground"}`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`px-3 py-1.5 text-sm rounded-md ${billingCycle === "annual" ? "bg-sky-500 text-white" : "text-muted-foreground"}`}
                  >
                    Annual
                  </button>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-6xl font-bold tracking-tight">${whole}</span>
                  <span className="text-3xl font-bold">.{cents}</span>
                  <span className="text-muted-foreground ml-1 text-lg">
                    {billingCycle === "annual" ? "/year" : "/month"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  14-day free trial included. Auto-renews until cancelled.
                </p>
                {billingCycle === "annual" ? (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    Annual billing: $49.99 x 12 = $599.88 per year
                  </p>
                ) : null}
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {allFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5">
                    <CheckCircle2 className="size-4 text-sky-500 shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {hasActiveSub ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-13 text-base"
                  disabled
                >
                  Subscribed
                </Button>
              ) : (
                <div className="space-y-3">
                  {!isAuthenticated ? (
                    <Button
                      size="lg"
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white h-13 text-base font-semibold rounded-xl"
                      asChild
                    >
                      <Link to="/signup">
                        Start Free 14-Day Trial <ArrowRight className="size-4 ml-2" />
                      </Link>
                    </Button>
                  ) : paypalClientId ? (
                    <div className="pt-1">
                      <PayPalCheckoutButton
                        billingCycle={billingCycle}
                        clientId={paypalClientId}
                        onSuccess={() => {
                          window.location.assign("/settings");
                        }}
                      />
                    </div>
                  ) : checkingPayPal ? (
                    <Button
                      size="lg"
                      className="w-full bg-sky-500 hover:bg-sky-600 text-white h-13 text-base font-semibold rounded-xl"
                      disabled
                    >
                      <Loader2 className="size-4 animate-spin mr-2" /> Loading payment...
                    </Button>
                  ) : (
                    <div className="rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-left text-sm text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Billing is not configured yet.</p>
                          <p className="text-xs text-amber-800/80 mt-1">
                            An administrator needs to add the PayPal client ID, secret, and recurring plan IDs before subscriptions can start.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> No credit card for trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> Unlimited team members
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-sky-500" /> Unlimited properties
            </span>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-6">
            {faqs.map((faq) => (
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

      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-600 to-violet-600" />
        <div className="relative container text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
            Ready to Get Started?
          </h2>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-8">
            Manage your portfolio, team, residents, and operations from one platform.
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
