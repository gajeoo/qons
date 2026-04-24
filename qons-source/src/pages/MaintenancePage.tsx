import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Hammer,
  Kanban,
  List,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Timer,
  User,
  Wrench,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const CATEGORIES = [
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "structural",
  "pest",
  "landscaping",
  "general",
  "emergency",
] as const;

const PRIORITIES = ["low", "medium", "high", "emergency"] as const;

const STATUSES = [
  "submitted",
  "triaged",
  "assigned",
  "in_progress",
  "completed",
  "cancelled",
] as const;

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  emergency: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-700",
  triaged: "bg-purple-100 text-purple-700",
  assigned: "bg-sky-100 text-sky-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

const categoryIcons: Record<string, React.ReactNode> = {
  plumbing: <Wrench className="size-3" />,
  electrical: <Flame className="size-3" />,
  hvac: <Wrench className="size-3" />,
  appliance: <Wrench className="size-3" />,
  structural: <Hammer className="size-3" />,
  pest: <AlertTriangle className="size-3" />,
  landscaping: <Wrench className="size-3" />,
  general: <Wrench className="size-3" />,
  emergency: <Flame className="size-3" />,
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function MaintenancePageInner() {
  const requests = useQuery(api.maintenance.list, {}) || [];
  const stats = useQuery(api.maintenance.getStats, {});
  const properties = useQuery(api.properties.list, {}) || [];
  const staff = useQuery(api.staffMembers.list, {}) || [];
  const createRequest = useMutation(api.maintenance.create);
  const updateStatus = useMutation(api.maintenance.updateStatus);
  const assignRequest = useMutation(api.maintenance.assign);

  // Build lookup maps for property names and staff names
  const propertyMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of properties) {
      map[p._id] = p.name;
    }
    return map;
  }, [properties]);

  const staffMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of staff) {
      map[s._id] = s.name;
    }
    return map;
  }, [staff]);

  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [showForm, setShowForm] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterProperty, setFilterProperty] = useState("all");

  const [form, setForm] = useState({
    propertyId: "",
    title: "",
    description: "",
    category: "general" as (typeof CATEGORIES)[number],
    priority: "medium" as (typeof PRIORITIES)[number],
    unitNumber: "",
    notes: "",
  });

  const [assignForm, setAssignForm] = useState({
    staffId: "",
    vendor: "",
  });

  const filtered = useMemo(() => {
    let result = requests;
    if (filterPriority !== "all") {
      result = result.filter((r) => r.priority === filterPriority);
    }
    if (filterProperty !== "all") {
      result = result.filter((r) => r.propertyId === filterProperty);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (propertyMap[r.propertyId] || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [requests, filterPriority, filterProperty, search, propertyMap]);

  // Group by status for kanban
  const kanbanColumns = STATUSES.filter((s) => s !== "cancelled").map(
    (status) => ({
      status,
      label: status.replace("_", " "),
      items: filtered.filter((r) => r.status === status),
    })
  );

  const handleCreate = async () => {
    if (!form.propertyId || !form.title || !form.description) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await createRequest({
        propertyId: form.propertyId as Id<"properties">,
        title: form.title,
        description: form.description,
        category: form.category,
        priority: form.priority,
        unitNumber: form.unitNumber || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Request created");
      setShowForm(false);
      setForm({
        propertyId: "",
        title: "",
        description: "",
        category: "general",
        priority: "medium",
        unitNumber: "",
        notes: "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create request");
    }
  };

  const handleAssign = async () => {
    if (!showAssign) return;
    try {
      await assignRequest({
        id: showAssign as Id<"maintenanceRequests">,
        assignedStaffId: assignForm.staffId
          ? (assignForm.staffId as Id<"staff">)
          : undefined,
        assignedVendor: assignForm.vendor || undefined,
      });
      toast.success("Request assigned");
      setShowAssign(null);
      setAssignForm({ staffId: "", vendor: "" });
    } catch (e: any) {
      toast.error(e.message || "Failed to assign request");
    }
  };

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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

  const openRequests = stats.submitted + stats.triaged + stats.assigned;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage maintenance requests from submission to completion.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-teal text-white hover:bg-teal/90"
        >
          <Plus className="size-4" /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Open Requests
                </p>
                <p className="text-2xl font-bold">{openRequests}</p>
              </div>
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Wrench className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.inProgress}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Loader2 className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Completed
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total
                </p>
                <p className="text-2xl font-bold">
                  {stats.total}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Timer className="size-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All properties" />
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
        <div className="ml-auto flex gap-1">
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            onClick={() => setViewMode("kanban")}
          >
            <Kanban className="size-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            className="size-8 p-0"
            onClick={() => setViewMode("table")}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Wrench className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No maintenance requests found</p>
            <p className="text-sm mt-1">
              Create a request to track maintenance work.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
          {kanbanColumns.map((col) => (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold capitalize">
                  {col.label}
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {col.items.length}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {col.items.map((req) => (
                  <Card key={req._id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-3 space-y-2">
                      <p className="font-medium text-sm leading-tight">
                        {req.title}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          className={`${priorityColors[req.priority] || ""} text-[10px] capitalize`}
                        >
                          {req.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {categoryIcons[req.category]}
                          <span className="ml-0.5">{req.category}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {propertyMap[req.propertyId] || "—"}
                        {req.unitNumber ? ` • ${req.unitNumber}` : ""}
                      </p>
                      {req.assignedStaffId && staffMap[req.assignedStaffId] && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="size-3" />
                          {staffMap[req.assignedStaffId]}
                        </p>
                      )}
                      {req.assignedVendor && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="size-3" />
                          {req.assignedVendor}
                        </p>
                      )}
                      <div className="flex gap-1 pt-1">
                        <Select
                          value={req.status}
                          onValueChange={(status: any) =>
                            updateStatus({
                              id: req._id,
                              status,
                            }).then(() => toast.success("Status updated"))
                          }
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize text-xs">
                                {s.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((req) => (
                  <TableRow
                    key={req._id}
                    className={
                      req.priority === "emergency" ? "bg-red-50/30" : ""
                    }
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{req.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {req.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {propertyMap[req.propertyId] || "—"}
                      {req.unitNumber && (
                        <span className="text-muted-foreground text-xs ml-1">
                          #{req.unitNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[11px] capitalize">
                        {categoryIcons[req.category]}
                        <span className="ml-0.5">{req.category}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${priorityColors[req.priority] || ""} text-[11px] capitalize`}
                      >
                        {req.priority === "emergency" && (
                          <Flame className="size-3 mr-0.5" />
                        )}
                        {req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(req.assignedStaffId && staffMap[req.assignedStaffId]) ||
                        req.assignedVendor || (
                          <span className="text-muted-foreground italic">
                            Unassigned
                          </span>
                        )}
                    </TableCell>
                    <TableCell>
                      {req.estimatedCost || req.actualCost ? (
                        <div className="text-xs">
                          {req.estimatedCost && (
                            <p>Est: {formatCurrency(req.estimatedCost)}</p>
                          )}
                          {req.actualCost && (
                            <p className="font-medium">
                              Act: {formatCurrency(req.actualCost)}
                            </p>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={req.status}
                        onValueChange={(status: any) =>
                          updateStatus({
                            id: req._id,
                            status,
                          }).then(() => toast.success("Status updated"))
                        }
                      >
                        <SelectTrigger className="h-7 w-[130px]">
                          <Badge
                            className={`${statusColors[req.status] || ""} text-[10px] capitalize`}
                          >
                            {req.status.replace("_", " ")}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(req.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-8 p-0"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setShowAssign(req._id)}
                          >
                            <User className="size-4 mr-2" />
                            Assign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* New Request Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Maintenance Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Brief description of the issue"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                placeholder="Detailed explanation of the problem..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Property *</Label>
                <Select
                  value={form.propertyId || "__none__"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      propertyId: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select...</SelectItem>
                    {properties.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit Number</Label>
                <Input
                  value={form.unitNumber}
                  onChange={(e) =>
                    setForm({ ...form, unitNumber: e.target.value })
                  }
                  placeholder="e.g., 4B"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v: any) =>
                    setForm({ ...form, category: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v: any) =>
                    setForm({ ...form, priority: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Internal Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Notes for staff..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <Plus className="size-4" /> Create Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog
        open={!!showAssign}
        onOpenChange={(open) => !open && setShowAssign(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Staff Member</Label>
              <Select
                value={assignForm.staffId || "__none__"}
                onValueChange={(v) =>
                  setAssignForm({
                    ...assignForm,
                    staffId: v === "__none__" ? "" : v,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Or External Vendor</Label>
              <Input
                value={assignForm.vendor}
                onChange={(e) =>
                  setAssignForm({ ...assignForm, vendor: e.target.value })
                }
                placeholder="Vendor/contractor name"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAssign(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <User className="size-4" /> Assign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function MaintenancePage() {
  return (
    <FeatureGate feature="maintenance">
      <MaintenancePageInner />
    </FeatureGate>
  );
}
