import { useAction, useQuery } from "convex/react";
import {
  CreditCard,
  Crown,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";

const planConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; price: string }
> = {
  starter: {
    label: "Starter",
    icon: Zap,
    color: "text-chart-1",
    price: "$49/mo",
  },
  pro: {
    label: "Professional",
    icon: Sparkles,
    color: "text-teal",
    price: "$149/mo",
  },
  enterprise: {
    label: "Enterprise",
    icon: Crown,
    color: "text-chart-4",
    price: "Custom",
  },
};

const statusColors: Record<string, string> = {
  active: "bg-teal/10 text-teal border-teal/30",
  canceled: "bg-muted text-muted-foreground border-border",
  past_due: "bg-destructive/10 text-destructive border-destructive/30",
  incomplete: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  trialing: "bg-chart-3/10 text-chart-3 border-chart-3/30",
};

export function AdminSubscribersPage() {
  const subscriptions = useQuery(api.subscriptions.listAll);
  const subStats = useQuery(api.subscriptions.getStats);
  const paypalConfig = useQuery(api.paypal.getAdminConfig);
  const savePayPalConfig = useAction(api.paypal.setCredentials);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [monthlyPlanId, setMonthlyPlanId] = useState("");
  const [annualPlanId, setAnnualPlanId] = useState("");
  const [mode, setMode] = useState<"sandbox" | "live">("live");
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (!paypalConfig) return;
    setClientId(paypalConfig.clientId);
    setMonthlyPlanId(paypalConfig.monthlyPlanId);
    setAnnualPlanId(paypalConfig.annualPlanId);
    setMode(paypalConfig.mode);
  }, [paypalConfig]);

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const getPlanSummary = (sub: NonNullable<typeof subscriptions>[number]) => {
    if (sub.plan === "starter" && sub.billingCycle === "annual") {
      return {
        label: "Premium",
        icon: Zap,
        color: "text-chart-1",
        price: "$599.88/yr",
      };
    }

    if (sub.plan === "starter") {
      return {
        label: "Premium",
        icon: Zap,
        color: "text-chart-1",
        price: "$49.99/mo",
      };
    }

    return planConfig[sub.plan] ?? planConfig.starter;
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const result = await savePayPalConfig({
        clientId,
        clientSecret: clientSecret.trim() || undefined,
        monthlyPlanId,
        annualPlanId,
        mode,
      });

      if (!result.success) {
        toast.error(result.error || "Failed to save PayPal configuration");
        return;
      }

      setClientSecret("");
      toast.success("PayPal configuration saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save PayPal configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  const filtered = subscriptions?.filter((sub) => {
    if (filterPlan && sub.plan !== filterPlan) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sub.userName?.toLowerCase().includes(q) ||
      sub.userEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Subscribers
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage subscriptions and track revenue
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>PayPal Billing Configuration</CardTitle>
              <CardDescription>
                Save the PayPal app credentials and recurring plan IDs used by the pricing page.
              </CardDescription>
            </div>
            <Badge variant={paypalConfig?.configured ? "default" : "outline"}>
              {paypalConfig?.configured ? "Configured" : "Setup required"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paypal-client-id">PayPal Client ID</Label>
              <Input
                id="paypal-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="PayPal REST app client ID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal-client-secret">PayPal Client Secret</Label>
              <Input
                id="paypal-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder={paypalConfig?.hasClientSecret ? "Stored already. Enter only to replace it." : "PayPal REST app client secret"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal-monthly-plan">Monthly Plan ID</Label>
              <Input
                id="paypal-monthly-plan"
                value={monthlyPlanId}
                onChange={(e) => setMonthlyPlanId(e.target.value)}
                placeholder="P-... monthly recurring plan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paypal-annual-plan">Annual Plan ID</Label>
              <Input
                id="paypal-annual-plan"
                value={annualPlanId}
                onChange={(e) => setAnnualPlanId(e.target.value)}
                placeholder="P-... annual recurring plan"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-end">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as "sandbox" | "live")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Create two PayPal subscription plans first: monthly at $49.99 and annual at $599.88. Then paste those PayPal plan IDs here.
            </div>
          </div>

          <Button onClick={handleSaveConfig} disabled={savingConfig}>
            {savingConfig ? <Loader2 className="size-4 animate-spin" /> : null}
            Save PayPal Configuration
          </Button>
        </CardContent>
      </Card>

      {/* Revenue Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="bg-gradient-to-br from-teal/5 to-transparent">
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-teal">
              {formatCurrency(subStats?.mrr ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">MRR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">
              {subStats?.activeSubscribers ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-chart-2">
              {subStats?.pastDueCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Past Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {subStats?.canceledCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Canceled</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterPlan === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterPlan(null)}
          >
            All
          </Button>
          {Object.entries(planConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={filterPlan === key ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setFilterPlan(filterPlan === key ? null : key)
              }
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Subscribers List */}
      <div className="space-y-3">
        {filtered === undefined ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading subscribers...
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No subscribers yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Subscribers will appear here when customers purchase a plan
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((sub) => {
            const plan = getPlanSummary(sub);
            const statusColor = statusColors[sub.status] ?? statusColors.active;

            return (
              <Card
                key={sub._id}
                className="hover:shadow-sm transition-shadow"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    {/* Subscriber Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {sub.userName ?? "Unknown User"}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${statusColor}`}
                        >
                          {sub.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{sub.userEmail}</span>
                        <span className="flex items-center gap-1">
                          <plan.icon className={`size-3 ${plan.color}`} />
                          {plan.label} — {plan.price}
                        </span>
                        {sub.billingProvider ? (
                          <span className="capitalize">{sub.billingProvider}</span>
                        ) : null}
                      </div>
                    </div>

                    {/* Subscription Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatDate(sub.currentPeriodEnd)}
                        </p>
                        <p>
                          {sub.cancelAtPeriodEnd
                            ? "Cancels on"
                            : "Renews on"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
