-- ============================================================
-- Presales Panel — Database Schema (Migration 14)
-- ============================================================

-- 1. Extend existing enums
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'presales';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'presales';
ALTER TYPE public.history_module ADD VALUE IF NOT EXISTS 'presales';

-- 2. Main Presales Cases table
CREATE TABLE IF NOT EXISTS public.presales_cases (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text        UNIQUE,                                          -- PSC-001
  lead_id        uuid        REFERENCES public.leads(id) ON DELETE SET NULL,  -- CRM Lead (optional)
  title_en       text        NOT NULL,
  title_ar       text,
  client_id      uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status         text        NOT NULL DEFAULT 'new'
                               CHECK (status IN (
                                 'new', 'under_review', 'boq_ready',
                                 'offer_sent', 'approved', 'handover', 'closed'
                               )),
  priority       text        NOT NULL DEFAULT 'medium'
                               CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  technical_notes text,
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 3. BOQ Items — Bill of Quantities
CREATE TABLE IF NOT EXISTS public.presales_boq_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid        NOT NULL REFERENCES public.presales_cases(id) ON DELETE CASCADE,
  item_no         int,
  description_en  text        NOT NULL,
  description_ar  text,
  unit            text,                                  -- م², قطعة, ساعة
  quantity        numeric(14,3) NOT NULL DEFAULT 0,
  unit_cost       numeric(14,2) NOT NULL DEFAULT 0,
  notes           text,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. Cost Estimation Items
CREATE TABLE IF NOT EXISTS public.presales_cost_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid        NOT NULL REFERENCES public.presales_cases(id) ON DELETE CASCADE,
  category        text,                                  -- مواد / عمالة / مقاولات / أخرى
  description_en  text        NOT NULL,
  description_ar  text,
  quantity        numeric(14,3) NOT NULL DEFAULT 1,
  unit_cost       numeric(14,2) NOT NULL DEFAULT 0,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. Financial Offers
CREATE TABLE IF NOT EXISTS public.presales_financial_offers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        uuid        NOT NULL REFERENCES public.presales_cases(id) ON DELETE CASCADE,
  offer_code     text        UNIQUE,                     -- PFO-001
  offer_date     date        NOT NULL DEFAULT CURRENT_DATE,
  valid_until    date,
  total_cost     numeric(14,2) NOT NULL DEFAULT 0,
  margin_pct     numeric(5,2) NOT NULL DEFAULT 0,        -- هامش الربح %
  selling_price  numeric(14,2) NOT NULL DEFAULT 0,
  currency       text        NOT NULL DEFAULT 'SAR',
  status         text        NOT NULL DEFAULT 'draft'
                               CHECK (status IN (
                                 'draft', 'submitted', 'approved', 'rejected', 'revised'
                               )),
  notes          text,
  approved_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 6. Handover Records
CREATE TABLE IF NOT EXISTS public.presales_handover_records (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        uuid        NOT NULL REFERENCES public.presales_cases(id) ON DELETE CASCADE,
  handover_date  date        NOT NULL DEFAULT CURRENT_DATE,
  handed_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  received_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id     uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  notes          text,
  status         text        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_presales_cases_lead_id    ON public.presales_cases(lead_id);
CREATE INDEX IF NOT EXISTS idx_presales_cases_assigned_to ON public.presales_cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_presales_cases_status     ON public.presales_cases(status);
CREATE INDEX IF NOT EXISTS idx_presales_boq_case_id      ON public.presales_boq_items(case_id);
CREATE INDEX IF NOT EXISTS idx_presales_cost_case_id     ON public.presales_cost_items(case_id);
CREATE INDEX IF NOT EXISTS idx_presales_offers_case_id   ON public.presales_financial_offers(case_id);
CREATE INDEX IF NOT EXISTS idx_presales_handover_case_id ON public.presales_handover_records(case_id);

-- 8. Auto-update updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS presales_cases_updated_at ON public.presales_cases;
CREATE TRIGGER presales_cases_updated_at
  BEFORE UPDATE ON public.presales_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS presales_offers_updated_at ON public.presales_financial_offers;
CREATE TRIGGER presales_offers_updated_at
  BEFORE UPDATE ON public.presales_financial_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. RLS Policies (presales role sees its own cases; admin sees all)
ALTER TABLE public.presales_cases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presales_boq_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presales_cost_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presales_financial_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presales_handover_records ENABLE ROW LEVEL SECURITY;

-- Note: We use `ur.role::text` casting so Postgres allows new enum values in the same execution block.
DROP POLICY IF EXISTS presales_cases_admin ON public.presales_cases;
CREATE POLICY presales_cases_admin ON public.presales_cases
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin', 'presales')
  ));

DROP POLICY IF EXISTS presales_boq_admin ON public.presales_boq_items;
CREATE POLICY presales_boq_admin ON public.presales_boq_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin', 'presales')
  ));

DROP POLICY IF EXISTS presales_cost_admin ON public.presales_cost_items;
CREATE POLICY presales_cost_admin ON public.presales_cost_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin', 'presales')
  ));

DROP POLICY IF EXISTS presales_offers_admin ON public.presales_financial_offers;
CREATE POLICY presales_offers_admin ON public.presales_financial_offers
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin', 'presales')
  ));

DROP POLICY IF EXISTS presales_handover_admin ON public.presales_handover_records;
CREATE POLICY presales_handover_admin ON public.presales_handover_records
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role::text IN ('admin', 'presales')
  ));

-- 10. Update role priority helper
CREATE OR REPLACE FUNCTION public.current_role_of(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role::text
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'finance' THEN 3
    WHEN 'presales' THEN 4
    WHEN 'hr' THEN 5
    WHEN 'employee' THEN 6
  END
  LIMIT 1;
$$;

-- 11. Grant presales role access to core CRM tables (Leads, Projects, Activities, Quotations)
DROP POLICY IF EXISTS "leads: read" ON public.leads;
DROP POLICY IF EXISTS "leads: read authenticated" ON public.leads;
CREATE POLICY "leads: read" ON public.leads
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'presales')
  OR owner_id = public.current_profile_id()
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "leads: update" ON public.leads;
DROP POLICY IF EXISTS "leads: update owner or manager/admin" ON public.leads;
CREATE POLICY "leads: update" ON public.leads
FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'presales')
  OR owner_id = public.current_profile_id()
);

DROP POLICY IF EXISTS "projects: read" ON public.projects;
CREATE POLICY "projects: read" ON public.projects
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'presales')
  OR public.is_project_member(id)
);

DROP POLICY IF EXISTS "activities: read" ON public.activities;
DROP POLICY IF EXISTS "activities: read scoped" ON public.activities;
CREATE POLICY "activities: read" ON public.activities
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'presales')
  OR owner_id = public.current_profile_id()
  OR public.current_profile_id() = ANY (presales_team)
);

DROP POLICY IF EXISTS "quotations: read" ON public.quotations;
CREATE POLICY "quotations: read" ON public.quotations
FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'manager')
  OR public.has_role(auth.uid(), 'finance')
  OR public.has_role(auth.uid(), 'presales')
  OR created_by = auth.uid()
);



