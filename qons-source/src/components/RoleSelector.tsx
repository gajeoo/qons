import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const PRESET_ROLES = [
  "Concierge",
  "Porter",
  "Supervisor",
  "Manager",
  "Maintenance",
  "Security",
  "Custodian",
  "Front Desk",
  "Leasing Agent",
  "Property Manager",
  "Assistant Manager",
  "Resident Manager",
  "Housekeeper",
  "Landscaper",
  "Electrician",
  "Plumber",
  "HVAC Technician",
];

interface RoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Role selector with preset options and ability to type a custom role.
 */
export function RoleSelector({
  value,
  onChange,
  placeholder = "Select or type role...",
}: RoleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = search
    ? PRESET_ROLES.filter(r => r.toLowerCase().includes(search.toLowerCase()))
    : PRESET_ROLES;

  const showCustomOption =
    search && !PRESET_ROLES.some(r => r.toLowerCase() === search.toLowerCase());

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal h-9"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "capitalize" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronsUpDown className="size-3.5 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search or type custom role..."
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {showCustomOption && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2 border-b text-teal font-medium"
                onClick={() => {
                  onChange(search.toLowerCase());
                  setOpen(false);
                  setSearch("");
                }}
              >
                Use "{search}"
              </button>
            )}
            {filtered.map(role => (
              <button
                key={role}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                onClick={() => {
                  onChange(role.toLowerCase());
                  setOpen(false);
                  setSearch("");
                }}
              >
                {value === role.toLowerCase() && (
                  <Check className="size-3.5 text-teal" />
                )}
                <span
                  className={value === role.toLowerCase() ? "font-medium" : ""}
                >
                  {role}
                </span>
              </button>
            ))}
            {filtered.length === 0 && !showCustomOption && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                No roles found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
