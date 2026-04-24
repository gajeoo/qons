import {
  Copy,
  FileText,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

/* ────── Template types ────── */
interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  createdAt: number;
}

const STORAGE_KEY = "qonsapp_templates";

const categories = [
  "Lease Agreement",
  "Rental Application",
  "Move-In Checklist",
  "Maintenance Request",
  "Late Rent Notice",
  "Eviction Notice",
  "Property Inspection",
  "Lease Renewal",
  "Invoice",
  "Custom",
];

/* ────── Default templates ────── */
const defaultTemplates: Omit<Template, "id" | "createdAt">[] = [
  {
    name: "Standard Lease Agreement",
    category: "Lease Agreement",
    content: `RESIDENTIAL LEASE AGREEMENT

This Lease Agreement ("Agreement") is entered into as of {{date}}, by and between:

LANDLORD: {{landlord_name}}
Address: {{landlord_address}}

TENANT: {{tenant_name}}

PROPERTY: {{property_address}}, Unit {{unit_number}}

TERM: This lease shall begin on {{start_date}} and end on {{end_date}}.

RENT: Tenant agrees to pay \${{monthly_rent}} per month, due on the {{due_day}} of each month.

SECURITY DEPOSIT: \${{deposit_amount}}

LATE FEE: A late fee of \${{late_fee}} will be charged if rent is not received within {{grace_days}} days of the due date.

UTILITIES: {{utilities_included}}

SIGNATURES:
Landlord: _________________________ Date: _________
Tenant: _________________________ Date: _________`,
  },
  {
    name: "Rental Application Form",
    category: "Rental Application",
    content: `RENTAL APPLICATION

Property: {{property_address}}, Unit {{unit_number}}
Application Date: {{date}}

PERSONAL INFORMATION:
Full Name: {{applicant_name}}
Date of Birth: {{dob}}
SSN (last 4): {{ssn_last4}}
Phone: {{phone}}
Email: {{email}}

CURRENT ADDRESS:
Address: {{current_address}}
Landlord Name: {{current_landlord}}
Landlord Phone: {{current_landlord_phone}}
Monthly Rent: \${{current_rent}}
Reason for Moving: {{move_reason}}

EMPLOYMENT:
Employer: {{employer}}
Position: {{position}}
Monthly Income: \${{monthly_income}}
Supervisor: {{supervisor_name}}
Phone: {{supervisor_phone}}

REFERENCES:
1. {{reference_1_name}} - {{reference_1_phone}}
2. {{reference_2_name}} - {{reference_2_phone}}

I certify that the above information is true and accurate.

Signature: _________________________ Date: _________`,
  },
  {
    name: "Late Rent Notice",
    category: "Late Rent Notice",
    content: `LATE RENT NOTICE

Date: {{date}}

To: {{tenant_name}}
Property: {{property_address}}, Unit {{unit_number}}

Dear {{tenant_name}},

This notice is to inform you that your rent payment of \${{rent_amount}} for the month of {{month}} is past due. As of {{date}}, your rent is {{days_late}} days overdue.

A late fee of \${{late_fee}} has been applied to your account, bringing your total balance to \${{total_due}}.

Please remit payment immediately to avoid further action.

If you have already made this payment, please disregard this notice.

Sincerely,
{{landlord_name}}
{{company_name}}`,
  },
  {
    name: "Maintenance Request Form",
    category: "Maintenance Request",
    content: `MAINTENANCE REQUEST

Date: {{date}}
Request #: {{request_id}}

TENANT: {{tenant_name}}
Property: {{property_address}}, Unit {{unit_number}}
Phone: {{phone}}

ISSUE:
Category: {{category}}
Priority: {{priority}}
Description: {{description}}

PREFERRED AVAILABILITY:
Date: {{preferred_date}}
Time: {{preferred_time}}

Permission to enter if absent: Yes / No

Submitted by: {{tenant_name}}
Date: {{date}}`,
  },
];

/* ────── Load/save helpers ────── */
function loadTemplates(): Template[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Initialize with defaults
  const templates = defaultTemplates.map((t, i) => ({
    ...t,
    id: `tmpl_${Date.now()}_${i}`,
    createdAt: Date.now(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates;
}

function saveTemplates(templates: Template[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

/* ────── AI content generation (client-side) ────── */
function generateAIContent(category: string, name: string): string {
  const templates: Record<string, string> = {
    "Move-In Checklist": `MOVE-IN CHECKLIST

Property: {{property_address}}, Unit {{unit_number}}
Tenant: {{tenant_name}}
Date: {{date}}

CONDITION ASSESSMENT:
Kitchen:
  [ ] Stove/Oven — Condition: ___
  [ ] Refrigerator — Condition: ___
  [ ] Dishwasher — Condition: ___
  [ ] Sink/Faucet — Condition: ___
  [ ] Cabinets — Condition: ___
  [ ] Countertops — Condition: ___

Bathroom:
  [ ] Toilet — Condition: ___
  [ ] Shower/Tub — Condition: ___
  [ ] Sink/Faucet — Condition: ___
  [ ] Mirror — Condition: ___

Living Areas:
  [ ] Walls — Condition: ___
  [ ] Flooring — Condition: ___
  [ ] Windows — Condition: ___
  [ ] Doors/Locks — Condition: ___
  [ ] Light Fixtures — Condition: ___

KEYS PROVIDED:
  [ ] Front Door: ___
  [ ] Mailbox: ___
  [ ] Other: ___

Notes: _______________

Tenant Signature: _____________ Date: _________
Landlord Signature: _____________ Date: _________`,
    "Eviction Notice": `NOTICE TO VACATE

Date: {{date}}

To: {{tenant_name}}
Property: {{property_address}}, Unit {{unit_number}}

You are hereby notified that you must vacate the above premises within {{days_to_vacate}} days of receiving this notice.

Reason: {{reason}}

Outstanding Balance: \${{amount_owed}}

If you fail to vacate by {{vacate_date}}, legal proceedings may be initiated.

{{landlord_name}}
{{company_name}}`,
    "Property Inspection": `PROPERTY INSPECTION REPORT

Date: {{date}}
Inspector: {{inspector_name}}
Property: {{property_address}}, Unit {{unit_number}}

TYPE: [ ] Move-In  [ ] Move-Out  [ ] Annual  [ ] Complaint

OVERALL CONDITION: [ ] Excellent  [ ] Good  [ ] Fair  [ ] Poor

NOTES:
Exterior: {{exterior_notes}}
Interior: {{interior_notes}}
Plumbing: {{plumbing_notes}}
Electrical: {{electrical_notes}}
HVAC: {{hvac_notes}}

PHOTOS ATTACHED: {{photo_count}}

Inspector Signature: _____________ Date: _________`,
    "Lease Renewal": `LEASE RENEWAL AGREEMENT

Date: {{date}}

This agreement renews the lease between:
LANDLORD: {{landlord_name}}
TENANT: {{tenant_name}}
PROPERTY: {{property_address}}, Unit {{unit_number}}

ORIGINAL LEASE: {{original_start}} to {{original_end}}
RENEWAL TERM: {{new_start}} to {{new_end}}

NEW MONTHLY RENT: \${{new_rent}} (previously \${{old_rent}})

All other terms remain unchanged unless modified below:
{{modifications}}

Landlord: _________________________ Date: _________
Tenant: _________________________ Date: _________`,
    Invoice: `INVOICE

Invoice #: {{invoice_number}}
Date: {{date}}
Due Date: {{due_date}}

FROM: {{company_name}}
TO: {{tenant_name}}, Unit {{unit_number}}

CHARGES:
  Monthly Rent: \${{rent_amount}}
  Late Fee: \${{late_fee}}
  Other: \${{other_charges}}

TOTAL DUE: \${{total_due}}

Payment Methods: Online Portal, Check, Bank Transfer
Make checks payable to: {{company_name}}`,
  };

  return templates[category] || `${name.toUpperCase()}\n\nDate: {{date}}\nPrepared by: {{prepared_by}}\n\n[Add your content here. Use {{variable_name}} for dynamic fields.]\n\nSignature: _____________ Date: _________`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CREATE TEMPLATE DIALOG
   ═══════════════════════════════════════════════════════════════════════════ */

function CreateTemplateDialog({
  onCreated,
}: {
  onCreated: (t: Template) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom");
  const [content, setContent] = useState("");

  const handleAIGenerate = () => {
    const generated = generateAIContent(category, name || category);
    setContent(generated);
    toast.success("Template generated with AI");
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    const tmpl: Template = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      category,
      content: content.trim() || `[Template content for ${name}]`,
      createdAt: Date.now(),
    };
    onCreated(tmpl);
    setOpen(false);
    setName("");
    setContent("");
    toast.success("Template created");
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
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Standard Lease Agreement"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              placeholder="Enter template content... use {{variable_name}} for dynamic fields"
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleCreate} className="w-full">
            Create Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export function DocumentTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const selected = templates.find((t) => t.id === selectedId);

  const handleDelete = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setEditContent("");
    }
    toast.success("Template deleted");
  };

  const handleSelect = (t: Template) => {
    setSelectedId(t.id);
    setEditContent(t.content);
  };

  const handleSaveEdit = () => {
    if (!selectedId) return;
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedId ? { ...t, content: editContent } : t,
      ),
    );
    toast.success("Template saved");
  };

  const handleDuplicate = (t: Template) => {
    const copy: Template = {
      ...t,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: `${t.name} (Copy)`,
      createdAt: Date.now(),
    };
    setTemplates((prev) => [...prev, copy]);
    toast.success("Template duplicated");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Document Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage document templates for leases, applications, notices, and more.
            Use <code className="text-xs bg-muted px-1 rounded">{"{{variable}}"}</code> for dynamic fields.
          </p>
        </div>
        <CreateTemplateDialog
          onCreated={(t) => setTemplates((prev) => [...prev, t])}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Template list */}
        <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No templates yet. Create one to get started.
              </CardContent>
            </Card>
          ) : (
            templates.map((t) => (
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
                      {t.category}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={(e) => {
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
                      onClick={(e) => {
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

        {/* Template editor */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{selected.name}</CardTitle>
                <CardDescription>
                  Category: {selected.category} · Created:{" "}
                  {new Date(selected.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
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
