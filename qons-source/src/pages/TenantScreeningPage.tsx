import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Eye,
  Loader2,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
  UserSearch,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  expired: "bg-gray-100 text-gray-600",
};

const recommendationColors: Record<string, string> = {
  approve: "bg-green-100 text-green-700",
  conditional: "bg-amber-100 text-amber-700",
  deny: "bg-red-100 text-red-700",
  review: "bg-blue-100 text-blue-700",
};

const recommendationIcons: Record<string, React.ReactNode> = {
  approve: <ThumbsUp className="size-3" />,
  conditional: <AlertCircle className="size-3" />,
  deny: <ThumbsDown className="size-3" />,
  review: <Eye className="size-3" />,
};

const backgroundColors: Record<string, string> = {
  clear: "text-green-600",
  flags_found: "text-red-600",
  pending: "text-amber-600",
  unavailable: "text-gray-500",
};

function getCreditScoreColor(score?: number) {
  if (!score) return "text-gray-500";
  if (score >= 740) return "text-green-600";
  if (score >= 670) return "text-sky-600";
  if (score >= 580) return "text-amber-600";
  return "text-red-600";
}

function getCreditScoreLabel(score?: number) {
  if (!score) return "N/A";
  if (score >= 740) return "Excellent";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

function getCreditScorePercent(score?: number) {
  if (!score) return 0;
  return Math.max(0, Math.min(100, ((score - 300) / 550) * 100));
}

function TenantScreeningPageInner() {
  const screenings = useQuery(api.tenantScreening.list, {}) || [];
  const properties = useQuery(api.properties.list, {}) || [];
  const createScreening = useMutation(api.tenantScreening.create);

  // Build property lookup map
  const propertyMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of properties) {
      map[p._id] = p.name;
    }
    return map;
  }, [properties]);

  // Compute stats from screenings list
  const stats = useMemo(() => {
    const pending = screenings.filter((s) => s.status === "pending").length;
    const completed = screenings.filter((s) => s.status === "completed").length;
    const approved = screenings.filter((s) => s.recommendation === "approve").length;
    const approvalRate = completed > 0 ? Math.round((approved / completed) * 100) : 0;
    return { pending, completed, approvalRate };
  }, [screenings]);

  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    propertyId: "",
    unitNumber: "",
    notes: "",
  });

  const filtered = useMemo(() => {
    let result = screenings;
    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.applicantName.toLowerCase().includes(q) ||
          s.applicantEmail.toLowerCase().includes(q) ||
          (propertyMap[s.propertyId] || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [screenings, filterStatus, search, propertyMap]);

  const detailScreening = showDetail
    ? screenings.find((s) => s._id === showDetail)
    : null;

  const handleCreate = async () => {
    if (!form.applicantName || !form.applicantEmail || !form.propertyId) {
      toast.error("Fill all required fields");
      return;
    }
    try {
      await createScreening({
        applicantName: form.applicantName,
        applicantEmail: form.applicantEmail,
        applicantPhone: form.applicantPhone || undefined,
        propertyId: form.propertyId as Id<"properties">,
        unitNumber: form.unitNumber || undefined,
        notes: form.notes || undefined,
      });
      toast.success("Screening request created");
      setShowForm(false);
      setForm({
        applicantName: "",
        applicantEmail: "",
        applicantPhone: "",
        propertyId: "",
        unitNumber: "",
        notes: "",
      });
    } catch (e: any) {
      toast.error(e.message || "Failed to create screening");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Tenant Screening
          </h1>
          <p className="text-sm text-muted-foreground">
            Screen potential tenants with credit, background, and income checks.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="bg-teal text-white hover:bg-teal/90"
        >
          <Plus className="size-4" /> New Screening
        </Button>
      </div>

      {/* Integration Notice */}
      <Card className="border-sky-200 bg-sky-50/50">
        <CardContent className="p-3 flex items-center gap-2 text-sm">
          <Shield className="size-4 text-sky-600 shrink-0" />
          <p className="text-sky-800">
            <strong>Demo Mode:</strong> Screening results are simulated.
            Integration with a live screening provider (TransUnion, Experian,
            etc.) is required for production data.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Pending Screenings
                </p>
                <p className="text-2xl font-bold">{stats.pending}</p>
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
                  Approval Rate
                </p>
                <p className="text-2xl font-bold">{stats.approvalRate}%</p>
              </div>
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <UserCheck className="size-5 text-sky-600" />
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
            placeholder="Search applicants..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <UserSearch className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No screenings found</p>
            <p className="text-sm mt-1">
              Start a new screening to vet potential tenants.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credit</TableHead>
                  <TableHead>Background</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((screening) => (
                  <TableRow key={screening._id}>
                    <TableCell className="font-medium">
                      {screening.applicantName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {screening.applicantEmail}
                    </TableCell>
                    <TableCell>
                      {propertyMap[screening.propertyId] || "—"}
                      {screening.unitNumber && (
                        <span className="text-muted-foreground text-xs ml-1">
                          #{screening.unitNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[screening.status] || ""} text-[11px] capitalize`}
                      >
                        {screening.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {screening.creditScore ? (
                        <span
                          className={`font-semibold ${getCreditScoreColor(screening.creditScore)}`}
                        >
                          {screening.creditScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {screening.backgroundStatus ? (
                        <span
                          className={`capitalize font-medium text-sm ${backgroundColors[screening.backgroundStatus] || ""}`}
                        >
                          {screening.backgroundStatus === "clear" && (
                            <ShieldCheck className="size-3 inline mr-0.5" />
                          )}
                          {screening.backgroundStatus.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {screening.recommendation ? (
                        <Badge
                          className={`${recommendationColors[screening.recommendation] || ""} text-[11px] capitalize`}
                        >
                          {recommendationIcons[screening.recommendation]}
                          <span className="ml-0.5">
                            {screening.recommendation}
                          </span>
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(screening.requestedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        onClick={() => setShowDetail(screening._id)}
                      >
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!showDetail}
        onOpenChange={(open) => !open && setShowDetail(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Screening Details</DialogTitle>
          </DialogHeader>
          {detailScreening && (
            <div className="space-y-5">
              {/* Applicant Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Applicant</p>
                  <p className="font-medium">{detailScreening.applicantName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{detailScreening.applicantEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Property</p>
                  <p className="font-medium">
                    {propertyMap[detailScreening.propertyId] || "—"}
                    {detailScreening.unitNumber
                      ? ` #${detailScreening.unitNumber}`
                      : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    className={`${statusColors[detailScreening.status] || ""} capitalize`}
                  >
                    {detailScreening.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              {/* Credit Score Gauge */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <DollarSign className="size-4" />
                      Credit Score
                    </p>
                    <div className="text-right">
                      <span
                        className={`text-2xl font-bold ${getCreditScoreColor(detailScreening.creditScore)}`}
                      >
                        {detailScreening.creditScore || "N/A"}
                      </span>
                      <p
                        className={`text-xs ${getCreditScoreColor(detailScreening.creditScore)}`}
                      >
                        {getCreditScoreLabel(detailScreening.creditScore)}
                      </p>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress
                      value={getCreditScorePercent(detailScreening.creditScore)}
                      className="h-3"
                      variant={
                        (detailScreening.creditScore || 0) >= 670
                          ? "success"
                          : (detailScreening.creditScore || 0) >= 580
                            ? "warning"
                            : "destructive"
                      }
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>300</span>
                      <span>580</span>
                      <span>670</span>
                      <span>740</span>
                      <span>850</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Other checks */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Background Check
                    </p>
                    <p
                      className={`font-semibold capitalize ${backgroundColors[detailScreening.backgroundStatus || "unavailable"]}`}
                    >
                      {detailScreening.backgroundStatus === "clear" && (
                        <ShieldCheck className="size-4 inline mr-1" />
                      )}
                      {(detailScreening.backgroundStatus || "unavailable").replace(
                        "_",
                        " "
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Income Verified
                    </p>
                    <p className="font-semibold">
                      {detailScreening.incomeVerified === true
                        ? "✓ Verified"
                        : detailScreening.incomeVerified === false
                          ? "✗ Not Verified"
                          : "Pending"}
                      {detailScreening.monthlyIncome && (
                        <span className="text-sm text-muted-foreground ml-1">
                          ($
                          {detailScreening.monthlyIncome.toLocaleString()}/mo)
                        </span>
                      )}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Eviction History
                    </p>
                    <p
                      className={`font-semibold ${
                        detailScreening.evictionHistory === true
                          ? "text-red-600"
                          : detailScreening.evictionHistory === false
                            ? "text-green-600"
                            : ""
                      }`}
                    >
                      {detailScreening.evictionHistory === true
                        ? "⚠ Found"
                        : detailScreening.evictionHistory === false
                          ? "✓ None"
                          : "Pending"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Employer
                    </p>
                    <p className="font-semibold">
                      {detailScreening.employerName || "—"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendation */}
              {detailScreening.recommendation && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium">Recommendation:</p>
                  <Badge
                    className={`${recommendationColors[detailScreening.recommendation] || ""} capitalize`}
                  >
                    {recommendationIcons[detailScreening.recommendation]}
                    <span className="ml-0.5">
                      {detailScreening.recommendation}
                    </span>
                  </Badge>
                </div>
              )}

              {detailScreening.notes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-lg p-3">
                    {detailScreening.notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
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

      {/* New Screening Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Tenant Screening</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Applicant Name *</Label>
              <Input
                value={form.applicantName}
                onChange={(e) =>
                  setForm({ ...form, applicantName: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.applicantEmail}
                onChange={(e) =>
                  setForm({ ...form, applicantEmail: e.target.value })
                }
                placeholder="applicant@email.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                type="tel"
                value={form.applicantPhone}
                onChange={(e) =>
                  setForm({ ...form, applicantPhone: e.target.value })
                }
                placeholder="(555) 123-4567"
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
                <Label>Unit</Label>
                <Input
                  value={form.unitNumber}
                  onChange={(e) =>
                    setForm({ ...form, unitNumber: e.target.value })
                  }
                  placeholder="e.g., 4B"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Additional context..."
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
                <Plus className="size-4" /> Start Screening
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TenantScreeningPage() {
  return (
    <FeatureGate feature="tenant_screening">
      <TenantScreeningPageInner />
    </FeatureGate>
  );
}
