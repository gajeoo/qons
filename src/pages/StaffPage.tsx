import { useMutation, useQuery } from "convex/react";
import {
  Award, Edit, Mail, MoreHorizontal, Phone, Plus, Trash2, Users,
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
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RoleSelector } from "@/components/RoleSelector";

import { FeatureGate } from "@/components/FeatureGate";

type StaffForm = {
  name: string; email: string; phone: string;
  role: string;
  hourlyRate: string; certifications: string; skills: string;
  maxHoursPerWeek: string; hireDate: string; notes: string;
};

const emptyForm: StaffForm = {
  name: "", email: "", phone: "", role: "concierge", hourlyRate: "",
  certifications: "", skills: "", maxHoursPerWeek: "40", hireDate: "", notes: "",
};

const roleColors: Record<string, string> = {
  concierge: "bg-blue-100 text-blue-700", porter: "bg-purple-100 text-purple-700",
  supervisor: "bg-amber-100 text-amber-700", manager: "bg-teal/10 text-teal",
  maintenance: "bg-orange-100 text-orange-700",
};

const defaultRoleColor = "bg-slate-100 text-slate-700";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-600", on_leave: "bg-yellow-100 text-yellow-700",
};

function StaffPageInner() {
  const staffList = useQuery(api.staffMembers.list) || [];
  const stats = useQuery(api.staffMembers.getStats);
  const create = useMutation(api.staffMembers.create);
  const update = useMutation(api.staffMembers.update);
  const remove = useMutation(api.staffMembers.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<Id<"staff"> | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  // Collect all unique roles for the filter
  const allRoles = [...new Set(staffList.map((s) => s.role))].sort();

  let filtered = staffList.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())
  );
  if (filterRole !== "all") filtered = filtered.filter((s) => s.role === filterRole);

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (s: typeof staffList[0]) => {
    setForm({
      name: s.name, email: s.email, phone: s.phone || "", role: s.role,
      hourlyRate: String(s.hourlyRate), certifications: (s.certifications || []).join(", "),
      skills: (s.skills || []).join(", "), maxHoursPerWeek: String(s.maxHoursPerWeek || 40),
      hireDate: s.hireDate || "", notes: s.notes || "",
    });
    setEditingId(s._id); setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        name: form.name, email: form.email, phone: form.phone || undefined,
        role: form.role, hourlyRate: parseFloat(form.hourlyRate) || 0,
        certifications: form.certifications ? form.certifications.split(",").map((c) => c.trim()).filter(Boolean) : undefined,
        skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        maxHoursPerWeek: parseInt(form.maxHoursPerWeek) || 40,
        hireDate: form.hireDate || undefined, notes: form.notes || undefined,
      };
      if (editingId) {
        await update({ id: editingId, ...data });
        toast.success("Staff member updated");
      } else {
        await create(data);
        toast.success("Staff member added");
      }
      setShowForm(false);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async (id: Id<"staff">) => {
    if (!confirm("Delete this staff member?")) return;
    await remove({ id }); toast.success("Staff member deleted");
  };

  const toggleStatus = async (s: typeof staffList[0]) => {
    const next = s.status === "active" ? "inactive" : "active";
    await update({ id: s._id, status: next });
    toast.success(`Status changed to ${next}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Directory</h1>
          <p className="text-muted-foreground">Manage your team members, availability, and certifications</p>
        </div>
        <Button onClick={openCreate} className="bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> Add Staff</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Staff", value: stats?.total ?? 0 },
          { label: "Active", value: stats?.active ?? 0 },
          { label: "On Leave", value: stats?.onLeave ?? 0 },
          { label: "Roles", value: Object.keys(stats?.roles || {}).length },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {allRoles.map((r) => (
              <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Users className="size-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="font-semibold text-lg">No staff members yet</h3>
          <p className="text-muted-foreground mt-1">Add your first team member to get started</p>
          <Button onClick={openCreate} className="mt-4 bg-teal text-white hover:bg-teal/90"><Plus className="size-4" /> Add Staff</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s._id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-gradient-to-br from-teal to-teal/60 flex items-center justify-center text-white font-bold text-sm">
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{s.name}</CardTitle>
                      <p className="text-sm text-muted-foreground capitalize">{s.role}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="size-8 p-0"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(s)}><Edit className="size-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(s)}>{s.status === "active" ? "Set Inactive" : "Set Active"}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(s._id)} className="text-destructive"><Trash2 className="size-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={statusColors[s.status]}>{s.status.replace("_", " ")}</Badge>
                  <Badge className={roleColors[s.role] || defaultRoleColor}>{s.role}</Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2"><Mail className="size-3" /> {s.email}</div>
                  {s.phone && <div className="flex items-center gap-2"><Phone className="size-3" /> {s.phone}</div>}
                  <p className="font-medium text-foreground">${s.hourlyRate}/hr</p>
                </div>
                {s.certifications && s.certifications.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.certifications.map((c) => (
                      <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 flex items-center gap-0.5">
                        <Award className="size-2.5" /> {c}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Full Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role *</Label>
                <RoleSelector
                  value={form.role}
                  onChange={(v) => setForm({ ...form, role: v })}
                />
              </div>
              <div><Label>Hourly Rate ($) *</Label><Input type="number" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} /></div>
            </div>
            <div><Label>Certifications (comma-separated)</Label><Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="CPR, First Aid, Fire Safety" /></div>
            <div><Label>Skills (comma-separated)</Label><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Front desk, Package handling, Access control" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Max Hours/Week</Label><Input type="number" value={form.maxHoursPerWeek} onChange={(e) => setForm({ ...form, maxHoursPerWeek: e.target.value })} /></div>
              <div><Label>Hire Date</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-teal text-white hover:bg-teal/90" disabled={!form.name || !form.email || !form.role || !form.hourlyRate}>
                {editingId ? "Save Changes" : "Add Staff Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function StaffPage() {
  return (
    <FeatureGate feature="staff">
      <StaffPageInner />
    </FeatureGate>
  );
}
