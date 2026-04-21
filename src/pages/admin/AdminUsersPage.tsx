import { useMutation, useQuery } from "convex/react";
import {
  Ban,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="size-3.5 text-red-500" />,
  customer: <UserCheck className="size-3.5 text-blue-500" />,
  manager: <Crown className="size-3.5 text-amber-500" />,
  worker: <Wrench className="size-3.5 text-green-500" />,
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-50 text-red-700 border-red-200",
  customer: "bg-blue-50 text-blue-700 border-blue-200",
  manager: "bg-amber-50 text-amber-700 border-amber-200",
  worker: "bg-green-50 text-green-700 border-green-200",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
  canceled: "bg-gray-100 text-gray-600 border-gray-200",
  past_due: "bg-red-50 text-red-700 border-red-200",
};

export function AdminUsersPage() {
  const users = useQuery(api.admin.listUsers);
  const setRole = useMutation(api.admin.setUserRole);
  const toggleActive = useMutation(api.admin.toggleUserActive);
  const assignPlan = useMutation(api.admin.adminAssignPlan);
  const pauseSub = useMutation(api.admin.adminPauseSubscription);
  const resumeSub = useMutation(api.admin.adminResumeSubscription);
  const deleteSub = useMutation(api.admin.adminDeleteSubscription);
  const deleteUser = useMutation(api.admin.adminDeleteUser);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [actionDialog, setActionDialog] = useState<{
    type: "role" | "plan" | "delete";
    userId: Id<"users">;
    userName: string;
    currentValue?: string;
  } | null>(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState(false);

  if (!users) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const matchesSearch =
      !search ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const stats = {
    total: users.length,
    admins: users.filter((u) => u.role === "admin").length,
    onTrial: users.filter((u) => u.isOnTrial).length,
    subscribed: users.filter((u) => u.hasSubscription).length,
    inactive: users.filter((u) => !u.isActive).length,
  };

  async function handleAction() {
    if (!actionDialog) return;
    setLoading(true);
    try {
      if (actionDialog.type === "role" && selectedValue) {
        await setRole({
          targetUserId: actionDialog.userId,
          role: selectedValue as "admin" | "customer" | "manager" | "worker",
        });
        toast.success(`Role updated to ${selectedValue}`);
      } else if (actionDialog.type === "plan" && selectedValue) {
        await assignPlan({
          targetUserId: actionDialog.userId,
          plan: selectedValue as "starter" | "pro" | "enterprise",
        });
        toast.success(`Plan assigned: ${selectedValue}`);
      } else if (actionDialog.type === "delete") {
        await deleteUser({ targetUserId: actionDialog.userId });
        toast.success("User deleted");
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setLoading(false);
      setActionDialog(null);
      setSelectedValue("");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage all users, assign roles and subscription plans
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-red-500" />
              <span className="text-2xl font-bold">{stats.admins}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Admins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-teal" />
              <span className="text-2xl font-bold">{stats.onTrial}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">On Trial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.subscribed}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Subscribed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Ban className="size-4 text-gray-400" />
              <span className="text-2xl font-bold">{stats.inactive}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="worker">Worker</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan / Status</TableHead>
                <TableHead>Trial</TableHead>
                <TableHead className="text-center">Team</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user._id} className={!user.isActive ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`gap-1 ${ROLE_COLORS[user.role || "customer"]}`}
                      >
                        {ROLE_ICONS[user.role || "customer"]}
                        {user.role || "customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.hasSubscription ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="capitalize">
                            {user.plan}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`ml-1 text-[10px] ${STATUS_COLORS[user.subscriptionStatus || "active"]}`}
                          >
                            {user.subscriptionStatus}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No plan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isOnTrial ? (
                        <Badge variant="outline" className="bg-teal/5 text-teal border-teal/20 gap-1">
                          <Sparkles className="size-3" />
                          {user.trialDaysRemaining}d left
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.teamSize > 0 ? (
                        <Badge variant="secondary">{user.teamSize}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {user.isActive ? (
                        <CheckCircle2 className="size-4 text-emerald-500 mx-auto" />
                      ) : (
                        <Ban className="size-4 text-gray-400 mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedValue(user.role || "customer");
                              setActionDialog({
                                type: "role",
                                userId: user._id,
                                userName: user.name || user.email || "User",
                                currentValue: user.role,
                              });
                            }}
                          >
                            <Shield className="size-4" /> Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedValue(user.plan || "starter");
                              setActionDialog({
                                type: "plan",
                                userId: user._id,
                                userName: user.name || user.email || "User",
                                currentValue: user.plan,
                              });
                            }}
                          >
                            <CreditCard className="size-4" /> Assign Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.hasSubscription && user.subscriptionStatus === "active" && (
                            <DropdownMenuItem
                              onClick={async () => {
                                await pauseSub({ targetUserId: user._id });
                                toast.success("Subscription paused");
                              }}
                            >
                              <Pause className="size-4" /> Pause Subscription
                            </DropdownMenuItem>
                          )}
                          {user.subscriptionStatus === "paused" && (
                            <DropdownMenuItem
                              onClick={async () => {
                                await resumeSub({ targetUserId: user._id });
                                toast.success("Subscription resumed");
                              }}
                            >
                              <Play className="size-4" /> Resume Subscription
                            </DropdownMenuItem>
                          )}
                          {user.hasSubscription && (
                            <DropdownMenuItem
                              onClick={async () => {
                                await deleteSub({ targetUserId: user._id });
                                toast.success("Subscription removed");
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="size-4" /> Remove Subscription
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={async () => {
                              await toggleActive({
                                targetUserId: user._id,
                                isActive: !user.isActive,
                              });
                              toast.success(user.isActive ? "User deactivated" : "User activated");
                            }}
                          >
                            {user.isActive ? (
                              <>
                                <Ban className="size-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-4" /> Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setActionDialog({
                                type: "delete",
                                userId: user._id,
                                userName: user.name || user.email || "User",
                              })
                            }
                            className="text-destructive"
                          >
                            <Trash2 className="size-4" /> Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === "role"
                ? "Change User Role"
                : actionDialog?.type === "plan"
                  ? "Assign Subscription Plan"
                  : "Delete User"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === "delete"
                ? `Are you sure you want to delete ${actionDialog.userName}? This will remove their profile, subscription, and onboarding data.`
                : `Update for ${actionDialog?.userName}`}
            </DialogDescription>
          </DialogHeader>

          {actionDialog?.type === "role" && (
            <div className="space-y-3">
              <Label>Role</Label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <span className="flex items-center gap-2">
                      <Shield className="size-3.5 text-red-500" /> Admin
                    </span>
                  </SelectItem>
                  <SelectItem value="customer">
                    <span className="flex items-center gap-2">
                      <UserCheck className="size-3.5 text-blue-500" /> Customer
                    </span>
                  </SelectItem>
                  <SelectItem value="manager">
                    <span className="flex items-center gap-2">
                      <Crown className="size-3.5 text-amber-500" /> Manager
                    </span>
                  </SelectItem>
                  <SelectItem value="worker">
                    <span className="flex items-center gap-2">
                      <Wrench className="size-3.5 text-green-500" /> Worker
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {actionDialog?.type === "plan" && (
            <div className="space-y-3">
              <Label>Plan</Label>
              <Select value={selectedValue} onValueChange={setSelectedValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter ($49/mo)</SelectItem>
                  <SelectItem value="pro">Professional ($149/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (Custom)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This assigns the plan directly without billing. Use for comps or manual management.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={loading}
              variant={actionDialog?.type === "delete" ? "destructive" : "default"}
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              {actionDialog?.type === "delete" ? "Delete" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
