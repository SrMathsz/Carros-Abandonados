import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fica false quando o arquivo .env ainda não foi preenchido
export const configurado = Boolean(url && chave);

export const supabase = configurado ? createClient(url, chave) : null;
