import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ChatWidget } from "@/components/ChatWidget";
import { FeatureGate } from "@/components/FeatureGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["todo", "in_progress", "completed", "cancelled"] as const;

function TasksPageInner() {
  const user = useQuery(api.auth.currentUser);
  const tasks = useQuery(api.tasks.list) || [];
  const staff = useQuery(api.staffMembers.list) || [];
  const properties = useQuery(api.properties.list) || [];
  const { isSubAccount, isWorker } = useFeatureAccess();
  const createTask = useMutation(api.tasks.create);
  const updateStatus = useMutation(api.tasks.updateStatus);
  const removeTask = useMutation(api.tasks.remove);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as (typeof PRIORITIES)[number],
    assignedToStaffId: "",
    propertyId: "",
    dueDate: "",
  });

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      await createTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        assignedToStaffId: form.assignedToStaffId
          ? (form.assignedToStaffId as Id<"staff">)
          : undefined,
        propertyId: form.propertyId ? (form.propertyId as Id<"properties">) : undefined,
        dueDate: form.dueDate || undefined,
      });
      toast.success("Task created");
      setForm({
        title: "",
        description: "",
        priority: "medium",
        assignedToStaffId: "",
        propertyId: "",
        dueDate: "",
      });
      setShowForm(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create task");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            Assign and automate operational work for staff and contractors.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-teal text-white hover:bg-teal/90">
          <Plus className="size-4" /> New Task
        </Button>
      </div>

      {!isWorker && !isSubAccount && user?._id && (
        <Card className="overflow-hidden border-sky-200/70 bg-gradient-to-br from-sky-50/80 via-background to-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Task Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <ChatWidget
              layout="embedded"
              source="dashboard"
              title="Task Planning Assistant"
              subtitle="Use it to break down work, assign owners, and suggest automation"
              inputPlaceholder="Ask for task plans, checklists, delegation ideas..."
              visitorId={`user_${user._id}`}
              visitorName={user.name ?? undefined}
              visitorEmail={user.email ?? undefined}
              metadata={JSON.stringify({ page: "tasks" })}
              suggestedPrompts={[
                "Create a move-in checklist",
                "Break down a property inspection into tasks",
                "What tasks should I automate weekly?",
                "How should I delegate maintenance work?",
              ]}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tasks.map((task) => (
          <Card key={task._id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span>{task.title}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0"
                  onClick={() => removeTask({ taskId: task._id }).then(() => toast.success("Task removed"))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {task.description ? (
                <p className="text-sm text-muted-foreground">{task.description}</p>
              ) : null}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Priority: {task.priority}</p>
                {task.assigneeName ? <p>Assigned: {task.assigneeName}</p> : null}
                {task.propertyName ? <p>Property: {task.propertyName}</p> : null}
                {task.dueDate ? <p>Due: {task.dueDate}</p> : null}
              </div>
              <Select
                value={task.status}
                onValueChange={(status: (typeof STATUSES)[number]) =>
                  updateStatus({ taskId: task._id, status }).then(() =>
                    toast.success("Task status updated"),
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              {task.status === "completed" ? (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Completed
                </p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            No tasks yet. Create your first assignment to start automating work.
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(priority: (typeof PRIORITIES)[number]) =>
                    setForm({ ...form, priority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Assign To Staff / Contractor</Label>
                <Select
                  value={form.assignedToStaffId || "__none__"}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      assignedToStaffId: value === "__none__" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {staff.map((member) => (
                      <SelectItem key={member._id} value={member._id}>
                        {member.name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property</Label>
                <Select
                  value={form.propertyId || "__none__"}
                  onValueChange={(value) =>
                    setForm({ ...form, propertyId: value === "__none__" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No Property</SelectItem>
                    {properties.map((property) => (
                      <SelectItem key={property._id} value={property._id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} className="bg-teal text-white hover:bg-teal/90">
                Create Task
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function TasksPage() {
  return (
    <FeatureGate feature="tasks">
      <TasksPageInner />
    </FeatureGate>
  );
}
