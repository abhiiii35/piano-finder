"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { globalSearch, type SearchGroups, type SearchResult } from "@/actions/search";
import { cn } from "@/lib/utils";

const GROUPS: { key: keyof SearchGroups; label: string }[] = [
  { key: "customers", label: "Customers" },
  { key: "contacts", label: "Contacts" },
  { key: "pianos", label: "Pianos" },
  { key: "locations", label: "Locations" },
  { key: "bookings", label: "Bookings" },
];

const EMPTY_RESULTS: SearchGroups = {
  customers: [],
  contacts: [],
  pianos: [],
  locations: [],
  bookings: [],
};

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGroups>(EMPTY_RESULTS);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      globalSearch(trimmed).then((data) => {
        setResults(data);
        setLoading(false);
        setActiveIndex(-1);
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Flatten groups in display order, each item tagged with its position in
  // that flattened list, so arrow-key navigation moves across all groups.
  let resultCounter = -1;
  const sections = GROUPS.map(({ key, label }) => {
    const items = results[key];
    if (items.length === 0) return null;
    return {
      label,
      items: items.map((item) => ({ item, index: ++resultCounter })),
    };
  }).filter((s): s is { label: string; items: { item: SearchResult; index: number }[] } => s !== null);
  const flatResults = sections.flatMap((s) => s.items.map((i) => i.item));

  function goTo(result: SearchResult) {
    setOpen(false);
    setQuery("");
    setResults(EMPTY_RESULTS);
    router.push(result.href);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatResults.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = flatResults[activeIndex] ?? flatResults[0];
      if (target) goTo(target);
    }
  }

  const showDropdown = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          placeholder="Search customers, pianos, contacts..."
          aria-label="Global search"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-8 w-full rounded-lg border border-input bg-transparent py-1 pr-8 pl-8 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setResults(EMPTY_RESULTS);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {loading ? (
            <p className="p-3 text-sm text-muted-foreground">Searching...</p>
          ) : flatResults.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            sections.map((section) => (
              <div key={section.label} className="border-b last:border-b-0">
                <p className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
                  {section.label}
                </p>
                {section.items.map(({ item, index }) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goTo(item)}
                    className={cn(
                      "flex w-full flex-col items-start px-3 py-1.5 text-left text-sm",
                      index === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                  >
                    <span className="font-medium">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
