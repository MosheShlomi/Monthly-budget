"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  className?: string;
}

export function MultiSelect({ options, selected, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const label =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? placeholder
      : `${selected.length} נבחרו`;

  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition-colors",
          open ? "border-primary-400 ring-2 ring-primary-100" : "border-slate-300 hover:border-slate-400",
          selected.length > 0 ? "text-slate-900 font-medium" : "text-slate-500"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={clsx("w-4 h-4 flex-shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <ul className="max-h-52 overflow-y-auto py-1">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-right hover:bg-slate-50 transition-colors"
                  >
                    <span
                      className={clsx(
                        "w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors",
                        checked ? "bg-primary-600 border-primary-600" : "border-slate-300 bg-white"
                      )}
                    >
                      {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {selected.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-1.5">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                נקה הכל
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
