CREATE TABLE IF NOT EXISTS public.registered_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    owner TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.registered_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registered_accounts_select" ON public.registered_accounts
    FOR SELECT USING (true);

CREATE POLICY "registered_accounts_insert" ON public.registered_accounts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

CREATE POLICY "registered_accounts_update" ON public.registered_accounts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

CREATE POLICY "registered_accounts_delete" ON public.registered_accounts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
        )
    );

-- Insert the default setting for public visibility
INSERT INTO public.system_settings (key, value)
VALUES ('registered_accounts_public', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
