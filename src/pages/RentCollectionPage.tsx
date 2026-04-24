import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function toCsvRow(values: Array<string | number>) {
  return values
    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
    .join(",");
}

function exportCsv(fileName: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [toCsvRow(headers), ...rows.map(toCsvRow)].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPdf(title: string, headers: string[], rows: Array<Array<string | number>>) {
  const htmlRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td style="border:1px solid #ddd;padding:6px;">${String(cell ?? "")}</td>`).join("")}</tr>`)
    .join("");
  const html = `
    <html><head><title>${title}</title></head><body>
    <h2>${title}</h2>
    <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:12px;">
      <thead><tr>${headers.map((h) => `<th style="border:1px solid #ddd;padding:6px;text-align:left;">${h}</th>`).join("")}</tr></thead>
      <tbody>${htmlRows}</tbody>
    </table>
    </body></html>
  `;
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function RentCollectionPage() {
  const invoices = useQuery(api.operations.listRentInvoices) || [];
  const residents = useQuery(api.residents.list, { propertyId: undefined }) || [];
  const properties = useQuery(api.properties.list) || [];
  const createInvoice = useMutation(api.operations.createRentInvoice);
  const recordPayment = useMutation(api.operations.recordRentPayment);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    residentId: "",
    propertyId: "",
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
    dueDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "ach" as "card" | "ach" | "cash" | "check" | "other",
  });

  const create = async () => {
    const amountCents = Math.round(Number(form.amount || "0") * 100);
    if (!amountCents) {
      toast.error("Amount is required");
      return;
    }
    await createInvoice({
      residentId: form.residentId ? (form.residentId as Id<"residents">) : undefined,
      propertyId: form.propertyId ? (form.propertyId as Id<"properties">) : undefined,
      period: form.period,
      dueDate: form.dueDate,
      amountCents,
      paymentMethod: form.paymentMethod,
    });
    toast.success("Invoice created");
    setOpen(false);
    setForm({ ...form, amount: "" });
  };

  const exportRows = invoices.map((invoice) => [
    invoice.period,
    invoice.residentName || "",
    invoice.propertyName || "",
    invoice.status,
    invoice.dueDate,
    (invoice.amountCents / 100).toFixed(2),
    ((invoice.paidCents || 0) / 100).toFixed(2),
    invoice.paymentMethod || "",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rent Collection & Payments</h1>
          <p className="text-sm text-muted-foreground">Create rent invoices and record ACH/card/check/cash payments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCsv("rent-invoices.csv", ["Period", "Resident", "Property", "Status", "Due Date", "Amount", "Paid", "Payment Method"], exportRows)}>
            <Download className="size-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportPdf("Rent Invoices", ["Period", "Resident", "Property", "Status", "Due Date", "Amount", "Paid", "Payment Method"], exportRows)}>
            <FileText className="size-4" /> PDF
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> New Invoice</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices yet.</p> : null}
          {invoices.map((invoice) => (
            <div key={invoice._id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{invoice.residentName || "Unassigned resident"} • {invoice.period}</p>
                <p className="text-sm font-semibold">{money.format(invoice.amountCents / 100)}</p>
              </div>
              <p className="text-xs text-muted-foreground">Due {invoice.dueDate} • {invoice.status} • paid {money.format((invoice.paidCents || 0) / 100)}</p>
              {invoice.status !== "paid" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => recordPayment({ invoiceId: invoice._id, amountCents: Math.max(0, invoice.amountCents - (invoice.paidCents || 0)), paymentMethod: "ach" }).then(() => toast.success("Marked as paid"))}>Mark Paid (ACH)</Button>
                  <Button size="sm" variant="outline" onClick={() => recordPayment({ invoiceId: invoice._id, amountCents: Math.round(invoice.amountCents / 2), paymentMethod: "card" }).then(() => toast.success("Partial payment recorded"))}>Record 50%</Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Rent Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Period (YYYY-MM)</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Resident</Label>
                <Select value={form.residentId || "__none__"} onValueChange={(value) => setForm({ ...form, residentId: value === "__none__" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="No resident" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No resident</SelectItem>
                    {residents.map((resident) => <SelectItem key={resident._id} value={resident._id}>{resident.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property</Label>
                <Select value={form.propertyId || "__none__"} onValueChange={(value) => setForm({ ...form, propertyId: value === "__none__" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="No property" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No property</SelectItem>
                    {properties.map((property) => <SelectItem key={property._id} value={property._id}>{property.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div>
                <Label>Default Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={(value: "card" | "ach" | "cash" | "check" | "other") => setForm({ ...form, paymentMethod: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ach">ACH</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={create} className="w-full bg-teal text-white hover:bg-teal/90">Create Invoice</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
