import React, { useState, useRef } from "react";
import { Download, Upload, AlertTriangle, Database, CheckSquare, Square } from "lucide-react";
import { createBackup, restoreBackup, TABLES_TO_BACKUP } from "@/lib/backupRestore";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

export function BackupRestoreTab() {
  const { dir } = useI18n();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTables, setSelectedTables] = useState<string[]>(TABLES_TO_BACKUP);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    async function checkTables() {
      const { data, error } = await supabase.rpc("get_all_tables" as any);
      if (error || !data) return;
      const allTables = data.map((d: any) => d.table_name);
      // Filter out tables that are already in TABLES_TO_BACKUP
      const unlisted = allTables.filter((t: string) => !TABLES_TO_BACKUP.includes(t));
      if (unlisted.length > 0) {
        setMissingTables(unlisted);
      }
    }
    checkTables();
  }, []);

  const toggleTable = (table: string) => {
    setSelectedTables((prev) =>
      prev.includes(table) ? prev.filter((t) => t !== table) : [...prev, table]
    );
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error("Please select at least one table to backup");
      return;
    }
    setIsExporting(true);
    try {
      const data = await createBackup(selectedTables);
      if (!data) return;
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Backup downloaded successfully");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Are you sure you want to restore this backup? Existing records with matching IDs will be updated. This action cannot be undone.")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      await restoreBackup(data);
    } catch (err: any) {
      console.error("Failed to parse or restore backup", err);
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Backup & Restore</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Safely export your CRM data as a JSON file, or restore from a previous backup.
        </p>
      </div>

      {missingTables.length > 0 && (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-warning-foreground">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h3 className="text-sm font-bold">Unlisted Tables Detected</h3>
              <p className="mt-1 text-xs">
                The following tables exist in your database but are not included in the standard backup script:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missingTables.map((t) => (
                  <span key={t} className="rounded bg-background px-2 py-1 text-xs font-medium border border-border">
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs opacity-80">
                To include them, please update <code>TABLES_TO_BACKUP</code> in the source code.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Export Data" icon={Database}>
          <p className="mb-4 text-sm text-muted-foreground">
            Download a snapshot of the selected CRM tables.
          </p>
          
          <div className="mb-4 rounded-lg border border-border bg-background p-3">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
              <span className="text-sm font-semibold">Select Tables</span>
              <button
                onClick={() =>
                  setSelectedTables(
                    selectedTables.length === TABLES_TO_BACKUP.length ? [] : TABLES_TO_BACKUP
                  )
                }
                className="text-xs font-semibold text-primary hover:underline"
              >
                {selectedTables.length === TABLES_TO_BACKUP.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
              {TABLES_TO_BACKUP.map((table) => (
                <label
                  key={table}
                  className="flex cursor-pointer items-center gap-2 rounded hover:bg-accent/50 px-2 py-1"
                >
                  <input
                    type="checkbox"
                    checked={selectedTables.includes(table)}
                    onChange={() => toggleTable(table)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20"
                  />
                  <span className="text-xs font-medium text-foreground">{table}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || selectedTables.length === 0}
            className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Download Backup"}
          </button>
        </Section>

        <Section title="Import Data" icon={Upload}>
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm text-amber-800">
                <span className="font-bold">Warning:</span> Restoring data will overwrite existing records that share the same IDs. Proceed with caution.
              </div>
            </div>
          </div>
          <input
            type="file"
            accept=".json"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex items-center justify-center gap-2 w-full rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isImporting ? "Restoring..." : "Select Backup File"}
          </button>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-lg font-bold">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {title}
      </div>
      {children}
    </div>
  );
}
