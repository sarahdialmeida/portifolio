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

// ---------- Autoplay videos ----------
// The image underneath is the default; the video only fades in once it is
// really playing. Blocked autoplay (Low Power Mode, reduce motion, errors)
// just leaves the image in place.
document.querySelectorAll('video.media-video').forEach((video) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.remove();
    return;
  }
  video.addEventListener('playing', () => video.classList.add('is-playing'));
  video.addEventListener('error', () => video.remove());
  const attempt = video.play();
  if (attempt) attempt.catch(() => {});
});

// ---------- Flowing gradient backgrounds (hero + footer) ----------
// The image is drawn on a WebGL canvas and slowly warped by layered sine
// waves, so the colours drift like liquid. If WebGL is unavailable the
// container's CSS background (the same image, static) stays visible.
const FLOW_VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FLOW_FRAGMENT = `
precision mediump float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_img;
uniform float u_time;
uniform float u_amp;

// Mirror the coordinates so warped edges never show a seam
vec2 mirror(vec2 p) { return 1.0 - abs(1.0 - mod(p, 2.0)); }

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;

  // object-fit: cover
  float rc = u_res.x / u_res.y;
  float ri = u_img.x / u_img.y;
  vec2 scale = rc > ri ? vec2(1.0, ri / rc) : vec2(rc / ri, 1.0);
  vec2 p = (uv - 0.5) * scale * 0.9 + 0.5;

  // Two layers of domain warping
  float t = u_time * 0.6;   // speed: raise to flow faster
  vec2 q = vec2(sin(p.y * 3.1 + t), cos(p.x * 2.7 - t * 0.8));
  vec2 r = vec2(sin(p.y * 5.3 + q.x * 1.7 - t * 1.2), cos(p.x * 4.1 + q.y * 1.5 + t * 0.9));
  p += (0.07 * q + 0.035 * r) * u_amp;  // amplitude (data-flow-amp on the element)
  // slow current, so the colours travel instead of only wobbling in place
  p += vec2(0.06 * sin(t * 0.37), 0.045 * cos(t * 0.29)) * u_amp;

  vec3 color = texture2D(u_tex, mirror(p)).rgb;
  // A touch of noise hides banding in the smooth gradient
  color += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}`;

function initFlow(container) {
  const canvas = container.querySelector('canvas');
  const gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vs = compile(gl.VERTEX_SHADER, FLOW_VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FLOW_FRAGMENT);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  // Full-screen quad
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_res');
  const uImg = gl.getUniformLocation(program, 'u_img');
  const uTime = gl.getUniformLocation(program, 'u_time');
  gl.uniform1f(gl.getUniformLocation(program, 'u_amp'), parseFloat(container.dataset.flowAmp) || 1);

  // The image is soft, so half resolution looks identical and costs a quarter
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
    canvas.width = Math.max(1, Math.round(container.clientWidth * ratio));
    canvas.height = Math.max(1, Math.round(container.clientHeight * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = false;
  let rafId = 0;
  const draw = (now) => {
    gl.uniform1f(uTime, reduceMotion ? 0 : now / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const loop = (now) => {
    draw(now);
    rafId = visible ? requestAnimationFrame(loop) : 0;
  };

  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.uniform2f(uImg, img.naturalWidth, img.naturalHeight);
    resize();
    draw(performance.now());
    canvas.classList.add('is-ready');

    new ResizeObserver(() => { resize(); draw(performance.now()); }).observe(container);
    if (reduceMotion) return;
    // Only animate while on screen
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !rafId) rafId = requestAnimationFrame(loop);
    }).observe(container);
  };
  img.src = container.dataset.flow;
}
document.querySelectorAll('.flow[data-flow]').forEach(initFlow);
