// =========================================
// WikiNumber - script.js
// =========================================

/* ---------------------------------------
   1. ESTADO Y PERSISTENCIA EN MEMORIA
--------------------------------------- */
const STORAGE_KEY = "wikinumber_prefs";

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function savePrefs() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: state.theme,
      accent: state.accent,
      lang: state.lang
    }));
  } catch (e) {
    // localStorage no disponible (modo privado, etc.) - seguimos sin guardar
  }
}

const savedPrefs = loadPrefs();

const state = {
  theme: savedPrefs.theme || "dark",
  accent: savedPrefs.accent || "orange",
  lang: savedPrefs.lang || "es",
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
  savePrefs();
}

function applyAccent(accent) {
  state.accent = accent;
  els.body.setAttribute("data-accent", accent);
  savePrefs();
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
  savePrefs();

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

// Obtiene el extracto en HTML real (con <p>, <ul><li>, etc.) en vez del
// texto plano aplanado que da la API de "summary". Esto respeta los
// párrafos y listas tal como aparecen en el artículo (clave para
// desambiguaciones como "Ve", que son listas, no prosa continua).
async function getArticleExtractHtml(lang, title) {
  const url = `https://${lang}.wikipedia.org/w/api.php` +
    `?action=query&prop=extracts&exintro=1&titles=${encodeURIComponent(title)}` +
    `&format=json&formatversion=2&origin=*`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const page = data?.query?.pages?.[0];
  return page?.extract || null;
}

// Convierte enlaces relativos (/wiki/...) en absolutos y los abre en
// pestaña nueva, para que funcionen dentro de nuestro marco incrustado.
function fixWikiLinks(html, lang) {
  const container = document.createElement("div");
  container.innerHTML = html;

  container.querySelectorAll("a").forEach(a => {
    const href = a.getAttribute("href");
    if (href && href.startsWith("/wiki/")) {
      a.setAttribute("href", `https://${lang}.wikipedia.org${href}`);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    } else if (href && href.startsWith("#")) {
      a.removeAttribute("href");
    }
  });

  return container.innerHTML;
}

// Si el resumen final no trae imagen, buscamos la imagen del mismo
// artículo en español (idioma base) o, si tampoco hay, en inglés.
async function getFallbackThumbnail(baseTitle, baseLang, excludeLang) {
  const langsToTry = [baseLang, "en"].filter(l => l !== excludeLang);

  for (const lang of langsToTry) {
    try {
      let title = baseTitle;
      if (lang !== baseLang) {
        const link = await getLanglinkTitle(baseTitle, baseLang, lang);
        if (!link) continue;
        title = link.title;
      }
      const summary = await getArticleSummary(lang, title);
      if (summary?.thumbnail?.source) {
        return summary.thumbnail;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
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

    // 3. Obtenemos el resumen del artículo final (metadata: título, imagen, link)
    const summary = await getArticleSummary(finalLang, finalTitle);

    // 3b. Obtenemos el cuerpo en HTML real, con párrafos y listas respetados
    const extractHtml = await getArticleExtractHtml(finalLang, finalTitle);

    // 4. Si no tiene imagen, buscamos una de respaldo en español o inglés
    if (!summary?.thumbnail?.source) {
      const fallbackThumb = await getFallbackThumbnail(basePage.title, baseLang, finalLang);
      if (fallbackThumb) {
        summary.thumbnail = fallbackThumb;
      }
    }

    renderArticle(summary, numberStr, finalLang, extractHtml);
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

function renderArticle(summary, numberStr, lang, extractHtml) {
  els.loadingZone.classList.add("hidden");
  els.errorZone.classList.add("hidden");
  els.emptyZone.classList.add("hidden");

  els.articleTitle.textContent = summary.title || "—";
  els.articleSeed.textContent = `#${numberStr} · ${lang}`;

  // Preferimos el HTML real (párrafos, listas) y caemos al texto plano
  // del resumen solo si por algún motivo no se pudo obtener.
  const bodyHtml = extractHtml
    ? fixWikiLinks(extractHtml, lang)
    : `<p>${summary.extract || ""}</p>`;

  els.articleExtract.innerHTML = `<div class="extract-text">${bodyHtml}</div>`;

  const thumb = summary.thumbnail;
  if (thumb?.source) {
    const img = document.createElement("img");
    img.src = thumb.source;
    img.alt = summary.title || "";

    // Decidimos según la proporción real reportada por la API
    // (width/height). Si es más alta que ancha (retrato/larga),
    // va abajo a ancho completo; si es apaisada o cuadrada, va al lado.
    const isTall = thumb.height && thumb.width && (thumb.height / thumb.width) > 1.15;
    img.className = isTall ? "img-tall" : "img-wide";

    els.articleExtract.appendChild(img);
  }

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

// Solo permitimos dígitos 0-9, nada más (ni letras, ni guiones, ni símbolos)
els.numberInput.addEventListener("input", (e) => {
  const cleaned = e.target.value.replace(/[^0-9]/g, "");
  if (cleaned !== e.target.value) {
    e.target.value = cleaned;
  }
});

els.numberInput.addEventListener("paste", (e) => {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text");
  const cleaned = text.replace(/[^0-9]/g, "");
  const start = e.target.selectionStart;
  const end = e.target.selectionEnd;
  const current = e.target.value;
  e.target.value = current.slice(0, start) + cleaned + current.slice(end);
});

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