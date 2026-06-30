// =========================================
// WikiNumber - script.js
// =========================================

/* ---------------------------------------
   1. ESTADO Y PERSISTENCIA EN MEMORIA
--------------------------------------- */
const state = {
  theme: "dark",
  accent: "violet",
  lang: "es",
  lastNumber: null
};

/* ---------------------------------------
   2. ELEMENTOS DEL DOM
--------------------------------------- */
const els = {
  body: document.body,
  themeToggle: document.getElementById("themeToggle"),
  themeIcon: document.getElementById("themeIcon"),
  accentSelect: document.getElementById("accentSelect"),
  langSelect: document.getElementById("langSelect"),
  numberInput: document.getElementById("numberInput"),
  searchBtn: document.getElementById("searchBtn"),
  tabs: document.querySelectorAll(".tab-btn"),
  panels: document.querySelectorAll(".panel"),
  loadingZone: document.getElementById("loadingZone"),
  errorZone: document.getElementById("errorZone"),
  resultFrame: document.getElementById("resultFrame"),
  emptyZone: document.getElementById("emptyZone"),
  articleTitle: document.getElementById("articleTitle"),
  articleSeed: document.getElementById("articleSeed"),
  articleExtract: document.getElementById("articleExtract"),
  articleLink: document.getElementById("articleLink")
};

/* ---------------------------------------
   3. TEMA / ACENTO / IDIOMA
--------------------------------------- */
function applyTheme(theme) {
  state.theme = theme;
  els.body.setAttribute("data-theme", theme);
  els.themeIcon.textContent = theme === "dark" ? "🌙" : "☀️";
}

function applyAccent(accent) {
  state.accent = accent;
  els.body.setAttribute("data-accent", accent);
}

function applyLang(lang) {
  state.lang = lang;
  const dict = TRANSLATIONS[lang] || TRANSLATIONS["es"];

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key]) el.placeholder = dict[key];
  });

  document.documentElement.lang = lang.startsWith("es") ? "es" : lang;

  // Si ya había un artículo cargado, re-buscarlo en el nuevo idioma
  if (state.lastNumber !== null) {
    fetchArticleForNumber(state.lastNumber);
  }
}

els.themeToggle.addEventListener("click", () => {
  applyTheme(state.theme === "dark" ? "light" : "dark");
});

els.accentSelect.addEventListener("change", (e) => {
  applyAccent(e.target.value);
});

els.langSelect.addEventListener("change", (e) => {
  applyLang(e.target.value);
});

/* ---------------------------------------
   4. TABS
--------------------------------------- */
els.tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    els.tabs.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const target = btn.getAttribute("data-tab");
    els.panels.forEach(p => p.classList.remove("active"));
    document.getElementById(`panel-${target}`).classList.add("active");
  });
});

/* ---------------------------------------
   5. HASH DETERMINÍSTICO
   Convierte el string numérico introducido en un
   entero estable (0 a 2^31-1) usando un hash tipo
   djb2 modificado. Mismo input -> mismo output, siempre.
--------------------------------------- */
function stableHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  // Aseguramos un número grande y estable, no negativo
  return hash >>> 0;
}

/* ---------------------------------------
   6. WIKIPEDIA: obtener artículo determinístico
   Estrategia:
   a) Generamos un hash del número.
   b) Usamos la API "allpages" de Wikipedia en español
      (idioma base estable, siempre existe) con
      gapfrom calculado a partir de las primeras letras
      generadas por el hash -> esto da un punto de partida
      consistente en el índice alfabético de páginas.
   c) Tomamos el primer resultado válido (namespace 0,
      sin redirecciones) de esa posición.
   d) Si el idioma de interfaz no es "es", buscamos el
      langlink correspondiente vía la API "langlinks".
      Si no existe, fallback a inglés, luego español.
--------------------------------------- */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

function hashToSeedTitle(hash) {
  // Convertimos el hash en una secuencia de 3 letras
  // pseudoaleatorias pero deterministas, usada como
  // punto de partida alfabético en allpages.
  const a = ALPHABET[hash % 26];
  const b = ALPHABET[Math.floor(hash / 26) % 26];
  const c = ALPHABET[Math.floor(hash / 676) % 26];
  return `${a}${b}${c}`;
}

async function getDeterministicPage(numberStr, wikiLang) {
  const hash = stableHash(numberStr);
  const seed = hashToSeedTitle(hash);

  // Paso 1: listado de páginas reales a partir del punto alfabético
  const allpagesUrl = `https://${wikiLang}.wikipedia.org/w/api.php` +
    `?action=query&list=allpages&apnamespace=0&apfilterredir=nonredirects` +
    `&aplimit=20&apfrom=${encodeURIComponent(seed)}&format=json&origin=*`;

  const res = await fetch(allpagesUrl);
  if (!res.ok) throw new Error("allpages_failed");
  const data = await res.json();

  const pages = data?.query?.allpages || [];
  if (pages.length === 0) throw new Error("no_pages_found");

  // Paso 2: elegimos un índice estable dentro de los resultados
  // usando el mismo hash (no random real)
  const index = hash % pages.length;
  return pages[index]; // { pageid, title }
}

async function getLanglinkTitle(title, fromLang, toLang) {
  if (fromLang === toLang) return { lang: fromLang, title };

  const url = `https://${fromLang}.wikipedia.org/w/api.php` +
    `?action=query&prop=langlinks&titles=${encodeURIComponent(title)}` +
    `&lllang=${toLang}&format=json&origin=*`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;

  const page = Object.values(pages)[0];
  const link = page?.langlinks?.[0];
  if (link && link["*"]) {
    return { lang: toLang, title: link["*"] };
  }
  return null;
}

async function getArticleSummary(lang, title) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("summary_failed");
  return res.json();
}

/* ---------------------------------------
   7. FLUJO PRINCIPAL DE BÚSQUEDA
--------------------------------------- */
async function fetchArticleForNumber(numberStr) {
  state.lastNumber = numberStr;

  showLoading();

  const baseLang = "es"; // idioma base, siempre disponible y estable
  const targetLang = WIKI_LANG_MAP[state.lang] || "es";

  try {
    // 1. Obtenemos la página base determinística (en español, base estable)
    const basePage = await getDeterministicPage(numberStr, baseLang);

    // 2. Si el idioma destino es distinto, intentamos traducir
    let finalLang = baseLang;
    let finalTitle = basePage.title;

    if (targetLang !== baseLang) {
      const translated = await getLanglinkTitle(basePage.title, baseLang, targetLang);
      if (translated) {
        finalLang = translated.lang;
        finalTitle = translated.title;
      } else {
        // Fallback: intentamos inglés
        const enFallback = await getLanglinkTitle(basePage.title, baseLang, "en");
        if (enFallback) {
          finalLang = enFallback.lang;
          finalTitle = enFallback.title;
        }
        // Si tampoco hay inglés, nos quedamos en español (ya está seteado)
      }
    }

    // 3. Obtenemos el resumen del artículo final
    const summary = await getArticleSummary(finalLang, finalTitle);

    renderArticle(summary, numberStr, finalLang);
  } catch (err) {
    console.error(err);
    showError();
  }
}

/* ---------------------------------------
   8. RENDER DE ESTADOS
--------------------------------------- */
function showLoading() {
  els.emptyZone.classList.add("hidden");
  els.errorZone.classList.add("hidden");
  els.resultFrame.classList.add("hidden");
  els.loadingZone.classList.remove("hidden");
}

function showError() {
  els.loadingZone.classList.add("hidden");
  els.resultFrame.classList.add("hidden");
  els.emptyZone.classList.add("hidden");
  els.errorZone.classList.remove("hidden");
}

function renderArticle(summary, numberStr, lang) {
  els.loadingZone.classList.add("hidden");
  els.errorZone.classList.add("hidden");
  els.emptyZone.classList.add("hidden");

  els.articleTitle.textContent = summary.title || "—";
  els.articleSeed.textContent = `#${numberStr} · ${lang}`;

  let html = "";
  if (summary.thumbnail?.source) {
    html += `<img src="${summary.thumbnail.source}" alt="${summary.title}" />`;
  }
  html += `<p>${summary.extract || ""}</p>`;
  els.articleExtract.innerHTML = html;

  els.articleLink.href = summary.content_urls?.desktop?.page || "#";

  const dict = TRANSLATIONS[state.lang] || TRANSLATIONS["es"];
  els.articleLink.textContent = dict.read_more;

  els.resultFrame.classList.remove("hidden");
}

/* ---------------------------------------
   9. EVENTOS DE BÚSQUEDA
--------------------------------------- */
function handleSearch() {
  const raw = els.numberInput.value.trim();
  if (!raw) return;
  fetchArticleForNumber(raw);
}

els.searchBtn.addEventListener("click", handleSearch);
els.numberInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

/* ---------------------------------------
   10. INICIALIZACIÓN
--------------------------------------- */
applyTheme(state.theme);
applyAccent(state.accent);
els.accentSelect.value = state.accent;
els.langSelect.value = state.lang;
applyLang(state.lang);