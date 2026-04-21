import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  Lock,
  Mail,
  Settings2,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  Wrench,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { api } from "../../convex/_generated/api";
import { FeatureGate } from "@/components/FeatureGate";
import type { Id } from "../../convex/_generated/dataModel";

// All assignable features with friendly labels
const ALL_FEATURES = [
  { key: "dashboard", label: "Dashboard", description: "View overview metrics" },
  { key: "properties", label: "Properties", description: "Manage properties" },
  { key: "residents", label: "Residents", description: "Manage residents" },
  { key: "staff", label: "Staff", description: "Staff directory" },
  { key: "schedule", label: "Scheduling", description: "View & manage shifts" },
  { key: "time_tracking", label: "Time Tracking", description: "GPS clock in/out" },
  { key: "payroll_csv", label: "Payroll (CSV)", description: "Export payroll data" },
  { key: "basic_analytics", label: "Analytics", description: "View reports" },
  { key: "payroll_integrations", label: "Payroll Integrations", description: "ADP, QuickBooks" },
  { key: "executive_analytics", label: "Executive Analytics", description: "Advanced reports" },
  { key: "amenities", label: "Amenities", description: "Amenity booking" },
  { key: "team_management", label: "Team Management", description: "Invite & manage team" },
  { key: "shift_swaps", label: "Shift Swaps", description: "Request shift swaps" },
  { key: "hoa", label: "HOA Management", description: "HOA suite" },
  { key: "reserve_fund", label: "Reserve Fund", description: "Fund tracking" },
];

function TeamPageInner() {
  const team = useQuery(api.invitations.getMyTeam);
  const invitations = useQuery(api.invitations.listMine);
  const createInvite = useMutation(api.invitations.create);
  const revokeInvite = useMutation(api.invitations.revoke);
  const updateFeatures = useMutation(api.invitations.updateTeamMemberFeatures);
  const toggleActive = useMutation(api.invitations.toggleTeamMemberActive);
  const updateRole = useMutation(api.invitations.updateTeamMemberRole);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "worker">("worker");
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Feature assignment dialog state
  const [editingMember, setEditingMember] = useState<{
    id: Id<"userProfiles">;
    name: string;
    features: string[];
    useRestrictions: boolean;
  } | null>(null);
  const [savingFeatures, setSavingFeatures] = useState(false);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    try {
      const result = await createInvite({ email: inviteEmail.trim(), role: inviteRole });
      if (result.success && result.token) {
        const link = `${window.location.origin}/signup?invite=${result.token}`;
        setInviteLink(link);
        toast.success("Invitation created!");
        setInviteEmail("");
      } else {
        toast.error(result.error || "Failed to create invitation");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to create invitation");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/signup?invite=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
  };

  const openFeatureEditor = (member: NonNullable<typeof team>[number]) => {
    const hasRestrictions = !!member.allowedFeatures && member.allowedFeatures.length > 0;
    setEditingMember({
      id: member._id,
      name: member.name || member.email,
      features: member.allowedFeatures || [],
      useRestrictions: hasRestrictions,
    });
  };

  const handleSaveFeatures = async () => {
    if (!editingMember) return;
    setSavingFeatures(true);
    try {
      const result = await updateFeatures({
        memberProfileId: editingMember.id,
        allowedFeatures: editingMember.useRestrictions ? editingMember.features : null,
      });
      if (result.success) {
        toast.success("Feature access updated");
        setEditingMember(null);
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to update");
    } finally {
      setSavingFeatures(false);
    }
  };

  const toggleFeature = (feature: string) => {
    if (!editingMember) return;
    setEditingMember({
      ...editingMember,
      features: editingMember.features.includes(feature)
        ? editingMember.features.filter((f) => f !== feature)
        : [...editingMember.features, feature],
    });
  };

  const handleToggleActive = async (memberId: Id<"userProfiles">, currentlyActive: boolean) => {
    try {
      const result = await toggleActive({ memberProfileId: memberId, isActive: !currentlyActive });
      if (result.success) {
        toast.success(currentlyActive ? "Member deactivated" : "Member activated");
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRoleChange = async (memberId: Id<"userProfiles">, newRole: "manager" | "worker") => {
    try {
      const result = await updateRole({ memberProfileId: memberId, role: newRole });
      if (result.success) {
        toast.success(`Role updated to ${newRole}`);
      } else {
        toast.error(result.error || "Failed");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const pendingInvites = invitations?.filter((i) => i.status === "pending") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Invite and manage team members in your organization. Members share your subscription and you control their feature access.
          </p>
        </div>
        <Dialog open={showInvite} onOpenChange={(o) => { setShowInvite(o); if (!o) setInviteLink(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-teal text-white hover:bg-teal/90">
              <UserPlus className="size-4" /> Invite Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                They'll be a sub-account under your organization — sharing your subscription with features you assign.
              </DialogDescription>
            </DialogHeader>

            {inviteLink ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-medium text-emerald-800">Invitation Created!</p>
                  <p className="text-xs text-emerald-600 mt-1">Share this link with your team member</p>
                </div>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Copied!");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={() => { setShowInvite(false); setInviteLink(null); }}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      placeholder="worker@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "manager" | "worker")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worker">
                          <span className="flex items-center gap-2">
                            <Wrench className="size-3.5 text-green-500" /> Worker — Can clock in, view shifts & assigned jobs
                          </span>
                        </SelectItem>
                        <SelectItem value="manager">
                          <span className="flex items-center gap-2">
                            <Crown className="size-3.5 text-amber-500" /> Manager — Can invite workers, manage staff
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground text-sm">How sub-accounts work:</p>
                    <p>• Team members share your subscription — no separate billing</p>
                    <p>• You control which features they can access</p>
                    <p>• If your subscription ends, their access pauses too</p>
                    <p>• You can deactivate or remove members anytime</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                  <Button onClick={handleInvite} disabled={loading}>
                    {loading && <Loader2 className="size-4 animate-spin" />}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="size-5" /> Team Members ({team?.length ?? 0})
          </CardTitle>
          <CardDescription>Sub-accounts under your organization. They share your subscription and you control their access.</CardDescription>
        </CardHeader>
        <CardContent>
          {!team || team.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="size-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No team members yet</p>
              <p className="text-sm mt-1">Invite workers and managers to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((member) => {
                  const hasRestrictions = !!member.allowedFeatures && member.allowedFeatures.length > 0;
                  return (
                    <TableRow key={member._id}>
                      <TableCell className="font-medium">{member.name || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(v) => handleRoleChange(member._id, v as "manager" | "worker")}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="worker">
                              <span className="flex items-center gap-1.5">
                                <Wrench className="size-3 text-green-500" /> Worker
                              </span>
                            </SelectItem>
                            <SelectItem value="manager">
                              <span className="flex items-center gap-1.5">
                                <Crown className="size-3 text-amber-500" /> Manager
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {hasRestrictions ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Lock className="size-3" />
                            {member.allowedFeatures!.length} features
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-teal border-teal/30">
                            <Shield className="size-3" />
                            Full access
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openFeatureEditor(member)}
                          title="Manage features"
                        >
                          <Settings2 className="size-3.5" /> Features
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={member.isActive ? "text-destructive hover:text-destructive" : "text-emerald-600 hover:text-emerald-600"}
                          onClick={() => handleToggleActive(member._id, member.isActive)}
                          title={member.isActive ? "Deactivate" : "Activate"}
                        >
                          {member.isActive ? (
                            <><UserMinus className="size-3.5" /> Deactivate</>
                          ) : (
                            <><UserPlus className="size-3.5" /> Activate</>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Feature Assignment Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(o) => { if (!o) setEditingMember(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-5" />
              Feature Access — {editingMember?.name}
            </DialogTitle>
            <DialogDescription>
              Control which features this team member can access. They can only use features that are both in your plan AND assigned here.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Toggle between full access and restricted */}
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox
                id="use-restrictions"
                checked={editingMember?.useRestrictions ?? false}
                onCheckedChange={(checked) => {
                  if (editingMember) {
                    setEditingMember({
                      ...editingMember,
                      useRestrictions: !!checked,
                      features: checked ? (editingMember.features.length > 0 ? editingMember.features : ["dashboard"]) : [],
                    });
                  }
                }}
              />
              <div>
                <Label htmlFor="use-restrictions" className="font-medium cursor-pointer">
                  Restrict feature access
                </Label>
                <p className="text-xs text-muted-foreground">
                  {editingMember?.useRestrictions
                    ? "Only checked features will be accessible"
                    : "Member has access to all features in your plan"}
                </p>
              </div>
            </div>

            {/* Feature checkboxes */}
            {editingMember?.useRestrictions && (
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {ALL_FEATURES.map((feat) => (
                  <label
                    key={feat.key}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={editingMember.features.includes(feat.key)}
                      onCheckedChange={() => toggleFeature(feat.key)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{feat.label}</p>
                      <p className="text-xs text-muted-foreground">{feat.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {editingMember?.useRestrictions && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editingMember && setEditingMember({ ...editingMember, features: ALL_FEATURES.map((f) => f.key) })}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => editingMember && setEditingMember({ ...editingMember, features: ["dashboard"] })}
                >
                  Clear All
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)}>Cancel</Button>
            <Button onClick={handleSaveFeatures} disabled={savingFeatures}>
              {savingFeatures && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="size-5" /> Pending Invitations ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => (
                  <TableRow key={inv._id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{inv.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyLink((invitations?.find((i) => i._id === inv._id) as any)?.token ?? "")}
                      >
                        <Copy className="size-3.5" /> Copy Link
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={async () => {
                          await revokeInvite({ invitationId: inv._id });
                          toast.success("Invitation revoked");
                        }}
                      >
                        <XCircle className="size-3.5" /> Revoke
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function TeamPage() {
  return (
    <FeatureGate feature="team_management">
      <TeamPageInner />
    </FeatureGate>
  );
}
