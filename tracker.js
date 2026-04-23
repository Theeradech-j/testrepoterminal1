// ── Supabase Configuration ────────────────────────────────────────────────────
// Fill these in after creating your Supabase project at https://supabase.com
const SUPABASE_URL      = 'https://baumerkzjvhfldwgboji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdW1lcmt6anZoZmxkd2dib2ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5MjAzNTMsImV4cCI6MjA5MjQ5NjM1M30.jW-7WdA70rIR_lJi2T4xyApQAd9xpmdf54LXXdcvSDM';

// ── Collect session info once on page load ────────────────────────────────────
let _ip      = 'unknown';
let _channel = 'Direct';

(async () => {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    _ip = (await r.json()).ip;
  } catch (_) {}

  try {
    const ref = document.referrer;
    if      (!ref)                                               _channel = 'Direct';
    else if (ref.includes('github'))                             _channel = 'GitHub';
    else if (ref.includes('google'))                             _channel = 'Google';
    else if (ref.includes('facebook') || ref.includes('fb.'))   _channel = 'Facebook';
    else if (ref.includes('twitter')  || ref.includes('t.co'))  _channel = 'Twitter/X';
    else                                                         _channel = new URL(ref).hostname;
  } catch (_) {}
})();

// ── Log one completed game round ──────────────────────────────────────────────
async function logGameSession({ score, level, lines, duration }) {
  if (!SUPABASE_URL.startsWith('http')) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/game_sessions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        ip_address:       _ip,
        channel:          _channel,
        user_agent:       navigator.userAgent,
        duration_seconds: duration,
        score,
        level,
        lines,
      }),
    });
  } catch (_) {}
}
