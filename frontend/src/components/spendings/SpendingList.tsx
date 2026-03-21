"use client";

import { Pencil, Trash2, CreditCard, Banknote } from "lucide-react";
import { fmtStr } from "@/lib/format";
import type { Spending } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Props {
  spendings: Spending[];
  onEdit: (spending: Spending) => void;
  onDelete: (id: string) => void;
  currentUserId: string;
  isOwner: boolean;
}

export function SpendingList({ spendings, onEdit, onDelete, currentUserId, isOwner }: Props) {
  if (spendings.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">לא נמצאו הוצאות</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {spendings.map((s) => {
        const canEdit = isOwner || s.user_id === currentUserId;
        return (
          <div
            key={s.id}
            className="flex items-center gap-3 py-3.5 px-1 hover:bg-slate-50 rounded-xl transition-colors group"
          >
            {/* Category color dot */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: s.category_color || "#6b7280" }}
            />

            {/* Main info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-slate-900" dir="ltr">
                  {fmtStr(s.amount)}
                </span>
                {s.category_name && (
                  <Badge color={s.category_color}>{s.category_name}</Badge>
                )}
                {s.payment_method === "card" ? (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <CreditCard className="w-3.5 h-3.5" />
                    {s.card_name || "כרטיס"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Banknote className="w-3.5 h-3.5" />
                    מזומן
                  </span>
                )}
              </div>
              {s.notes && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">{s.notes}</p>
              )}
            </div>

            {/* Right side: date, user, actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-left hidden sm:block">
                <p className="text-xs text-slate-500">
                  {new Date(s.date).toLocaleDateString("he-IL")}
                </p>
                <p className="text-xs text-slate-400">{s.user_name || s.user_email?.split("@")[0]}</p>
              </div>
              {canEdit && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(s)}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
