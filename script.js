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

// The switch is hidden while the Spanish copy is being reviewed: everyone gets
// English. Set to true (and remove "hidden" from .lang in the HTML) to enable it.
const LANG_SWITCH_ENABLED = false;

// Saved choice first; otherwise follow the browser language
function initialLanguage() {
  if (!LANG_SWITCH_ENABLED) return 'en';
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
// On mobile there is no hover: the services light up one by one as you scroll
const mobileServices = window.matchMedia('(max-width: 860px)');
if (serviceItems.length) {
  const onServicesScroll = () => {
    if (!mobileServices.matches) return;
    // progress runs from the list's top reaching 80% of the screen
    // to its bottom reaching 35%, split evenly between the items
    const rect = serviceItems[0].parentElement.getBoundingClientRect();
    const start = window.innerHeight * 0.8;
    const end = window.innerHeight * 0.35 - rect.height;
    const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 0.999);
    const current = serviceItems[Math.floor(progress * serviceItems.length)];
    if (!current.classList.contains('is-active')) activateService(current);
  };
  window.addEventListener('scroll', onServicesScroll, { passive: true });
  onServicesScroll();
}
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

// ---------- Marquees (home logos, About books) ----------
// Duplicate each set so the loop is seamless, and give every marquee the same
// speed in px/s, whatever its length.
const MARQUEE_SPEED = 48; // px per second (the home logos: 1450px every 30s)
document.querySelectorAll('.marquee__track').forEach((track) => {
  const set = track.querySelector('.marquee__set');
  const copy = set.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('img').forEach((img) => { img.alt = ''; });
  track.appendChild(copy);
  const setSpeed = () => { track.style.animationDuration = set.getBoundingClientRect().width / MARQUEE_SPEED + 's'; };
  setSpeed();
  set.querySelectorAll('img').forEach((img) => { if (!img.complete) img.addEventListener('load', setSpeed); });
  window.addEventListener('resize', setSpeed);
});

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

// ---------- Autoplay videos (McCain card) ----------
// Muted loops that should always be running. The image underneath shows until
// the video really plays. Safari can refuse an early play() call, so we retry
// whenever the card comes on screen and once the video has data.
document.querySelectorAll('video.media-video').forEach((video) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.remove();
    return;
  }
  video.muted = true;
  video.defaultMuted = true;
  const tryPlay = () => {
    if (!video.paused) return;
    const attempt = video.play();
    if (attempt) attempt.catch(() => {});
  };
  // Only show the video while it really plays. Safari pauses it off screen and,
  // in Low Power Mode, may not resume: the image then shows instead of a play button.
  video.addEventListener('playing', () => video.classList.add('is-playing'));
  video.addEventListener('pause', () => video.classList.remove('is-playing'));
  video.addEventListener('ended', () => { video.currentTime = 0; tryPlay(); });
  video.addEventListener('error', () => video.remove());
  video.addEventListener('loadeddata', tryPlay);
  video.addEventListener('canplay', tryPlay);
  let onScreen = false;
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) tryPlay();
  }, { threshold: 0.1 }).observe(video);
  // Low Power Mode only allows play() from a user gesture: retry on each one
  ['pointerdown', 'touchend', 'keydown'].forEach((evt) =>
    window.addEventListener(evt, () => { if (onScreen) tryPlay(); }, { passive: true }));
  tryPlay();
});

// ---------- Case study videos: poster + play button ----------
// The poster shows until the visitor presses play; then the video plays with
// sound and native controls. It pauses when scrolled out of view.
document.querySelectorAll('video.case-video').forEach((video) => {
  const box = video.closest('.case-achievements');
  const button = box && box.querySelector('.case-video__play');
  if (!button) return;
  button.addEventListener('click', () => {
    video.controls = true;
    video.muted = false;
    box.classList.add('is-playing');
    const attempt = video.play();
    if (attempt) attempt.catch(() => {});
  });
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && !video.paused) video.pause();
  }, { threshold: 0.2 }).observe(video);
});

// ---------- Email buttons: also copy the address ----------
// mailto: does nothing when the visitor has no email app set up, so the click
// copies the address too and says so.
document.querySelectorAll('[data-copy-email]').forEach((link) => {
  const label = link.querySelector('.case-invite__cta-label');
  link.addEventListener('click', () => {
    if (!navigator.clipboard || !label) return;
    navigator.clipboard.writeText(link.dataset.copyEmail).then(() => {
      const original = label.innerHTML;
      label.textContent = document.documentElement.lang === 'es' ? 'Email copiado' : 'Email copied';
      setTimeout(() => { label.innerHTML = original; }, 2500);
    }).catch(() => {});
  });
});

// ---------- Case image carousels ----------
// Arrows (and swipe on touch) move between slides, looping at the ends so
// both arrows always work. The first time the
// carousel comes on screen it nudges sideways to show the next image's edge.
document.querySelectorAll('.case-carousel').forEach((carousel) => {
  const track = carousel.querySelector('.case-carousel__track');
  const slides = track.children;
  const prev = carousel.querySelector('.case-carousel__btn--prev');
  const next = carousel.querySelector('.case-carousel__btn--next');
  const dots = carousel.querySelectorAll('.case-carousel__dots span');
  let index = 0;
  const go = (i) => {
    index = (i + slides.length) % slides.length;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.style.transform = `translateX(calc(${-index * 100}% - ${index * gap}px))`;
    dots.forEach((d, n) => d.classList.toggle('is-active', n === index));
  };
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });
  // swipe
  let startX = null;
  track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') startX = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
    startX = null;
  });
  go(0);
  // one-time peek hint
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      if (index !== 0) return;
      track.classList.add('is-peeking');
      track.addEventListener('animationend', () => track.classList.remove('is-peeking'), { once: true });
    }, { threshold: 0.6 }).observe(carousel);
  }
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
  const gl = canvas && canvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: 'flowPreserve' in container.dataset });
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
  // (data-flow-res overrides the scale; data-flow-preserve lets other canvases read it)
  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2) * (parseFloat(container.dataset.flowRes) || 0.5);
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
// Desktop only: a faint brush stroke painted with the hero gradient trails the cursor.
// A chain of points chases the pointer; the stroke is drawn on a 2D canvas and
// filled with the live WebGL flow (rendered small and stretched, it is soft anyway).
const cursorQuery = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 861px)');
if (cursorQuery.matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const trail = document.createElement('div');
  trail.className = 'cursor-trail flow';
  trail.dataset.flow = '/assets/img/hero-background.jpg';
  trail.dataset.flowAmp = '2';
  trail.dataset.flowRes = '0.15';
  trail.dataset.flowPreserve = '';
  trail.setAttribute('aria-hidden', 'true');
  trail.innerHTML = '<canvas class="cursor-trail__source"></canvas><canvas class="cursor-trail__stroke"></canvas>';
  document.body.appendChild(trail);

  const source = trail.querySelector('.cursor-trail__source');
  const stroke = trail.querySelector('.cursor-trail__stroke');
  const ctx = stroke.getContext('2d');
  const sizeStroke = () => { stroke.width = window.innerWidth; stroke.height = window.innerHeight; };
  sizeStroke();
  window.addEventListener('resize', sizeStroke);

  const COUNT = 30;          // points in the tail: more = longer stroke
  const HEAD = 34;           // brush radius at the cursor, in px
  const points = Array.from({ length: COUNT }, () => ({ x: -200, y: -200 }));
  let mx = -200, my = -200, raf = 0, active = false;

  const frame = (now) => {
    const t = now / 1000;
    points[0].x += (mx - points[0].x) * 0.35;
    points[0].y += (my - points[0].y) * 0.35;
    for (let i = 1; i < COUNT; i++) {
      points[i].x += (points[i - 1].x - points[i].x) * 0.42;
      points[i].y += (points[i - 1].y - points[i].y) * 0.42;
    }

    // Sway the tail sideways so the stroke dances like a ribbon
    const path = points.map((p, i) => {
      const next = points[Math.min(i + 1, COUNT - 1)];
      const dx = p.x - next.x, dy = p.y - next.y;
      const len = Math.hypot(dx, dy) || 1;
      const sway = Math.sin(t * 4 - i * 0.45) * Math.min(len, 6) * (i / COUNT) * 2.2;
      return { x: p.x - (dy / len) * sway, y: p.y + (dx / len) * sway };
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, stroke.width, stroke.height);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    for (let i = 0; i < COUNT - 2; i++) {
      const a = path[i], b = path[i + 1], c = path[i + 2];
      ctx.lineWidth = HEAD * 2 * Math.pow(1 - i / COUNT, 1.4);
      ctx.beginPath();
      ctx.moveTo((a.x + b.x) / 2, (a.y + b.y) / 2);
      ctx.quadraticCurveTo(b.x, b.y, (b.x + c.x) / 2, (b.y + c.y) / 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(path[0].x, path[0].y, HEAD, 0, Math.PI * 2);
    ctx.fill();

    // Keep only the stroke, filled with the flowing gradient
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(source, 0, 0, stroke.width, stroke.height);

    raf = active ? requestAnimationFrame(frame) : 0;
  };

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!active) {
      points.forEach((p) => { p.x = mx; p.y = my; });
      active = true;
      trail.classList.add('is-active');
      if (!raf) raf = requestAnimationFrame(frame);
    }
  });
  document.documentElement.addEventListener('mouseleave', () => {
    active = false;
    trail.classList.remove('is-active');
  });
}
document.querySelectorAll('.flow[data-flow]').forEach(initFlow);

// ---------- Projects page: filter cards by area ----------
const filterButtons = document.querySelectorAll('[data-filter]');
const filterCards = document.querySelectorAll('.projects-grid [data-tags]');
filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    filterCards.forEach((card) => {
      const match = filter === 'all' || card.dataset.tags.split(' ').includes(filter);
      card.classList.toggle('is-hidden', !match);
      card.classList.remove('is-shown');
      if (match) {
        card.classList.add('is-visible');        // skip the scroll fade-in
        void card.offsetWidth;                    // restart the entrance animation
        card.classList.add('is-shown');
      }
    });
  });
});

// ---------- About: footnote GIFs ----------
// A clip pops up next to a footnote marker on hover (or tap on touch), at its
// original proportions. Add more by mapping a footnote id to a video here.
//   ratio:    width / height of the frame
//   position: which part of the video to show when the frame crops it
// Safari refuses to play video on hover in Low Power Mode, so the clip then
// falls back to Tenor's animated WebP of the same GIF (images always animate).
const footnoteFallback = (src) => src.replace(/AAAPo\/(.+)\.mp4$/, 'AAAA1/$1.webp');
const FOOTNOTE_MEDIA = {
  fn1: { src: 'https://media.tenor.com/uC9B5qE3SDAAAAPo/asain-japan.mp4', ratio: 1.78771, label: 'Asain Japan GIF', credit: 'https://tenor.com/view/asain-japan-gif-19431061' },
  fn2: { src: 'https://media.tenor.com/9-O8W8FeUUwAAAPo/absolute-cinema.mp4', ratio: 1, label: 'Absolute Cinema GIF', credit: 'https://tenor.com/view/absolute-cinema-raccoon-absolute-cinema-gif-17862327649353748812' },
  // only the bottom scene of this GIF (466x357 of 466x640)
  fn3: { src: 'https://media.tenor.com/cRt6jjaaTT4AAAPo/diy-the-simpsons.mp4', ratio: 466 / 357, position: 'center bottom', label: 'Diy The Simpsons GIF', credit: 'https://tenor.com/view/diy-the-simpsons-ralph-wiggum-crafts-other-girls-gif-16552779' },
  fn4: { src: 'https://media.tenor.com/3TEqWT1vov4AAAPo/big-book-huge-book.mp4', ratio: 0.674699, label: 'Big Book Huge Book GIF', credit: 'https://tenor.com/view/big-book-huge-book-big-book-meme-thick-book-meme-struggling-to-turn-page-gif-15938567119012078334' },
  fn5: { src: 'https://media.tenor.com/vKftz2A4_jIAAAPo/mc-escher-escher.mp4', ratio: 1.35593, label: 'Mc Escher Escher GIF', credit: 'https://tenor.com/view/mc-escher-escher-mcesher-impossible-stairs-stairs-gif-23297343' },
  fn6: { src: 'https://media.tenor.com/a-6d7Eb-LoUAAAPo/yo-haciendo-yoga.mp4', ratio: 624 / 640, label: 'Yo Haciendo Yoga GIF', credit: 'https://tenor.com/view/yo-haciendo-yoga-gif-22817625' },
  fn7: { src: 'https://media.tenor.com/eBMZeTXtYskAAAPo/sorority-sisterhood.mp4', ratio: 1, label: 'Sorority Sisterhood GIF', credit: 'https://tenor.com/view/sorority-sisterhood-help-gif-8083667' },
};
const humanSection = document.querySelector('.human');
if (humanSection) {
  const pop = document.createElement('div');
  pop.className = 'fn-pop';
  pop.setAttribute('aria-hidden', 'true');
  const credit = document.createElement('a');
  credit.className = 'fn-pop__credit';
  credit.textContent = 'via Tenor';
  pop.appendChild(credit);
  document.body.appendChild(pop);

  // One video per footnote, so switching between numbers is instant
  const videos = {};
  Object.entries(FOOTNOTE_MEDIA).forEach(([id, media]) => {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'none';
    v.src = media.src;
    v.setAttribute('aria-label', media.label);
    if (media.position) v.style.objectPosition = media.position;
    pop.insertBefore(v, credit);
    videos[id] = v;
  });
  // Start downloading as soon as the visitor gets near the section
  let preloaded = false;
  const preload = () => {
    if (preloaded) return;
    preloaded = true;
    Object.values(videos).forEach((v) => { v.preload = 'auto'; v.load(); });
  };
  humanSection.addEventListener('pointerenter', preload);
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { preload(); obs.disconnect(); }
  }, { rootMargin: '200px 0px' }).observe(humanSection);

  const images = {};
  let useImages = false;
  const showImage = (id) => {
    if (!images[id]) {
      const img = new Image();
      img.alt = FOOTNOTE_MEDIA[id].label;
      img.src = footnoteFallback(FOOTNOTE_MEDIA[id].src);
      if (FOOTNOTE_MEDIA[id].position) img.style.objectPosition = FOOTNOTE_MEDIA[id].position;
      pop.insertBefore(img, credit);
      images[id] = img;
    }
    Object.entries(images).forEach(([key, img]) => img.classList.toggle('is-active', key === id));
    Object.values(videos).forEach((v) => { v.classList.remove('is-active'); v.pause(); });
  };

  let current = null;
  const show = (marker) => {
    const id = marker.getAttribute('aria-describedby');
    const media = FOOTNOTE_MEDIA[id];
    if (!media) return;
    current = marker;
    Object.entries(videos).forEach(([key, v]) => {
      const active = key === id && !useImages;
      v.classList.toggle('is-active', active);
      if (!active) v.pause();
    });
    credit.href = media.credit;

    // Fit inside 320x260 (smaller on narrow screens) keeping the frame's shape
    let width = Math.min(320, window.innerWidth - 32);
    let height = width / media.ratio;
    if (height > 260) { height = 260; width = height * media.ratio; }
    width = Math.round(width);
    height = Math.round(height);
    const r = marker.getBoundingClientRect();
    const left = Math.min(Math.max(16, r.left + r.width / 2 - width / 2), window.innerWidth - width - 16);
    const above = r.top > height + 40;
    pop.style.width = width + 'px';
    pop.style.height = height + 'px';
    pop.style.left = left + window.scrollX + 'px';
    // leave room under the frame for the "via Tenor" credit
    pop.style.top = (above ? r.top - height - 28 : r.bottom + 12) + window.scrollY + 'px';
    pop.classList.add('is-on');
    if (useImages) { showImage(id); return; }
    const attempt = videos[id].play();
    if (attempt) attempt.catch(() => {
      useImages = true;
      if (current === marker) showImage(id);
    });
  };
  const hide = () => {
    current = null;
    pop.classList.remove('is-on');
    Object.values(videos).forEach((v) => v.pause());
  };

  // Hover only for a real mouse; taps are handled by the click listener below
  document.addEventListener('pointerover', (e) => {
    const marker = e.pointerType === 'mouse' && e.target.closest && e.target.closest('.fn');
    if (marker) show(marker);
  });
  document.addEventListener('pointerout', (e) => {
    const marker = e.pointerType === 'mouse' && e.target.closest && e.target.closest('.fn');
    if (marker && !marker.contains(e.relatedTarget)) hide();
  });
  // Touch: tap the number to toggle, tap anywhere else to close
  document.addEventListener('click', (e) => {
    const marker = e.target.closest && e.target.closest('.fn');
    if (marker) {
      if (e.pointerType === 'mouse' || current !== marker) show(marker); else hide();
      return;
    }
    if (!pop.contains(e.target)) hide();
  });
  window.addEventListener('scroll', () => { if (current) hide(); }, { passive: true });
}

// ---------- Case page: the contents list highlights the section being read ----------
const csToc = document.querySelector('.cs-toc');
if (csToc) {
  const links = [...csToc.querySelectorAll('a[href^="#"]')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  let activeId = null;
  const onScroll = () => {
    const line = window.innerHeight * 0.3;
    let current = sections[0];
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s; });
    if (current.id === activeId) return;
    activeId = current.id;
    links.forEach((a) => {
      const on = a.getAttribute('href') === '#' + activeId;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
        // mobile: the contents bar scrolls sideways, keep the active link centred
        const list = a.closest('ol');
        if (list.scrollWidth > list.clientWidth) {
          list.scrollTo({ left: a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
        }
      } else {
        a.removeAttribute('aria-current');
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---------- DxC Final product: walkthrough in a desktop browser ----------
// Plays the screens in order while the demo is on screen; the step bars jump to a screen.
document.querySelectorAll('[data-demo]').forEach((demo) => {
  const shots = [...demo.querySelectorAll('.dx-demo__shot')];
  const bars = [...demo.querySelectorAll('.dx-demo__steps button')];
  const caption = demo.querySelector('.dx-demo__caption');
  const screen = demo.querySelector('.dx-demo__screen');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEP = 3400;
  let index = 0, timer = null, visible = false;

  const show = (i) => {
    index = (i + shots.length) % shots.length;
    clearTimeout(timer);
    shots.forEach((s, n) => {
      s.classList.toggle('is-active', n === index);
      if (s.hasAttribute('data-scroll')) { s.style.setProperty('--scroll-t', '0s'); s.style.setProperty('--scroll-y', '0px'); }
    });
    bars.forEach((b, n) => { b.classList.toggle('is-done', n < index); b.classList.remove('is-active'); });
    caption.textContent = shots[index].dataset.caption;
    demo.classList.toggle('is-pinned', shots[index].hasAttribute('data-scroll'));
    const shot = shots[index];
    let duration = STEP;
    if (shot.hasAttribute('data-scroll') && !reduced) {
      // hold, scroll to the bottom of the form, hold
      const distance = shot.offsetHeight - screen.offsetHeight;
      const scrollTime = Math.max(2500, distance * 6);
      duration = 1000 + scrollTime + 1200;
      setTimeout(() => {
        if (index !== shots.indexOf(shot)) return;
        shot.style.setProperty('--scroll-t', scrollTime + 'ms');
        shot.style.setProperty('--scroll-y', -distance + 'px');
      }, 1000);
    }
    const bar = bars[index];
    bar.style.setProperty('--step-t', duration + 'ms');
    void bar.offsetWidth; // restart the progress animation
    bar.classList.add('is-active');
    if (!reduced && visible) timer = setTimeout(() => show(index + 1), duration);
  };

  bars.forEach((b, n) => b.addEventListener('click', () => show(n)));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    demo.classList.toggle('is-paused', !visible);
    if (visible && !reduced) show(index); else clearTimeout(timer);
  }, { threshold: 0.4 }).observe(demo);
  show(0);
});
