import { ReactNode } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "bg-white rounded-2xl shadow-sm border border-slate-100",
          paddings[padding],
          className
        )
      )}
    >
      {children}
    </div>
  );
}
