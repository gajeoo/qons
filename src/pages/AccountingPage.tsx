import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function AccountingPage() {
  const entries = useQuery(api.operations.listBookkeepingEntries) || [];
  const properties = useQuery(api.properties.list) || [];
  const createEntry = useMutation(api.operations.createBookkeepingEntry);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    propertyId: "",
    date: new Date().toISOString().slice(0, 10),
    type: "income" as "income" | "expense" | "transfer",
    category: "General",
    amount: "",
    description: "",
    reference: "",
  });

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const entry of entries) {
      if (entry.type === "income") income += entry.amountCents;
      if (entry.type === "expense") expense += entry.amountCents;
    }
    return { income, expense, net: income - expense };
  }, [entries]);

  const submit = async () => {
    const amountCents = Math.round(Number(form.amount || "0") * 100);
    if (!amountCents || !form.category.trim()) {
      toast.error("Category and amount are required");
      return;
    }

    await createEntry({
      propertyId: form.propertyId ? (form.propertyId as Id<"properties">) : undefined,
      date: form.date,
      type: form.type,
      category: form.category.trim(),
      amountCents,
      description: form.description.trim() || undefined,
      reference: form.reference.trim() || undefined,
    });

    toast.success("Entry added");
    setOpen(false);
    setForm({ ...form, amount: "", description: "", reference: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting / Bookkeeping</h1>
          <p className="text-sm text-muted-foreground">Track income, expenses, and transfer entries per property.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-teal text-white hover:bg-teal/90">
          <Plus className="size-4" /> New Entry
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Income</CardTitle></CardHeader><CardContent className="text-xl font-semibold text-emerald-600">{money.format(totals.income / 100)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Expenses</CardTitle></CardHeader><CardContent className="text-xl font-semibold text-rose-600">{money.format(totals.expense / 100)}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Net</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{money.format(totals.net / 100)}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ledger</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? <p className="text-sm text-muted-foreground">No bookkeeping entries yet.</p> : null}
          {entries.map((entry) => (
            <div key={entry._id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="font-medium">{entry.category}</p>
                <p className={entry.type === "expense" ? "text-rose-600" : "text-emerald-600"}>
                  {entry.type === "expense" ? "-" : "+"}{money.format(entry.amountCents / 100)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">{entry.date} • {entry.type}{entry.reference ? ` • ${entry.reference}` : ""}</p>
              {entry.description ? <p className="mt-1 text-sm">{entry.description}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Bookkeeping Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(value: "income" | "expense" | "transfer") => setForm({ ...form, type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            </div>
            <div>
              <Label>Property (optional)</Label>
              <Select value={form.propertyId || "__none__"} onValueChange={(value) => setForm({ ...form, propertyId: value === "__none__" ? "" : value })}>
                <SelectTrigger><SelectValue placeholder="No property" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No property</SelectItem>
                  {properties.map((property) => <SelectItem key={property._id} value={property._id}>{property.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <Button onClick={submit} className="w-full bg-teal text-white hover:bg-teal/90">Save Entry</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
