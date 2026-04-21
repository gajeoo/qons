import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Home,
  Loader2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { FeatureGate } from "@/components/FeatureGate";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
};

export function ResidentsPage() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");

  const residents = useQuery(api.residents.list, {}) || [];
  const stats = useQuery(api.residents.getStats);
  const properties = useQuery(api.properties.list) || [];
  const createResident = useMutation(api.residents.create);
  const approveResident = useMutation(api.residents.approve);
  const rejectResident = useMutation(api.residents.reject);
  const deactivateResident = useMutation(api.residents.deactivate);
  const removeResident = useMutation(api.residents.remove);

  const [form, setForm] = useState({
    propertyId: "",
    name: "",
    email: "",
    phone: "",
    unit: "",
    leaseStart: "",
    leaseEnd: "",
    moveInDate: "",
    emergencyContact: "",
    emergencyPhone: "",
    vehiclePlate: "",
    pets: "",
    notes: "",
    status: "active" as "pending" | "active",
  });

  const resetForm = () => {
    setForm({
      propertyId: "",
      name: "",
      email: "",
      phone: "",
      unit: "",
      leaseStart: "",
      leaseEnd: "",
      moveInDate: "",
      emergencyContact: "",
      emergencyPhone: "",
      vehiclePlate: "",
      pets: "",
      notes: "",
      status: "active",
    });
  };

  const handleCreate = async () => {
    if (!form.propertyId || !form.name || !form.email || !form.unit) {
      toast.error("Fill required fields: property, name, email, unit");
      return;
    }
    try {
      await createResident({
        propertyId: form.propertyId as Id<"properties">,
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        unit: form.unit,
        leaseStart: form.leaseStart || undefined,
        leaseEnd: form.leaseEnd || undefined,
        moveInDate: form.moveInDate || undefined,
        status: form.status,
        emergencyContact: form.emergencyContact || undefined,
        emergencyPhone: form.emergencyPhone || undefined,
        vehiclePlate: form.vehiclePlate || undefined,
        pets: form.pets || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Resident added");
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleApprove = async (id: Id<"residents">) => {
    try {
      await approveResident({ id });
      toast.success("Resident approved");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (id: Id<"residents">) => {
    try {
      await rejectResident({ id });
      toast.success("Resident rejected");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeactivate = async (id: Id<"residents">) => {
    try {
      await deactivateResident({ id });
      toast.success("Resident deactivated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: Id<"residents">) => {
    try {
      await removeResident({ id });
      toast.success("Resident removed");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Property lookup map
  const propertyMap = Object.fromEntries(
    properties.map((p) => [p._id, p]),
  );

  // Filter and search
  const filtered = residents.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterProperty !== "all" && r.propertyId !== filterProperty) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.unit.toLowerCase().includes(q) ||
        (r.phone && r.phone.includes(q))
      );
    }
    return true;
  });

  return (
    <FeatureGate feature="residents">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Residents</h1>
            <p className="text-muted-foreground">
              Manage residents, approve accounts, and track occupancy
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <UserPlus className="size-4" /> Add Resident
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="size-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Residents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="size-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.active ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Loader2 className="size-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <UserMinus className="size-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.inactive ?? 0}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search residents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProperty} onValueChange={setFilterProperty}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pending Approvals Banner */}
        {(stats?.pending ?? 0) > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="size-8 rounded-full bg-amber-200 flex items-center justify-center">
                <Loader2 className="size-4 text-amber-700" />
              </div>
              <div>
                <p className="font-medium text-amber-900">
                  {stats?.pending} resident{(stats?.pending ?? 0) > 1 ? "s" : ""} pending approval
                </p>
                <p className="text-sm text-amber-700">
                  Review and approve or reject pending applications
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Residents Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Residents ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="size-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No residents found</p>
                <p className="text-sm mt-1">
                  Add your first resident to get started
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resident</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lease Period</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((resident) => {
                      const prop = propertyMap[resident.propertyId];
                      return (
                        <TableRow key={resident._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{resident.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {resident.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Home className="size-3.5 text-muted-foreground" />
                              <span className="text-sm">
                                {prop?.name || "Unknown"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{resident.unit}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={
                                statusColors[resident.status] || ""
                              }
                            >
                              {resident.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {resident.leaseStart && resident.leaseEnd
                              ? `${resident.leaseStart} — ${resident.leaseEnd}`
                              : resident.leaseStart || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              {resident.phone && (
                                <Phone className="size-3.5" />
                              )}
                              {resident.email && (
                                <Mail className="size-3.5" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {resident.status === "pending" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleApprove(resident._id)
                                      }
                                    >
                                      <Check className="size-4 mr-2 text-green-600" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleReject(resident._id)
                                      }
                                    >
                                      <X className="size-4 mr-2 text-red-600" />
                                      Reject
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                {resident.status === "active" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleDeactivate(resident._id)
                                    }
                                  >
                                    <UserMinus className="size-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                )}
                                {(resident.status === "inactive" ||
                                  resident.status === "rejected") && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleApprove(resident._id)
                                    }
                                  >
                                    <UserCheck className="size-4 mr-2" />
                                    Reactivate
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(resident._id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="size-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Resident Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="size-5" /> Add New Resident
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Property *</Label>
                <Select
                  value={form.propertyId}
                  onValueChange={(v) =>
                    setForm({ ...form, propertyId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Full Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <Label>Unit *</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) =>
                      setForm({ ...form, unit: e.target.value })
                    }
                    placeholder="e.g. 4B"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="john@email.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as "pending" | "active" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      Active (approved immediately)
                    </SelectItem>
                    <SelectItem value="pending">
                      Pending (requires approval)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Lease Start</Label>
                  <Input
                    type="date"
                    value={form.leaseStart}
                    onChange={(e) =>
                      setForm({ ...form, leaseStart: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Lease End</Label>
                  <Input
                    type="date"
                    value={form.leaseEnd}
                    onChange={(e) =>
                      setForm({ ...form, leaseEnd: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Move-in Date</Label>
                  <Input
                    type="date"
                    value={form.moveInDate}
                    onChange={(e) =>
                      setForm({ ...form, moveInDate: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Emergency Contact</Label>
                  <Input
                    value={form.emergencyContact}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        emergencyContact: e.target.value,
                      })
                    }
                    placeholder="Name"
                  />
                </div>
                <div>
                  <Label>Emergency Phone</Label>
                  <Input
                    value={form.emergencyPhone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        emergencyPhone: e.target.value,
                      })
                    }
                    placeholder="Phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vehicle Plate</Label>
                  <Input
                    value={form.vehiclePlate}
                    onChange={(e) =>
                      setForm({ ...form, vehiclePlate: e.target.value })
                    }
                    placeholder="ABC-1234"
                  />
                </div>
                <div>
                  <Label>Pets</Label>
                  <Input
                    value={form.pets}
                    onChange={(e) =>
                      setForm({ ...form, pets: e.target.value })
                    }
                    placeholder="e.g. Dog (Golden Retriever)"
                  />
                </div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="size-4 mr-1" /> Add Resident
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FeatureGate>
  );
}
