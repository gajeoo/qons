import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
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

export function LeaseManagementPage() {
  const leases = useQuery(api.operations.listLeaseAgreements) || [];
  const residents = useQuery(api.residents.list, { propertyId: undefined }) || [];
  const properties = useQuery(api.properties.list) || [];
  const createLease = useMutation(api.operations.createLeaseAgreement);
  const updateStatus = useMutation(api.operations.updateLeaseStatus);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    residentId: "",
    propertyId: "",
    unit: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 31536000000).toISOString().slice(0, 10),
    rent: "",
    deposit: "",
    esignProvider: "internal" as "docusign" | "hellosign" | "internal" | "none",
    externalDocumentId: "",
  });

  const create = async () => {
    const rentCents = Math.round(Number(form.rent || "0") * 100);
    if (!rentCents) {
      toast.error("Rent amount is required");
      return;
    }

    await createLease({
      residentId: form.residentId ? (form.residentId as Id<"residents">) : undefined,
      propertyId: form.propertyId ? (form.propertyId as Id<"properties">) : undefined,
      unit: form.unit.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      rentCents,
      depositCents: form.deposit ? Math.round(Number(form.deposit) * 100) : undefined,
      esignProvider: form.esignProvider,
      externalDocumentId: form.externalDocumentId.trim() || undefined,
    });

    toast.success("Lease agreement created");
    setOpen(false);
    setForm({ ...form, rent: "", deposit: "", unit: "", externalDocumentId: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lease Management & eSignatures</h1>
          <p className="text-sm text-muted-foreground">Manage lease lifecycle and track eSignature providers.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> New Lease</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Leases</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {leases.length === 0 ? <p className="text-sm text-muted-foreground">No leases yet.</p> : null}
          {leases.map((lease) => (
            <div key={lease._id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{lease.residentName || "Unassigned resident"} • {money.format(lease.rentCents / 100)} / month</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{lease.status}</p>
              </div>
              <p className="text-xs text-muted-foreground">{lease.startDate} → {lease.endDate} • {lease.esignProvider}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateStatus({ leaseId: lease._id, status: "sent" }).then(() => toast.success("Marked sent"))}>Sent</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus({ leaseId: lease._id, status: "signed" }).then(() => toast.success("Marked signed"))}>Signed</Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus({ leaseId: lease._id, status: "active" }).then(() => toast.success("Marked active"))}>Active</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Lease</DialogTitle></DialogHeader>
          <div className="space-y-3">
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
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div>
                <Label>eSign Provider</Label>
                <Select value={form.esignProvider} onValueChange={(value: "docusign" | "hellosign" | "internal" | "none") => setForm({ ...form, esignProvider: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="docusign">DocuSign</SelectItem>
                    <SelectItem value="hellosign">HelloSign</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Monthly Rent ($)</Label><Input type="number" value={form.rent} onChange={(e) => setForm({ ...form, rent: e.target.value })} /></div>
              <div><Label>Deposit ($)</Label><Input type="number" value={form.deposit} onChange={(e) => setForm({ ...form, deposit: e.target.value })} /></div>
            </div>
            <div><Label>External Document ID</Label><Input value={form.externalDocumentId} onChange={(e) => setForm({ ...form, externalDocumentId: e.target.value })} /></div>
            <Button onClick={create} className="w-full bg-teal text-white hover:bg-teal/90">Create Lease</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
