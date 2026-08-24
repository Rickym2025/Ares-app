/**
 * AresAI - Live Pricing & Stripe Checkout Engine
 * RM Studio Universal Engine (Supabase S2 Central DB)
 */

const SUPABASE_S2_URL = 'https://jhijfulhntlhcytbhcly.supabase.co';
const SUPABASE_S2_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoaWpmdWxobnRsaGN5dGJoY2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzcxODcsImV4cCI6MjA5ODMxMzE4N30.z062NW4ApClll-XWHH2ufmcCleBRNHUUdKO6FiLa0TQ';

// 1. Prezzi di Fallback Immediati (Zero Flicker)
const ARES_PRICES = {
  base:  { id: "base",  name: "Atleta PRO", price: 19 },
  coach: { id: "coach", name: "Coach Hub & Arena", price: 99 }
};

// 2. Render Reattivo del DOM
function renderAresPrices() {
  const elBase = document.getElementById("price-atleta-val");
  const elCoach = document.getElementById("price-coach-val");

  if (elBase) elBase.innerText = `€${ARES_PRICES.base.price}`;
  if (elCoach) elCoach.innerText = `€${ARES_PRICES.coach.price}`;

  const btnBase = document.querySelector('[data-btn-plan="base"]');
  const btnCoach = document.querySelector('[data-btn-plan="coach"]');
  if (btnBase) btnBase.innerText = `Acquista Atleta PRO (€${ARES_PRICES.base.price})`;
  if (btnCoach) btnCoach.innerText = `Attiva Coach Hub (€${ARES_PRICES.coach.price}) 🔥`;

  const optBase = document.querySelector('option[data-plan-option="base"]');
  const optCoach = document.querySelector('option[data-plan-option="coach"]');
  if (optBase) optBase.innerText = `Atleta PRO (${ARES_PRICES.base.price}€/mese)`;
  if (optCoach) optCoach.innerText = `Coach Hub per Palestre & PT (${ARES_PRICES.coach.price}€/mese)`;
}

// 3. Fetch Live da Supabase S2 (Tabella saas_pricing)
async function initAresPricing() {
  try {
    const res = await fetch(`${SUPABASE_S2_URL}/rest/v1/saas_pricing?saas=eq.ares&select=*`, {
      headers: {
        'apikey': SUPABASE_S2_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_S2_ANON_KEY}`
      },
      cache: 'no-store'
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
          const pid = (item.plan_id || "").toLowerCase();
          if (ARES_PRICES[pid]) {
            ARES_PRICES[pid].price = Number(item.price);
            if (item.name) ARES_PRICES[pid].name = item.name;
          }
        });
        renderAresPrices();
      }
    }
  } catch (e) {
    console.warn("Utilizzo prezzi locali di fallback per AresAI:", e);
  }
}

// 4. Dispatch Checkout On-The-Fly verso n8n
async function avviaCheckoutAres(planKey = "base", email = "", phone = "", name = "") {
  const plan = ARES_PRICES[planKey] || ARES_PRICES.base;
  const origin = window.location.origin;
  const telSafe = phone ? phone.replace(/[^0-9+]/g, '') : '';

  const payload = {
    progetto: "Ares",
    portal_type: "ares",
    title: `AresAI • ${plan.name}`,
    price: plan.price,
    ricarica_tipo: planKey === "coach" ? "coach" : "base",
    email: email || undefined,
    agency_id: telSafe || (email ? `lead_${email}` : "atleta_anon"),
    project_id: telSafe || "atleta_anon",
    origin: origin,
    success_url: `${origin}/atleta.html?success=true&plan=${planKey}`,
    cancel_url: `${origin}/#prezzi`
  };

  try {
    const res = await fetch("https://n8n.rmstudio.app/webhook/crea-sessione-stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Errore creazione sessione Stripe");
    const data = await res.json();
    const redirectUrl = data.url || data.checkout_url || data.session_url;

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      throw new Error("URL Stripe non restituito dal server");
    }
  } catch (err) {
    console.error("Errore checkout AresAI:", err);
    window.location.hash = "#registrazione-sezione";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderAresPrices();
  initAresPricing();
});
