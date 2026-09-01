-- Migration: Create Consultants Table
CREATE TABLE IF NOT EXISTS public.consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.consultants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultants_select" ON public.consultants
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "consultants_insert" ON public.consultants
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "consultants_update" ON public.consultants
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "consultants_delete" ON public.consultants
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role IN ('admin', 'manager')
        )
    );
