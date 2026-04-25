/**
 * Supabase Configuration
 * Replace these values with your Supabase project credentials
 */

const SUPABASE_CONFIG = {
    // Your Supabase project URL (e.g., https://abcdefgh12345678.supabase.co)
    url: 'YOUR_SUPABASE_URL',
    
    // Your Supabase anon/public API key
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

// Make available globally
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
