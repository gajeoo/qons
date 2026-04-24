import { useMutation, useQuery } from "convex/react";
import { Download, FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

function toCsvRow(values: Array<string | number>) {
  return values.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",");
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

export function TenantScreeningPage() {
  const screenings = useQuery(api.operations.listTenantScreenings) || [];
  const properties = useQuery(api.properties.list) || [];
  const createScreening = useMutation(api.operations.createTenantScreening);
  const updateScreening = useMutation(api.operations.updateTenantScreening);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    email: "",
    phone: "",
    propertyId: "",
    provider: "transunion" as "transunion" | "experian" | "checkr" | "other",
    notes: "",
  });

  const create = async () => {
    if (!form.applicantName.trim()) {
      toast.error("Applicant name is required");
      return;
    }
    await createScreening({
      applicantName: form.applicantName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      propertyId: form.propertyId ? (form.propertyId as Id<"properties">) : undefined,
      provider: form.provider,
      notes: form.notes.trim() || undefined,
    });
    toast.success("Screening request created");
    setOpen(false);
    setForm({ ...form, applicantName: "", email: "", phone: "", notes: "" });
  };

  const exportRows = screenings.map((item) => [
    item.applicantName,
    item.email || "",
    item.phone || "",
    item.provider,
    item.status,
    item.result || "",
    item.score || "",
    item.notes || "",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Screening Integration</h1>
          <p className="text-sm text-muted-foreground">Track screening requests and provider outcomes in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCsv("tenant-screenings.csv", ["Applicant", "Email", "Phone", "Provider", "Status", "Result", "Score", "Notes"], exportRows)}>
            <Download className="size-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportPdf("Tenant Screening Requests", ["Applicant", "Email", "Phone", "Provider", "Status", "Result", "Score", "Notes"], exportRows)}>
            <FileText className="size-4" /> PDF
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> New Screening</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Screening Requests</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {screenings.length === 0 ? <p className="text-sm text-muted-foreground">No screening requests yet.</p> : null}
          {screenings.map((item) => (
            <div key={item._id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.applicantName}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.status}</p>
              </div>
              <p className="text-xs text-muted-foreground">{item.provider}{item.score ? ` • score ${item.score}` : ""}{item.result ? ` • ${item.result}` : ""}</p>
              {item.notes ? <p className="mt-1 text-sm">{item.notes}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateScreening({ screeningId: item._id, status: "in_progress" }).then(() => toast.success("Marked in progress"))}>In Progress</Button>
                <Button size="sm" variant="outline" onClick={() => updateScreening({ screeningId: item._id, status: "completed", result: "pass" }).then(() => toast.success("Marked pass"))}>Pass</Button>
                <Button size="sm" variant="outline" onClick={() => updateScreening({ screeningId: item._id, status: "completed", result: "review" }).then(() => toast.success("Marked review"))}>Needs Review</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Screening Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Applicant Name</Label><Input value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} /></div>
              <div>
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(value: "transunion" | "experian" | "checkr" | "other") => setForm({ ...form, provider: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transunion">TransUnion</SelectItem>
                    <SelectItem value="experian">Experian</SelectItem>
                    <SelectItem value="checkr">Checkr</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
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
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={create} className="w-full bg-teal text-white hover:bg-teal/90">Create Screening</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
