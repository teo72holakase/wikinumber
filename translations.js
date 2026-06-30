// =========================================
// WikiNumber - translations.js
// =========================================

const TRANSLATIONS = {
  "es": {
    theme_label: "Tema",
    accent_label: "Color",
    lang_label: "Idioma",
    input_placeholder: "Ej: 3, 1990, 42...",
    search_btn: "Buscar artículo",
    tab_article: "Artículo",
    tab_how: "Cómo funciona",
    tab_why: "Por qué se creó",
    loading_text: "Calculando coordenadas del conocimiento...",
    error_text: "No se pudo cargar el artículo. Intenta con otro número.",
    empty_text: "Introduce un número arriba para descubrir su artículo asociado.",
    read_more: "Leer artículo completo en Wikipedia →",
    how_title: "¿Cómo funciona WikiNumber?",
    how_p1: "WikiNumber convierte cualquier número que introduzcas en una coordenada determinística dentro del universo de artículos de Wikipedia. Esto significa que el mismo número siempre te devolverá el mismo artículo, sin importar cuándo, desde dónde o en qué navegador lo busques.",
    how_p2: "Internamente, el número se transforma mediante un algoritmo de hash en un identificador estable que apunta a una página real de Wikipedia. Si cambias el idioma de la página, WikiNumber buscará automáticamente la versión equivalente del mismo artículo en ese idioma; si no existe traducción disponible, se mostrará en inglés o español como alternativa.",
    how_p3: "Sirve como una forma curiosa de exploración: un generador de descubrimiento aleatorio pero reproducible, ideal para juegos, retos, casualidades numéricas (tu cumpleaños, tu edad, tu DNI) o simple curiosidad.",
    why_title: "¿Por qué se creó WikiNumber?",
    why_p1: "No se me ocurrió otra cosa wacho, perdón."
  },

  "es-ES": {
    theme_label: "Tema",
    accent_label: "Color",
    lang_label: "Idioma",
    input_placeholder: "P.ej: 3, 1990, 42...",
    search_btn: "Buscar artículo",
    tab_article: "Artículo",
    tab_how: "Cómo funciona",
    tab_why: "Por qué se creó",
    loading_text: "Calculando coordenadas del conocimiento...",
    error_text: "No se ha podido cargar el artículo. Prueba con otro número.",
    empty_text: "Introduce un número arriba para descubrir su artículo asociado.",
    read_more: "Leer artículo completo en Wikipedia →",
    how_title: "¿Cómo funciona WikiNumber?",
    how_p1: "WikiNumber convierte cualquier número que introduzcas en una coordenada determinista dentro del universo de artículos de Wikipedia. Esto significa que el mismo número siempre te devolverá el mismo artículo, sin importar cuándo, desde dónde o en qué navegador lo busques.",
    how_p2: "Internamente, el número se transforma mediante un algoritmo de hash en un identificador estable que apunta a una página real de Wikipedia. Si cambias el idioma de la página, WikiNumber buscará automáticamente la versión equivalente del mismo artículo en ese idioma; si no existe traducción disponible, se mostrará en inglés o español como alternativa.",
    how_p3: "Sirve como una forma curiosa de exploración: un generador de descubrimiento aleatorio pero reproducible, ideal para juegos, retos, casualidades numéricas (tu cumpleaños, tu edad, tu DNI) o simple curiosidad.",
    why_title: "¿Por qué se creó WikiNumber?",
    why_p1: "Ni la más puta idea chaval, perdón ostia."
  },

  "en": {
    theme_label: "Theme",
    accent_label: "Color",
    lang_label: "Language",
    input_placeholder: "E.g: 3, 1990, 42...",
    search_btn: "Search article",
    tab_article: "Article",
    tab_how: "How it works",
    tab_why: "Why it was created",
    loading_text: "Calculating knowledge coordinates...",
    error_text: "Couldn't load the article. Try another number.",
    empty_text: "Enter a number above to discover its associated article.",
    read_more: "Read full article on Wikipedia →",
    how_title: "How does WikiNumber work?",
    how_p1: "WikiNumber turns any number you enter into a deterministic coordinate within the universe of Wikipedia articles. This means the same number will always return the same article, no matter when, where, or which browser you search from.",
    how_p2: "Internally, the number is transformed via a hashing algorithm into a stable identifier pointing to a real Wikipedia page. If you change the page language, WikiNumber automatically looks for the equivalent version of the same article in that language; if no translation is available, it falls back to English or Spanish.",
    how_p3: "It works as a curious form of exploration: a random yet reproducible discovery generator, ideal for games, challenges, numeric coincidences (your birthday, your age, your ID number) or simple curiosity.",
    why_title: "Why was WikiNumber created?",
    why_p1: "IDK lmao lol."
  },

  "pt": {
    theme_label: "Tema",
    accent_label: "Cor",
    lang_label: "Idioma",
    input_placeholder: "Ex: 3, 1990, 42...",
    search_btn: "Buscar artigo",
    tab_article: "Artigo",
    tab_how: "Como funciona",
    tab_why: "Por que foi criado",
    loading_text: "Calculando coordenadas do conhecimento...",
    error_text: "Não foi possível carregar o artigo. Tente outro número.",
    empty_text: "Digite um número acima para descobrir o artigo associado.",
    read_more: "Ler artigo completo na Wikipédia →",
    how_title: "Como funciona o WikiNumber?",
    how_p1: "O WikiNumber transforma qualquer número que você digitar em uma coordenada determinística dentro do universo de artigos da Wikipédia. Isso significa que o mesmo número sempre retornará o mesmo artigo, não importa quando, de onde ou em qual navegador você pesquise.",
    how_p2: "Internamente, o número é transformado por um algoritmo de hash em um identificador estável que aponta para uma página real da Wikipédia. Se você mudar o idioma da página, o WikiNumber buscará automaticamente a versão equivalente do mesmo artigo nesse idioma; se não houver tradução disponível, será exibido em inglês ou espanhol.",
    how_p3: "Funciona como uma forma curiosa de exploração: um gerador de descobertas aleatório, porém reprodutível, ideal para jogos, desafios, coincidências numéricas (seu aniversário, sua idade, seu documento) ou simples curiosidade.",
    why_title: "Por que o WikiNumber foi criado?",
    why_p1: "Nao tinha ideia do que mais fazer, desculpa e obrigado."
  }
};

// Mapeo de idioma de la interfaz -> código de idioma de Wikipedia
const WIKI_LANG_MAP = {
  "es": "es",
  "es-ES": "es",
  "en": "en",
  "pt": "pt"
};