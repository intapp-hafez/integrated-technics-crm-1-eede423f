-- Demo seed data (bilingual). Run AFTER schema + policies.
-- Idempotent via ON CONFLICT DO NOTHING where possible.

-- Pipeline stages
insert into public.pipeline_stages (key, label_en, label_ar, color, sort_order) values
  ('new',         'New',         'جديد',     '#64748b', 1),
  ('contacted',   'Contacted',   'تم التواصل','#3b82f6', 2),
  ('qualified',   'Qualified',   'مؤهل',     '#8b5cf6', 3),
  ('proposal',    'Proposal',    'عرض',      '#f59e0b', 4),
  ('negotiation', 'Negotiation', 'تفاوض',    '#ec4899', 5),
  ('won',         'Won',         'مكسوب',    '#10b981', 6),
  ('lost',        'Lost',        'خاسر',     '#ef4444', 7)
on conflict (key) do nothing;

-- Activity types
insert into public.activity_types_config (key, label_en, label_ar) values
  ('Call',       'Call',       'اتصال'),
  ('Meeting',    'Meeting',    'اجتماع'),
  ('Site Visit', 'Site Visit', 'زيارة موقع'),
  ('Follow-up',  'Follow-up',  'متابعة'),
  ('Inspection', 'Inspection', 'تفتيش'),
  ('Email',      'Email',      'بريد إلكتروني')
on conflict (key) do nothing;

-- Locations (Egypt cities)
insert into public.locations (city_en, city_ar, districts_en, districts_ar) values
  ('Cairo',      'القاهرة',  array['Nasr City','Maadi','Heliopolis','Zamalek','Downtown','New Cairo'],
                              array['مدينة نصر','المعادي','مصر الجديدة','الزمالك','وسط البلد','القاهرة الجديدة']),
  ('Giza',       'الجيزة',   array['Dokki','Mohandessin','6th of October','Sheikh Zayed','Haram'],
                              array['الدقي','المهندسين','السادس من أكتوبر','الشيخ زايد','الهرم']),
  ('Alexandria', 'الإسكندرية', array['Smouha','Sidi Gaber','Stanley','Miami','Montaza'],
                              array['سموحة','سيدي جابر','ستانلي','ميامي','المنتزه'])
on conflict (city_en) do nothing;

-- Role/page permissions (defaults aligned with the UI matrix)
insert into public.role_permissions (role, page, can_create, can_read, can_update, can_delete) values
  ('admin','dashboard',true,true,true,true),
  ('admin','leads',true,true,true,true),
  ('admin','pipeline',true,true,true,true),
  ('admin','activities',true,true,true,true),
  ('admin','projects',true,true,true,true),
  ('admin','employees',true,true,true,true),
  ('admin','attendance',true,true,true,true),
  ('admin','offers',true,true,true,true),
  ('admin','history',true,true,true,true),
  ('admin','settings',true,true,true,true),
  ('manager','leads',true,true,true,true),
  ('manager','pipeline',true,true,true,true),
  ('manager','activities',true,true,true,true),
  ('manager','projects',false,true,true,false),
  ('manager','offers',false,true,true,false),
  ('hr','employees',true,true,true,true),
  ('hr','attendance',true,true,true,true),
  ('finance','offers',true,true,true,true),
  ('finance','projects',false,true,true,false),
  ('employee','leads',true,true,true,false),
  ('employee','activities',true,true,true,false),
  ('employee','attendance',true,true,false,false)
on conflict (role, page) do nothing;
