import { useAction, useMutation, useQuery } from "convex/react";
import {
  Check,
  Clock,
  Mail,
  MessageSquare,
  Reply,
  Search,
  Send,
  StickyNote,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../convex/_generated/api";

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  new: {
    label: "New",
    color: "bg-chart-3/10 text-chart-3 border-chart-3/30",
    icon: UserPlus,
  },
  contacted: {
    label: "Contacted",
    color: "bg-chart-2/10 text-chart-2 border-chart-2/30",
    icon: Mail,
  },
  converted: {
    label: "Converted",
    color: "bg-teal/10 text-teal border-teal/30",
    icon: Check,
  },
  archived: {
    label: "Archived",
    color: "bg-muted text-muted-foreground border-border",
    icon: X,
  },
};

const typeLabels: Record<string, string> = {
  demo: "General Inquiry",
  general: "General Inquiry",
  trial: "Trial Question",
  beta: "Free Trial Signup",
  question: "Question",
  partnership: "Partnership",
  pricing: "Pricing",
  support: "Support",
};

export function AdminLeadsPage() {
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteDialogLead, setNoteDialogLead] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [replyDialogLead, setReplyDialogLead] = useState<any | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const leads = useQuery(
    api.leads.list,
    filterStatus
      ? {
          status: filterStatus as
            | "new"
            | "contacted"
            | "converted"
            | "archived",
        }
      : {},
  );
  const leadStats = useQuery(api.leads.getStats);
  const updateStatus = useMutation(api.leads.updateStatus);
  const addNote = useMutation(api.leads.addNote);
  const sendReplyEmail = useAction(api.leads.sendReplyEmail);

  const filteredLeads = leads?.filter(lead => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      lead.company?.toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (
    leadId: string,
    newStatus: "new" | "contacted" | "converted" | "archived",
  ) => {
    try {
      await updateStatus({ leadId: leadId as any, status: newStatus });
      toast.success(`Lead status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleSaveNote = async () => {
    if (!noteDialogLead) return;
    try {
      await addNote({ leadId: noteDialogLead as any, notes: noteText });
      toast.success("Note saved");
      setNoteDialogLead(null);
      setNoteText("");
    } catch {
      toast.error("Failed to save note");
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leads</h1>
        <p className="text-muted-foreground mt-1">
          Manage contact form submissions and inquiries
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          {
            label: "Total",
            value: leadStats?.total ?? 0,
            color: "text-foreground",
          },
          { label: "New", value: leadStats?.new ?? 0, color: "text-chart-3" },
          {
            label: "Contacted",
            value: leadStats?.contacted ?? 0,
            color: "text-chart-2",
          },
          {
            label: "Converted",
            value: leadStats?.converted ?? 0,
            color: "text-teal",
          },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterStatus === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(null)}
          >
            All
          </Button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <Button
              key={key}
              variant={filterStatus === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(filterStatus === key ? null : key)}
            >
              {config.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {filteredLeads === undefined ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading leads...
            </CardContent>
          </Card>
        ) : filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No leads found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Leads will appear here when visitors submit the contact form
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredLeads.map(lead => {
            const status = statusConfig[lead.status];
            return (
              <Card
                key={lead._id}
                className="hover:shadow-sm transition-shadow"
              >
                <CardContent className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Lead Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">
                          {lead.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${status.color}`}
                        >
                          {status.label}
                        </Badge>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {typeLabels[lead.inquiryType] ?? lead.inquiryType}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{lead.email}</span>
                        {lead.company && <span>• {lead.company}</span>}
                        {lead.properties && (
                          <span>• {lead.properties} properties</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(lead._creationTime)}
                        </span>
                      </div>
                      {lead.message && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {lead.message}
                        </p>
                      )}
                      {lead.notes && (
                        <div className="flex items-start gap-1.5 mt-2 text-xs bg-muted/50 rounded-lg p-2">
                          <StickyNote className="size-3 mt-0.5 text-chart-2 shrink-0" />
                          <span className="text-muted-foreground">
                            {lead.notes}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.status !== "contacted" &&
                        lead.status !== "archived" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(lead._id, "contacted")
                            }
                          >
                            <Mail className="size-3.5" />
                            Mark Contacted
                          </Button>
                        )}
                      {lead.status !== "converted" &&
                        lead.status !== "archived" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(lead._id, "converted")
                            }
                          >
                            <Check className="size-3.5" />
                            Convert
                          </Button>
                        )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyDialogLead(lead);
                          setReplyText("");
                        }}
                      >
                        <Reply className="size-3.5" />
                        Reply
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setNoteDialogLead(lead._id);
                          setNoteText(lead.notes ?? "");
                        }}
                      >
                        <StickyNote className="size-3.5" />
                      </Button>
                      {lead.status !== "archived" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground"
                          onClick={() =>
                            handleStatusChange(lead._id, "archived")
                          }
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog
        open={!!replyDialogLead}
        onOpenChange={open => {
          if (!open) {
            setReplyDialogLead(null);
            setReplyText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="size-4 text-teal" />
              Reply to {replyDialogLead?.name}
            </DialogTitle>
          </DialogHeader>
          {replyDialogLead && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">
                  Original message from <strong>{replyDialogLead.email}</strong>
                  :
                </p>
                <p className="text-muted-foreground">
                  {replyDialogLead.message || "No message"}
                </p>
              </div>
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="min-h-[150px]"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyDialogLead(null);
                    setReplyText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={!replyText.trim() || sendingReply}
                  onClick={async () => {
                    if (!replyDialogLead || !replyText.trim()) return;
                    setSendingReply(true);
                    try {
                      const result = await sendReplyEmail({
                        leadId: replyDialogLead._id,
                        replyMessage: replyText.trim(),
                      });
                      if (result.success) {
                        toast.success(`Reply sent to ${replyDialogLead.email}`);
                        setReplyDialogLead(null);
                        setReplyText("");
                      } else {
                        toast.error(result.error || "Failed to send reply");
                      }
                    } catch {
                      toast.error("Failed to send reply");
                    } finally {
                      setSendingReply(false);
                    }
                  }}
                >
                  {sendingReply ? "Sending..." : "Send Reply"}
                  {!sendingReply && <Send className="size-3.5" />}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog
        open={!!noteDialogLead}
        onOpenChange={open => {
          if (!open) {
            setNoteDialogLead(null);
            setNoteText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add internal notes about this lead..."
            className="min-h-[120px]"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setNoteDialogLead(null);
                setNoteText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>Save Note</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
