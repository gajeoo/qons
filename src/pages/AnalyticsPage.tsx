import { useQuery } from "convex/react";
import {
  Activity, BarChart3, Building2, DollarSign, TrendingUp, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

import { FeatureGate } from "@/components/FeatureGate";

function AnalyticsPageInner() {
  const data = useQuery(api.analytics.getExecutiveDashboard);

  const downloadCsv = (name: string, rows: Array<Record<string, string | number>>) => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")]
      .concat(rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Analytics</h1>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted/50 animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const { overview, performance, propertyStats, roleDistribution, weekTrend, trendComparison, propertyFinancials } = data as any;
  const maxTrendHours = Math.max(...weekTrend.map((d: any) => d.hours), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Analytics</h1>
        <p className="text-muted-foreground">Utilization, cost-per-building, profitability, and performance insights</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() =>
              downloadCsv(
                "weekly-hours-trend.csv",
                weekTrend.map((d: any) => ({ date: d.date, day: d.label, hours: d.hours, shifts: d.shifts })),
              )
            }
          >
            Download Trend Report
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            onClick={() =>
              downloadCsv(
                "property-financials.csv",
                (propertyFinancials || []).map((p: any) => ({
                  property: p.propertyName,
                  revenue: p.revenue,
                  expenses: p.expenses,
                  noi: p.noi,
                })),
              )
            }
          >
            Download Financial Report
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {[
          { label: "Revenue", data: trendComparison?.revenue },
          { label: "Expenses", data: trendComparison?.expenses },
          { label: "NOI", data: trendComparison?.noi },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{item.label} trend (MoM)</p>
              <p className="text-lg font-semibold mt-1">${(item.data?.current ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prev: ${(item.data?.previous ?? 0).toLocaleString()} • Delta: {(item.data?.delta ?? 0) >= 0 ? "+" : ""}${(item.data?.delta ?? 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Utilization Rate", value: `${performance.utilizationRate}%`, icon: Activity, color: performance.utilizationRate >= 80 ? "text-green-600" : performance.utilizationRate >= 50 ? "text-amber-600" : "text-red-600" },
          { label: "Hours This Month", value: performance.totalHoursThisMonth.toLocaleString(), icon: TrendingUp, color: "text-teal" },
          { label: "Cost Per Building", value: `$${performance.costPerBuilding.toLocaleString()}`, icon: DollarSign, color: "text-blue-600" },
          { label: "Active Staff", value: overview.activeStaff, icon: Users, color: "text-purple-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5"><kpi.icon className={`size-5 ${kpi.color}`} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="size-4" /> Weekly Hours Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {weekTrend.map((day: any) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium">{day.hours > 0 ? day.hours : ""}</span>
                  <div
                    className="w-full bg-teal/80 rounded-t transition-all hover:bg-teal"
                    style={{ height: `${(day.hours / maxTrendHours) * 120}px`, minHeight: day.hours > 0 ? "4px" : "2px" }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="size-4" /> Staff by Role</CardTitle></CardHeader>
          <CardContent>
            {Object.keys(roleDistribution).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No staff data yet</p>
            ) : (
              <div className="space-y-3">
                {(Object.entries(roleDistribution) as Array<[string, number]>).sort(([, a], [, b]) => b - a).map(([role, count]) => {
                  const total = Object.values(roleDistribution as Record<string, number>).reduce((s: number, c: number) => s + c, 0);
                  const pct = Math.round((count / total) * 100);
                  const colors: Record<string, string> = {
                    concierge: "bg-blue-500", porter: "bg-purple-500", supervisor: "bg-amber-500",
                    manager: "bg-teal", maintenance: "bg-orange-500",
                  };
                  return (
                    <div key={role}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{role}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${colors[role] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Property Coverage */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="size-4" /> Property Coverage This Month</CardTitle></CardHeader>
          <CardContent>
            {propertyStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No properties yet — add properties to see coverage data</p>
            ) : (
              <div className="space-y-4">
                {propertyStats.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-4">
                    <div className="w-40 truncate font-medium text-sm">{p.name}</div>
                    <div className="flex-1">
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${p.coverageRate >= 80 ? "bg-green-500" : p.coverageRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${p.coverageRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="font-medium">{p.coverageRate}%</span>
                      <span className="text-muted-foreground ml-1">({p.filledShifts}/{p.totalShifts})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overview Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Properties", value: overview.totalProperties },
          { label: "Total Units", value: overview.totalUnits },
          { label: "Total Staff", value: overview.totalStaff },
          { label: "Shifts This Month", value: performance.shiftsThisMonth },
          { label: "Open Shifts", value: performance.openShifts },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Property Financial Tracking (Revenue, Expenses, NOI)</CardTitle></CardHeader>
        <CardContent>
          {(propertyFinancials || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No financial data yet.</p>
          ) : (
            <div className="space-y-3">
              {propertyFinancials.map((p: any) => (
                <div key={p.propertyId} className="rounded-md border p-3">
                  <p className="font-medium">{p.propertyName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revenue: ${p.revenue.toLocaleString()} • Expenses: ${p.expenses.toLocaleString()} • NOI: ${p.noi.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
