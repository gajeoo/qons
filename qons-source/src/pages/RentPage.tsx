import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  Receipt,
  Search,
  TrendingUp,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="size-3" />,
  processing: <Loader2 className="size-3 animate-spin" />,
  completed: <CheckCircle2 className="size-3" />,
  failed: <XCircle className="size-3" />,
  refunded: <Receipt className="size-3" />,
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

function RentPageInner() {
  const payments = useQuery(api.rentPayments.list, {}) || [];
  const stats = useQuery(api.rentPayments.getStats, {});
  const properties = useQuery(api.properties.list, {}) || [];
  const residents = useQuery(api.residents.list, {}) || [];
  const recordPayment = useMutation(api.rentPayments.recordPayment);
  const updateStatus = useMutation(api.rentPayments.updateStatus);
  const createPayment = useMutation(api.rentPayments.create);

  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterProperty, setFilterProperty] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("due");

  const [recordForm, setRecordForm] = useState({
    propertyId: "",
    residentId: "",
    amount: "",
    type: "rent" as "rent" | "late_fee" | "deposit" | "other",
    paymentMethod: "cash" as "cash" | "check" | "other",
    dueDate: "",
    memo: "",
  });

  const [createForm, setCreateForm] = useState({
    propertyId: "",
    residentId: "",
    amount: "",
    type: "rent" as "rent" | "late_fee" | "deposit" | "other",
    paymentMethod: "ach" as "ach" | "card" | "cash" | "check" | "other",
    dueDate: "",
    memo: "",
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

  const today = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    let result = payments;
    if (filterProperty !== "all") {
      result = result.filter((p) => p.propertyId === filterProperty);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const residentName = residentMap.get(p.residentId) || "";
        const propertyName = propertyMap.get(p.propertyId) || "";
        return (
          residentName.toLowerCase().includes(q) ||
          propertyName.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [payments, filterProperty, search, residentMap, propertyMap]);

  const dueNow = filtered.filter(
    (p) => p.status === "pending" && p.dueDate <= today
  );
  const upcoming = filtered.filter(
    (p) => p.status === "pending" && p.dueDate > today
  );
  const history = filtered.filter(
    (p) => p.status === "completed" || p.status === "refunded"
  );
  const overdue = filtered.filter(
    (p) =>
      (p.status === "pending" || p.status === "failed") && p.dueDate < today
  );

  const tabData: Record<string, typeof filtered> = {
    due: dueNow,
    upcoming,
    history,
    overdue,
  };

  const handleRecordPayment = async () => {
    if (
      !recordForm.propertyId ||
      !recordForm.residentId ||
      !recordForm.amount ||
      !recordForm.dueDate
    ) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await recordPayment({
        propertyId: recordForm.propertyId as Id<"properties">,
        residentId: recordForm.residentId as Id<"residents">,
        amount: parseFloat(recordForm.amount),
        type: recordForm.type,
        paymentMethod: recordForm.paymentMethod,
        dueDate: recordForm.dueDate,
        memo: recordForm.memo || undefined,
      });
      toast.success("Payment recorded successfully");
      setShowRecordDialog(false);
      setRecordForm({
        propertyId: "",
        residentId: "",
        amount: "",
        type: "rent",
        paymentMethod: "cash",
        dueDate: "",
        memo: "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to record payment");
    }
  };

  const handleCreatePayment = async () => {
    if (
      !createForm.propertyId ||
      !createForm.residentId ||
      !createForm.amount ||
      !createForm.dueDate
    ) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await createPayment({
        propertyId: createForm.propertyId as Id<"properties">,
        residentId: createForm.residentId as Id<"residents">,
        amount: parseFloat(createForm.amount),
        type: createForm.type,
        paymentMethod: createForm.paymentMethod,
        dueDate: createForm.dueDate,
        memo: createForm.memo || undefined,
      });
      toast.success("Payment entry created");
      setShowCreateDialog(false);
      setCreateForm({
        propertyId: "",
        residentId: "",
        amount: "",
        type: "rent",
        paymentMethod: "ach",
        dueDate: "",
        memo: "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create payment");
    }
  };

  if (!stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rent Collection
          </h1>
          <p className="text-muted-foreground">Loading payment data...</p>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rent Collection
          </h1>
          <p className="text-sm text-muted-foreground">
            Track payments, manage charges, and monitor rent collection.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowRecordDialog(true)}>
            <Receipt className="size-4" /> Record Payment
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-teal text-white hover:bg-teal/90"
          >
            <Plus className="size-4" /> New Charge
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Pending
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(stats.totalPending)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <DollarSign className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Collected
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalCollected)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalOverdue)}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Payments
                </p>
                <p className="text-2xl font-bold">{stats.count}</p>
              </div>
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Receipt className="size-5 text-purple-600" />
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
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-[200px]">
            <Filter className="size-4 mr-1" />
            <SelectValue placeholder="Filter by property" />
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="due">
            Due Now
            {dueNow.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 text-[10px] px-1.5 py-0"
              >
                {dueNow.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="history">Payment History</TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue
            {overdue.length > 0 && (
              <Badge
                variant="destructive"
                className="ml-1.5 text-[10px] px-1.5 py-0"
              >
                {overdue.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {(["due", "upcoming", "history", "overdue"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            {tabData[tab].length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center text-muted-foreground">
                  <CircleDollarSign className="size-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">
                    {tab === "due"
                      ? "No payments due right now"
                      : tab === "upcoming"
                        ? "No upcoming payments"
                        : tab === "history"
                          ? "No payment history yet"
                          : "No overdue payments — great!"}
                  </p>
                  <p className="text-sm mt-1">
                    {tab === "due" || tab === "upcoming"
                      ? "New charges will appear here when created."
                      : tab === "history"
                        ? "Completed payments will show here."
                        : "All payments are on time."}
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
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabData[tab].map((payment) => (
                        <TableRow key={payment._id}>
                          <TableCell className="font-medium">
                            {residentMap.get(payment.residentId) || "—"}
                          </TableCell>
                          <TableCell>
                            {propertyMap.get(payment.propertyId) || "—"}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold">
                              {formatCurrency(payment.amount)}
                            </span>
                            {payment.lateFee ? (
                              <span className="text-red-500 text-xs ml-1">
                                +{formatCurrency(payment.lateFee)} late
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                payment.dueDate < today &&
                                payment.status === "pending"
                                  ? "text-red-600 font-medium"
                                  : ""
                              }
                            >
                              {formatDate(payment.dueDate)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="capitalize text-[11px]"
                            >
                              {payment.type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`${statusColors[payment.status] || ""} text-[11px]`}
                            >
                              {statusIcons[payment.status]}
                              <span className="capitalize ml-0.5">
                                {payment.status}
                              </span>
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
                                {payment.status === "pending" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatus({
                                          id: payment._id as Id<"rentPayments">,
                                          status: "completed",
                                        }).then(() =>
                                          toast.success("Marked as paid")
                                        )
                                      }
                                    >
                                      <CheckCircle2 className="size-4 mr-2" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() =>
                                        updateStatus({
                                          id: payment._id as Id<"rentPayments">,
                                          status: "failed",
                                        }).then(() =>
                                          toast.success("Marked as failed")
                                        )
                                      }
                                    >
                                      <XCircle className="size-4 mr-2" />
                                      Mark Failed
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {payment.status === "completed" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      updateStatus({
                                        id: payment._id as Id<"rentPayments">,
                                        status: "refunded",
                                      }).then(() =>
                                        toast.success("Payment refunded")
                                      )
                                    }
                                  >
                                    <Receipt className="size-4 mr-2" />
                                    Refund
                                  </DropdownMenuItem>
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
          </TabsContent>
        ))}
      </Tabs>

      {/* Record Manual Payment Dialog */}
      <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Manual Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Property *</Label>
                <Select
                  value={recordForm.propertyId || "__none__"}
                  onValueChange={(v) =>
                    setRecordForm({
                      ...recordForm,
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
                  value={recordForm.residentId || "__none__"}
                  onValueChange={(v) =>
                    setRecordForm({
                      ...recordForm,
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
                          !recordForm.propertyId ||
                          r.propertyId === recordForm.propertyId
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recordForm.amount}
                  onChange={(e) =>
                    setRecordForm({ ...recordForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={recordForm.type}
                  onValueChange={(v: any) =>
                    setRecordForm({ ...recordForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="late_fee">Late Fee</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Method *</Label>
                <Select
                  value={recordForm.paymentMethod}
                  onValueChange={(v: any) =>
                    setRecordForm({ ...recordForm, paymentMethod: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={recordForm.dueDate}
                onChange={(e) =>
                  setRecordForm({ ...recordForm, dueDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Memo (optional)</Label>
              <Textarea
                value={recordForm.memo}
                onChange={(e) =>
                  setRecordForm({ ...recordForm, memo: e.target.value })
                }
                rows={2}
                placeholder="Check #, reference, notes..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowRecordDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordPayment}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <CheckCircle2 className="size-4" /> Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Payment Charge Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Rent Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Property *</Label>
                <Select
                  value={createForm.propertyId || "__none__"}
                  onValueChange={(v) =>
                    setCreateForm({
                      ...createForm,
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
                  value={createForm.residentId || "__none__"}
                  onValueChange={(v) =>
                    setCreateForm({
                      ...createForm,
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
                          !createForm.propertyId ||
                          r.propertyId === createForm.propertyId
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={createForm.amount}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, amount: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(v: any) =>
                    setCreateForm({ ...createForm, type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="late_fee">Late Fee</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={createForm.paymentMethod}
                  onValueChange={(v: any) =>
                    setCreateForm({ ...createForm, paymentMethod: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ach">ACH</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date *</Label>
              <Input
                type="date"
                value={createForm.dueDate}
                onChange={(e) =>
                  setCreateForm({ ...createForm, dueDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Memo (optional)</Label>
              <Textarea
                value={createForm.memo}
                onChange={(e) =>
                  setCreateForm({ ...createForm, memo: e.target.value })
                }
                rows={2}
                placeholder="Notes about this charge..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePayment}
                className="bg-teal text-white hover:bg-teal/90"
              >
                <Plus className="size-4" /> Create Charge
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function RentPage() {
  return (
    <FeatureGate feature="rent_collection">
      <RentPageInner />
    </FeatureGate>
  );
}
