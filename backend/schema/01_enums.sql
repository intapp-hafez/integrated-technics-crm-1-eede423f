-- Enumerated types used across the schema

create type public.app_role as enum ('admin','manager','hr','finance','employee');

create type public.lead_status as enum
  ('new','contacted','qualified','proposal','negotiation','won','lost');

create type public.activity_type as enum
  ('Call','Meeting','Site Visit','Follow-up','Inspection','Email');

create type public.activity_status as enum
  ('pending','in_progress','done','cancelled');

create type public.quotation_status as enum
  ('draft','pending_approval','sent','negotiating','accepted','rejected');

create type public.project_status as enum
  ('On Track','At Risk','Delayed','Completed','On Hold');

create type public.attendance_status as enum
  ('present','late','absent','leave');

create type public.notification_type as enum
  ('lead','chat','activity','attendance','quotation','project','system');

create type public.history_module as enum
  ('lead','pipeline','project','employee','activity','settings','quotation','attendance');
