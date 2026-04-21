import { useQuery } from "convex/react";
import {
  ArrowUpRight,
  CreditCard,
  Crown,
  DollarSign,
  MessageSquare,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
  Wrench,
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
import { api } from "../../../convex/_generated/api";

export function AdminDashboardPage() {
  const dashStats = useQuery(api.admin.getDashboardStats);
  const leadStats = useQuery(api.leads.getStats);
  const subStats = useQuery(api.subscriptions.getStats);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const stats = [
    {
      title: "Monthly Revenue (MRR)",
      value: dashStats ? formatCurrency(dashStats.mrr) : "—",
      change: subStats
        ? `${subStats.activeSubscribers} active subscriber${subStats.activeSubscribers !== 1 ? "s" : ""}`
        : "",
      icon: DollarSign,
      color: "text-teal",
      bg: "bg-teal/10",
    },
    {
      title: "Total Users",
      value: dashStats?.totalUsers?.toString() ?? "—",
      change: dashStats
        ? `+${dashStats.newUsersThisWeek} this week`
        : "",
      icon: Users,
      color: "text-chart-2",
      bg: "bg-chart-2/10",
    },
    {
      title: "Active Subscribers",
      value: subStats?.activeSubscribers?.toString() ?? "—",
      change: subStats
        ? `${subStats.starterCount} Starter, ${subStats.proCount} Pro`
        : "",
      icon: CreditCard,
      color: "text-chart-3",
      bg: "bg-chart-3/10",
    },
    {
      title: "Total Leads",
      value: dashStats?.totalLeads?.toString() ?? "—",
      change: dashStats
        ? `+${dashStats.newLeadsThisWeek} this week`
        : "",
      icon: MessageSquare,
      color: "text-chart-4",
      bg: "bg-chart-4/10",
    },
    {
      title: "Active Trials",
      value: dashStats?.activeTrials?.toString() ?? "—",
      change: "14-day free trial users",
      icon: Sparkles,
      color: "text-teal",
      bg: "bg-teal/10",
    },
    {
      title: "Managers",
      value: dashStats?.totalManagers?.toString() ?? "—",
      change: "Building managers",
      icon: Crown,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      title: "Workers",
      value: dashStats?.totalWorkers?.toString() ?? "—",
      change: "Invited workers",
      icon: Wrench,
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      title: "Demo Requests",
      value: dashStats?.demoRequests?.toString() ?? "—",
      change: "From contact form",
      icon: UserPlus,
      color: "text-chart-1",
      bg: "bg-chart-1/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of your QonsApp business metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">
                {stat.value}
              </div>
              {stat.change && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lead Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-teal" />
              Lead Pipeline
            </CardTitle>
            <CardDescription>
              Current lead status breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: "New Leads",
                  value: leadStats?.new ?? 0,
                  color: "bg-chart-3",
                },
                {
                  label: "Contacted",
                  value: leadStats?.contacted ?? 0,
                  color: "bg-chart-2",
                },
                {
                  label: "Converted",
                  value: leadStats?.converted ?? 0,
                  color: "bg-teal",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-sm flex-1">{item.label}</span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}

              <div className="pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  asChild
                >
                  <Link to="/admin/leads">
                    View All Leads
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-teal" />
              Revenue Breakdown
            </CardTitle>
            <CardDescription>Subscription revenue by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  label: "Starter Plan ($49/mo)",
                  count: subStats?.starterCount ?? 0,
                  revenue: (subStats?.starterCount ?? 0) * 4900,
                  color: "bg-chart-1",
                },
                {
                  label: "Pro Plan ($149/mo)",
                  count: subStats?.proCount ?? 0,
                  revenue: (subStats?.proCount ?? 0) * 14900,
                  color: "bg-teal",
                },
                {
                  label: "Enterprise (Custom)",
                  count: subStats?.enterpriseCount ?? 0,
                  revenue: (subStats?.enterpriseCount ?? 0) * 29900,
                  color: "bg-chart-4",
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <div className="flex-1">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({item.count})
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}

              <div className="pt-3 border-t flex items-center justify-between">
                <span className="text-sm font-medium">Total MRR</span>
                <span className="text-lg font-bold text-teal">
                  {formatCurrency(subStats?.mrr ?? 0)}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link to="/admin/subscribers">
                  View All Subscribers
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-teal/5 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-teal">
                {dashStats?.demoRequests ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Demo Requests
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-chart-2/5 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-chart-2">
                {subStats?.pastDueCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Past Due
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-chart-4/5 to-transparent">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-chart-4">
                {subStats?.canceledCount ?? 0}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Churned
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
