/**
 * AresAI - Live Pricing & Stripe Checkout Engine
 * RM Studio Universal Engine
 */
const ARES_PRICES = {
  base:  { id: "base",  name: "Atleta PRO (19€/m)", price: 19 },
  coach: { id: "coach", name: "Coach Hub (99€/m)",  price: 99 }
};

async function initAresPricing() {
  try {
    const res = await fetch("https://zqkqlhosyjvxdwfjmwwb.supabase.co/rest/v1/saas_pricing?saas=eq.ares&select=*");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        data.forEach(item => {
          const pid = (item.plan_id || "").toLowerCase();
          if (ARES_PRICES[pid]) {
            ARES_PRICES[pid].price = Number(item.price);
          }
        });
      }
    }
  } catch (e) {
    console.warn("Utilizzo prezzi locali per AresAI:", e);
  }

  const elBase = document.getElementById("price-atleta-val");
  const elCoach = document.getElementById("price-coach-val");
  if (elBase) elBase.innerText = `€${ARES_PRICES.base.price}`;
  if (elCoach) elCoach.innerText = `€${ARES_PRICES.coach.price}`;
}

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
    success_url: `${origin}/dashboard.html?success=true&plan=${planKey}`,
    cancel_url: `${origin}/#prezzi`
  };

  try {
    const res = await fetch("https://n8n.rmstudio.app/webhook/crea-sessione-stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Errore creazione sessione");
    const data = await res.json();
    const redirectUrl = data.url || data.checkout_url || data.session_url;

    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      throw new Error("URL Stripe mancante");
    }
  } catch (err) {
    console.error("Errore checkout AresAI:", err);
    window.location.hash = "#registrazione-sezione";
  }
}

document.addEventListener("DOMContentLoaded", initAresPricing);
