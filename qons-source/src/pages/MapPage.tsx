import { useQuery } from "convex/react";
import { Building2, Map as LucideMap } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { PropertyMap } from "@/components/PropertyMap";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "../../convex/_generated/api";

export function MapPage() {
  const properties = useQuery(api.properties.list) || [];

  return (
    <FeatureGate feature="map">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <LucideMap className="size-6 text-teal" /> Portfolio Map
          </h1>
          <p className="text-muted-foreground mt-1">
            Interactive view of all your property locations and nearby amenities
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            {
              label: "Total Properties",
              value: properties.length,
              color: "text-teal bg-teal/10",
            },
            {
              label: "Mapped",
              value: properties.filter(
                p =>
                  p.latitude &&
                  p.longitude &&
                  p.latitude !== 0 &&
                  p.longitude !== 0,
              ).length,
              color: "text-green-600 bg-green-100",
            },
            {
              label: "Residential",
              value: properties.filter(p => p.type === "residential").length,
              color: "text-blue-600 bg-blue-100",
            },
            {
              label: "Commercial",
              value: properties.filter(p => p.type === "commercial").length,
              color: "text-purple-600 bg-purple-100",
            },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${stat.color}`}>
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Interactive Map */}
        <PropertyMap properties={properties} height="600px" showControls />
      </div>
    </FeatureGate>
  );
}
