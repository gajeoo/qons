import { useEffect, useRef, useState } from "react";
import { Building2, MapPin, Navigation } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface Property {
  _id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  type: string;
  totalUnits?: number;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  status?: string;
}

interface PropertyMapProps {
  properties: Property[];
  height?: string;
  showControls?: boolean;
}

const MAP_HEIGHT_CLASS: Record<string, string> = {
  "400px": "h-[400px]",
  "500px": "h-[500px]",
  "600px": "h-[600px]",
};

/**
 * Interactive map showing property portfolio locations.
 * Uses Leaflet with OpenStreetMap tiles (free, no API key needed).
 */
export function PropertyMap({ properties, height = "500px", showControls = true }: PropertyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [, setSelectedProperty] = useState<Property | null>(null);

  // Properties with valid coordinates
  const mappableProperties = properties.filter(
    (p) => p.latitude && p.longitude && p.latitude !== 0 && p.longitude !== 0
  );

  // Properties without coordinates
  const unmappedProperties = properties.filter(
    (p) => !p.latitude || !p.longitude || p.latitude === 0 || p.longitude === 0
  );

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet
    const loadMap = async () => {
      try {
        const L = await import("leaflet");

        // Add Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        // Default center: US center
        let center: [number, number] = [39.8283, -98.5795];
        let zoom = 4;

        if (mappableProperties.length === 1) {
          center = [mappableProperties[0].latitude!, mappableProperties[0].longitude!];
          zoom = 15;
        } else if (mappableProperties.length > 1) {
          const lats = mappableProperties.map((p) => p.latitude!);
          const lngs = mappableProperties.map((p) => p.longitude!);
          center = [
            (Math.min(...lats) + Math.max(...lats)) / 2,
            (Math.min(...lngs) + Math.max(...lngs)) / 2,
          ];
          // Calculate appropriate zoom based on spread
          const latSpread = Math.max(...lats) - Math.min(...lats);
          const lngSpread = Math.max(...lngs) - Math.min(...lngs);
          const maxSpread = Math.max(latSpread, lngSpread);
          if (maxSpread < 0.01) zoom = 16;
          else if (maxSpread < 0.1) zoom = 13;
          else if (maxSpread < 1) zoom = 10;
          else if (maxSpread < 5) zoom = 7;
          else zoom = 5;
        }

        const map = L.map(mapRef.current!, {
          scrollWheelZoom: true,
          zoomControl: showControls,
        }).setView(center, zoom);

        // Beautiful map tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // Custom marker icon
        const createIcon = (type: string) => {
          const color = type === "residential" ? "#0d9488" : type === "commercial" ? "#3b82f6" : type === "mixed" ? "#8b5cf6" : "#f59e0b";
          return L.divIcon({
            html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>
            </div>`,
            className: "custom-marker",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
          });
        };

        // Add markers
        mappableProperties.forEach((property) => {
          const marker = L.marker([property.latitude!, property.longitude!], {
            icon: createIcon(property.type),
          }).addTo(map);

          marker.bindPopup(`
            <div style="min-width:200px;padding:4px;">
              ${property.imageUrl ? `<img src="${property.imageUrl}" alt="${property.name}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />` : ""}
              <h3 style="font-weight:700;font-size:14px;margin:0 0 4px;">${property.name}</h3>
              <p style="color:#6b7280;font-size:12px;margin:0 0 2px;">${property.address}</p>
              ${property.city ? `<p style="color:#6b7280;font-size:12px;margin:0 0 4px;">${property.city}${property.state ? `, ${property.state}` : ""}</p>` : ""}
              <div style="display:flex;gap:8px;font-size:11px;margin-top:6px;">
                <span style="background:#f0fdfa;color:#0d9488;padding:2px 8px;border-radius:9999px;font-weight:500;">${property.type}</span>
                ${property.totalUnits ? `<span style="background:#eff6ff;color:#3b82f6;padding:2px 8px;border-radius:9999px;font-weight:500;">${property.totalUnits} units</span>` : ""}
              </div>
            </div>
          `);

          marker.on("click", () => {
            setSelectedProperty(property);
          });
        });

        // Fit bounds if multiple properties
        if (mappableProperties.length > 1) {
          const bounds = L.latLngBounds(
            mappableProperties.map((p) => [p.latitude!, p.longitude!] as [number, number])
          );
          map.fitBounds(bounds, { padding: [50, 50] });
        }

        mapInstanceRef.current = map;
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load map:", err);
      }
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mappableProperties.length]);

  const handleLocateAll = () => {
    if (!mapInstanceRef.current || mappableProperties.length === 0) return;
    const L = (window as any).L;
    if (!L) return;
    const bounds = L.latLngBounds(
      mappableProperties.map((p: Property) => [p.latitude!, p.longitude!])
    );
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  };

  return (
    <div className="space-y-4">
      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border shadow-sm">
        <div
          ref={mapRef}
          className={`w-full ${MAP_HEIGHT_CLASS[height] || MAP_HEIGHT_CLASS["500px"]}`}
        />

        {/* Loading overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-muted/50 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="size-8 text-teal animate-bounce mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {isLoaded && mappableProperties.length === 0 && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center p-6">
              <Building2 className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold text-lg mb-1">No properties on map yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Add latitude and longitude to your properties to see them on the interactive map.
              </p>
            </div>
          </div>
        )}

        {/* Map controls */}
        {showControls && mappableProperties.length > 1 && (
          <div className="absolute top-3 right-3 z-[1000]">
            <Button
              size="sm"
              variant="secondary"
              className="shadow-md bg-white/90 backdrop-blur-sm"
              onClick={handleLocateAll}
            >
              <Navigation className="size-3.5" /> View All
            </Button>
          </div>
        )}
      </div>

      {/* Legend + stats */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-teal" /> Residential
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-blue-500" /> Commercial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-purple-500" /> Mixed Use
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-amber-500" /> Other
        </span>
        <span className="ml-auto">
          {mappableProperties.length} of {properties.length} properties mapped
        </span>
      </div>

      {/* Unmapped properties notice */}
      {unmappedProperties.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-amber-800 mb-2">
              {unmappedProperties.length} propert{unmappedProperties.length === 1 ? "y" : "ies"} without coordinates
            </p>
            <div className="flex flex-wrap gap-2">
              {unmappedProperties.slice(0, 5).map((p) => (
                <span key={p._id} className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  {p.name}
                </span>
              ))}
              {unmappedProperties.length > 5 && (
                <span className="text-xs text-amber-600">+{unmappedProperties.length - 5} more</span>
              )}
            </div>
            <p className="text-xs text-amber-600 mt-2">
              Edit these properties and add coordinates to see them on the map.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
