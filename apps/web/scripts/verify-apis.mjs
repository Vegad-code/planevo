const env = process.env;

async function checkSupabase() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.error("❌ Supabase keys missing");
    return;
  }

  // Check Anon key
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${anonKey}`, {
      headers: { Authorization: `Bearer ${anonKey}` }
    });
    if (res.ok) console.log("✅ Supabase Anon Key OK");
    else console.error("❌ Supabase Anon Key FAILED", res.status, await res.text());
  } catch(e) {
    console.error("❌ Supabase Anon Key FAILED", e.message);
  }

  // Check Service Role key
  try {
    const res = await fetch(`${url}/rest/v1/?apikey=${serviceKey}`, {
      headers: { Authorization: `Bearer ${serviceKey}` }
    });
    if (res.ok) console.log("✅ Supabase Service Role Key OK");
    else console.error("❌ Supabase Service Role Key FAILED", res.status, await res.text());
  } catch(e) {
    console.error("❌ Supabase Service Role Key FAILED", e.message);
  }
}

async function checkOpenAI() {
  const key = env.OPENAI_API_KEY;
  if (!key) {
    console.error("❌ OpenAI key missing");
    return;
  }
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) console.log("✅ OpenAI API Key OK");
    else console.error("❌ OpenAI API Key FAILED", res.status, await res.text());
  } catch(e) {
    console.error("❌ OpenAI API Key FAILED", e.message);
  }
}

async function checkGemini() {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    console.error("❌ Gemini key missing");
    return;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (res.ok) console.log("✅ Gemini API Key OK");
    else console.error("❌ Gemini API Key FAILED", res.status, await res.text());
  } catch(e) {
    console.error("❌ Gemini API Key FAILED", e.message);
  }
}

async function checkStripe() {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("❌ Stripe Secret Key missing");
    return;
  }
  try {
    const res = await fetch("https://api.stripe.com/v1/prices?limit=1", {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) console.log("✅ Stripe Secret Key OK");
    else console.error("❌ Stripe Secret Key FAILED", res.status, await res.text());
  } catch(e) {
    console.error("❌ Stripe Secret Key FAILED", e.message);
  }
}

async function checkResend() {
  const key = env.RESEND_API_KEY;
  if (!key) {
    console.error("❌ Resend API Key missing");
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` }
    });
    if (res.ok) console.log("✅ Resend API Key OK");
    else console.error("❌ Resend API Key FAILED", res.status, await res.text());
  } catch(e) {
    console.error("❌ Resend API Key FAILED", e.message);
  }
}

async function checkPosthog() {
  const key = env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key || !host) {
    console.error("❌ PostHog keys missing");
    return;
  }
  // Posthog endpoint for checking config
  console.log("✅ PostHog Configured (Manual verification needed for event tracking)");
}

async function checkSentry() {
  const dsn = env.SENTRY_DSN || env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error("❌ Sentry DSN missing");
    return;
  }
  console.log("✅ Sentry Configured:", dsn.startsWith("http") ? "Valid DSN format" : "Invalid DSN");
}

async function main() {
  console.log("Starting API Key Verification...\n");
  await checkSupabase();
  await checkOpenAI();
  await checkGemini();
  await checkStripe();
  await checkResend();
  await checkPosthog();
  await checkSentry();
  console.log("\nVerification complete!");
}

main();
