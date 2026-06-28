import { useState, useRef } from "react";
import { X, Upload, Download, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { actions, useStoreState } from "@/lib/store";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export type ImportType = "projects" | "leads" | "activities";

interface Props {
  type: ImportType;
  onClose: () => void;
}

export function ExcelImportModal({ type, onClose }: Props) {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings, profile } = useStoreState();

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sampleRow: any = {};

    switch (type) {
      case "projects":
        headers = [
          "Name",
          "Client",
          "ClientEmail",
          "ClientPhone",
          "City",
          "District",
          "Street",
          "AccountType",
          "Contact2Name",
          "Contact2Title",
          "Contact2Phone",
          "Contact3Name",
          "Contact3Title",
          "Contact3Phone",
        ];
        sampleRow = {
          Name: "Sample Project",
          Client: "Sample Client",
          ClientEmail: "info@example.com",
          ClientPhone: "+201000000000",
          City: "Cairo",
          District: "Nasr City",
          Street: "10 Abbas St",
          AccountType: "End User",
          Contact2Name: "Hafez Rahim",
          Contact2Title: "Engineer",
          Contact2Phone: "+201111111111",
          Contact3Name: "",
          Contact3Title: "",
          Contact3Phone: "",
        };
        break;
      case "leads":
        headers = [
          "Company",
          "Contact",
          "Email",
          "Phone",
          "Industry",
          "City",
          "District",
          "Street",
          "Source",
          "Status",
          "Value",
          "Probability",
          "ExpectedCloseDate",
        ];
        sampleRow = {
          Company: "Sample Lead",
          Contact: "Hafez Rahim",
          Email: "Hafez@example.com",
          Phone: "+201000000000",
          Industry: "Technology",
          City: "Cairo",
          District: "Maadi",
          Street: "15 Maadi St",
          Source: "Website",
          Status: "new",
          Value: 50000,
          Probability: 20,
          ExpectedCloseDate: new Date().toISOString().slice(0, 10),
        };
        break;
      case "activities":
        headers = ["Title", "Type", "DueDate", "Time", "EstMinutes", "Notes"];
        sampleRow = {
          Title: "Initial Call",
          Type: "Call",
          DueDate: new Date().toISOString().slice(0, 10),
          Time: "10:00",
          EstMinutes: 30,
          Notes: "Discuss requirements",
        };
        break;
    }

    const ws = XLSX.utils.json_to_sheet([sampleRow], { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${type}_import_template.xlsx`);
  };

  const processFile = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        toast.error(isAr ? "الملف فارغ" : "File is empty");
        setLoading(false);
        return;
      }

      let count = 0;
      const myName = profile?.name && profile.name !== "—" ? profile.name : "Unassigned";

      switch (type) {
        case "projects":
          for (const row of rows as any[]) {
            if (!row.Name || !row.Client) continue;
            const extraContacts: { name: string; title: string; phone: string; email: string }[] =
              [];
            if (row.Contact2Name)
              extraContacts.push({
                name: row.Contact2Name,
                title: row.Contact2Title || "",
                phone: String(row.Contact2Phone || ""),
                email: String(row.Contact2Email || ""),
              });
            if (row.Contact3Name)
              extraContacts.push({
                name: row.Contact3Name,
                title: row.Contact3Title || "",
                phone: String(row.Contact3Phone || ""),
                email: String(row.Contact3Email || ""),
              });
            actions.addProject({
              name: row.Name,
              client: row.Client,
              clientEmail: row.ClientEmail,
              clientPhone: String(row.ClientPhone || ""),
              city: row.City,
              district: row.District,
              street: row.Street,
              budget: 0,
              team: 1,
              teamMembers: [],
              progress: 0,
              status: "On Track",
              offeredValue: 0,
              competitors: [],
              category: row.AccountType || "Other",
              lastUpdate: new Date().toISOString().slice(0, 10),
              ...(extraContacts.length > 0 ? { extraContacts } : {}),
            } as any);
            count++;
          }
          break;
        case "leads":
          for (const row of rows as any[]) {
            if (!row.Company) continue;
            actions.addLead({
              company: row.Company,
              contact: row.Contact || row.Company,
              email: row.Email,
              industry: row.Industry,
              source: row.Source || "Website",
              status: settings.statuses.includes(row.Status) ? row.Status : "new",
              value: Number(row.Value) || 0,
              probability: Number(row.Probability) || 0,
              city: row.City || "Cairo",
              street: row.Street,
              owner: myName,
              expectedCloseDate: row.ExpectedCloseDate,
            } as any);
            count++;
          }
          break;
        case "activities":
          for (const row of rows as any[]) {
            if (!row.Title) continue;
            actions.addActivity({
              type: settings.activityTypes.includes(row.Type) ? row.Type : "Call",
              title: row.Title,
              dueDate: row.DueDate || new Date().toISOString().slice(0, 10),
              time: row.Time || "09:00",
              estMinutes: Number(row.EstMinutes) || 30,
              notes: row.Notes,
              owner: myName,
            } as any);
            count++;
          }
          break;
      }

      toast.success(`${t("importSuccess")} (${count} records)`);
      onClose();
    } catch (err) {
      console.error("Import error", err);
      toast.error(t("importFailed") as string);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-foreground">
              {t("importExcel")} - {t(type)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">
              1. {t("downloadTemplate")}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {isAr
                ? "قم بتنزيل القالب لتعبئة البيانات بالصيغة الصحيحة."
                : "Download the template to fill in the data in the correct format."}
            </p>
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              <Download className="h-4 w-4" /> {t("downloadTemplate")}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">2. {t("uploadExcel")}</div>
            <p className="mb-3 text-xs text-muted-foreground">
              {isAr
                ? "قم برفع الملف بعد تعبئته بالبيانات."
                : "Upload the file after filling it with data."}
            </p>

            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              ref={fileInputRef}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                file
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }`}
            >
              {file ? (
                <>
                  <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
                  <div className="text-sm font-semibold text-foreground">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </div>
                </>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <div className="text-sm font-semibold text-foreground">{t("uploadExcel")}</div>
                  <div className="text-xs text-muted-foreground">.xlsx or .xls</div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={processFile}
            disabled={!file || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors min-w-[100px]"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              t("importExcel")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
