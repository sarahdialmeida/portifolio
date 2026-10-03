// Menu overlay
const menuToggle = document.querySelector('.menu-toggle');
const menu = document.getElementById('menu');

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!open));
  menu.hidden = open;
  document.body.style.overflow = open ? '' : 'hidden';
});

// Header turns solid once we scroll past the hero
// (pages without a [data-hero] keep the solid header from the start)
const header = document.querySelector('.header');
const hero = document.querySelector('[data-hero]');
if (hero) {
  new IntersectionObserver(([entry]) => {
    header.classList.toggle('is-solid', !entry.isIntersecting);
  }, { rootMargin: '-80px 0px 0px 0px' }).observe(hero);
}

// Fade-in cards on scroll
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

// "What I bring": hover/click a service to show its description
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

// Testimonial: words light up as you scroll through it
const quote = document.querySelector('[data-words]');
if (quote) {
  quote.innerHTML = quote.textContent
    .trim()
    .split(/\s+/)
    .map((word) => `<span class="w">${word}</span>`)
    .join(' ');
  const words = quote.querySelectorAll('.w');

  function updateQuote() {
    const rect = quote.getBoundingClientRect();
    const start = window.innerHeight * 0.85;
    const end = window.innerHeight * 0.35;
    const progress = Math.min(Math.max((start - rect.top) / (start - end + rect.height * 0.5), 0), 1);
    const lit = Math.round(progress * words.length);
    words.forEach((w, i) => w.classList.toggle('is-on', i < lit));
  }
  window.addEventListener('scroll', updateQuote, { passive: true });
  updateQuote();
}

// Clients marquee: duplicate the logo set so the loop is seamless
const track = document.querySelector('.clients__track');
if (track) {
  const copy = track.querySelector('.clients__set').cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  track.appendChild(copy);
}

// About: hovering a footnote marker highlights its note
document.querySelectorAll('.fn').forEach((marker) => {
  const note = document.getElementById(marker.getAttribute('aria-describedby'));
  if (!note) return;
  const on = () => note.classList.add('is-on');
  const off = () => note.classList.remove('is-on');
  marker.addEventListener('mouseenter', on);
  marker.addEventListener('mouseleave', off);
  marker.addEventListener('focus', on);
  marker.addEventListener('blur', off);
});
