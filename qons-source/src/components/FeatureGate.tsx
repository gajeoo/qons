import { Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wraps content that requires a specific feature. Shows upgrade prompt if user lacks access.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, isLoading, hasAccess, isSubAccount } = useFeatureAccess();

  if (isLoading) return null;

  // If they have access to this specific feature, show content
  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  // If custom fallback, show that
  if (fallback) return <>{fallback}</>;

  const { getRequiredPlan } = useFeatureAccess();
  const requiredPlan = getRequiredPlan(feature);
  const showUpgradeCta = !isSubAccount;

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="pt-8 pb-6 text-center">
          <div className="mx-auto size-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Feature Locked</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This feature requires the <strong>{requiredPlan}</strong> plan or
            higher.
            {!hasAccess && " Your free trial has ended."}
          </p>
          {showUpgradeCta ? (
            <Button className="bg-teal text-white hover:bg-teal/90" asChild>
              <Link to="/pricing">
                <Sparkles className="size-4" /> Upgrade Plan
              </Link>
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Contact your organization administrator to request access.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Trial banner shown at top of dashboard when user is on trial.
 *
 * Rules:
 * - Paid subscribers: NEVER show this banner
 * - Sub-accounts (workers/managers): NEVER show plan/billing info
 * - Trial users (primary accounts): show trial countdown with upgrade button
 * - Expired trial (primary accounts): show expired warning with upgrade button
 * - Sub-accounts with org subscription lost: show org inactive message (no billing controls)
 */
export function TrialBanner() {
  const {
    isOnTrial,
    trialDaysRemaining,
    hasAccess,
    currentPlan,
    isSubAccount,
    isPaidSubscriber,
  } = useFeatureAccess();

  // Paid subscribers — never show any banner
  if (isPaidSubscriber) return null;

  // Sub-accounts should never see billing/plan prompts
  if (isSubAccount) {
    // If org lost access, show a simple message (no payment CTAs)
    if (!hasAccess) {
      return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-center gap-4">
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
              Organization subscription inactive
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Contact your organization administrator to restore access
            </p>
          </div>
        </div>
      );
    }
    // Sub-account with access (org trial or paid) — no banner
    return null;
  }

  // Primary account: trial expired, no subscription
  if (!hasAccess && currentPlan === "none") {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-destructive text-sm">
            Your free trial has ended
          </p>
          <p className="text-xs text-destructive/70 mt-0.5">
            Subscribe to a plan to continue using all features
          </p>
        </div>
        <Button
          size="sm"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shrink-0"
          asChild
        >
          <Link to="/pricing">Choose a Plan</Link>
        </Button>
      </div>
    );
  }

  // Primary account: on trial
  if (isOnTrial) {
    const isUrgent = trialDaysRemaining <= 3;
    return (
      <div
        className={`rounded-xl p-4 flex items-center justify-between gap-4 ${isUrgent ? "bg-amber-50 border border-amber-200" : "bg-teal/5 border border-teal/20"}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`size-9 rounded-lg flex items-center justify-center ${isUrgent ? "bg-amber-100" : "bg-teal/10"}`}
          >
            <Sparkles
              className={`size-4 ${isUrgent ? "text-amber-600" : "text-teal"}`}
            />
          </div>
          <div>
            <p
              className={`font-semibold text-sm ${isUrgent ? "text-amber-800" : "text-foreground"}`}
            >
              Free Trial — {trialDaysRemaining} day
              {trialDaysRemaining !== 1 ? "s" : ""} remaining
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You have full access to all features during your trial
            </p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-teal text-white hover:bg-teal/90 shrink-0"
          asChild
        >
          <Link to="/pricing">Subscribe Now</Link>
        </Button>
      </div>
    );
  }

  return null;
}
