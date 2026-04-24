import { useMutation, useQuery } from "convex/react";
import {
  Building2, Edit, MapPin, MoreHorizontal, Plus, Trash2, Upload, Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { StateSelector } from "@/components/StateSelector";

import { FeatureGate } from "@/components/FeatureGate";

type PropertyForm = {
  name: string; address: string; city: string; state: string; zip: string;
  type: "residential" | "commercial" | "mixed" | "hoa"; units: string;
  contactName: string; contactPhone: string; contactEmail: string; notes: string;
  imageUrl?: string;
  imageStorageId?: Id<"_storage">;
  latitude?: number; longitude?: number;
};

const emptyForm: PropertyForm = {
  name: "", address: "", city: "", state: "", zip: "",
  type: "residential", units: "", contactName: "", contactPhone: "", contactEmail: "", notes: "",
};

function PropertiesPageInner() {
  const properties = useQuery(api.properties.list) || [];
  const stats = useQuery(api.properties.getStats);
  const importHistory = useQuery(api.imports.listHistory) || [];
  const financials = useQuery(api.analytics.getPropertyFinancials) || [];
  const create = useMutation(api.properties.create);
  const update = useMutation(api.properties.update);
  const remove = useMutation(api.properties.remove);
  const generateImageUploadUrl = useMutation(api.properties.generateImageUploadUrl);
  const smartImport = useMutation(api.imports.smartImport);

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<Id<"properties"> | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<"all" | "success" | "partial" | "failed">("all");

  const filteredImportHistory = importHistory.filter((job) =>
    historyFilter === "all" ? true : job.status === historyFilter,
  );

  const filtered = properties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  const financialMap = Object.fromEntries(
    financials.map((f: any) => [f.propertyId, f]),
  );

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (p: typeof properties[0]) => {
    setForm({
      name: p.name, address: p.address, city: p.city, state: p.state, zip: p.zip,
      type: p.type, units: String(p.units), contactName: p.contactName || "",
      contactPhone: p.contactPhone || "", contactEmail: p.contactEmail || "", notes: p.notes || "",
      imageUrl: p.imageUrl,
      imageStorageId: p.imageStorageId,
      latitude: p.latitude, longitude: p.longitude,
    });
    setEditingId(p._id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...form,
        units: parseInt(form.units) || 0,
        imageUrl: form.imageUrl || undefined,
        imageStorageId: form.imageStorageId,
        latitude: form.latitude,
        longitude: form.longitude,
      };
      if (editingId) {
        await update({ id: editingId, ...data });
        toast.success("Property updated");
      } else {
        await create(data);
        toast.success("Property added");
      }
      setShowForm(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: Id<"properties">) => {
    if (!confirm("Delete this property?")) return;
    await remove({ id });
    toast.success("Property deleted");
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    setImportSummary(null);
    try {
      const content = await file.text();
      const result = await smartImport({ fileName: file.name, content });

      const summary = [
        `Properties created: ${result.propertiesCreated}`,
        `Properties updated: ${result.propertiesUpdated}`,
        `Staff created: ${result.staffCreated}`,
        `Residents created: ${result.residentsCreated}`,
        `Ignored rows: ${result.ignoredRows}`,
      ].join(" | ");

      setImportSummary(summary);

      if (result.errors.length > 0) {
        toast.error(`Import completed with ${result.errors.length} row errors`);
      } else {
        toast.success("Import completed successfully");
      }
    } catch (e: any) {
      toast.error(e.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }

    setUploadingImage(true);
    try {
      const uploadUrl = await generateImageUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { storageId } = await response.json();
      setForm({
        ...form,
        imageStorageId: storageId,
        imageUrl: "",
      });
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const statusColor = { active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-600", onboarding: "bg-blue-100 text-blue-700" };
  const typeLabel = { residential: "Residential", commercial: "Commercial", mixed: "Mixed Use", hoa: "HOA" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">Manage all your buildings and properties</p>
        </div>
        <Button onClick={openCreate} className="bg-teal text-white hover:bg-teal/90">
          <Plus className="size-4" /> Add Property
        </Button>
        <Button variant="outline" onClick={() => setShowImport(true)}>
          <Upload className="size-4" /> Import Data
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Properties", value: stats?.total ?? 0, icon: Building2 },
          { label: "Active", value: stats?.active ?? 0, icon: Building2 },
          { label: "Inactive", value: stats?.inactive ?? 0, icon: Building2 },
          { label: "Total Units", value: stats?.totalUnits ?? 0, icon: Users },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal/10 p-2"><s.icon className="size-4 text-teal" /></div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Input placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />

      {/* Property Cards */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Building2 className="size-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg">No properties yet</h3>
          <p className="text-muted-foreground mt-1">Add your first property to get started</p>
          <Button onClick={openCreate} className="mt-4 bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> Add Property</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p._id} className="group hover:shadow-md transition-shadow">
              {p.imageUrl ? (
                <div className="aspect-[16/9] w-full overflow-hidden rounded-t-lg border-b bg-muted/20">
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                </div>
              ) : null}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3" /> {p.city}, {p.state}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-8 p-0"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}><Edit className="size-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(p._id)} className="text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className={statusColor[p.status]}>{p.status}</Badge>
                  <Badge variant="outline">{typeLabel[p.type]}</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>{p.address}</p>
                  <p className="font-medium text-foreground">{p.units} units</p>
                  {financialMap[p._id] ? (
                    <p>
                      Revenue: ${financialMap[p._id].revenue.toLocaleString()} • Expenses: ${financialMap[p._id].expenses.toLocaleString()} • NOI: ${financialMap[p._id].noi.toLocaleString()}
                    </p>
                  ) : null}
                  {p.contactName && <p>Contact: {p.contactName}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Property" : "Add Property"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Property Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sunset Towers" /></div>
            <div>
              <Label>Address *</Label>
              <AddressAutocomplete
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
                onSelect={(s) => setForm({
                  ...form,
                  address: s.address,
                  city: s.city || form.city,
                  state: s.state || form.state,
                  zip: s.zip || form.zip,
                  latitude: s.latitude,
                  longitude: s.longitude,
                })}
                placeholder="Start typing an address..."
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>City *</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div>
                <Label>State *</Label>
                <StateSelector
                  value={form.state}
                  onChange={(v) => setForm({ ...form, state: v })}
                />
              </div>
              <div><Label>ZIP *</Label><Input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="mixed">Mixed Use</SelectItem>
                    <SelectItem value="hoa">HOA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Units *</Label><Input type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} /></div>
            </div>
            <div><Label>Contact Name</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div>
              <Label>Property Image (Upload or URL)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleImageUpload(file);
                  }
                }}
                disabled={uploadingImage}
                className="mb-2"
              />
              {form.imageStorageId ? (
                <p className="mb-2 text-xs text-muted-foreground">Uploaded image attached.</p>
              ) : null}
              <Input
                value={form.imageUrl || ""}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value, imageStorageId: undefined })}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-teal text-white hover:bg-teal/90" disabled={uploadingImage || !form.name || !form.address || !form.city || !form.state || !form.zip || !form.units}>
                {editingId ? "Save Changes" : "Add Property"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Portfolio, Staff, and Residents</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV or JSON file. QuonsApp will auto-categorize rows into properties,
              staff, residents, and property image updates.
            </p>
            <Input
              type="file"
              accept=".csv,.json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
              disabled={importing}
            />
            {importing ? <p className="text-sm">Importing...</p> : null}
            {importSummary ? (
              <p className="text-sm rounded-md border p-3 bg-muted">{importSummary}</p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Tip: include columns like propertyName, address, city, state, zip, units,
              imageUrl, role, hourlyRate, residentName, unit, and leaseEnd for best results.
            </p>

            {importHistory.length > 0 ? (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">Recent imports</p>
                  <Select value={historyFilter} onValueChange={(value: "all" | "success" | "partial" | "failed") => setHistoryFilter(value)}>
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border">
                  {filteredImportHistory.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No imports match this filter.</p>
                  ) : filteredImportHistory.map((job) => (
                    <div key={job._id} className="px-3 py-2 border-b last:border-b-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{job.fileName}</span>
                        <Badge
                          variant="outline"
                          className={job.status === "success" ? "text-emerald-600" : job.status === "partial" ? "text-amber-600" : "text-red-600"}
                        >
                          {job.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        Rows: {job.totalRows} | Properties +{job.propertiesCreated}/{job.propertiesUpdated} | Staff +{job.staffCreated} | Residents +{job.residentsCreated}
                      </p>
                      {job.ignoredRows > 0 || job.errorCount > 0 ? (
                        <p className="text-muted-foreground mt-1">
                          Ignored: {job.ignoredRows} | Errors: {job.errorCount}
                        </p>
                      ) : null}
                      {job.errorSummary ? (
                        <p className="text-xs text-red-600 mt-1 line-clamp-2">{job.errorSummary}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PropertiesPage() {
  return (
    <FeatureGate feature="properties">
      <PropertiesPageInner />
    </FeatureGate>
  );
}
