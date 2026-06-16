# Backend — Integrated Technics CRM

Source of truth for database schema, RLS policies, triggers, edge functions and seed data.
All user-facing text columns are **bilingual** (`*_en` / `*_ar`).

## Structure

```
backend/
├── schema/           # DDL — run in numeric order
│   ├── 00_extensions.sql
│   ├── 01_enums.sql
│   ├── 02_profiles.sql
│   ├── 03_roles.sql
│   ├── 04_clients.sql
│   ├── 05_leads.sql
│   ├── 06_activities.sql
│   ├── 07_projects.sql
│   ├── 08_quotations.sql
│   ├── 09_attendance.sql
│   ├── 10_notifications.sql
│   ├── 11_history.sql
│   ├── 12_attachments.sql
│   └── 13_settings.sql
├── functions/        # SQL helpers + triggers
│   ├── helpers.sql
│   └── triggers.sql
├── policies/         # Row Level Security
│   └── rls_policies.sql
├── edge-functions/   # Deno edge functions (deploy via supabase CLI)
│   ├── convert-lead-to-quotation/
│   ├── send-notification/
│   └── daily-attendance-summary/
└── seed/             # Demo data
    └── seed.sql
```

## Bilingual convention

| Column pattern         | Example                                 |
|------------------------|------------------------------------------|
| `name_en` / `name_ar`  | `"Aramco Digital"` / `"أرامكو ديجيتال"` |
| `title_en` / `title_ar`| Activity / notification titles           |
| `body_en` / `body_ar`  | Long descriptions                        |
| `label_en` / `label_ar`| Settings (statuses, stages, etc.)        |

Client convention: a helper `t(row, lang)` picks `*_${lang}` and falls back to the other.

## Roles & access

Roles live in `public.user_roles` (NEVER on profiles). The `has_role(uid, role)`
SECURITY DEFINER function is used in every RLS policy to prevent recursion.

Roles: `admin`, `manager`, `hr`, `finance`, `employee`.

## Apply order

1. `schema/*.sql` (in order)
2. `functions/helpers.sql` then `functions/triggers.sql`
3. `policies/rls_policies.sql`
4. (optional) `seed/seed.sql`
5. Deploy edge functions: `supabase functions deploy <name>`
