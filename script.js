/* ---------------------------
   Hästguiden – demo för analys
---------------------------- */
window.dataLayer = window.dataLayer || [];

// UTM & session attribution
(function persistUtm() {
  const params = new URLSearchParams(location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  let found = false;
  utmKeys.forEach(k => {
    if (params.has(k)) { sessionStorage.setItem(k, params.get(k)); found = true; }
  });
  if (found) dataLayer.push({event: "utm_captured", ...Object.fromEntries(utmKeys.map(k=>[k, sessionStorage.getItem(k)]))});
})();

// A/B test – ändrar rubriken för variant B
(function abTest() {
  const KEY = "ab_variant";
  let variant = localStorage.getItem(KEY);
  if (!variant) {
    variant = Math.random() < 0.5 ? "A" : "B";
    localStorage.setItem(KEY, variant);
  }
  if (variant === "B") {
    const h1 = document.getElementById("heroTitle");
    if (h1) h1.textContent = "Upptäck allt om hästar här";
  }
  dataLayer.push({event: "experiment_viewed", experiment_id: "hero_title", variant});
})();

// Hjälp-funktion för tracking
function track(event, params = {}) {
  const payload = { event, ...params, ts: Date.now() };
  // dataLayer (för GTM/GA4-tests)
  window.dataLayer.push(payload);
  // Logga för tydlighet i kursövningar
  console.info("[track]", payload);
  // Skicka beacon till ett dummy-endpoint (fungerar inte utan server – men triggar i nätverkspanelen)
  try {
    const body = new Blob([JSON.stringify(payload)], {type: "application/json"});
    navigator.sendBeacon && navigator.sendBeacon("/collect", body);
  } catch {}
}

// Konsenthantering (superenkel)
(function consentBanner() {
  const KEY = "analytics_consent";
  const banner = document.getElementById("cookieBanner");
  const saved = localStorage.getItem(KEY);
  if (!saved) banner.style.display = "flex";
  banner?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-consent]");
    if (!btn) return;
    const choice = btn.getAttribute("data-consent");
    localStorage.setItem(KEY, choice);
    banner.style.display = "none";
    track("consent_set", {choice});
  });
})();

// År i sidfot
document.getElementById("year").textContent = new Date().getFullYear();

// Mobilmeny
(function navToggle() {
  const nav = document.querySelector(".main-nav");
  const btn = document.querySelector(".nav-toggle");
  btn?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    btn.setAttribute("aria-expanded", String(open));
    track("nav_toggle", {open});
  });
  document.querySelectorAll("[data-nav]").forEach(a => {
    a.addEventListener("click", () => track("nav_click", {to: a.getAttribute("href")}));
  });
})();

// Till toppen-knapp
(function backToTop() {
  const btn = document.getElementById("backToTop");
  window.addEventListener("scroll", () => {
    btn.style.display = window.scrollY > 400 ? "inline-flex" : "none";
  });
  btn.addEventListener("click", () => {
    window.scrollTo({top:0, behavior:"smooth"});
    track("back_to_top_click");
  });
})();

// Sök och filter för raser
(function breedFilters() {
  const grid = document.getElementById("breedGrid");
  const search = document.getElementById("searchBreeds");
  const reset = document.getElementById("resetFilters");
  const filterBoxes = Array.from(document.querySelectorAll("[data-filter]"));

  function applyFilters() {
    const query = (search.value || "").trim().toLowerCase();
    const selected = filterBoxes.reduce((acc, el) => {
      if (el.checked) acc[el.dataset.filter] = (acc[el.dataset.filter] || []).concat(el.value);
      return acc;
    }, {});
    grid.querySelectorAll(".card").forEach(card => {
      const name = card.dataset.breed.toLowerCase();
      const size = card.dataset.size; // single
      const use = (card.dataset.use || "").split(" ");
      let visible = true;
      if (query && !name.includes(query)) visible = false;
      if (selected.size && !selected.size.includes(size)) visible = false;
      if (selected.use && !selected.use.every(u => use.includes(u))) visible = false;
      card.style.display = visible ? "" : "none";
    });
  }

  search?.form?.addEventListener("submit", (e) => {
    e.preventDefault();
    applyFilters();
    track("search_breeds", {query: search.value});
  });
  search?.addEventListener("input", () => applyFilters());

  filterBoxes.forEach(cb => cb.addEventListener("change", () => {
    applyFilters();
    track("filter_change", {type: cb.dataset.filter, value: cb.value, checked: cb.checked});
  }));

  reset?.addEventListener("click", () => {
    search.value = "";
    filterBoxes.forEach(cb => cb.checked = false);
    applyFilters();
    track("filters_reset");
  });

  // Gilla-knappar + localStorage
  grid.querySelectorAll(".btn-like").forEach(btn => {
    const key = "like_" + btn.dataset.like;
    if (localStorage.getItem(key) === "1") btn.setAttribute("aria-pressed", "true");
    btn.addEventListener("click", () => {
      const pressed = btn.getAttribute("aria-pressed") === "true";
      btn.setAttribute("aria-pressed", String(!pressed));
      localStorage.setItem(key, !pressed ? "1" : "0");
      track("breed_like_toggle", {breed: btn.dataset.like, liked: !pressed});
    });
  });
})();

// Galleri lightbox
(function lightbox() {
  const dialog = document.getElementById("lightbox");
  const img = document.getElementById("lightboxImg");
  document.querySelectorAll(".gallery-item").forEach(el => {
    el.addEventListener("click", () => {
      img.src = el.getAttribute("data-img");
      img.alt = el.querySelector("img").alt || "Bild";
      dialog.showModal();
      track("gallery_open", {src: img.src});
    });
  });
  dialog.querySelector(".close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
})();

// Outbound länkar
(function outboundLinks() {
  document.querySelectorAll("a.outbound").forEach(a => {
    a.addEventListener("click", () => {
      track("outbound_click", {href: a.href});
    });
  });
})();

// Quiz
(function quiz() {
  const form = document.getElementById("quizForm");
  const result = document.getElementById("quizResult");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const ans = new FormData(form);
    let score = 0;
    if (ans.get("q1")==="tölt") score++;
    if (ans.get("q2")==="6-8") score++;
    if (ans.get("q3")==="hö") score++;
    result.textContent = `Du fick ${score}/3 rätt.`;
    track("quiz_submitted", {score});
  });
})();

// Nyhetsbrev
(function newsletter() {
  const form = document.getElementById("newsletterForm");
  const msg = document.getElementById("newsletterMsg");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email");
    const gdpr = document.getElementById("gdpr");
    if (!email.checkValidity()) {
      msg.textContent = "Ange en giltig e-postadress.";
      track("newsletter_error", {reason: "email_invalid"});
      return;
    }
    if (!gdpr.checked) {
      msg.textContent = "Du måste godkänna integritetspolicyn.";
      track("newsletter_error", {reason: "no_consent"});
      return;
    }
    msg.textContent = "Tack! Du är nu anmäld.";
    form.reset();
    track("newsletter_subscribed", {method: "form"});
  });
})();

// Signup-modal
(function signup() {
  const dialog = document.getElementById("signupModal");
  document.querySelectorAll("[data-open-modal='signup']").forEach(btn=>{
    btn.addEventListener("click", ()=>{ dialog.showModal(); track("modal_open", {id:"signup"}); });
  });
  dialog.querySelector(".close").addEventListener("click", ()=> dialog.close());
  // Submit via <menu> knappar (value="submit")
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "submit") {
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("signupEmail").value.trim();
      const level = document.getElementById("level").value;
      if (!name || !email || !level) {
        document.getElementById("signupMsg").textContent = "Fyll i alla fält.";
        track("signup_error", {reason: "missing_fields"});
        return;
      }
      document.getElementById("signupMsg").textContent = "Välkommen, " + name + "!";
      track("signup_submitted", {level});
      // Återställ efter kort delay så texten hinner synas
      setTimeout(()=> {
        document.getElementById("signupForm").reset();
        dialog.close();
      }, 1000);
    }
  });
})();

// Integritet/Policy-modal
(function privacyModal() {
  const modal = document.getElementById("privacyModal");
  document.querySelectorAll("[data-open-modal='privacy']").forEach(a => {
    a.addEventListener("click", (e) => { e.preventDefault(); modal.showModal(); track("modal_open", {id:"privacy"}); });
  });
  modal.querySelector(".close").addEventListener("click", ()=> modal.close());
})();

// Scroll-djup och tidsmätning
(function engagement() {
  const marks = [25,50,75,100];
  let fired = new Set();
  function onScroll() {
    const h = document.documentElement;
    const scrolled = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    marks.forEach(m => {
      if (scrolled >= m && !fired.has(m)) {
        fired.add(m);
        track("scroll_depth", {percent: m});
      }
    });
  }
  window.addEventListener("scroll", throttle(onScroll, 500), {passive:true});

  // Time on page heartbeat var 15:e sekund
  let secs = 0;
  setInterval(() => {
    secs += 15;
    track("heartbeat", {seconds: secs});
  }, 15000);
})();

// PerformanceObserver – LCP & FCP (enkel)
(function webVitalsLite(){
  if ("PerformanceObserver" in window) {
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            track("metric_fcp", {value: entry.startTime});
          }
        }
      }).observe({type: "paint", buffered: true});
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          track("metric_lcp", {value: entry.startTime});
        }
      }).observe({type: "largest-contentful-paint", buffered: true});
    } catch {}
  }
})();

// Hjälp: throttle
function throttle(fn, wait) {
  let last = 0;
  return function(...args){
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn.apply(this, args);
    }
  }
}

// Backfill: dialog.close() på backdrop-klick hanteras i respektive modul.

// Accessbility: Enter på hero-CTA länkar spåras via standard click.
// Ende.
