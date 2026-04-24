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
  "/settings": "settings",
  "/tasks": "tasks",
  "/residents": "residents",
  "/map": "map",
  "/pricing": "billing_management",
  "/team": "team_management",
  "/rent": "rent_collection",
  "/accounting": "accounting",
  "/leases": "leases",
  "/maintenance": "maintenance",
  "/documents": "documents",
  "/tenant-screening": "tenant_screening",
  "/notifications": "notifications",
  "/automations": "automations",
  "/referrals": "referrals",
};

export const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Professional",
  enterprise: "Business",
  trial: "Free Trial",
  admin: "Admin",
  none: "No Plan",
};

export const PLAN_UPGRADE_LABELS: Record<string, string> = {
  starter: "Professional",
  pro: "Business",
  enterprise: "Business",
  trial: "Starter",
  none: "Starter",
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

  const getRequiredPlan = (feature: string): string => {
    // Map features to the minimum plan that includes them
    const starterFeatures = [
      "dashboard", "properties", "staff", "residents", "tasks",
      "amenities", "hoa_basic", "basic_analytics", "map", "notifications",
      "settings", "team_management", "referrals",
    ];
    const proFeatures = [
      "schedule", "time_tracking", "payroll_csv", "payroll_integrations",
      "automations", "ai_assistant", "executive_analytics", "hoa",
      "rent_collection", "accounting", "leases", "maintenance", "documents",
      "advanced_exports",
    ];
    
    if (starterFeatures.includes(feature)) return "Starter ($79/mo)";
    if (proFeatures.includes(feature)) return "Professional ($149/mo)";
    return "Business ($299/mo)";
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
