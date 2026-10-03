// Small localStorage wrapper (storage can be blocked in private windows)
const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch (e) {} },
};

// ---------- Language (EN / ES) ----------
// English lives in the HTML. Spanish comes from /i18n.js (shared strings)
// plus the page's own <script id="i18n-es"> block.
const pageStrings = document.getElementById('i18n-es');
const spanish = Object.assign({}, window.I18N_ES, pageStrings ? JSON.parse(pageStrings.textContent) : {});
const i18nEls = document.querySelectorAll('[data-i18n]');
const i18nTextEls = document.querySelectorAll('[data-i18n-text]');
i18nEls.forEach((el) => { el.dataset.en = el.innerHTML; });
i18nTextEls.forEach((el) => { el.dataset.textEn = el.dataset.text; });

function setLanguage(lang) {
  const es = lang === 'es';
  i18nEls.forEach((el) => {
    const t = es && spanish[el.dataset.i18n];
    el.innerHTML = t || el.dataset.en;
  });
  i18nTextEls.forEach((el) => {
    const t = es && spanish[el.dataset.i18nText];
    el.dataset.text = t || el.dataset.textEn;
  });
  // Menu links roll over to a copy of their label
  document.querySelectorAll('.menu__links a').forEach((a) => { a.dataset.label = a.textContent.trim(); });
  document.documentElement.lang = es ? 'es' : 'en';
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.dispatchEvent(new CustomEvent('langchange'));
}

// Saved choice first; otherwise follow the browser language
function initialLanguage() {
  const saved = store.get('lang');
  if (saved === 'en' || saved === 'es') return saved;
  return (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';
}
setLanguage(initialLanguage());
document.querySelectorAll('.lang button').forEach((b) => {
  b.addEventListener('click', () => {
    store.set('lang', b.dataset.lang);
    setLanguage(b.dataset.lang);
  });
});

// ---------- First-visit intro ----------
// Red curtain: the phrase types in, then the screen splits open.
const intro = document.querySelector('.intro');
if (intro && !document.documentElement.classList.contains('intro-seen')) {
  const finish = () => {
    intro.remove();
    document.documentElement.classList.remove('intro-active');
    store.set('introSeen', '1');
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
  } else {
    const text = intro.querySelector('.intro__text');
    text.innerHTML = [...text.textContent.trim()]
      .map((ch, i) => `<span style="animation-delay:${(0.35 + i * 0.055).toFixed(3)}s">${ch === ' ' ? '&nbsp;' : ch}</span>`)
      .join('');
    document.documentElement.classList.add('intro-active');
    setTimeout(() => intro.classList.add('is-open'), 1500);
    setTimeout(finish, 3100);
  }
} else if (intro) {
  intro.remove();
}

// ---------- Menu panel: drops down from the top ----------
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.getElementById('menu');
const menuClose = menu.querySelector('.menu__close');

function setMenu(open) {
  menu.classList.toggle('is-open', open);
  menu.inert = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
  (open ? menuClose : menuToggle).focus({ preventScroll: true });
}
menuToggle.addEventListener('click', () => setMenu(true));
menuClose.addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false);
});
document.addEventListener('click', (e) => {
  if (menu.classList.contains('is-open') && !menu.contains(e.target) && !menuToggle.contains(e.target)) setMenu(false);
});

// ---------- Header turns solid once we scroll past the hero ----------
// (pages without a [data-hero] keep the solid header from the start)
const header = document.querySelector('.header');
const hero = document.querySelector('[data-hero]');
if (hero) {
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-solid', !entry.isIntersecting);
  }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
}

// ---------- Fade-in cards on scroll ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// ---------- "What I bring": hover/click a service to show its description ----------
const detailTitle = document.querySelector('.services__detail-title');
const detailText = document.querySelector('.services__detail-text');
const serviceItems = document.querySelectorAll('.services__list li');

function activateService(item) {
  serviceItems.forEach((li) => li.classList.toggle('is-active', li === item));
  detailTitle.textContent = item.querySelector('.services__name').textContent;
  detailText.textContent = item.dataset.text;
}
serviceItems.forEach((item) => {
  item.addEventListener('mouseenter', () => activateService(item));
  item.addEventListener('click', () => activateService(item));
});
document.addEventListener('langchange', () => {
  const active = document.querySelector('.services__list li.is-active');
  if (active) activateService(active);
});

// ---------- Testimonial: words light up as you scroll through it ----------
const quote = document.querySelector('[data-words]');
if (quote) {
  let words = [];
  function updateQuote() {
    const rect = quote.getBoundingClientRect();
    const start = window.innerHeight * 0.85;
    const end = window.innerHeight * 0.35;
    const progress = Math.min(Math.max((start - rect.top) / (start - end + rect.height * 0.5), 0), 1);
    const lit = Math.round(progress * words.length);
    words.forEach((w, i) => w.classList.toggle('is-on', i < lit));
  }
  function splitWords() {
    quote.innerHTML = quote.textContent
      .trim()
      .split(/\s+/)
      .map((word) => `<span class="w">${word}</span>`)
      .join(' ');
    words = quote.querySelectorAll('.w');
    updateQuote();
  }
  window.addEventListener('scroll', updateQuote, { passive: true });
  document.addEventListener('langchange', splitWords);
  splitWords();
}

// ---------- Clients marquee: duplicate the logo set so the loop is seamless ----------
const track = document.querySelector('.clients__track');
if (track) {
  const copy = track.querySelector('.clients__set').cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.appendChild(copy);
}

// ---------- About: hovering a footnote marker highlights its note ----------
// Delegated, because switching language re-renders the paragraphs
function toggleNote(e, on) {
  const marker = e.target.closest && e.target.closest('.fn');
  if (!marker) return;
  const note = document.getElementById(marker.getAttribute('aria-describedby'));
  if (note) note.classList.toggle('is-on', on);
}
document.addEventListener('mouseover', (e) => toggleNote(e, true));
document.addEventListener('mouseout', (e) => toggleNote(e, false));
document.addEventListener('focusin', (e) => toggleNote(e, true));
document.addEventListener('focusout', (e) => toggleNote(e, false));
