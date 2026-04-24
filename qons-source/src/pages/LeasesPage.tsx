import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  Calendar,

  Clock,
  FileSignature,
  FileText,
  MoreHorizontal,
  Pen,
  Plus,
  RefreshCw,
  Search,
  XCircle,
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
import { Switch } from "@/components/ui/switch";
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

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  renewed: "bg-blue-100 text-blue-700",
  terminated: "bg-gray-100 text-gray-600",
};

const signatureColors: Record<string, string> = {
  unsigned: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  signed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LeasesPageInner() {
  const leases = useQuery(api.leases.list, {}) || [];
  const properties = useQuery(api.properties.list, {}) || [];
  const residents = useQuery(api.residents.list, {}) || [];
  const createLease = useMutation(api.leases.create);
  const renewLease = useMutation(api.leases.renew);
  const terminateLease = useMutation(api.leases.terminate);
  const createRentPayment = useMutation(api.rentPayments.create);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [showRenewDialog, setShowRenewDialog] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewMonthlyRent, setRenewMonthlyRent] = useState("");

  const [form, setForm] = useState({
    propertyId: "",
    residentId: "",
    unitNumber: "",
    leaseType: "fixed" as "fixed" | "month_to_month" | "commercial",
    startDate: "",
    endDate: "",
    monthlyRent: "",
    securityDeposit: "",
    terms: "",
    autoRenew: false,
    renewalTermMonths: "12",
  });

  // Build lookup maps for property/resident names
  const propertyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of properties) map.set(p._id, p.name);
    return map;
  }, [properties]);

  const residentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of residents) map.set(r._id, r.name);
    return map;
  }, [residents]);

  // Compute stats from lease data
  const computedStats = useMemo(() => {
    const activeLeases = leases.filter((l) => l.status === "active").length;
    const expiringSoon = leases.filter(
      (l) => l.status === "expiring_soon"
    ).length;
    const expired = leases.filter((l) => l.status === "expired").length;
    const monthlyRentRoll = leases
      .filter(
        (l) => l.status === "active" || l.status === "expiring_soon"
      )
      .reduce((sum, l) => sum + l.monthlyRent, 0);
    return { activeLeases, expiringSoon, expired, monthlyRentRoll };
  }, [leases]);

  const filtered = useMemo(() => {
    let result = leases;
    if (filterStatus !== "all") {
      result = result.filter((l) => l.status === filterStatus);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const residentName = residentMap.get(l.residentId) || "";
        const propertyName = propertyMap.get(l.propertyId) || "";
        return (
          residentName.toLowerCase().includes(q) ||
          propertyName.toLowerCase().includes(q) ||
          l.unitNumber?.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [leases, filterStatus, search, residentMap, propertyMap]);

  const detailLease = showDetail
    ? leases.find((l) => l._id === showDetail)
    : null;

  const resetForm = () => {
    setForm({
      propertyId: "",
      residentId: "",
      unitNumber: "",
      leaseType: "fixed",
      startDate: "",
      endDate: "",
      monthlyRent: "",
      securityDeposit: "",
      terms: "",
      autoRenew: false,
      renewalTermMonths: "12",
    });
  };

  const handleCreate = async () => {
    if (
      !form.propertyId ||
      !form.residentId ||
      !form.startDate ||
      !form.endDate ||
      !form.monthlyRent
    ) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      const monthlyRent = parseFloat(form.monthlyRent);
      await createLease({
        propertyId: form.propertyId as Id<"properties">,
        residentId: form.residentId as Id<"residents">,
        unitNumber: form.unitNumber || undefined,
        leaseType: form.leaseType,
        startDate: form.startDate,
        endDate: form.endDate,
        monthlyRent,
        securityDeposit: form.securityDeposit
          ? parseFloat(form.securityDeposit)
          : undefined,
        terms: form.terms || undefined,
        autoRenew: form.autoRenew,
        renewalTermMonths: form.autoRenew
          ? parseInt(form.renewalTermMonths)
          : undefined,
      });

      // Auto-generate rent payment entries for lease duration
      try {
        const start = new Date(form.startDate + "T00:00:00");
        const end = new Date(form.endDate + "T00:00:00");
        const dueDay = start.getDate(); // use lease start day as due day
        const cur = new Date(start);
        const maxEntries = 24; // cap at 2 years of monthly entries
        let count = 0;
        while (cur <= end && count < maxEntries) {
          const dueDate = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
          await createRentPayment({
            propertyId: form.propertyId as Id<"properties">,
            residentId: form.residentId as Id<"residents">,
            amount: monthlyRent,
            type: "rent" as const,
            paymentMethod: "ach" as const,
            dueDate,
            memo: `Rent - ${cur.toLocaleString("default", { month: "long", year: "numeric" })}`,
          });
          cur.setMonth(cur.getMonth() + 1);
          count++;
        }
        toast.success(`Lease created with ${count} rent entries`);
      } catch {
        toast.success("Lease created (rent entries will need manual setup)");
      }
      setShowForm(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to create lease");
    }
  };

  const openRenewDialog = (leaseId: string) => {
    const lease = leases.find((l) => l._id === leaseId);
    if (lease) {
      // Auto-suggest a new end date based on renewal term or 12 months from current end
      const months = lease.renewalTermMonths ?? 12;
      const endDate = new Date(lease.endDate + "T00:00:00");
      endDate.setMonth(endDate.getMonth() + months);
      setRenewEndDate(endDate.toISOString().split("T")[0]);
      setRenewMonthlyRent("");
    }
    setShowRenewDialog(leaseId);
  };

  const handleRenew = async () => {
    if (!showRenewDialog || !renewEndDate) {
      toast.error("New end date is required");
      return;
    }
    try {
      await renewLease({
        id: showRenewDialog as Id<"leases">,
        newEndDate: renewEndDate,
        newMonthlyRent: renewMonthlyRent
          ? parseFloat(renewMonthlyRent)
          : undefined,
      });
      toast.success("Lease renewed");
      setShowRenewDialog(null);
      setRenewEndDate("");
      setRenewMonthlyRent("");
    } catch (e: any) {
      toast.error(e.message || "Failed to renew lease");
    }
  };

  const handleTerminate = async (leaseId: string) => {
    try {
      await terminateLease({ id: leaseId as Id<"leases"> });
      toast.success("Lease terminated");
    } catch (e: any) {
      toast.error(e.message || "Failed to terminate lease");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leases</h1>
          <p className="text-sm text-muted-foreground">
            Manage lease agreements, renewals, and tenant contracts.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-teal text-white hover:bg-teal/90"
        >
          <Plus className="size-4" /> Create Lease
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Active Leases
                </p>
                <p className="text-2xl font-bold">
                  {computedStats.activeLeases}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <FileText className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Expiring Soon
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {computedStats.expiringSoon}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Expired
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {computedStats.expired}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Monthly Rent Roll
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(computedStats.monthlyRentRoll)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <Calendar className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search resident, property..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="renewed">Renewed</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <FileSignature className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No leases found</p>
            <p className="text-sm mt-1">
              Create your first lease to manage tenant agreements.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resident</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Monthly Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lease) => (
                  <TableRow
                    key={lease._id}
                    className={
                      lease.status === "expiring_soon"
                        ? "bg-amber-50/50"
                        : lease.status === "expired"
                          ? "bg-red-50/30"
                          : ""
                    }
                  >
                    <TableCell className="font-medium">
                      {residentMap.get(lease.residentId) || "—"}
                    </TableCell>
                    <TableCell>
                      {propertyMap.get(lease.propertyId) || "—"}
                    </TableCell>
                    <TableCell>{lease.unitNumber || "—"}</TableCell>
                    <TableCell>{formatDate(lease.startDate)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          lease.status === "expiring_soon"
                            ? "text-amber-600 font-medium"
                            : lease.status === "expired"
                              ? "text-red-600 font-medium"
                              : ""
                        }
                      >
                        {formatDate(lease.endDate)}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(lease.monthlyRent)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[lease.status] || ""} text-[11px] capitalize`}
                      >
                        {lease.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${signatureColors[lease.signatureStatus] || ""} text-[11px] capitalize`}
                      >
                        {lease.signatureStatus === "signed" && (
                          <Pen className="size-3 mr-0.5" />
                        )}
                        {lease.signatureStatus}
                      </Badge>
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
                            onClick={() => setShowDetail(lease._id)}
                          >
                            <FileText className="size-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {(lease.status === "active" ||
                            lease.status === "expiring_soon") && (
                            <DropdownMenuItem
                              onClick={() => openRenewDialog(lease._id)}
                            >
                              <RefreshCw className="size-4 mr-2" />
                              Renew Lease
                            </DropdownMenuItem>
                          )}
                          {lease.status !== "terminated" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleTerminate(lease._id)}
                              >
                                <XCircle className="size-4 mr-2" />
                                Terminate Lease
                              </DropdownMenuItem>
                            </>
                          )}
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

      {/* Lease Detail Dialog */}
      <Dialog
        open={!!showDetail}
        onOpenChange={(open) => !open && setShowDetail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lease Details</DialogTitle>
          </DialogHeader>
          {detailLease && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Resident</p>
                  <p className="font-medium">
                    {residentMap.get(detailLease.residentId) || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="font-medium">
                    {propertyMap.get(detailLease.propertyId) || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Unit</p>
                  <p className="font-medium">
                    {detailLease.unitNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lease Type</p>
                  <p className="font-medium capitalize">
                    {detailLease.leaseType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {formatDate(detailLease.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {formatDate(detailLease.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(detailLease.monthlyRent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Security Deposit
                  </p>
                  <p className="font-medium">
                    {detailLease.securityDeposit
                      ? formatCurrency(detailLease.securityDeposit)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    className={`${statusColors[detailLease.status] || ""} capitalize`}
                  >
                    {detailLease.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Signature</p>
                  <Badge
                    className={`${signatureColors[detailLease.signatureStatus] || ""} capitalize`}
                  >
                    {detailLease.signatureStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Auto-Renew</p>
                  <p className="font-medium">
                    {detailLease.autoRenew ? "Yes" : "No"}
                    {detailLease.autoRenew && detailLease.renewalTermMonths
                      ? ` (${detailLease.renewalTermMonths} months)`
                      : ""}
                  </p>
                </div>
              </div>
              {detailLease.terms && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Terms</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">
                    {detailLease.terms}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                {(detailLease.status === "active" ||
                  detailLease.status === "expiring_soon") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      openRenewDialog(detailLease._id);
                      setShowDetail(null);
                    }}
                  >
                    <RefreshCw className="size-4" /> Renew
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setShowDetail(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Renew Lease Dialog */}
      <Dialog
        open={!!showRenewDialog}
        onOpenChange={(open) => !open && setShowRenewDialog(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renew Lease</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New End Date *</Label>
              <Input
                type="date"
                value={renewEndDate}
                onChange={(e) => setRenewEndDate(e.target.value)}
              />
            </div>
            <div>
              <Label>New Monthly Rent (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={renewMonthlyRent}
                onChange={(e) => setRenewMonthlyRent(e.target.value)}
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRenewDialog(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenew}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <RefreshCw className="size-4" /> Renew
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Lease Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Lease</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                <Label>Resident *</Label>
                <Select
                  value={form.residentId || "__none__"}
                  onValueChange={(v) =>
                    setForm({
                      ...form,
                      residentId: v === "__none__" ? "" : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select resident" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Select...</SelectItem>
                    {residents
                      .filter(
                        (r) =>
                          !form.propertyId ||
                          r.propertyId === form.propertyId
                      )
                      .map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
              <div>
                <Label>Lease Type</Label>
                <Select
                  value={form.leaseType}
                  onValueChange={(v: any) =>
                    setForm({ ...form, leaseType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Term</SelectItem>
                    <SelectItem value="month_to_month">
                      Month to Month
                    </SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Monthly Rent *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyRent}
                  onChange={(e) =>
                    setForm({ ...form, monthlyRent: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Security Deposit</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.securityDeposit}
                  onChange={(e) =>
                    setForm({ ...form, securityDeposit: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label>Terms / Notes</Label>
              <Textarea
                value={form.terms}
                onChange={(e) => setForm({ ...form, terms: e.target.value })}
                rows={3}
                placeholder="Additional lease terms, conditions..."
              />
            </div>
            <div className="flex items-center gap-4 py-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.autoRenew}
                  onCheckedChange={(v) => setForm({ ...form, autoRenew: v })}
                />
                <Label className="font-normal">Auto-renew</Label>
              </div>
              {form.autoRenew && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">
                    Renewal term:
                  </Label>
                  <Select
                    value={form.renewalTermMonths}
                    onValueChange={(v) =>
                      setForm({ ...form, renewalTermMonths: v })
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 month</SelectItem>
                      <SelectItem value="3">3 months</SelectItem>
                      <SelectItem value="6">6 months</SelectItem>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="24">24 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <Plus className="size-4" /> Create Lease
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function LeasesPage() {
  return (
    <FeatureGate feature="leases">
      <LeasesPageInner />
    </FeatureGate>
  );
}
