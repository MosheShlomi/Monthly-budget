import { ReactNode } from "react";
import { clsx } from "clsx";

interface BadgeProps {
  children: ReactNode;
  color?: string;
  variant?: "solid" | "soft";
  className?: string;
}

export function Badge({
  children,
  color,
  variant = "soft",
  className,
}: BadgeProps) {
  if (color) {
    const style =
      variant === "solid"
        ? { backgroundColor: color, color: "white" }
        : { backgroundColor: `${color}20`, color: color };

    return (
      <span
        className={clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
          className
        )}
        style={style}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-slate-100 text-slate-700",
        className
      )}
    >
      {children}
    </span>
  );
}
