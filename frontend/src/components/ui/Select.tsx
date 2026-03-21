"use client";

import { forwardRef, SelectHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-slate-700">{label}</label>
        )}
        <select
          ref={ref}
          className={twMerge(
            clsx(
              "w-full px-3 py-2 rounded-lg border text-sm transition-colors bg-white",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              error
                ? "border-red-400 bg-red-50"
                : "border-slate-300 hover:border-slate-400",
              className
            )
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
