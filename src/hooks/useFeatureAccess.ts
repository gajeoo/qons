import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const ROUTE_FEATURE_MAP: Record<string, string> = {
  "/properties": "properties",
  "/staff": "staff",
  "/schedule": "schedule",
  "/time-tracking": "time_tracking",
  "/payroll": "payroll_csv",
  "/analytics": "basic_analytics",
  "/amenities": "amenities",
  "/hoa": "hoa",
  "/dashboard": "dashboard",
  "/settings": "dashboard",
  "/tasks": "tasks",
  "/residents": "residents",
  "/map": "map",
  "/pricing": "billing_management",
  "/team": "team_management",
};

export const PLAN_LABELS: Record<string, string> = {
  premium: "Premium",
  starter: "Premium",
  pro: "Premium",
  enterprise: "Premium",
  trial: "Free Trial",
  admin: "Admin",
  none: "No Plan",
};

export function useFeatureAccess() {
  const plan = useQuery(api.featureGating.getEffectivePlan);

  const hasFeature = (feature: string): boolean => {
    if (!plan) return false;
    return plan.features.includes(feature);
  };

  const hasRouteAccess = (path: string): boolean => {
    const feature = ROUTE_FEATURE_MAP[path];
    if (!feature) return true;
    return hasFeature(feature);
  };

  const getRequiredPlan = (_feature: string): string => {
    return "Premium";
  };

  return {
    plan,
    // `null` means profile/access hasn't been established yet (e.g. first login).
    // Keep loading state until we have a concrete plan object to avoid false redirects.
    isLoading: plan === undefined || plan === null,
    hasAccess: plan?.hasAccess ?? false,
    isOnTrial: plan?.isOnTrial ?? false,
    trialDaysRemaining: plan?.trialDaysRemaining ?? 0,
    currentPlan: plan?.plan ?? "none",
    planLabel: PLAN_LABELS[plan?.plan ?? "none"] ?? "No Plan",
    role: plan?.role ?? "customer",
    propertyLimit: plan?.propertyLimit ?? 0,
    features: plan?.features ?? [],
    isSubAccount: plan?.isSubAccount ?? false,
    isPaidSubscriber: plan?.isPaidSubscriber ?? false,
    isWorker: plan?.role === "worker",
    isManager: plan?.role === "manager",
    hasUsedTrial: plan?.hasUsedTrial ?? false,
    hasFeature,
    hasRouteAccess,
    getRequiredPlan,
  };
}
