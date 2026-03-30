"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  value,
  onChange,
  className,
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      {label && (
        <label className="text-sm font-medium text-slate-700">{label}</label>
      )}
      <div ref={ref} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            "flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg border text-sm bg-white transition-colors",
            open
              ? "border-primary-400 ring-2 ring-primary-100"
              : error
              ? "border-red-400 bg-red-50"
              : "border-slate-300 hover:border-slate-400",
            selectedLabel ? "text-slate-900" : "text-slate-500",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="truncate">{selectedLabel ?? placeholder ?? "בחר"}</span>
          <ChevronDown
            className={clsx(
              "w-4 h-4 flex-shrink-0 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <ul className="max-h-52 overflow-y-auto py-1">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange?.(opt.value);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-right hover:bg-slate-50 transition-colors"
                    >
                      <span
                        className={clsx(
                          "w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary-600 border-primary-600"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && (
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        )}
                      </span>
                      <span className="flex-1 truncate">{opt.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
