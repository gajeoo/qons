import { useMutation, useQuery } from "convex/react";
import {
  Check,
  Copy,
  DollarSign,
  Gift,
  Link2,
  Loader2,
  Mail,
  Send,
  Share2,
  Star,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FeatureGate } from "@/components/FeatureGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../../convex/_generated/api";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  signed_up: "bg-blue-100 text-blue-700",
  converted: "bg-green-100 text-green-700",
  rewarded: "bg-purple-100 text-purple-700",
  expired: "bg-gray-100 text-gray-600",
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ReferralsPageInner() {
  const referralCode = useQuery(api.referrals.getMyCode, {});
  const referrals = useQuery(api.referrals.listMyReferrals, {}) || [];
  const stats = useQuery(api.referrals.getReferralStats, {});
  const submitReferral = useMutation(api.referrals.submitReferral);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const code = referralCode || "";
  const referralLink = code ? `${window.location.origin}?ref=${code}` : "";

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setSending(true);
    try {
      await submitReferral({ referredEmail: inviteEmail });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setShowInvite(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  if (!stats || referralCode === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
          <p className="text-muted-foreground">Loading referral data...</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Referrals</h1>
          <p className="text-sm text-muted-foreground">
            Invite others to Qons and earn rewards when they subscribe.
          </p>
        </div>
        <Button
          onClick={() => setShowInvite(true)}
          className="bg-teal text-white hover:bg-teal/90"
        >
          <Send className="size-4" /> Invite by Email
        </Button>
      </div>

      {/* Referral Code Card */}
      <Card className="border-teal/30 bg-gradient-to-r from-teal/5 to-sky-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                Your Referral Code
              </p>
              <div className="flex items-center gap-3">
                <code className="text-2xl font-bold tracking-widest text-teal bg-white px-4 py-2 rounded-lg border">
                  {code || "Send your first referral to get a code"}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCode}
                  disabled={!code}
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
            {code && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Share Link
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={referralLink}
                    className="w-[260px] text-xs bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    disabled={!referralLink}
                  >
                    <Link2 className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Referrals
                </p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="size-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <Users className="size-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Signed Up
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.signedUp}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserPlus className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Converted
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.converted}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-green-100 flex items-center justify-center">
                <UserCheck className="size-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Rewards Earned
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {stats.rewarded}
                </p>
              </div>
              <div className="size-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Gift className="size-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="size-4 text-teal" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: "1",
                icon: <Share2 className="size-6" />,
                title: "Share Your Code",
                desc: "Send your unique referral code or link to colleagues and friends.",
              },
              {
                step: "2",
                icon: <UserPlus className="size-6" />,
                title: "They Sign Up",
                desc: "Your friend creates a Qons account using your referral link.",
              },
              {
                step: "3",
                icon: <DollarSign className="size-6" />,
                title: "They Subscribe",
                desc: "Once they choose a paid plan, both referrals become eligible.",
              },
              {
                step: "4",
                icon: <Gift className="size-6" />,
                title: "Both Get Rewarded",
                desc: "You and your friend each get 1 month free on your subscription!",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="size-12 rounded-full bg-teal/10 text-teal mx-auto flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Referral History */}
      {referrals.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            <Users className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No referrals yet</p>
            <p className="text-sm mt-1">
              Share your code to start earning rewards.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referral History</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((ref) => (
                  <TableRow key={ref._id}>
                    <TableCell className="font-medium">
                      {ref.referredEmail || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${statusColors[ref.status] || ""} text-[11px] capitalize`}
                      >
                        {ref.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ref.createdAt)}
                    </TableCell>
                    <TableCell>
                      {ref.rewardType ? (
                        <span className="text-green-600 font-medium text-sm">
                          {ref.rewardType}
                          {ref.rewardAmount
                            ? ` — $${ref.rewardAmount}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite by Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll send them an email with your referral link and a
              brief intro to Qons.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowInvite(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={sending}
                className="bg-teal text-white hover:bg-teal/90"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mail className="size-4" />
                )}
                Send Invite
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReferralsPage() {
  return (
    <FeatureGate feature="referrals">
      <ReferralsPageInner />
    </FeatureGate>
  );
}
