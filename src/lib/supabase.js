import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://boosebgyavjeoioppriu.supabase.co'
const supabaseKey = sb_secret_4OSoZO7QekAaCA1OxxDSyQ_Sg4qbuI7

export const supabase = createClient(supabaseUrl, supabaseKey)