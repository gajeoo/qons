import { useState } from "react";
import {
  CreditCard,
  DollarSign,
  Palette,
  Save,
  Tag,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ────── Plan definitions (hardcoded, matching deployed featureGating) ────── */
const defaultPlans = [
  { plan: "starter", name: "Starter", monthlyPrice: 4599, unitLimit: 50 },
  { plan: "pro", name: "Professional", monthlyPrice: 9599, unitLimit: 200 },
  { plan: "enterprise", name: "Business", monthlyPrice: 14099, unitLimit: 9999 },
];

/* ═══════════════════════════════════════════════════════════════════════════
   PRICING TAB
   ═══════════════════════════════════════════════════════════════════════════ */

function PricingTab() {
  const [plans, setPlans] = useState(defaultPlans);
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleSave = (planKey: string) => {
    const cents = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(cents) || cents < 100) {
      toast.error("Enter a valid price (min $1.00)");
      return;
    }
    setPlans((prev) =>
      prev.map((p) => (p.plan === planKey ? { ...p, monthlyPrice: cents } : p)),
    );
    setEditing(null);
    toast.info("Price updated locally. Backend deploy needed to persist changes across the site.");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" /> Plan Pricing
          </CardTitle>
          <CardDescription>
            Current plan prices. To make changes persist site-wide, a Convex backend deploy is required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((p) => (
              <Card key={p.plan} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {p.unitLimit >= 9999 ? "Unlimited" : `≤${p.unitLimit}`} units
                    </Badge>
                  </div>
                  {editing === p.plan ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="h-8"
                      />
                      <Button size="sm" onClick={() => handleSave(p.plan)}>
                        <Save className="size-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold">
                        ${(p.monthlyPrice / 100).toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
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
  const [codes, setCodes] = useState<
    { code: string; percent: number; active: boolean }[]
  >([]);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("10");

  const handleCreate = () => {
    if (!newCode.trim()) {
      toast.error("Enter a discount code");
      return;
    }
    setCodes((prev) => [
      ...prev,
      { code: newCode.toUpperCase(), percent: parseInt(newPercent) || 10, active: true },
    ]);
    setNewCode("");
    toast.info("Discount code created locally. Backend deploy needed to persist.");
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
              onChange={(e) => setNewCode(e.target.value)}
            />
          </div>
          <div className="w-24">
            <Label className="text-xs">% Off</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={newPercent}
              onChange={(e) => setNewPercent(e.target.value)}
            />
          </div>
          <Button onClick={handleCreate}>Create</Button>
        </div>

        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No discount codes yet.
          </p>
        ) : (
          <div className="divide-y">
            {codes.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">
                    {c.code}
                  </code>
                  <span className="text-sm text-muted-foreground">{c.percent}% off</span>
                </div>
                <Badge variant={c.active ? "default" : "secondary"}>
                  {c.active ? "Active" : "Disabled"}
                </Badge>
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
              onChange={(e) => setBrandColor(e.target.value)}
              className="size-10 rounded border cursor-pointer"
            />
            <Input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
        <div>
          <Label>Tagline</Label>
          <Input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button
          onClick={() =>
            toast.info("Branding saved locally. Backend deploy needed to persist.")
          }
        >
          <Save className="size-4 mr-2" /> Save Branding
        </Button>
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
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pricing">
            <CreditCard className="size-4 mr-1.5" /> Pricing
          </TabsTrigger>
          <TabsTrigger value="discounts">
            <Tag className="size-4 mr-1.5" /> Discounts
          </TabsTrigger>
          <TabsTrigger value="branding">
            <Palette className="size-4 mr-1.5" /> Branding
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
      </Tabs>
    </div>
  );
}
