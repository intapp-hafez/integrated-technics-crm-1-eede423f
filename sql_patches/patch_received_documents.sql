-- Migration: Add Received Documents from Client to Leads Table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS received_documents TEXT[] DEFAULT '{}'::TEXT[],
ADD COLUMN IF NOT EXISTS received_documents_other TEXT;
