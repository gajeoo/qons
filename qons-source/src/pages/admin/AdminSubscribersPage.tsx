import { useQuery } from "convex/react";
import { CreditCard, Crown, Search, Sparkles, Zap } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlan, setFilterPlan] = useState<string | null>(null);

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

  const filtered = subscriptions?.filter(sub => {
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
            onChange={e => setSearchQuery(e.target.value)}
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
              onClick={() => setFilterPlan(filterPlan === key ? null : key)}
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
          filtered.map(sub => {
            const plan = planConfig[sub.plan] ?? planConfig.starter;
            const statusColor = statusColors[sub.status] ?? statusColors.active;

            return (
              <Card key={sub._id} className="hover:shadow-sm transition-shadow">
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
                      </div>
                    </div>

                    {/* Subscription Details */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatDate(sub.currentPeriodEnd)}
                        </p>
                        <p>
                          {sub.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}
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
