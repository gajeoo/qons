import { useAuthActions } from "@convex-dev/auth/react";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  Crown,
  LogOut,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { APP_NAME } from "@/lib/constants";

const plans = [
  {
    name: "Starter",
    price: 79,
    description: "Up to 50 units",
    features: [
      "Property & resident management",
      "Staff directory & tasks",
      "Amenity booking",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: 149,
    popular: true,
    description: "Up to 200 units",
    features: [
      "Everything in Starter",
      "AI scheduling & automations",
      "Rent collection & accounting",
      "Lease & maintenance management",
      "HOA suite & AI assistant",
    ],
  },
  {
    name: "Business",
    price: 299,
    description: "Unlimited units",
    features: [
      "Everything in Professional",
      "Tenant screening",
      "API access & white-label",
      "Priority support",
      "Custom reports",
    ],
  },
];

export function AccountPausedPage() {
  const { signOut } = useAuthActions();
  const { isSubAccount, role } = useFeatureAccess();

  // Sub-accounts (workers/managers) — DON'T show pricing or "Pick a Plan"
  // Their membership is tied to the primary account
  if (isSubAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <div className="size-8 rounded-lg bg-teal flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              {APP_NAME}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 container max-w-2xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
          <div className="inline-flex items-center justify-center size-20 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-6">
            <Building2 className="size-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Account Access Paused
          </h1>
          <p className="text-muted-foreground text-lg mb-2 max-w-md">
            Your organization&apos;s subscription is currently inactive.
          </p>
          <p className="text-muted-foreground text-sm max-w-md mb-8">
            Your account is managed by your organization&apos;s administrator.
            Please contact them to restore access. Once they subscribe or renew,
            your access will be restored automatically.
          </p>

          <Card className="w-full max-w-sm border-dashed">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Users className="size-5 text-teal shrink-0" />
                <span>
                  Your role: <strong className="capitalize">{role}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Check className="size-5 text-teal shrink-0" />
                <span>Your data is safe — nothing has been deleted</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Zap className="size-5 text-teal shrink-0" />
                <span>Access resumes instantly when your org subscribes</span>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Primary account owner — show tiered plans
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between h-14 px-4 max-w-6xl mx-auto">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <div className="size-8 rounded-lg bg-teal flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            {APP_NAME}
          </Link>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-12">
        {/* Alert */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <AlertTriangle className="size-8 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            Your Free Trial Has Ended
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Choose a plan to restore access to all your data and features.
            Everything is safe — nothing has been deleted.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {plans.map(plan => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? "border-teal shadow-lg ring-1 ring-teal/20" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-teal text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Crown className="size-3" /> Most Popular
                  </span>
                </div>
              )}
              <CardHeader className="pb-4 text-center">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground text-sm">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="size-4 text-teal shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full mt-4 ${plan.popular ? "bg-teal text-white hover:bg-teal/90" : ""}`}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  asChild
                >
                  <Link to="/pricing">
                    Get {plan.name} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Reassurance */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="size-4 text-teal" />
            All your properties, staff, schedules, and data are preserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Once you subscribe, everything will be restored instantly.
          </p>
        </div>
      </main>
    </div>
  );
}
