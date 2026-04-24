import { useMutation, useQuery } from "convex/react";
import {
  BadgeDollarSign, Check, Download, FileSpreadsheet, Loader2, Plus, Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

import { FeatureGate } from "@/components/FeatureGate";

function PayrollPageInner() {
  const payrolls = useQuery(api.payroll.list) || [];
  const generate = useMutation(api.payroll.generate);
  const approveMut = useMutation(api.payroll.approve);
  const markExported = useMutation(api.payroll.markExported);
  const removeMut = useMutation(api.payroll.remove);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    periodStart: "", periodEnd: "", format: "csv" as "csv" | "adp" | "paychex" | "quickbooks" | "excel",
  });

  const handleGenerate = async () => {
    if (!form.periodStart || !form.periodEnd) { toast.error("Select date range"); return; }
    setLoading(true);
    try {
      await generate(form);
      toast.success("Payroll report generated");
      setShowForm(false);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  const exportCsv = (payroll: typeof payrolls[0]) => {
    const header = "Staff,Regular Hours,OT Hours,Regular Pay,OT Pay,Total Pay\n";
    const rows = payroll.entries.map((e) =>
      `"${e.staffName}",${e.regularHours},${e.overtimeHours},${e.regularPay.toFixed(2)},${e.overtimePay.toFixed(2)},${e.totalPay.toFixed(2)}`
    ).join("\n");
    const taxRate = payroll.taxRate ?? 0;
    const taxAmount = payroll.taxAmount ?? 0;
    const totalWithTax = payroll.totalWithTax ?? payroll.totalAmount;
    const total = `\n"TOTAL",${payroll.totalHours},,,,${payroll.totalAmount.toFixed(2)}\n"TAX",,,,,${taxAmount.toFixed(2)}\n"TOTAL_WITH_TAX",,,,,${totalWithTax.toFixed(2)}\n"TAX_RATE_%",,,,,${taxRate.toFixed(2)}`;
    const blob = new Blob([header + rows + total], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${payroll.periodStart}-to-${payroll.periodEnd}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    markExported({ id: payroll._id });
    toast.success("Exported");
  };

  const statusColor: Record<string, string> = {
    draft: "bg-amber-100 text-amber-700", approved: "bg-blue-100 text-blue-700", exported: "bg-green-100 text-green-700",
  };

  const formatLabel: Record<string, string> = {
    csv: "CSV", adp: "ADP", paychex: "Paychex", quickbooks: "QuickBooks", excel: "Excel",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">Generate and export payroll reports with overtime calculations</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-teal text-white hover:bg-teal/90">
          <Plus className="size-4" /> Generate Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal/10 p-2"><FileSpreadsheet className="size-4 text-teal" /></div>
            <div>
              <p className="text-2xl font-bold">{payrolls.length}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal/10 p-2"><BadgeDollarSign className="size-4 text-teal" /></div>
            <div>
              <p className="text-2xl font-bold">${payrolls.reduce((s, p) => s + p.totalAmount, 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Payroll</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2"><FileSpreadsheet className="size-4 text-amber-700" /></div>
            <div>
              <p className="text-2xl font-bold">{payrolls.filter((p) => p.status === "draft").length}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      {/* Payroll Reports */}
      {payrolls.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <FileSpreadsheet className="size-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg">No payroll reports yet</h3>
          <p className="text-muted-foreground mt-1">Generate a payroll report from approved time entries</p>
          <Button onClick={() => setShowForm(true)} className="mt-4 bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> Generate Report</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {payrolls.map((p) => (
            <Card key={p._id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-4 cursor-pointer text-left"
                    onClick={() => setExpandedId(expandedId === p._id ? null : p._id)}
                  >
                    <div>
                      <p className="font-semibold">{p.periodStart} → {p.periodEnd}</p>
                      <p className="text-sm text-muted-foreground">{p.staffCount} staff · {p.totalHours}h · {formatLabel[p.format]}</p>
                    </div>
                    <Badge className={statusColor[p.status]}>{p.status}</Badge>
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-3">
                      <p className="font-bold text-lg">${(p.totalWithTax ?? p.totalAmount).toLocaleString()}</p>
                      {(p.taxAmount ?? 0) > 0 ? (
                        <p className="text-xs text-muted-foreground">incl. tax ${p.taxAmount?.toLocaleString()} ({p.taxRate ?? 0}%)</p>
                      ) : null}
                    </div>
                    {p.status === "draft" && (
                      <Button size="sm" variant="outline" onClick={() => approveMut({ id: p._id }).then(() => toast.success("Approved"))}>
                        <Check className="size-3" /> Approve
                      </Button>
                    )}
                    {(p.status === "approved" || p.status === "exported") && (
                      <Button size="sm" variant="outline" onClick={() => exportCsv(p)}>
                        <Download className="size-3" /> Export
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeMut({ id: p._id }).then(() => toast.success("Deleted"))}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {expandedId === p._id && p.entries.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="pb-2">Staff</th>
                          <th className="pb-2 text-right">Regular</th>
                          <th className="pb-2 text-right">OT</th>
                          <th className="pb-2 text-right">Reg Pay</th>
                          <th className="pb-2 text-right">OT Pay</th>
                          <th className="pb-2 text-right font-bold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.entries.map((e, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2">{e.staffName}</td>
                            <td className="py-2 text-right">{e.regularHours}h</td>
                            <td className="py-2 text-right">{e.overtimeHours}h</td>
                            <td className="py-2 text-right">${e.regularPay.toFixed(2)}</td>
                            <td className="py-2 text-right">${e.overtimePay.toFixed(2)}</td>
                            <td className="py-2 text-right font-medium">${e.totalPay.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Generate Payroll Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Period Start *</Label><Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} /></div>
            <div><Label>Period End *</Label><Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} /></div>
            <div><Label>Export Format</Label>
              <Select value={form.format} onValueChange={(v: any) => setForm({ ...form, format: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="adp">ADP</SelectItem>
                  <SelectItem value="paychex">Paychex</SelectItem>
                  <SelectItem value="quickbooks">QuickBooks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleGenerate} className="bg-teal text-white hover:bg-teal/90" disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />} Generate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PayrollPage() {
  return (
    <FeatureGate feature="payroll_csv">
      <PayrollPageInner />
    </FeatureGate>
  );
}
