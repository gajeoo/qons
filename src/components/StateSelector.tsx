import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
  "District of Columbia", "Puerto Rico", "Guam", "American Samoa",
  "U.S. Virgin Islands", "Northern Mariana Islands",
];

interface StateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * State selector: dropdown with all 50 US states + territories.
 * Users can also type in a custom value if their state isn't in the list.
 */
export function StateSelector({
  value,
  onChange,
  placeholder = "Select or type state...",
}: StateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? US_STATES.filter((s) => s.toLowerCase().includes(search.toLowerCase()))
    : US_STATES;

  const showCustomOption = search && !US_STATES.some(
    (s) => s.toLowerCase() === search.toLowerCase()
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal h-9"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
        <ChevronsUpDown className="size-3.5 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-900 border rounded-lg shadow-lg">
          <div className="p-2 border-b">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search states or type custom..."
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
                  onChange(search);
                  setOpen(false);
                  setSearch("");
                }}
              >
                Use "{search}"
              </button>
            )}
            {filtered.map((state) => (
              <button
                key={state}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center gap-2"
                onClick={() => {
                  onChange(state);
                  setOpen(false);
                  setSearch("");
                }}
              >
                {value === state && <Check className="size-3.5 text-teal" />}
                <span className={value === state ? "font-medium" : ""}>{state}</span>
              </button>
            ))}
            {filtered.length === 0 && !showCustomOption && (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No states found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
