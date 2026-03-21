/**
 * Format a monetary amount as: [sign]1,234 ₪
 * sign: "+"  → always show + prefix
 *       "-"  → always show - prefix
 *       "auto" → + when ≥ 0, - when < 0
 *       omitted → no sign prefix
 */
export function fmt(amount: number, sign?: "+" | "-" | "auto"): string {
  const abs = Math.abs(amount).toLocaleString("he-IL");
  if (sign === "+") return `+${abs} ₪`;
  if (sign === "-") return `-${abs} ₪`;
  if (sign === "auto") return `${amount >= 0 ? "+" : "-"}${abs} ₪`;
  return `${abs} ₪`;
}

/** Shorthand: parse a decimal string and format it */
export function fmtStr(amount: string, sign?: "+" | "-" | "auto"): string {
  return fmt(parseFloat(amount), sign);
}
