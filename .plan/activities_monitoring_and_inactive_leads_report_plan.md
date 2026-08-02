# 📋 Implementation Plan: Activities Monitoring & Inactive Leads Report

This document outlines the detailed architectural specification and step-by-step implementation strategy for adding **Activities Monitoring Settings** and the **Inactive Leads Report** to INT-CRM.

---

## 🎯 Features Overview

### 1. ⚙️ Activities Monitoring Settings (`Settings > Activities Monitoring`)

Configures automated background rules for tracking lead inactivity, business operating hours, and multi-tier notification escalation paths.

#### Key Modules:

- **Global Control & Threshold**:
  - Master enable/disable toggle for activities monitoring.
  - Dropdown selector for inactivity threshold (`1 Day`, `2 Days`, `3 Days`, `5 Days`, `7 Days`, `14 Days`). Default: `3 Days`.
- **Schedules & Working Hours**:
  - Notification Frequency checkboxes: `Daily`, `Weekly`, `Monthly`.
  - Working Days checkboxes: Sunday–Saturday (Default: Sunday–Thursday). Off-days are excluded when calculating inactive days.
  - Working Hours selects: Start time (e.g. `08:00 AM`) and End time (e.g. `06:00 PM`).
- **Lead Status Exclusions**:
  - Checkboxes to ignore leads in specific statuses: `Ignore Closed Leads`, `Ignore Won Leads`, `Ignore Lost Leads`, `Ignore Archived Leads`.
- **Multi-tier Escalation Rules**:
  - `3 Days` → Notify Assigned Employee (`bg-emerald-500/10 text-emerald-600`)
  - `5 Days` → Notify Direct Manager (`bg-blue-500/10 text-blue-600`)
  - `7 Days` → Notify Sales Manager (`bg-amber-500/10 text-amber-600`)
  - `14 Days` → Notify CRM Admin (`bg-rose-500/10 text-rose-600`)
- **Advanced Monitoring Toggles**:
  - `Ignore Activities Created by Others`: Only evaluate activities created by lead owner.
  - `Include Sub-Activities`: Count child/sub-activities towards last activity timestamp.
  - `Pause Monitoring for Holidays`: Exclude official public holidays.
  - `Auto-Create Follow-up`: Automatically create follow-up task upon escalation.

---

### 2. 📊 Inactive Leads Report (`Reports > Inactive Leads Report`)

An interactive report and management workspace for analyzing dormant leads, filtering by inactivity age, sending batch reminders, and exporting reports.

#### Key Modules:

- **Header & Action Bar**:
  - Page title, subtitle, `Export` button, and `Schedule Report` modal trigger.
- **Top Filter Bar**:
  - Date Range dropdown (`7+ Days`, `1-2 Days`, `3-6 Days`, `14+ Days`, `All Time`).
  - Employee filter dropdown (`All Employees`, individual employees).
  - Lead Stage filter dropdown (`All Stages`, stage list).
  - Priority filter dropdown (`All Priorities`, `High`, `Medium`, `Low`).
  - `More Filters` trigger.
- **Data Table**:
  - Row Selection checkboxes for batch operations.
  - Columns:
    - **Lead Name**: Name + Account link.
    - **Account**: Company/Account name.
    - **Assigned To**: Employee avatar + full name.
    - **Last Activity**: Formatted date + relative age (e.g. `12-05-2026 (8 days ago)`).
    - **Inactive For**: Red/Warning pill badge (e.g. `8 Days`).
    - **Stage**: Colored stage pill badge (e.g. `Proposal`, `Negotiation`, `Qualification`, `New`).
    - **Priority**: Colored priority badge (`High`, `Medium`, `Low`).
    - **Actions**: 3-dots action menu (`Send Reminder`, `View Lead`, `Reassign Owner`, `Log Activity`).
  - **Bottom Batch Action Bar**:
    - Appears when 1+ rows selected: `Send Reminder` button & `Export to CSV` button.
  - Pagination controls (`Showing 1 to 10 of X records`).
- **Right Analytical Sidebar**:
  - **Activity Age Checkboxes**: Live count badges:
    - `Today (0)`
    - `1 - 2 Days (3)`
    - `3 - 6 Days (8)`
    - `7 - 14 Days (20)`
    - `14+ Days (17)`
  - **Advanced Filters**: Lead Stage, Lead Source, Priority, Sort By (`Inactive For: High to Low`).
  - **Live Summary Card**:
    - Total Inactive Leads count
    - High Priority count (Red)
    - Medium Priority count (Amber)
    - Low Priority count (Blue)
  - `Generate Report` button.

---

## 🛠️ Step-by-Step Technical Implementation Plan

### Step 1: Database Migration & Schema (`supabase/migrations/`)

- Create table `activities_monitoring_settings`:
  ```sql
  CREATE TABLE IF NOT EXISTS public.activities_monitoring_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enabled BOOLEAN DEFAULT true,
    no_activity_threshold_days INT DEFAULT 3,
    frequency TEXT[] DEFAULT ARRAY['daily', 'weekly'],
    working_days TEXT[] DEFAULT ARRAY['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    working_hours_start TIME DEFAULT '08:00:00',
    working_hours_end TIME DEFAULT '18:00:00',
    ignore_closed BOOLEAN DEFAULT true,
    ignore_won BOOLEAN DEFAULT true,
    ignore_lost BOOLEAN DEFAULT true,
    ignore_archived BOOLEAN DEFAULT true,
    ignore_others_activities BOOLEAN DEFAULT false,
    include_sub_activities BOOLEAN DEFAULT true,
    pause_holidays BOOLEAN DEFAULT false,
    auto_create_followup BOOLEAN DEFAULT false,
    escalation_rules JSONB DEFAULT '[
      {"days": 3, "role": "Employee"},
      {"days": 5, "role": "Manager"},
      {"days": 7, "role": "Sales Manager"},
      {"days": 14, "role": "CRM Admin"}
    ]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- Seed initial monitoring settings row.

### Step 2: Settings Component (`src/components/admin/settings/ActivitiesMonitoringTab.tsx`)

- Build clean, responsive tab component matching Screenshot 1 layout.
- Bind form controls to settings state and persist changes to Supabase / store state.
- Add `Activities Monitoring` tab to `TABS` array in `src/routes/admin.settings.tsx`.

### Step 3: Inactive Leads Calculation & Helper Utilities (`src/lib/inactiveLeads.ts`)

- Implement inactivity helper functions:
  - `calculateInactiveDays(lead, activities, workingDays, workingHours)`: Computes actual working days elapsed since the lead's latest activity.
  - `filterInactiveLeads(leads, activities, filters)`: Evaluates inactive deals against selected criteria (stage, age bucket, priority, owner).

### Step 4: Inactive Leads Report Route (`src/routes/admin.reports.inactive-leads.tsx` & `admin.reports.tsx`)

- Build the report view with:
  - Top filter controls.
  - Table with multi-row selection & floating batch actions bar (`Send Reminder`, `Export to CSV`).
  - Right analytical sidebar with age breakdown checkboxes, sort controls, and summary card.
- Add navigation link to `Inactive Leads Report` in `admin.reports.tsx` and `manager.reports.tsx`.

### Step 5: Reminder & Escalation Dispatch Engine

- Implement `actions.sendLeadReminder(leadId, message)` in `src/lib/store.ts` to push instant notifications to lead owners.
- Implement automated escalation alert logic based on escalation rule intervals.

---

## 🧪 Verification Plan

### Manual & UI Testing:

1. Navigate to **Settings > Activities Monitoring** tab:
   - Toggle options, adjust dropdown threshold, working hours, and click **Save Changes**.
   - Verify settings persist across reloads.
2. Navigate to **Reports > Inactive Leads Report**:
   - Verify inactive lead counts match real lead activity records.
   - Filter by **Activity Age** (e.g. `7 - 14 Days`) and verify table updates instantly.
   - Select 2+ leads, click **Send Reminder**, and check Notification Center for triggered alerts.
   - Click **Export to CSV** and verify downloaded file output.
