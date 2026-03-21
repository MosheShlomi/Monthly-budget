"use client";

import { forwardRef, InputHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-slate-700">{label}</label>
        )}
        <input
          ref={ref}
          className={twMerge(
            clsx(
              "w-full px-3 py-2 rounded-lg border text-sm transition-colors",
              "placeholder:text-slate-400",
              "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
              error
                ? "border-red-400 bg-red-50 focus:ring-red-400"
                : "border-slate-300 bg-white hover:border-slate-400",
              className
            )
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
