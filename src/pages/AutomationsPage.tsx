import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Cog,
  PauseCircle,
  PlayCircle,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
  XCircle,
  Zap,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";

// ========== CONSTANTS ==========

const TRIGGERS = [
  {
    value: "task_created",
    label: "Task Created",
    icon: "📋",
    desc: "When a new task is created",
  },
  {
    value: "task_status_changed",
    label: "Task Status Changed",
    icon: "🔄",
    desc: "When a task status updates",
  },
  {
    value: "lease_expiring",
    label: "Lease Expiring Soon",
    icon: "📅",
    desc: "When a lease is about to expire",
  },
  {
    value: "rent_overdue",
    label: "Rent/Dues Overdue",
    icon: "💰",
    desc: "When rent or HOA dues are past due",
  },
  {
    value: "shift_no_show",
    label: "Shift No-Show",
    icon: "🚫",
    desc: "When staff doesn't show up for a shift",
  },
  {
    value: "maintenance_request",
    label: "Maintenance Request",
    icon: "🔧",
    desc: "When a maintenance task is created",
  },
  {
    value: "hoa_violation_created",
    label: "HOA Violation",
    icon: "⚠️",
    desc: "When an HOA violation is reported",
  },
  {
    value: "new_resident",
    label: "New Resident",
    icon: "🏠",
    desc: "When a new resident is added",
  },
  {
    value: "schedule",
    label: "Scheduled (Recurring)",
    icon: "⏰",
    desc: "Run on a schedule",
  },
] as const;

const ACTION_TYPES = [
  { value: "create_task", label: "Create Task", icon: "📋" },
  { value: "assign_staff", label: "Assign Staff", icon: "👤" },
  { value: "update_status", label: "Update Status", icon: "🔄" },
  { value: "send_notification", label: "Send Notification", icon: "🔔" },
  { value: "escalate_priority", label: "Escalate Priority", icon: "🔺" },
  { value: "add_note", label: "Add Note", icon: "📝" },
] as const;

const OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
] as const;

// Pre-built templates for one-click setup
const TEMPLATES = [
  {
    name: "Lease Expiry Reminder",
    description: "Auto-create a task 30 days before any lease expires",
    trigger: "lease_expiring",
    conditions: [
      { field: "days_before_expiry", operator: "less_than", value: "30" },
    ],
    actions: [
      {
        type: "create_task",
        config: JSON.stringify({
          title: "Lease Expiring - Follow Up",
          priority: "high",
          category: "administrative",
        }),
      },
    ],
    cronExpression: "daily",
    icon: "📅",
  },
  {
    name: "Overdue Rent Escalation",
    description: "Auto-flag overdue rent and create follow-up tasks",
    trigger: "rent_overdue",
    conditions: [],
    actions: [
      {
        type: "create_task",
        config: JSON.stringify({
          title: "Overdue Rent - Collection Needed",
          priority: "urgent",
          category: "administrative",
        }),
      },
    ],
    cronExpression: "daily",
    icon: "💰",
  },
  {
    name: "Maintenance Auto-Assign",
    description: "Auto-assign maintenance tasks to available staff",
    trigger: "task_created",
    conditions: [
      { field: "category", operator: "equals", value: "maintenance" },
    ],
    actions: [
      { type: "escalate_priority", config: JSON.stringify({}) },
      {
        type: "add_note",
        config: JSON.stringify({
          note: "Auto-escalated: maintenance priority",
        }),
      },
    ],
    icon: "🔧",
  },
  {
    name: "HOA Violation Warning",
    description: "Create a follow-up task when a violation is reported",
    trigger: "hoa_violation_created",
    conditions: [],
    actions: [
      {
        type: "create_task",
        config: JSON.stringify({
          title: "HOA Violation Follow-Up",
          priority: "high",
          category: "hoa",
        }),
      },
    ],
    icon: "⚠️",
  },
  {
    name: "New Resident Onboarding",
    description: "Create welcome tasks when a new resident moves in",
    trigger: "new_resident",
    conditions: [],
    actions: [
      {
        type: "create_task",
        config: JSON.stringify({
          title: "Welcome Package - New Resident",
          priority: "medium",
          category: "administrative",
        }),
      },
      {
        type: "send_notification",
        config: JSON.stringify({
          message: "New resident added — prepare welcome package",
        }),
      },
    ],
    icon: "🏠",
  },
  {
    name: "Task Completion Tracker",
    description: "Send a notification when high-priority tasks are completed",
    trigger: "task_status_changed",
    conditions: [
      { field: "newStatus", operator: "equals", value: "completed" },
      { field: "priority", operator: "equals", value: "high" },
    ],
    actions: [
      {
        type: "send_notification",
        config: JSON.stringify({ message: "High-priority task completed" }),
      },
    ],
    icon: "✅",
  },
];

// ========== COMPONENTS ==========

function StatsCards({ stats }: { stats: any }) {
  if (!stats) return null;
  const cards = [
    {
      label: "Active Rules",
      value: stats.activeRules,
      total: stats.totalRules,
      icon: Zap,
      color: "text-blue-600 bg-blue-100",
    },
    {
      label: "Runs (24h)",
      value: stats.runsLast24h,
      icon: Activity,
      color: "text-emerald-600 bg-emerald-100",
    },
    {
      label: "Runs (7d)",
      value: stats.runsLast7d,
      icon: Clock,
      color: "text-purple-600 bg-purple-100",
    },
    {
      label: "Success Rate",
      value: `${stats.successRate}%`,
      icon: CheckCircle2,
      color: "text-green-600 bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`p-2 rounded-lg ${c.color}`}>
              <c.icon className="size-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {c.value}
                {c.total !== undefined && (
                  <span className="text-sm text-muted-foreground font-normal">
                    /{c.total}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RuleCard({
  rule,
  onToggle,
  onDelete,
}: {
  rule: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const triggerInfo = TRIGGERS.find(t => t.value === rule.trigger);

  return (
    <Card
      className={`transition-opacity ${!rule.isActive ? "opacity-60" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{triggerInfo?.icon || "⚡"}</span>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                {rule.name}
                <Badge
                  variant={rule.isActive ? "default" : "secondary"}
                  className="text-xs"
                >
                  {rule.isActive ? "Active" : "Paused"}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {rule.description || triggerInfo?.desc}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Cog className="size-3" /> {rule.conditions?.length || 0}{" "}
                  conditions
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ArrowRight className="size-3" /> {rule.actions?.length || 0}{" "}
                  actions
                </span>
                {rule.runCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Activity className="size-3" /> {rule.runCount} runs
                    </span>
                  </>
                )}
                {rule.cronExpression && (
                  <>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs">
                      {rule.cronExpression}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggle}
              title={rule.isActive ? "Pause" : "Activate"}
            >
              {rule.isActive ? (
                <PauseCircle className="size-4 text-amber-500" />
              ) : (
                <PlayCircle className="size-4 text-green-500" />
              )}
            </Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LogEntry({ log }: { log: any }) {
  const icon =
    log.status === "success" ? (
      <CheckCircle2 className="size-4 text-green-500" />
    ) : log.status === "failed" ? (
      <XCircle className="size-4 text-red-500" />
    ) : (
      <PauseCircle className="size-4 text-muted-foreground" />
    );

  const details = log.details ? JSON.parse(log.details) : {};

  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{log.ruleName}</p>
        <p className="text-xs text-muted-foreground">
          {log.trigger} · {log.actionsExecuted} actions
          {details.reason && ` · ${details.reason}`}
          {details.actions?.length > 0 && ` · ${details.actions.join(", ")}`}
        </p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {new Date(log.executedAt).toLocaleString()}
      </span>
    </div>
  );
}

// ========== CREATE DIALOG ==========

function CreateRuleDialog({
  open,
  onClose,
  template,
}: {
  open: boolean;
  onClose: () => void;
  template?: (typeof TEMPLATES)[number] | null;
}) {
  const createRule = useMutation(api.automations.create);
  const properties = useQuery(api.properties.list) || [];

  const [form, setForm] = useState({
    name: template?.name || "",
    description: template?.description || "",
    trigger: template?.trigger || "",
    cronExpression: template?.cronExpression || "",
    propertyId: "",
    conditions:
      template?.conditions ||
      ([] as { field: string; operator: string; value: string }[]),
    actions: template?.actions || ([] as { type: string; config: string }[]),
  });

  // Reset form when template changes
  const formKey = template?.name || "custom";

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.trigger) {
      toast.error("Name and trigger are required");
      return;
    }
    if (form.actions.length === 0) {
      toast.error("At least one action is required");
      return;
    }

    try {
      await createRule({
        name: form.name,
        description: form.description || undefined,
        trigger: form.trigger,
        conditions: form.conditions,
        actions: form.actions,
        cronExpression: form.cronExpression || undefined,
        propertyId: form.propertyId ? (form.propertyId as any) : undefined,
      });
      toast.success("Automation rule created!");
      onClose();
    } catch {
      toast.error("Failed to create rule");
    }
  };

  const addCondition = () => {
    setForm({
      ...form,
      conditions: [
        ...form.conditions,
        { field: "", operator: "equals", value: "" },
      ],
    });
  };

  const addAction = () => {
    setForm({
      ...form,
      actions: [
        ...form.actions,
        {
          type: "create_task",
          config: JSON.stringify({ title: "", priority: "medium" }),
        },
      ],
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[85vh] overflow-y-auto"
        key={formKey}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="size-5" />
            {template ? `Create: ${template.name}` : "New Automation Rule"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="grid gap-3">
            <div>
              <Label>Rule Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Lease Expiry Reminder"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What does this automation do?"
                rows={2}
              />
            </div>
          </div>

          {/* Trigger */}
          <div>
            <Label>Trigger *</Label>
            <Select
              value={form.trigger}
              onValueChange={v => setForm({ ...form, trigger: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="When should this run?" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(form.trigger === "schedule" ||
              form.trigger === "lease_expiring" ||
              form.trigger === "rent_overdue") && (
              <div className="mt-2">
                <Label>Schedule Frequency</Label>
                <Select
                  value={form.cronExpression}
                  onValueChange={v => setForm({ ...form, cronExpression: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How often?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Scope to Property */}
          {properties.length > 0 && (
            <div>
              <Label>Scope to Property (optional)</Label>
              <Select
                value={form.propertyId}
                onValueChange={v => setForm({ ...form, propertyId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Properties</SelectItem>
                  {properties.map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Conditions (optional)</Label>
              <Button size="sm" variant="outline" onClick={addCondition}>
                <Plus className="size-3 mr-1" /> Add
              </Button>
            </div>
            {form.conditions.map((cond, i) => (
              <div key={`cond-${i}`} className="flex gap-2 mb-2">
                <Input
                  placeholder="Field (e.g., category)"
                  value={cond.field}
                  onChange={e => {
                    const newConds = [...form.conditions];
                    newConds[i] = { ...cond, field: e.target.value };
                    setForm({ ...form, conditions: newConds });
                  }}
                  className="flex-1"
                />
                <Select
                  value={cond.operator}
                  onValueChange={v => {
                    const newConds = [...form.conditions];
                    newConds[i] = { ...cond, operator: v };
                    setForm({ ...form, conditions: newConds });
                  }}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={cond.value}
                  onChange={e => {
                    const newConds = [...form.conditions];
                    newConds[i] = { ...cond, value: e.target.value };
                    setForm({ ...form, conditions: newConds });
                  }}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setForm({
                      ...form,
                      conditions: form.conditions.filter((_, j) => j !== i),
                    });
                  }}
                >
                  <XCircle className="size-4" />
                </Button>
              </div>
            ))}
            {form.conditions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No conditions — rule fires on every trigger match.
              </p>
            )}
          </div>

          {/* Actions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Actions *</Label>
              <Button size="sm" variant="outline" onClick={addAction}>
                <Plus className="size-3 mr-1" /> Add
              </Button>
            </div>
            {form.actions.map((action, i) => {
              const config = (() => {
                try {
                  return JSON.parse(action.config);
                } catch {
                  return {};
                }
              })();
              return (
                <Card key={`action-${i}`} className="mb-2">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex gap-2 items-center">
                      <Select
                        value={action.type}
                        onValueChange={v => {
                          const newActions = [...form.actions];
                          newActions[i] = { ...action, type: v };
                          setForm({ ...form, actions: newActions });
                        }}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map(at => (
                            <SelectItem key={at.value} value={at.value}>
                              {at.icon} {at.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setForm({
                            ...form,
                            actions: form.actions.filter((_, j) => j !== i),
                          });
                        }}
                      >
                        <XCircle className="size-4" />
                      </Button>
                    </div>
                    {action.type === "create_task" && (
                      <div className="grid gap-2">
                        <Input
                          placeholder="Task title"
                          value={config.title || ""}
                          onChange={e => {
                            const newActions = [...form.actions];
                            newActions[i] = {
                              ...action,
                              config: JSON.stringify({
                                ...config,
                                title: e.target.value,
                              }),
                            };
                            setForm({ ...form, actions: newActions });
                          }}
                        />
                        <Select
                          value={config.priority || "medium"}
                          onValueChange={v => {
                            const newActions = [...form.actions];
                            newActions[i] = {
                              ...action,
                              config: JSON.stringify({
                                ...config,
                                priority: v,
                              }),
                            };
                            setForm({ ...form, actions: newActions });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low Priority</SelectItem>
                            <SelectItem value="medium">
                              Medium Priority
                            </SelectItem>
                            <SelectItem value="high">High Priority</SelectItem>
                            <SelectItem value="urgent">
                              Urgent Priority
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {action.type === "send_notification" && (
                      <Input
                        placeholder="Notification message"
                        value={config.message || ""}
                        onChange={e => {
                          const newActions = [...form.actions];
                          newActions[i] = {
                            ...action,
                            config: JSON.stringify({
                              ...config,
                              message: e.target.value,
                            }),
                          };
                          setForm({ ...form, actions: newActions });
                        }}
                      />
                    )}
                    {action.type === "update_status" && (
                      <Select
                        value={config.status || "in_progress"}
                        onValueChange={v => {
                          const newActions = [...form.actions];
                          newActions[i] = {
                            ...action,
                            config: JSON.stringify({ ...config, status: v }),
                          };
                          setForm({ ...form, actions: newActions });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {action.type === "add_note" && (
                      <Input
                        placeholder="Note text"
                        value={config.note || ""}
                        onChange={e => {
                          const newActions = [...form.actions];
                          newActions[i] = {
                            ...action,
                            config: JSON.stringify({
                              ...config,
                              note: e.target.value,
                            }),
                          };
                          setForm({ ...form, actions: newActions });
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button onClick={handleSubmit} className="w-full">
            <Sparkles className="size-4 mr-2" /> Create Automation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ========== MAIN PAGE ==========

function AutomationsPageInner() {
  const rules = useQuery(api.automations.list) || [];
  const logs = useQuery(api.automations.getLogs, {}) || [];
  const stats = useQuery(api.automations.getStats);
  const toggleRule = useMutation(api.automations.toggle);
  const removeRule = useMutation(api.automations.remove);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<
    (typeof TEMPLATES)[number] | null
  >(null);
  const [tab, setTab] = useState<"rules" | "templates" | "logs">("rules");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="size-6" /> Automations
          </h1>
          <p className="text-muted-foreground">
            Set up rules to automate repetitive tasks, reminders, and workflows.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedTemplate(null);
            setShowCreate(true);
          }}
        >
          <Plus className="size-4 mr-2" /> New Rule
        </Button>
      </div>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[
          { key: "rules" as const, label: "My Rules", icon: Zap },
          { key: "templates" as const, label: "Templates", icon: Sparkles },
          { key: "logs" as const, label: "Activity Log", icon: Activity },
        ].map(t => (
          <button
            key={t.key}
            type="button"
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t.key)}
          >
            <t.icon className="size-4" /> {t.label}
            {t.key === "rules" && rules.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {rules.length}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "rules" && (
        <div className="space-y-3">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bot className="size-12 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold text-lg">
                  No automation rules yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create your first rule or start from a template to automate
                  your workflows.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setShowCreate(true);
                    }}
                  >
                    <Plus className="size-4 mr-2" /> Create Rule
                  </Button>
                  <Button variant="outline" onClick={() => setTab("templates")}>
                    <Sparkles className="size-4 mr-2" /> Browse Templates
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            rules.map((rule: any) => (
              <RuleCard
                key={rule._id}
                rule={rule}
                onToggle={async () => {
                  await toggleRule({ ruleId: rule._id });
                  toast.success(
                    rule.isActive ? "Rule paused" : "Rule activated",
                  );
                }}
                onDelete={async () => {
                  if (confirm(`Delete "${rule.name}"?`)) {
                    await removeRule({ ruleId: rule._id });
                    toast.success("Rule deleted");
                  }
                }}
              />
            ))
          )}
        </div>
      )}

      {tab === "templates" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map(t => (
            <Card
              key={t.name}
              className="cursor-pointer hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-5">
                <div className="text-3xl mb-3">{t.icon}</div>
                <h3 className="font-semibold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Badge variant="outline">
                    {TRIGGERS.find(tr => tr.value === t.trigger)?.label}
                  </Badge>
                  <span>
                    {t.actions.length} action{t.actions.length > 1 ? "s" : ""}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedTemplate(t);
                    setShowCreate(true);
                  }}
                >
                  <Wand2 className="size-3 mr-1" /> Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === "logs" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="size-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No automation activity yet. Rules will log here when they run.
              </p>
            ) : (
              <div className="divide-y">
                {logs.map((log: any) => (
                  <LogEntry key={log._id} log={log} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <CreateRuleDialog
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
      />
    </div>
  );
}

export default function AutomationsPage() {
  return (
    <FeatureGate feature="tasks">
      <AutomationsPageInner />
    </FeatureGate>
  );
}
