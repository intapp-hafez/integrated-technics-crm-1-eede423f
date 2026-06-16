
-- Fire on INSERT too when a lead is created with status='won'
DROP TRIGGER IF EXISTS trg_lead_won_ins ON public.leads;
CREATE TRIGGER trg_lead_won_ins
AFTER INSERT ON public.leads
FOR EACH ROW
WHEN (NEW.status = 'won')
EXECUTE FUNCTION public.on_lead_won();

-- Make the function safe for INSERT (OLD is null on insert)
CREATE OR REPLACE FUNCTION public.on_lead_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare new_qid uuid;
begin
  if NEW.status = 'won' and (TG_OP = 'INSERT' OR OLD.status is distinct from 'won') then
    -- Skip if a quotation already exists for this lead
    if exists (select 1 from public.quotations where lead_id = NEW.id) then
      return NEW;
    end if;

    insert into public.quotations (code, lead_id, client_id, title_en, title_ar, value, status, created_by)
    values (
      'Q-' || to_char(now(), 'YYYYMMDDHH24MISS'),
      NEW.id, NEW.client_id,
      coalesce(NEW.company_en,'Quotation') || ' — Draft',
      coalesce(NEW.company_ar, NEW.company_en) || ' — مسودة',
      coalesce(NEW.value, 0), 'draft', auth.uid()
    ) returning id into new_qid;

    insert into public.history (module, action_en, action_ar, actor_id, target_table, target_id, details_en, details_ar)
    values ('lead','Lead won — quotation draft created','تم كسب الفرصة — تم إنشاء مسودة عرض سعر',
      public.current_profile_id(),'leads', NEW.id,
      'Auto-generated quotation ' || new_qid::text,
      'تم إنشاء عرض السعر تلقائيًا ' || new_qid::text);

    insert into public.notifications (type, title_en, title_ar, body_en, body_ar, href, audience_roles, created_by)
    values ('quotation','New quotation draft','مسودة عرض سعر جديدة',
      'Lead ' || coalesce(NEW.company_en,'') || ' was won — draft quotation created.',
      'تم كسب الفرصة ' || coalesce(NEW.company_ar, NEW.company_en, '') || ' — تم إنشاء مسودة عرض السعر.',
      '/admin/offers/' || new_qid::text,
      array['admin','finance','manager']::public.app_role[],
      auth.uid());
  end if;
  return NEW;
end;
$function$;

-- Backfill: create draft quotations for any 'won' leads that don't have one
INSERT INTO public.quotations (code, lead_id, client_id, title_en, title_ar, value, status, created_by)
SELECT
  'Q-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || substr(l.id::text,1,4),
  l.id, l.client_id,
  coalesce(l.company_en,'Quotation') || ' — Draft',
  coalesce(l.company_ar, l.company_en) || ' — مسودة',
  coalesce(l.value, 0), 'draft', l.created_by
FROM public.leads l
WHERE l.status = 'won'
  AND NOT EXISTS (SELECT 1 FROM public.quotations q WHERE q.lead_id = l.id);
