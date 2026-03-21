"use client";

import { MultiSelect } from "@/components/ui/MultiSelect";
import type { Category, FamilyMember, SpendingFilters } from "@/types";

const MONTH_NAMES = [
  "", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

interface Props {
  filters: SpendingFilters;
  onFilterChange: (filters: SpendingFilters) => void;
  categories: Category[];
  members: FamilyMember[];
}

export function SpendingFilters({ filters, onFilterChange, categories, members }: Props) {
  const now = new Date();

  const monthOptions = MONTH_NAMES.slice(1).map((name, i) => ({
    value: String(i + 1),
    label: name,
  }));

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - 2 + i;
    return { value: String(y), label: String(y) };
  });

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  const memberOptions = members.map((m) => ({
    value: m.user_id,
    label: m.user_name || m.user_email,
  }));

  return (
    <div className="flex flex-wrap gap-3">
      <MultiSelect
        options={monthOptions}
        selected={filters.months?.map(String) ?? []}
        onChange={(vals) =>
          onFilterChange({ ...filters, months: vals.length ? vals.map(Number) : undefined })
        }
        placeholder="כל החודשים"
        className="w-36"
      />
      <MultiSelect
        options={yearOptions}
        selected={filters.years?.map(String) ?? []}
        onChange={(vals) =>
          onFilterChange({ ...filters, years: vals.length ? vals.map(Number) : undefined })
        }
        placeholder="כל השנים"
        className="w-28"
      />
      <MultiSelect
        options={categoryOptions}
        selected={filters.category_ids ?? []}
        onChange={(vals) =>
          onFilterChange({ ...filters, category_ids: vals.length ? vals : undefined })
        }
        placeholder="כל הקטגוריות"
        className="w-40"
      />
      <MultiSelect
        options={memberOptions}
        selected={filters.user_ids ?? []}
        onChange={(vals) =>
          onFilterChange({ ...filters, user_ids: vals.length ? vals : undefined })
        }
        placeholder="כל החברים"
        className="w-40"
      />
    </div>
  );
}
