import { useMutation, useQuery } from "convex/react";
import { Copy, FileText, Plus, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type DocumentType =
  | "lease_agreement"
  | "renter_application"
  | "maintenance_report"
  | "notice_to_vacate"
  | "late_rent_notice"
  | "move_in_checklist"
  | "move_out_checklist"
  | "custom";

interface Template {
  id: Id<"documentTemplates">;
  name: string;
  category: DocumentType;
  content: string;
  createdAt: number;
}

const categoryOptions: Array<{ label: string; value: DocumentType }> = [
  { label: "Lease Agreement", value: "lease_agreement" },
  { label: "Rental Application", value: "renter_application" },
  { label: "Maintenance Report", value: "maintenance_report" },
  { label: "Notice to Vacate", value: "notice_to_vacate" },
  { label: "Late Rent Notice", value: "late_rent_notice" },
  { label: "Move-In Checklist", value: "move_in_checklist" },
  { label: "Move-Out Checklist", value: "move_out_checklist" },
  { label: "Custom", value: "custom" },
];

const typeLabel: Record<DocumentType, string> = {
  lease_agreement: "Lease Agreement",
  renter_application: "Rental Application",
  maintenance_report: "Maintenance Report",
  notice_to_vacate: "Notice to Vacate",
  late_rent_notice: "Late Rent Notice",
  move_in_checklist: "Move-In Checklist",
  move_out_checklist: "Move-Out Checklist",
  custom: "Custom",
};

function extractVariables(content: string) {
  const matches = content.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) ?? [];
  return Array.from(new Set(matches.map(v => v.replace(/[{}\s]/g, ""))));
}

function generateAIContent(category: DocumentType, name: string): string {
  const templates: Record<DocumentType, string> = {
    move_in_checklist: `MOVE-IN CHECKLIST

Property: {{property_address}}, Unit {{unit_number}}
Tenant: {{tenant_name}}
Date: {{date}}

CONDITION ASSESSMENT:
Kitchen:
  [ ] Stove/Oven — Condition: ___
  [ ] Refrigerator — Condition: ___
  [ ] Dishwasher — Condition: ___
  [ ] Sink/Faucet — Condition: ___

Bathroom:
  [ ] Toilet — Condition: ___
  [ ] Shower/Tub — Condition: ___

Living Areas:
  [ ] Walls — Condition: ___
  [ ] Flooring — Condition: ___

Tenant Signature: _____________ Date: _________
Landlord Signature: _____________ Date: _________`,
    notice_to_vacate: `NOTICE TO VACATE

Date: {{date}}

To: {{tenant_name}}
Property: {{property_address}}, Unit {{unit_number}}

You are hereby notified that you must vacate the above premises within {{days_to_vacate}} days of receiving this notice.

Reason: {{reason}}
Outstanding Balance: \${{amount_owed}}

Landlord: {{landlord_name}}`,
    maintenance_report: `MAINTENANCE REPORT

Date: {{date}}
Technician: {{technician_name}}
Property: {{property_address}}, Unit {{unit_number}}

Issue Reported: {{issue}}
Work Performed: {{work_performed}}
Parts Used: {{parts_used}}
Outcome: {{outcome}}

Technician Signature: _____________ Date: _________`,
    lease_agreement: `LEASE AGREEMENT

Date: {{date}}
Landlord: {{landlord_name}}
Tenant: {{tenant_name}}
Property: {{property_address}}, Unit {{unit_number}}

Term: {{start_date}} to {{end_date}}
Monthly Rent: \${{monthly_rent}}
Deposit: \${{deposit_amount}}

Landlord: _________________________ Date: _________
Tenant: _________________________ Date: _________`,
    late_rent_notice: `LATE RENT NOTICE

Date: {{date}}
Tenant: {{tenant_name}}
Property: {{property_address}}, Unit {{unit_number}}

Your rent payment for {{month}} is past due.
Balance Due: \${{total_due}}
Late Fee: \${{late_fee}}

Please submit payment immediately.`,
    renter_application: `RENTAL APPLICATION

Applicant: {{applicant_name}}
Date: {{date}}
Phone: {{phone}}
Email: {{email}}

Current Address: {{current_address}}
Employer: {{employer}}
Monthly Income: \${{monthly_income}}

Signature: _________________________ Date: _________`,
    move_out_checklist: `MOVE-OUT CHECKLIST

Property: {{property_address}}, Unit {{unit_number}}
Tenant: {{tenant_name}}
Date: {{date}}

[ ] Keys returned
[ ] Unit cleaned
[ ] Damages documented
[ ] Forwarding address collected

Inspector Signature: _____________ Date: _________`,
    custom: `${name.toUpperCase()}

Date: {{date}}
Prepared by: {{prepared_by}}

[Add your content here. Use {{variable_name}} for dynamic fields.]

Signature: _____________ Date: _________`,
  };

  return templates[category];
}

function CreateTemplateDialog({
  onCreate,
  creating,
}: {
  onCreate: (payload: {
    name: string;
    category: DocumentType;
    content: string;
  }) => Promise<boolean>;
  creating: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentType>("custom");
  const [content, setContent] = useState("");

  const handleAIGenerate = () => {
    const generated = generateAIContent(category, name || typeLabel[category]);
    setContent(generated);
    toast.success("Template generated with AI");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    const created = await onCreate({
      name: name.trim(),
      category,
      content: content.trim() || `[Template content for ${name}]`,
    });

    if (!created) return;

    setOpen(false);
    setName("");
    setCategory("custom");
    setContent("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-teal text-white hover:bg-teal/90">
          <Plus className="size-4 mr-2" /> New Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Template Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Standard Lease Agreement"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={v => setCategory(v as DocumentType)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>Content</Label>
              <Button variant="ghost" size="sm" onClick={handleAIGenerate}>
                <Sparkles className="size-3 mr-1" /> AI Generate
              </Button>
            </div>
            <Textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={15}
              placeholder="Enter template content... use {{variable_name}} for dynamic fields"
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={creating}>
            {creating ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentTemplatesPage() {
  const rawTemplates = useQuery(api.documentTemplates.list, {}) ?? [];
  const createTemplate = useMutation(api.documentTemplates.create);
  const updateTemplate = useMutation(api.documentTemplates.update);
  const removeTemplate = useMutation(api.documentTemplates.remove);

  const templates = useMemo<Template[]>(
    () =>
      rawTemplates.map(t => ({
        id: t._id,
        name: t.name,
        category: t.type,
        content: t.content,
        createdAt: t.createdAt,
      })),
    [rawTemplates],
  );

  const [selectedId, setSelectedId] = useState<Id<"documentTemplates"> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = templates.find(t => t.id === selectedId);

  const handleCreateTemplate = async (payload: {
    name: string;
    category: DocumentType;
    content: string;
  }): Promise<boolean> => {
    setCreating(true);
    try {
      await createTemplate({
        name: payload.name,
        type: payload.category,
        content: payload.content,
        variables: extractVariables(payload.content),
      });
      toast.success("Template created");
      return true;
    } catch (error: any) {
      toast.error(error?.message || "Failed to create template");
      return false;
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: Id<"documentTemplates">) => {
    try {
      await removeTemplate({ id });
      if (selectedId === id) {
        setSelectedId(null);
        setEditContent("");
      }
      toast.success("Template deleted");
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete template");
    }
  };

  const handleSelect = (t: Template) => {
    setSelectedId(t.id);
    setEditContent(t.content);
  };

  const handleSaveEdit = async () => {
    if (!selectedId) return;
    try {
      await updateTemplate({
        id: selectedId,
        content: editContent,
        variables: extractVariables(editContent),
      });
      toast.success("Template saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save template");
    }
  };

  const handleDuplicate = async (t: Template) => {
    try {
      const copyName = `${t.name} (Copy)`;
      await createTemplate({
        name: copyName,
        type: t.category,
        content: t.content,
        variables: extractVariables(t.content),
      });
      toast.success("Template duplicated");
    } catch {
      toast.error("Failed to duplicate template");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document Templates</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage shared organization document templates. Use
            <code className="text-xs bg-muted px-1 rounded">
              {"{{variable}}"}
            </code>
            for dynamic fields.
          </p>
        </div>
        <CreateTemplateDialog onCreate={handleCreateTemplate} creating={creating} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No templates yet. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            templates.map(t => (
              <Card
                key={t.id}
                className={`cursor-pointer transition-all hover:shadow-sm ${
                  selectedId === t.id ? "border-teal ring-1 ring-teal/30" : ""
                }`}
                onClick={() => handleSelect(t)}
              >
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <p className="font-medium text-sm truncate">{t.name}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {typeLabel[t.category]}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={e => {
                        e.stopPropagation();
                        handleDuplicate(t);
                      }}
                    >
                      <Copy className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(t.id);
                      }}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selected.name}</CardTitle>
                <CardDescription>
                  Category: {typeLabel[selected.category]} · Created: {new Date(selected.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                />
                <Button onClick={handleSaveEdit} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <FileText className="size-12 mx-auto mb-3 opacity-30" />
                <p>Select a template to view and edit</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
