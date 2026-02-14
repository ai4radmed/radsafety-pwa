/// <reference types="astro/client" />

import type { SupabaseClient, Session } from '@supabase/supabase-js';

declare namespace App {
    interface Locals {
        supabase: SupabaseClient;
        session: Session | null;
    }
}
