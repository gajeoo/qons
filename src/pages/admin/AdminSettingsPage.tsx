import { CreditCard, DollarSign, FileText, Palette, Save, Tag } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/* ═══════════════════════════════════════════════════════════════════════════
   PRICING TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function PricingTab() {
  const plans = useQuery(api.pricing.getPlans) ?? [];
  const updatePlan = useMutation(api.pricing.updatePlan);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [savingPlan, setSavingPlan] = useState<string | null>(null);

  const handleSave = async (planKey: "starter" | "pro" | "enterprise") => {
    const cents = Math.round(parseFloat(editPrice) * 100);
    if (Number.isNaN(cents) || cents < 100) {
      toast.error("Enter a valid price (min $1.00)");
      return;
    }

    setSavingPlan(planKey);
    try {
      await updatePlan({
        plan: planKey,
        monthlyPrice: cents,
        annualPrice: Math.round(cents * 10),
      });
      setEditing(null);
      toast.success("Plan price updated across the site");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update plan");
    } finally {
      setSavingPlan(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" /> Plan Pricing
          </CardTitle>
          <CardDescription>
            Current plan prices. To make changes persist site-wide, a Convex
            backend deploy is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map(p => (
              <Card key={p.plan} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {p.unitLimit || "Plan limit"}
                    </Badge>
                  </div>
                  {editing === p.plan ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={e => setEditPrice(e.target.value)}
                        className="h-8"
                      />
                      <Button
                        size="sm"
                        onClick={() =>
                          handleSave(p.plan as "starter" | "pro" | "enterprise")
                        }
                        disabled={savingPlan === p.plan}
                      >
                        <Save className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold">
                        ${(p.monthlyPrice / 100).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /mo
                        </span>
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(p.plan);
                          setEditPrice((p.monthlyPrice / 100).toFixed(2));
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DISCOUNTS TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function DiscountsTab() {
  const codes = useQuery(api.pricing.listDiscounts) ?? [];
  const createDiscount = useMutation(api.pricing.createDiscount);
  const toggleDiscount = useMutation(api.pricing.toggleDiscount);
  const deleteDiscount = useMutation(api.pricing.deleteDiscount);

  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast.error("Enter a discount code");
      return;
    }

    const percent = parseInt(newPercent, 10) || 10;
    if (percent < 1 || percent > 100) {
      toast.error("Discount percent must be between 1 and 100");
      return;
    }

    setCreating(true);
    try {
      await createDiscount({
        code: newCode,
        type: "percentage",
        value: percent,
      });
      setNewCode("");
      setNewPercent("10");
      toast.success("Discount created and now active site-wide");
    } catch (error: any) {
      toast.error(error?.message || "Failed to create discount");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="size-5" /> Discount Codes
        </CardTitle>
        <CardDescription>
          Create promotional discount codes for your plans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs">Code</Label>
            <Input
              placeholder="e.g. WELCOME20"
              value={newCode}
              onChange={e => setNewCode(e.target.value)}
            />
          </div>
          <div className="w-24">
            <Label className="text-xs">% Off</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={newPercent}
              onChange={e => setNewPercent(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate} disabled={creating}>
            Create
          </Button>
        </div>

        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No discount codes yet.
          </p>
        ) : (
          <div className="divide-y">
            {codes.map(c => (
              <div key={c._id} className="flex items-center justify-between py-2 gap-3">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">
                    {c.code}
                  </code>
                  <span className="text-sm text-muted-foreground">
                    {c.type === "percentage"
                      ? `${c.value}% off`
                      : `$${(c.value / 100).toFixed(2)} off`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.isActive ? "default" : "secondary"}>
                    {c.isActive ? "Active" : "Disabled"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDiscount({ id: c._id as Id<"discountCodes"> })}
                  >
                    {c.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteDiscount({ id: c._id as Id<"discountCodes"> })}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BRANDING TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function BrandingTab() {
  const [brandColor, setBrandColor] = useState("#0d9488");
  const [tagline, setTagline] = useState("AI-Powered Property Management");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="size-5" /> Branding
        </CardTitle>
        <CardDescription>
          Customize the appearance of your QuonsApp instance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Brand Color</Label>
          <div className="flex items-center gap-3 mt-1">
            <input
              type="color"
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              aria-label="Brand color"
              title="Brand color"
              className="size-10 rounded border cursor-pointer"
            />
            <Input
              value={brandColor}
              onChange={e => setBrandColor(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
        <div>
          <Label>Tagline</Label>
          <Input
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          onClick={() =>
            toast.info(
              "Branding saved locally. Backend deploy needed to persist.",
            )
          }
        >
          <Save className="size-4 mr-2" /> Save Branding
        </Button>
      </CardContent>
    </Card>
  );
}

function TenantTemplatePreviewTab() {
  const templates =
    useQuery(api.documentTemplates.listForOrganizationViewer, {
      audience: "tenant",
    }) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" /> Tenant Template Preview
        </CardTitle>
        <CardDescription>
          Preview organization templates that tenants will see in their portal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tenant-facing templates found.
          </p>
        ) : (
          <div className="space-y-3">
            {templates.slice(0, 12).map(template => (
              <div key={template._id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-sm">{template.name}</p>
                  <Badge variant="outline" className="capitalize text-xs">
                    {template.type.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-4">
                  {template.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage pricing, discounts, and branding for your QuonsApp instance.
        </p>
      </div>

      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-4">
          <TabsTrigger value="pricing" className="justify-start sm:justify-center min-w-0 h-auto py-2 whitespace-normal break-words leading-tight text-xs sm:text-sm">
            <CreditCard className="size-4 mr-1.5" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="discounts" className="justify-start sm:justify-center min-w-0 h-auto py-2 whitespace-normal break-words leading-tight text-xs sm:text-sm">
            <Tag className="size-4 mr-1.5" /> Discounts
          </TabsTrigger>
          <TabsTrigger value="branding" className="justify-start sm:justify-center min-w-0 h-auto py-2 whitespace-normal break-words leading-tight text-xs sm:text-sm">
            <Palette className="size-4 mr-1.5" /> Branding
          </TabsTrigger>
          <TabsTrigger value="tenantTemplates" className="justify-start sm:justify-center min-w-0 h-auto py-2 whitespace-normal break-words leading-tight text-xs sm:text-sm">
            <FileText className="size-4 mr-1.5" /> Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-4">
          <PricingTab />
        </TabsContent>

        <TabsContent value="discounts" className="mt-4">
          <DiscountsTab />
        </TabsContent>

        <TabsContent value="branding" className="mt-4">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="tenantTemplates" className="mt-4">
          <TenantTemplatePreviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
