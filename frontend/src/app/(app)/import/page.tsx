"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle, FileSpreadsheet, Trash2 } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { apiUpload, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { Category, FamilyMember } from "@/types";

type Step = "upload" | "preview" | "confirm" | "success";
type RowType = "expenses" | "incomes";

interface EditableRow {
  _id: number;
  date: string;
  amount: number;
  notes: string;
  category_id: string;
  category_name: string;
  payment_method?: "cash" | "card";
}

interface EditableSheet {
  name: string;
  expenses: EditableRow[];
  incomes: EditableRow[];
}

interface ParsedRow {
  date: string;
  amount: number;
  notes: string | null;
  category_name: string;
  payment_method?: "cash" | "card";
}

interface ParsedSheet {
  name: string;
  expenses: ParsedRow[];
  incomes: ParsedRow[];
}

interface BudgetPreview {
  sheets: ParsedSheet[];
  all_category_names: string[];
  matched_categories: Record<string, string>;
}

interface ImportResult {
  expenses_imported: number;
  incomes_imported: number;
}

const STEPS: Step[] = ["upload", "preview", "confirm", "success"];
const STEP_LABELS: Record<Step, string> = {
  upload: "העלאה",
  preview: "עריכה",
  confirm: "אישור",
  success: "סיום",
};

export default function ImportPage() {
  const { currentFamily } = useFamilyStore();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [editableSheets, setEditableSheets] = useState<EditableSheet[]>([]);
  const [memberAssignment, setMemberAssignment] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<Record<string, RowType>>({});

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const f = acceptedFiles[0];
      if (!f || !currentFamily) return;
      setFile(f);
      setLoading(true);

      try {
        const [cats, mems] = await Promise.all([
          apiFetch<Category[]>(`/api/v1/families/${currentFamily.id}/categories`),
          apiFetch<FamilyMember[]>(`/api/v1/families/${currentFamily.id}/members`),
        ]);
        setCategories(cats);
        setMembers(mems);

        const formData = new FormData();
        formData.append("file", f);
        const prev = await apiUpload<BudgetPreview>(
          `/api/v1/families/${currentFamily.id}/import/budget-preview`,
          formData
        );

        // Build editable sheets, auto-matching category IDs where possible
        let rowId = 0;
        const sheets: EditableSheet[] = prev.sheets.map((sheet) => ({
          name: sheet.name,
          expenses: sheet.expenses.map((row) => ({
            _id: rowId++,
            date: row.date,
            amount: row.amount,
            notes: row.notes ?? "",
            category_id: prev.matched_categories[row.category_name.toLowerCase()] ?? "",
            category_name: row.category_name,
            payment_method: row.payment_method ?? "card",
          })),
          incomes: sheet.incomes.map((row) => ({
            _id: rowId++,
            date: row.date,
            amount: row.amount,
            notes: row.notes ?? "",
            category_id: prev.matched_categories[row.category_name.toLowerCase()] ?? "",
            category_name: row.category_name,
          })),
        }));
        setEditableSheets(sheets);

        // Default active tab to "expenses"
        const tabs: Record<string, RowType> = {};
        sheets.forEach((s) => { tabs[s.name] = "expenses"; });
        setActiveTab(tabs);

        // Auto-assign members: first sheet → first member, second → second
        const assignment: Record<string, string> = {};
        sheets.forEach((sheet, i) => {
          const member = mems[i] ?? mems[mems.length - 1];
          if (member) assignment[sheet.name] = member.user_id;
        });
        setMemberAssignment(assignment);

        setStep("preview");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "שגיאה בטעינת הקובץ");
      } finally {
        setLoading(false);
      }
    },
    [currentFamily]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  function updateRow(sheetName: string, type: RowType, rowId: number, patch: Partial<EditableRow>) {
    setEditableSheets((prev) =>
      prev.map((sheet) =>
        sheet.name === sheetName
          ? { ...sheet, [type]: sheet[type].map((r) => (r._id === rowId ? { ...r, ...patch } : r)) }
          : sheet
      )
    );
  }

  function deleteRow(sheetName: string, type: RowType, rowId: number) {
    setEditableSheets((prev) =>
      prev.map((sheet) =>
        sheet.name === sheetName
          ? { ...sheet, [type]: sheet[type].filter((r) => r._id !== rowId) }
          : sheet
      )
    );
  }

  async function handleImport() {
    if (!currentFamily) return;
    setLoading(true);
    try {
      const sheets = editableSheets.map((sheet) => {
        const member = members.find((m) => m.user_id === memberAssignment[sheet.name]);
        return {
          member_user_id: memberAssignment[sheet.name],
          member_user_email: member?.user_email ?? "",
          member_user_name: member?.user_name ?? null,
          expenses: sheet.expenses.map((row) => ({
            date: row.date,
            amount: row.amount,
            notes: row.notes || null,
            category_id: row.category_id || null,
            category_name: row.category_name,
            payment_method: row.payment_method ?? "card",
          })),
          incomes: sheet.incomes.map((row) => ({
            date: row.date,
            amount: row.amount,
            notes: row.notes || null,
            category_id: row.category_id || null,
            category_name: row.category_name,
          })),
        };
      });

      const res = await apiFetch<ImportResult>(
        `/api/v1/families/${currentFamily.id}/import/budget-confirm`,
        { method: "POST", body: JSON.stringify({ sheets }) }
      );
      setResult(res);
      setStep("success");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה בייבוא");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setEditableSheets([]);
    setMemberAssignment({});
    setResult(null);
    setActiveTab({});
  }

  if (!currentFamily) {
    return <div className="text-center py-20 text-slate-400">אין משפחה מחוברת</div>;
  }

  const canConfirm = editableSheets.every((s) => !!memberAssignment[s.name]);

  const memberOptions = members.map((m) => ({
    value: m.user_id,
    label: m.user_name ?? m.user_email,
  }));

  const expenseCatOptions = [
    { value: "", label: "— בחר קטגוריה —" },
    ...categories.filter((c) => c.type === "expense").map((c) => ({ value: c.id, label: c.name })),
  ];

  const incomeCatOptions = [
    { value: "", label: "— בחר קטגוריה —" },
    ...categories.filter((c) => c.type === "income").map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ייבוא תקציב חודשי</h1>
        <p className="text-sm text-slate-500 mt-0.5">ייבוא הוצאות והכנסות מקובץ תקציב Excel</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs
                  ${step === s
                    ? "bg-primary-600 text-white"
                    : STEPS.indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-500"
                  }`}
              >
                {i + 1}
              </div>
              <span className={`hidden sm:inline ${step === s ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="w-6 h-0.5 bg-slate-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <Card>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
              ${isDragActive ? "border-primary-400 bg-primary-50" : "border-slate-200 hover:border-primary-300"}`}
          >
            <input {...getInputProps()} />
            {loading ? (
              <Spinner className="mx-auto" />
            ) : (
              <>
                <Upload className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">גרור קובץ Excel לכאן</p>
                <p className="text-sm text-slate-400 mt-1">או לחץ לבחירת קובץ</p>
                <p className="text-xs text-slate-300 mt-3">.xlsx, .xls</p>
              </>
            )}
          </div>
          <div className="mt-4 text-xs text-slate-400 space-y-1">
            <p className="font-medium text-slate-500">מבנה הקובץ הנדרש:</p>
            <p>• גיליון 1: סיכום (מדולג)</p>
            <p>• גיליון 2: הוצאות והכנסות של המשתמש הראשון</p>
            <p>• גיליון 3: הוצאות והכנסות של המשתמש השני</p>
          </div>
        </Card>
      )}

      {/* Step 2: Preview & Edit */}
      {step === "preview" && editableSheets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
            <span className="font-medium">{file?.name}</span>
          </div>

          {editableSheets.map((sheet) => {
            const tab = activeTab[sheet.name] ?? "expenses";
            const rows = sheet[tab];
            const catOptions = tab === "expenses" ? expenseCatOptions : incomeCatOptions;

            return (
              <Card key={sheet.name} padding="none">
                {/* Sheet header */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">{sheet.name}</p>
                    <span className="text-xs text-slate-400">
                      {sheet.expenses.length} הוצאות · {sheet.incomes.length} הכנסות
                    </span>
                  </div>

                  <Select
                    label="חבר משפחה *"
                    value={memberAssignment[sheet.name] ?? ""}
                    options={memberOptions}
                    onChange={(v) => setMemberAssignment((p) => ({ ...p, [sheet.name]: v }))}
                    placeholder="בחר חבר"
                  />

                  {/* Expense / Income tabs */}
                  <div className="flex gap-1">
                    {(["expenses", "incomes"] as RowType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTab((p) => ({ ...p, [sheet.name]: t }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${tab === t
                            ? "bg-primary-600 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                      >
                        {t === "expenses"
                          ? `הוצאות (${sheet.expenses.length})`
                          : `הכנסות (${sheet.incomes.length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Editable table */}
                {rows.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">אין שורות</p>
                ) : (
                  <div className="overflow-auto max-h-[420px]">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-right font-medium text-slate-500 w-32">תאריך</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500 w-24">סכום</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500">תיאור</th>
                          <th className="px-3 py-2 text-right font-medium text-slate-500 w-44">קטגוריה</th>
                          {tab === "expenses" && (
                            <th className="px-3 py-2 text-right font-medium text-slate-500 w-28">תשלום</th>
                          )}
                          <th className="px-2 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row._id} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-3 py-1.5">
                              <input
                                type="date"
                                value={row.date}
                                onChange={(e) => updateRow(sheet.name, tab, row._id, { date: e.target.value })}
                                className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) =>
                                  updateRow(sheet.name, tab, row._id, { amount: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={row.notes}
                                onChange={(e) => updateRow(sheet.name, tab, row._id, { notes: e.target.value })}
                                placeholder="—"
                                className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary-400"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <select
                                value={row.category_id}
                                onChange={(e) => updateRow(sheet.name, tab, row._id, { category_id: e.target.value })}
                                className={`w-full text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary-400
                                  ${row.category_id
                                    ? "border-slate-200 text-slate-700 bg-white"
                                    : "border-amber-300 text-amber-700 bg-amber-50"
                                  }`}
                              >
                                {catOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              {!row.category_id && (
                                <p className="text-amber-500 mt-0.5" style={{ fontSize: "10px" }}>
                                  ייווצר: {row.category_name}
                                </p>
                              )}
                            </td>
                            {tab === "expenses" && (
                              <td className="px-3 py-1.5">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => updateRow(sheet.name, tab, row._id, { payment_method: "cash" })}
                                    className={`flex-1 py-0.5 rounded text-xs font-medium border transition-all
                                      ${row.payment_method === "cash"
                                        ? "bg-green-50 border-green-400 text-green-700"
                                        : "bg-white border-slate-200 text-slate-500"
                                      }`}
                                  >
                                    מזומן
                                  </button>
                                  <button
                                    onClick={() => updateRow(sheet.name, tab, row._id, { payment_method: "card" })}
                                    className={`flex-1 py-0.5 rounded text-xs font-medium border transition-all
                                      ${row.payment_method === "card"
                                        ? "bg-primary-50 border-primary-400 text-primary-700"
                                        : "bg-white border-slate-200 text-slate-500"
                                      }`}
                                  >
                                    כרטיס
                                  </button>
                                </div>
                              </td>
                            )}
                            <td className="px-2 py-1.5">
                              <button
                                onClick={() => deleteRow(sheet.name, tab, row._id)}
                                className="text-slate-300 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            );
          })}

          <div className="flex gap-3">
            <Button onClick={() => setStep("confirm")} disabled={!canConfirm} className="flex-1">
              המשך לאישור
            </Button>
            <Button variant="secondary" onClick={reset} className="flex-1">
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && (
        <div className="space-y-4">
          <Card>
            <p className="font-semibold text-slate-800 mb-4">סיכום לפני ייבוא</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 text-right font-medium">גיליון</th>
                  <th className="pb-2 text-right font-medium">חבר משפחה</th>
                  <th className="pb-2 text-right font-medium">הוצאות</th>
                  <th className="pb-2 text-right font-medium">הכנסות</th>
                </tr>
              </thead>
              <tbody>
                {editableSheets.map((sheet) => {
                  const member = members.find((m) => m.user_id === memberAssignment[sheet.name]);
                  const newCats = sheet.expenses.filter((r) => !r.category_id).length
                    + sheet.incomes.filter((r) => !r.category_id).length;
                  return (
                    <tr key={sheet.name} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700">{sheet.name}</td>
                      <td className="py-2 text-slate-700">{member?.user_name ?? member?.user_email ?? "—"}</td>
                      <td className="py-2 text-slate-700">{sheet.expenses.length}</td>
                      <td className="py-2 text-slate-700">
                        {sheet.incomes.length}
                        {newCats > 0 && (
                          <span className="text-amber-500 text-xs mr-1.5">
                            ({newCats} קטגוריות חדשות ייווצרו)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleImport} loading={loading} className="flex-1">
              ייבא עכשיו
            </Button>
            <Button variant="secondary" onClick={() => setStep("preview")} className="flex-1">
              חזור לעריכה
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === "success" && result && (
        <Card className="text-center py-10">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-2xl font-bold text-slate-900 mb-2">ייבוא הושלם!</p>
          <p className="text-slate-500 mb-1">{result.expenses_imported} הוצאות יובאו בהצלחה</p>
          <p className="text-slate-500 mb-6">{result.incomes_imported} הכנסות יובאו בהצלחה</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => (window.location.href = "/spendings")}>לדף ההוצאות</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "/incomes")}>לדף ההכנסות</Button>
            <Button variant="secondary" onClick={reset}>ייבוא נוסף</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
