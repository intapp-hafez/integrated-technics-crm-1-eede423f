import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const TABLES_TO_BACKUP = [
  "activities",
  "activity_types_config",
  "admin_task_activities",
  "admin_tasks",
  "attachments",
  "attendance",
  "automation_rules",
  "catalog_categories",
  "catalog_items",
  "clients",
  "departments",
  "email_delivery_logs",
  "email_jobs",
  "history",
  "ip_blocklist",
  "ip_whitelist",
  "lead_catalog_items",
  "lead_notes",
  "leads",
  "locations",
  "messages",
  "notification_templates",
  "notifications",
  "pipeline_config",
  "pipeline_stages",
  "positions",
  "profiles",
  "project_members",
  "project_requests",
  "projects",
  "quotation_items",
  "quotations",
  "rate_limit_counters",
  "registered_accounts",
  "role_permissions",
  "security_audit_logs",
  "security_events",
  "security_scan_runs",
  "smtp_settings",
  "sticky_notes",
  "system_settings",
  "user_roles"
];

export async function createBackup(tablesToBackup = TABLES_TO_BACKUP) {
  const backupData: Record<string, any[]> = {};
  
  for (const table of tablesToBackup) {
    const { data, error } = await supabase.from(table as any).select("*");
    if (error) {
      console.error(`Failed to backup table ${table}`, error);
      toast.error(`Failed to backup ${table}`);
      return null;
    }
    backupData[table] = data || [];
  }
  
  return backupData;
}

export async function restoreBackup(backupData: Record<string, any[]>) {
  const tables = TABLES_TO_BACKUP.filter(t => backupData[t] && backupData[t].length > 0);
  
  let successCount = 0;
  for (const table of tables) {
    const records = backupData[table];
    if (!records || records.length === 0) continue;
    
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from(table as any).upsert(batch);
      if (error) {
        console.error(`Failed to restore table ${table}`, error);
        toast.error(`Failed to restore ${table}: ${error.message}`);
        return false;
      }
    }
    successCount++;
  }
  
  toast.success(`Successfully restored ${successCount} tables`);
  return true;
}
