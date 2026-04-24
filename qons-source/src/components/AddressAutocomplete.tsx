import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "./ui/input";

interface AddressSuggestion {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: {
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Address input with autocomplete suggestions from OpenStreetMap Nominatim.
 * Free, no API key required. Debounced to respect rate limits.
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address...",
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "5",
        countrycodes: "us",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "Accept-Language": "en" } },
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      }
    } catch {
      // Silently fail — user can still type manually
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address;
    const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
    const city = addr.city || addr.town || addr.village || "";
    const state = addr.state || "";
    const zip = addr.postcode || "";

    onChange(street || suggestion.display_name.split(",")[0]);
    setShowSuggestions(false);

    if (onSelect) {
      onSelect({
        address: street || suggestion.display_name.split(",")[0],
        city,
        state,
        zip,
        latitude: parseFloat(suggestion.lat),
        longitude: parseFloat(suggestion.lon),
      });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="size-4 border-2 border-muted-foreground/30 border-t-teal rounded-full animate-spin" />
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 flex items-start gap-2 border-b last:border-0 transition-colors"
              onClick={() => handleSelect(s)}
            >
              <MapPin className="size-3.5 text-teal shrink-0 mt-0.5" />
              <span className="line-clamp-2">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
