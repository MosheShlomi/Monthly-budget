"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle, FileSpreadsheet, ArrowLeft } from "lucide-react";
import { useFamilyStore } from "@/store/familyStore";
import { apiUpload, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "sonner";
import type { Category } from "@/types";

type Step = "upload" | "map" | "confirm" | "success";

interface PreviewData {
  headers: string[];
  rows: string[][];
  total_rows: number;
}

interface MappedRow {
  amount: number;
  category_id: string;
  date: string;
  payment_method: string;
  notes?: string;
}

export default function ImportPage() {
  const { currentFamily } = useFamilyStore();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Column mapping
  const [amountCol, setAmountCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [notesCol, setNotesCol] = useState("");
  const [defaultCategory, setDefaultCategory] = useState("");
  const [defaultPayment, setDefaultPayment] = useState("cash");

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const f = acceptedFiles[0];
      if (!f || !currentFamily) return;
      setFile(f);
      setLoading(true);

      try {
        // Load categories
        const cats = await apiFetch<Category[]>(`/api/v1/families/${currentFamily.id}/categories`);
        setCategories(cats);

        const formData = new FormData();
        formData.append("file", f);
        const prev = await apiUpload<PreviewData>(
          `/api/v1/families/${currentFamily.id}/import/preview`,
          formData
        );
        setPreview(prev);
        setStep("map");
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
    accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] },
    multiple: false,
  });

  async function handleConfirm() {
    if (!currentFamily || !preview || !amountCol || !dateCol || !defaultCategory) {
      toast.error("נא למלא את כל השדות הנדרשים");
      return;
    }

    const amountIdx = preview.headers.indexOf(amountCol);
    const dateIdx = preview.headers.indexOf(dateCol);
    const notesIdx = notesCol ? preview.headers.indexOf(notesCol) : -1;

    const rows: MappedRow[] = preview.rows
      .map((row) => {
        const amount = parseFloat(row[amountIdx]);
        if (isNaN(amount) || amount <= 0) return null;
        return {
          amount,
          category_id: defaultCategory,
          date: row[dateIdx] || new Date().toISOString().split("T")[0],
          payment_method: defaultPayment,
          notes: notesIdx >= 0 ? row[notesIdx] : undefined,
        };
      })
      .filter(Boolean) as MappedRow[];

    setLoading(true);
    try {
      const result = await apiFetch<{ imported: number }>(
        `/api/v1/families/${currentFamily.id}/import/confirm`,
        {
          method: "POST",
          body: JSON.stringify({ rows }),
        }
      );
      setImportedCount(result.imported);
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
    setPreview(null);
    setAmountCol("");
    setDateCol("");
    setNotesCol("");
    setDefaultCategory("");
  }

  if (!currentFamily) {
    return <div className="text-center py-20 text-slate-400">אין משפחה מחוברת</div>;
  }

  const colOptions = preview?.headers.map((h) => ({ value: h, label: h })) ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ייבוא מ-Excel</h1>
        <p className="text-sm text-slate-500 mt-0.5">ייבוא הוצאות מקובץ אקסל</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        {(["upload", "map", "confirm", "success"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs
              ${step === s ? "bg-primary-600 text-white" :
                (["upload","map","confirm","success"].indexOf(step) > i ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500")}`}>
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-slate-200" />}
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
        </Card>
      )}

      {/* Step 2: Map columns */}
      {step === "map" && preview && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{file?.name}</span>
              <span className="text-xs text-slate-400">· {preview.total_rows} שורות</span>
            </div>

            <div className="space-y-4">
              <Select
                label="עמודת סכום *"
                value={amountCol}
                options={colOptions}
                onChange={(e) => setAmountCol(e.target.value)}
                placeholder="בחר עמודה"
              />
              <Select
                label="עמודת תאריך *"
                value={dateCol}
                options={colOptions}
                onChange={(e) => setDateCol(e.target.value)}
                placeholder="בחר עמודה"
              />
              <Select
                label="עמודת הערות (אופציונלי)"
                value={notesCol}
                options={[{ value: "", label: "ללא" }, ...colOptions]}
                onChange={(e) => setNotesCol(e.target.value)}
              />
              <Select
                label="קטגוריה לכל ההוצאות *"
                value={defaultCategory}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                onChange={(e) => setDefaultCategory(e.target.value)}
                placeholder="בחר קטגוריה"
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">אמצעי תשלום</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDefaultPayment("cash")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all
                      ${defaultPayment === "cash" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    מזומן
                  </button>
                  <button
                    onClick={() => setDefaultPayment("card")}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all
                      ${defaultPayment === "card" ? "bg-primary-50 border-primary-500 text-primary-700" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    כרטיס
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Preview table */}
          {preview.rows.length > 0 && (
            <Card padding="none">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-700">תצוגה מקדימה (5 שורות ראשונות)</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {preview.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-right font-medium text-slate-600 border-b border-slate-100">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 text-slate-600">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="flex gap-3">
            <Button onClick={() => setStep("confirm")} className="flex-1">
              המשך
            </Button>
            <Button variant="secondary" onClick={reset} className="flex-1">
              ביטול
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === "confirm" && preview && (
        <Card className="text-center">
          <FileSpreadsheet className="w-12 h-12 text-primary-400 mx-auto mb-3" />
          <p className="text-lg font-semibold text-slate-900 mb-1">מוכן לייבוא</p>
          <p className="text-slate-500 text-sm mb-6">
            ייבוא {preview.total_rows} שורות מ-{file?.name}
          </p>
          <div className="flex gap-3">
            <Button onClick={handleConfirm} loading={loading} className="flex-1">
              ייבא עכשיו
            </Button>
            <Button variant="secondary" onClick={() => setStep("map")} className="flex-1">
              <ArrowLeft className="w-4 h-4 rtl-flip" />
              חזור
            </Button>
          </div>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === "success" && (
        <Card className="text-center py-10">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <p className="text-2xl font-bold text-slate-900 mb-1">ייבוא הושלם!</p>
          <p className="text-slate-500 mb-6">{importedCount} הוצאות נוספו בהצלחה</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.href = "/spendings"}>
              לדף ההוצאות
            </Button>
            <Button variant="secondary" onClick={reset}>
              ייבוא נוסף
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
