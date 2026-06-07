/* ============================================================
   0. Supabase client — loaded lazily from a CDN.
   Wrapped so that if the import fails (offline, CDN blocked,
   placeholder credentials, etc.) the rest of the page — countdown,
   animations, form UI — keeps working; only the backend-dependent
   bits (submitting an RSVP, the live lantern wall) degrade gracefully.
   ============================================================ */
let supabasePromise = null;
function getSupabase() {
  if (!supabasePromise) {
    supabasePromise = (async () => {
      const [{ createClient }, { SUPABASE_URL, SUPABASE_ANON_KEY }] = await Promise.all([
        import('https://esm.sh/@supabase/supabase-js@2'),
        import('./supabase-config.js'),
      ]);
      return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    })().catch((err) => {
      console.error('Supabase client unavailable:', err);
      return null;
    });
  }
  return supabasePromise;
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   1. Opening sequence — marigold "toran" curtains part, then
   the couple's names resolve into focus like ink settling.
   ============================================================ */
(function openingSequence() {
  const curtain = document.getElementById('curtain');
  const inkEls = Array.from(document.querySelectorAll('.ink-reveal[data-stagger]'));

  function revealNames() {
    inkEls.forEach((el) => {
      const idx = parseInt(el.dataset.stagger, 10) || 0;
      setTimeout(() => el.classList.add('is-visible'), idx * 240);
    });
  }

  if (!curtain || prefersReducedMotion) {
    if (curtain) curtain.classList.add('is-hidden');
    revealNames();
    return;
  }

  // Let the page settle for a beat, then part the curtains
  setTimeout(() => curtain.classList.add('is-open'), 550);
  setTimeout(() => {
    curtain.classList.add('is-hidden');
    revealNames();
  }, 1850);
})();

/* ============================================================
   2. Generative rangoli mandala — drawn live with concentric
   rings of hand-placed petals using polar geometry, then
   "inked on" with an animated stroke-draw reveal.
   ============================================================ */
(function buildRangoli() {
  const svg = document.getElementById('rangoli');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const cx = 300;
  const cy = 300;

  const rings = [
    { radius: 60, count: 8, len: 42, width: 15, rotate: 0 },
    { radius: 116, count: 12, len: 56, width: 19, rotate: 15 },
    { radius: 176, count: 16, len: 62, width: 21, rotate: 0 },
    { radius: 238, count: 22, len: 50, width: 16, rotate: 8 },
  ];

  const drawables = [];

  function petalPath(len, width) {
    const half = width / 2;
    return `M0,0 C ${-half},${(-len * 0.55).toFixed(1)} ${(-half * 0.6).toFixed(1)},${-len} 0,${-len} ` +
           `C ${(half * 0.6).toFixed(1)},${-len} ${half},${(-len * 0.55).toFixed(1)} 0,0 Z`;
  }

  rings.forEach((ring) => {
    for (let i = 0; i < ring.count; i++) {
      const angle = (360 / ring.count) * i + ring.rotate;
      const rad = (angle * Math.PI) / 180;
      const x = cx + ring.radius * Math.cos(rad);
      const y = cy + ring.radius * Math.sin(rad);

      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', petalPath(ring.len, ring.width));
      path.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(angle + 90).toFixed(1)})`);
      path.setAttribute('class', 'rangoli__petal');
      svg.appendChild(path);
      drawables.push({ el: path, kind: 'path' });
    }

    const ring2 = document.createElementNS(NS, 'circle');
    ring2.setAttribute('cx', cx);
    ring2.setAttribute('cy', cy);
    ring2.setAttribute('r', Math.max(20, ring.radius - ring.len * 0.2));
    ring2.setAttribute('class', 'rangoli__ring');
    svg.appendChild(ring2);
    drawables.push({ el: ring2, kind: 'fade' });
  });

  for (let i = 0; i < 8; i++) {
    const angle = 45 * i;
    const rad = (angle * Math.PI) / 180;
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', (cx + 26 * Math.cos(rad)).toFixed(1));
    dot.setAttribute('cy', (cy + 26 * Math.sin(rad)).toFixed(1));
    dot.setAttribute('r', 5.5);
    dot.setAttribute('class', 'rangoli__dot');
    svg.appendChild(dot);
    drawables.push({ el: dot, kind: 'fade' });
  }

  if (prefersReducedMotion) return; // leave fully drawn, skip the animated reveal

  drawables.forEach(({ el, kind }, i) => {
    const delay = (i % 46) * 28;
    if (kind === 'path') {
      const length = el.getTotalLength();
      el.style.strokeDasharray = String(length);
      el.style.strokeDashoffset = String(length);
      el.style.opacity = '0';
      el.style.transition = `stroke-dashoffset 1.5s ease ${delay}ms, opacity 0.6s ease ${delay}ms`;
      requestAnimationFrame(() => {
        el.style.strokeDashoffset = '0';
        el.style.opacity = '1';
      });
    } else {
      el.style.opacity = '0';
      el.style.transition = `opacity 1.3s ease ${delay}ms`;
      requestAnimationFrame(() => { el.style.opacity = '1'; });
    }
  });
})();

/* ============================================================
   3. Floating petals (decorative background)
   ============================================================ */
(function petals() {
  const field = document.getElementById('petalField');
  if (!field) return;
  const glyphs = ['🌸', '🌺', '🌼', '🪷'];
  const COUNT = window.matchMedia('(max-width: 640px)').matches ? 8 : 15;

  for (let i = 0; i < COUNT; i++) {
    const petal = document.createElement('span');
    petal.className = 'petal';
    petal.textContent = glyphs[i % glyphs.length];
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.fontSize = `${1 + Math.random() * 1.4}rem`;
    petal.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    petal.style.animationDuration = `${14 + Math.random() * 16}s`;
    petal.style.animationDelay = `-${Math.random() * 25}s`;
    field.appendChild(petal);
  }
})();

/* ============================================================
   4. Reveal-on-scroll for content blocks
   ============================================================ */
(function revealOnScroll() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  );
  items.forEach((el) => observer.observe(el));
})();

/* ============================================================
   5. The Day Journey — the backdrop drifts from dawn light,
   through daylight & a golden-hour glow, into a starlit night,
   smoothly cross-fading as the visitor scrolls past each
   chapter (mapped via each section's [data-scene] attribute).
   ============================================================ */
(function dayJourney() {
  const root = document.documentElement;
  const sceneEls = Array.from(document.querySelectorAll('[data-scene]'));
  if (!sceneEls.length) return;

  const SCENES = {
    dawn:     { top: [253, 242, 220], mid: [251, 224, 192], bottom: [246, 207, 158], stars: 0 },
    daylight: { top: [255, 248, 236], mid: [255, 233, 207], bottom: [243, 201, 168], stars: 0 },
    golden:   { top: [246, 193, 120], mid: [233, 140, 106], bottom: [182, 83, 106], stars: 0.18 },
    night:    { top: [90, 24, 38],    mid: [56, 16, 28],    bottom: [26, 13, 24],   stars: 1 },
  };

  const current = {
    top: [...SCENES.dawn.top],
    mid: [...SCENES.dawn.mid],
    bottom: [...SCENES.dawn.bottom],
    stars: 0,
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpColor(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgb(c) { return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`; }

  function activeScene() {
    const viewportCenter = window.innerHeight * 0.45;
    let closest = sceneEls[0];
    let closestDist = Infinity;
    for (const el of sceneEls) {
      const rect = el.getBoundingClientRect();
      const dist = Math.abs((rect.top + rect.height / 2) - viewportCenter);
      if (dist < closestDist) { closestDist = dist; closest = el; }
    }
    return SCENES[closest.dataset.scene] || SCENES.dawn;
  }

  const factor = prefersReducedMotion ? 1 : 0.05;

  function tick() {
    const target = activeScene();
    current.top = lerpColor(current.top, target.top, factor);
    current.mid = lerpColor(current.mid, target.mid, factor);
    current.bottom = lerpColor(current.bottom, target.bottom, factor);
    current.stars = lerp(current.stars, target.stars, factor);

    root.style.setProperty('--j-top', rgb(current.top));
    root.style.setProperty('--j-mid', rgb(current.mid));
    root.style.setProperty('--j-bottom', rgb(current.bottom));
    root.style.setProperty('--stars-opacity', current.stars.toFixed(3));

    requestAnimationFrame(tick);
  }
  tick();

  // Generate a starfield once — its container's opacity is tied to --stars-opacity
  const starField = document.getElementById('journeyStars');
  if (starField) {
    const STAR_COUNT = window.matchMedia('(max-width: 640px)').matches ? 35 : 70;
    for (let i = 0; i < STAR_COUNT; i++) {
      const star = document.createElement('span');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 70}%`;
      star.style.animationDelay = `-${Math.random() * 4}s`;
      star.style.animationDuration = `${3 + Math.random() * 4}s`;
      starField.appendChild(star);
    }
  }
})();

/* ============================================================
   6. Parallax ornaments — decorative motifs drift at their own
   pace as you scroll, adding a sense of depth to each chapter.
   ============================================================ */
(function parallax() {
  const els = Array.from(document.querySelectorAll('.parallax-motif'));
  if (!els.length || prefersReducedMotion) return;

  let ticking = false;
  function update() {
    const scrollY = window.scrollY;
    els.forEach((el) => {
      const depth = parseFloat(el.dataset.depth || '0.1');
      el.style.transform = `translateY(${(scrollY * depth * -1).toFixed(1)}px)`;
    });
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
})();

/* ============================================================
   7. Magnetic, jewel-like cards — they tilt toward the cursor
   and catch a soft sheen of light, like candlelight on glass.
   ============================================================ */
(function magneticCards() {
  if (prefersReducedMotion) return;
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--rx', `${((0.5 - py) * 12).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${((px - 0.5) * 14).toFixed(2)}deg`);
      card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '50%');
    });
  });
})();

/* ============================================================
   8. Countdown to the big day
   Wedding: 19 July 2026, 5:00 PM (America/Toronto, EDT = UTC-04:00)
   ============================================================ */
(function countdown() {
  const WEDDING_DATE = new Date('2026-07-19T17:00:00-04:00').getTime();
  const els = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins: document.getElementById('cd-mins'),
    secs: document.getElementById('cd-secs'),
  };
  if (!els.days) return;

  function tick() {
    const diff = WEDDING_DATE - Date.now();
    const pad = (n) => String(Math.max(n, 0)).padStart(2, '0');
    if (diff <= 0) {
      els.days.textContent = els.hours.textContent = els.mins.textContent = els.secs.textContent = '00';
      return;
    }
    const totalSeconds = Math.floor(diff / 1000);
    els.days.textContent = pad(Math.floor(totalSeconds / 86400));
    els.hours.textContent = pad(Math.floor((totalSeconds % 86400) / 3600));
    els.mins.textContent = pad(Math.floor((totalSeconds % 3600) / 60));
    els.secs.textContent = pad(totalSeconds % 60);
  }
  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   9. RSVP form behaviour
   ============================================================ */
const form = document.getElementById('rsvpForm');
const attendingFields = document.getElementById('attendingFields');
const guestCountSelect = document.getElementById('guestCount');
const guestCountSpecify = document.getElementById('guestCountSpecify');
const foodCountSelect = document.getElementById('foodCount');
const foodCountSpecify = document.getElementById('foodCountSpecify');
const submitBtn = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

const successOverlay = document.getElementById('successOverlay');
const successName = document.getElementById('successName');
const successMessage = document.getElementById('successMessage');
document.getElementById('successClose')?.addEventListener('click', () => {
  successOverlay.hidden = true;
});

form?.querySelectorAll('input[name="attending"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const isAttending = radio.value === 'yes' && radio.checked;
    attendingFields.hidden = !isAttending;
    guestCountSelect.required = isAttending;
    foodCountSelect.required = isAttending;
    if (!isAttending) {
      guestCountSelect.value = '';
      foodCountSelect.value = '';
      guestCountSpecify.hidden = true;
      foodCountSpecify.hidden = true;
      guestCountSpecify.value = '';
      foodCountSpecify.value = '';
    }
  });
});

function wireSpecifyInput(select, specifyInput) {
  select.addEventListener('change', () => {
    const needsSpecify = select.value === 'more';
    specifyInput.hidden = !needsSpecify;
    specifyInput.required = needsSpecify;
    if (!needsSpecify) specifyInput.value = '';
  });
}
if (guestCountSelect) wireSpecifyInput(guestCountSelect, guestCountSpecify);
if (foodCountSelect) wireSpecifyInput(foodCountSelect, foodCountSpecify);

function setStatus(message, state) {
  formStatus.textContent = message;
  formStatus.dataset.state = state || '';
}

function numericFromSelect(select, specifyInput) {
  if (select.value === 'more') {
    const parsed = parseInt(specifyInput.value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = parseInt(select.value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('', '');

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const attending = form.querySelector('input[name="attending"]:checked')?.value === 'yes';
  const guestName = document.getElementById('guestName').value.trim();
  const contactNumber = document.getElementById('contactNumber').value.trim();
  const message = document.getElementById('message').value.trim();

  const payload = {
    guest_name: guestName,
    attending,
    contact_number: contactNumber,
    message: message || null,
    guest_count: attending ? numericFromSelect(guestCountSelect, guestCountSpecify) : null,
    guest_count_note: attending && guestCountSelect.value === 'more' ? guestCountSpecify.value.trim() : null,
    food_preference_count: attending ? numericFromSelect(foodCountSelect, foodCountSpecify) : null,
    food_preference_note: attending && foodCountSelect.value === 'more' ? foodCountSpecify.value.trim() : null,
  };

  submitBtn.disabled = true;
  submitBtn.classList.add('is-loading');
  setStatus('Lighting your lantern…', '');

  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error('Backend is not configured yet');

    const { error } = await supabase.from('rsvps').insert(payload);
    if (error) throw error;

    form.reset();
    attendingFields.hidden = true;
    guestCountSpecify.hidden = true;
    foodCountSpecify.hidden = true;

    setStatus('Thank you! Your RSVP has been received. 🪔', 'success');
    showSuccess(guestName, attending);
    fireConfetti();
  } catch (err) {
    console.error('RSVP submission failed:', err);
    setStatus('Something went wrong sending your RSVP — please try again, or message us directly.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('is-loading');
  }
});

function showSuccess(name, attending) {
  successName.textContent = name || 'friend';
  successMessage.textContent = attending
    ? "Your lantern now glows on our Wall of Wishes. We can't wait to celebrate with you! 🪔"
    : "Your lantern now glows on our Wall of Wishes. We'll miss you, but thank you for letting us know — sending love your way!";
  successOverlay.hidden = false;
}

/* Lightweight confetti burst — petals & sparks, no external library */
function fireConfetti() {
  const glyphs = ['🪔', '🌸', '✨', '🌼', '💛'];
  const layer = document.createElement('div');
  layer.style.position = 'fixed';
  layer.style.inset = '0';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = '60';
  document.body.appendChild(layer);

  for (let i = 0; i < 26; i++) {
    const piece = document.createElement('span');
    piece.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    piece.style.position = 'absolute';
    piece.style.left = `${50 + (Math.random() - 0.5) * 50}%`;
    piece.style.top = '40%';
    piece.style.fontSize = `${1 + Math.random() * 1.2}rem`;
    piece.style.opacity = '0';
    piece.style.transition = `transform ${1.1 + Math.random() * 0.9}s cubic-bezier(.21,.9,.4,1), opacity 0.4s ease`;
    layer.appendChild(piece);

    requestAnimationFrame(() => {
      const x = (Math.random() - 0.5) * 480;
      const y = -(120 + Math.random() * 280);
      const rot = (Math.random() - 0.5) * 540;
      piece.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg)`;
      piece.style.opacity = '1';
      setTimeout(() => { piece.style.opacity = '0'; }, 900);
    });
  }
  setTimeout(() => layer.remove(), 2400);
}

/* ============================================================
   10. Live Lantern Wall — public, privacy-safe RSVP feed.
   Reads only from the `lantern_wall` table, which exposes
   nothing but a guest's first name + whether they're attending.
   ============================================================ */
const lanternSky = document.getElementById('lanternSky');
const lanternCount = document.getElementById('lanternCount');
const seenLanternIds = new Set();
let bobDelayCounter = 0;

function firstName(fullName) {
  return (fullName || 'A guest').trim().split(/\s+/)[0];
}

function renderLantern(row, { animate } = { animate: false }) {
  if (!lanternSky || seenLanternIds.has(row.id)) return;
  seenLanternIds.add(row.id);

  const empty = lanternSky.querySelector('.lantern-sky__empty');
  if (empty) empty.remove();

  const lantern = document.createElement('div');
  lantern.className = `lantern${row.attending ? '' : ' lantern--declined'}`;
  lantern.style.setProperty('--bob-delay', `${(bobDelayCounter++ % 8) * -0.7}s`);
  if (!animate) lantern.style.animationName = 'lantern-bob';

  lantern.innerHTML = `
    <span class="lantern__glow" aria-hidden="true"></span>
    <span class="lantern__name">${escapeHtml(firstName(row.guest_name))}</span>
    <span class="lantern__status" aria-hidden="true">${row.attending ? '💛' : '🌙'}</span>
  `;
  lanternSky.appendChild(lantern);
  lanternCount.textContent = String(seenLanternIds.size);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadLanternWall() {
  if (!lanternSky) return;
  const supabase = await getSupabase();
  if (!supabase) {
    lanternSky.innerHTML = '<p class="lantern-sky__empty">The lanterns are warming up — check back soon ✨</p>';
    return;
  }

  const { data, error } = await supabase
    .from('lantern_wall')
    .select('id, guest_name, attending, created_at')
    .order('created_at', { ascending: true })
    .limit(500);

  if (error) {
    console.error('Could not load lantern wall:', error);
    lanternSky.innerHTML = '<p class="lantern-sky__empty">The lanterns are warming up — check back soon ✨</p>';
    return;
  }

  if (!data || data.length === 0) {
    lanternSky.innerHTML = '<p class="lantern-sky__empty">Be the first to light a lantern! 🪔</p>';
    lanternCount.textContent = '0';
    return;
  }

  data.forEach((row) => renderLantern(row, { animate: false }));
}

async function subscribeLanternWall() {
  const supabase = await getSupabase();
  if (!supabase) return;

  supabase
    .channel('lantern-wall-changes')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'lantern_wall' },
      (payload) => renderLantern(payload.new, { animate: true })
    )
    .subscribe();
}

loadLanternWall().then(subscribeLanternWall);
