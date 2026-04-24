import { useQuery } from "convex/react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  FileSignature,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

function AnalyticsPageInner() {
  const data = useQuery(api.analytics.getExecutiveDashboard);

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Executive Analytics
          </h1>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted/50 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const {
    overview,
    performance,
    financial,
    maintenance,
    leasing,
    propertyStats,
    roleDistribution,
    weekTrend,
  } = data as any;

  const maxTrendHours = Math.max(...weekTrend.map((d: any) => d.hours), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Executive Analytics
        </h1>
        <p className="text-muted-foreground">
          Portfolio performance, financials, operations & leasing insights
        </p>
      </div>

      {/* Primary KPIs */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Utilization Rate",
            value: `${performance.utilizationRate}%`,
            icon: Activity,
            color:
              performance.utilizationRate >= 80
                ? "text-green-600"
                : performance.utilizationRate >= 50
                  ? "text-amber-600"
                  : "text-red-600",
          },
          {
            label: "Rent Collected",
            value: `$${(financial?.collectedThisMonth ?? 0).toLocaleString()}`,
            icon: Wallet,
            color: "text-emerald-600",
          },
          {
            label: "Overdue Rent",
            value: `$${(financial?.overdueAmount ?? 0).toLocaleString()}`,
            icon: AlertTriangle,
            color:
              (financial?.overdueCount ?? 0) > 0
                ? "text-red-600"
                : "text-green-600",
          },
          {
            label: "Collection Rate",
            value: `${financial?.collectionRate ?? 0}%`,
            icon: DollarSign,
            color: "text-blue-600",
          },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {kpi.label}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>
                    {kpi.value}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5 shrink-0">
                  <kpi.icon className={`size-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operations & Leasing KPIs */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-orange-100 text-orange-600 shrink-0">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{maintenance?.open ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  Open Work Orders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-emerald-100 text-emerald-600 shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">
                  {maintenance?.completed ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Completed Repairs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-sky-100 text-sky-600 shrink-0">
                <FileSignature className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">
                  {leasing?.activeLeases ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Active Leases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-amber-100 text-amber-600 shrink-0">
                <ClipboardList className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">
                  {leasing?.expiringSoon ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  Leases Expiring (60d)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4" /> Weekly Hours Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weekTrend.map((day: any) => (
                <div key={day.date} className="grid grid-cols-[36px_1fr_36px] gap-2 items-center">
                  <span className="text-xs text-muted-foreground">{day.label}</span>
                  <progress
                    max={maxTrendHours}
                    value={day.hours}
                    className="h-2 w-full [appearance:none] [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:bg-teal [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-teal"
                  />
                  <span className="text-xs font-medium text-right">{day.hours}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" /> Staff by Role
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(roleDistribution).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No staff data yet
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(roleDistribution)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([role, count]) => {
                    const total = Number(
                      Object.values(roleDistribution).reduce(
                        (s: number, c) => s + Number(c),
                        0,
                      ),
                    );
                    const pct = total
                      ? Math.round((Number(count) / total) * 100)
                      : 0;
                    const colors: Record<string, string> = {
                      concierge: "bg-blue-500",
                      porter: "bg-purple-500",
                      supervisor: "bg-amber-500",
                      manager: "bg-teal",
                      maintenance: "bg-orange-500",
                    };
                    return (
                      <div key={role}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{role}</span>
                          <span className="text-muted-foreground">
                            {count as number} ({pct}%)
                          </span>
                        </div>
                        <progress
                          max={100}
                          value={pct}
                          className={`h-2 w-full [appearance:none] [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-value]:${colors[role] || "bg-gray-400"} [&::-moz-progress-bar]:${colors[role] || "bg-gray-400"}`}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Coverage */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4" /> Property Coverage This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {propertyStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No properties yet — add properties to see coverage data
              </p>
            ) : (
              <div className="space-y-4">
                {propertyStats.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="w-40 truncate font-medium text-sm">
                      {p.name}
                    </div>
                    <div className="flex-1">
                      <progress
                        max={100}
                        value={p.coverageRate}
                        className={`h-3 w-full [appearance:none] [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${
                          p.coverageRate >= 80
                            ? "[&::-webkit-progress-value]:bg-green-500 [&::-moz-progress-bar]:bg-green-500"
                            : p.coverageRate >= 50
                              ? "[&::-webkit-progress-value]:bg-amber-500 [&::-moz-progress-bar]:bg-amber-500"
                              : "[&::-webkit-progress-value]:bg-red-500 [&::-moz-progress-bar]:bg-red-500"
                        }`}
                      />
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="font-medium">{p.coverageRate}%</span>
                      <span className="text-muted-foreground ml-1">
                        ({p.filledShifts}/{p.totalShifts})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overview Grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Properties", value: overview.totalProperties },
          { label: "Total Units", value: overview.totalUnits },
          { label: "Residents", value: overview.totalResidents ?? 0 },
          { label: "Active Staff", value: overview.activeStaff },
          { label: "Shifts This Month", value: performance.shiftsThisMonth },
          { label: "Open Shifts", value: performance.openShifts },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  return (
    <FeatureGate feature="basic_analytics">
      <AnalyticsPageInner />
    </FeatureGate>
  );
}
