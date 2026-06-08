/* ============================================================
   0. Supabase client — loaded lazily from a CDN.
   Wrapped so a failed import (offline, CDN blocked, placeholder
   credentials) never breaks the core experience — only the
   backend-dependent bits (RSVP submit, live lantern wall) degrade.
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
const html = document.documentElement;

function vibrate(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* no-op */ }
  }
}

const VENUE_NAME = 'Royal India Banquets';
const VENUE_ADDRESS = '31 Melanie Dr, Brampton, ON L6T 5H8';
const WEDDING_DATE = new Date('2026-07-19T17:00:00-04:00');

/* ============================================================
   0b. Personalized invite — reads a guest's name from the link
   (e.g. yoursite.com/?to=Aarav+Patel) and weaves it straight
   into the greeting, then pre-fills their RSVP name field.
   Falls back to the generic greeting when no name is present.
   Sets only textContent/value (never innerHTML), so a crafted
   query string can never inject markup.
   ============================================================ */
(function personalizeInvite() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('to') || params.get('guest') || params.get('name');
  if (!raw) return;

  const name = raw
    .trim()
    .slice(0, 60)
    .replace(/[^\p{L}\p{M}\s.'-]/gu, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  if (!name) return;

  const eyebrow = document.getElementById('heroEyebrow');
  if (eyebrow) {
    const nameSpan = document.createElement('span');
    nameSpan.className = 'hero__guest-name';
    nameSpan.textContent = name;
    eyebrow.replaceChildren(
      document.createTextNode('— dear '),
      nameSpan,
      document.createTextNode(', you are joyfully invited to —'),
    );
  }

  const guestNameField = document.getElementById('guestName');
  if (guestNameField && !guestNameField.value) {
    guestNameField.value = name;
  }
})();

/* ============================================================
   1. Firecracker burst — a short, dazzling shower of sparks
      that fires the instant the curtain parts. Pure canvas
      particles (gravity + fade), in the wedding's palette.
   ============================================================ */
function launchFireworks() {
  const canvas = document.getElementById('fireworks');
  if (!canvas) return;
  if (prefersReducedMotion) { canvas.remove(); return; }

  const ctx = canvas.getContext('2d');
  const colors = ['#d8a13a', '#f0962f', '#c2415a', '#f0d9ad', '#0e6e6e', '#fffaf2'];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0, height = 0;
  let particles = [];
  let running = true;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function burst(x, y, count) {
    const lead = colors[Math.floor(Math.random() * colors.length)];
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
      const speed = 2.2 + Math.random() * 3.6;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.011 + Math.random() * 0.013,
        color: Math.random() < 0.65 ? lead : colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 2,
        trail: [],
      });
    }
  }

  function tick() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 4) p.trail.shift();
      p.vy += 0.05;
      p.vx *= 0.992;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      ctx.globalAlpha = Math.max(p.life, 0) * 0.5;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.7;
      ctx.beginPath();
      p.trail.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    particles = particles.filter((p) => p.life > 0 && p.y < height + 40);
    requestAnimationFrame(tick);
  }
  tick();

  const launches = [
    { x: () => width * 0.26, y: () => height * 0.28, count: 50, delay: 0 },
    { x: () => width * 0.74, y: () => height * 0.22, count: 50, delay: 240 },
    { x: () => width * 0.5, y: () => height * 0.36, count: 64, delay: 480 },
    { x: () => width * 0.36, y: () => height * 0.18, count: 38, delay: 760 },
  ];
  launches.forEach(({ x, y, count, delay }) => {
    setTimeout(() => {
      burst(x(), y(), count);
      vibrate(16);
    }, delay);
  });

  setTimeout(() => canvas.classList.add('is-done'), 2500);
  setTimeout(() => {
    running = false;
    window.removeEventListener('resize', resize);
    canvas.remove();
  }, 3700);
}

/* ============================================================
   2. Curtain — a brief opening flourish that parts to reveal
      the hero (and sets off the firecracker burst), then
      steps fully out of the way.
   ============================================================ */
(function curtainSequence() {
  const curtain = document.getElementById('curtain');
  if (!curtain) return;

  if (prefersReducedMotion) {
    html.classList.add('curtain-gone');
    document.getElementById('fireworks')?.remove();
    return;
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      html.classList.add('curtain-open');
      vibrate(12);
      launchFireworks();
    }, 420);
    setTimeout(() => {
      html.classList.add('curtain-gone');
    }, 1700);
  });
})();

/* ============================================================
   3. Generative rangoli — builds a unique concentric mandala
      out of rings + petal clusters behind the hero names.
   ============================================================ */
(function buildRangoli() {
  const svg = document.getElementById('rangoli');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const cx = 300, cy = 300;
  const ringRadii = [70, 120, 175, 235, 285];

  ringRadii.forEach((r) => {
    const circle = document.createElementNS(NS, 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    svg.appendChild(circle);
  });

  ringRadii.slice(1).forEach((r, ringIndex) => {
    const count = 8 + ringIndex * 4;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const size = 9 - ringIndex;
      if (i % 2 === 0) {
        const petal = document.createElementNS(NS, 'path');
        const dx = Math.cos(angle) * size * 1.6;
        const dy = Math.sin(angle) * size * 1.6;
        petal.setAttribute(
          'd',
          `M ${x - dy} ${y + dx} C ${x + size * 2} ${y + size * 2} ${x + size * 2} ${y - size * 2} ${x + dy} ${y - dx} Z`
        );
        petal.setAttribute('class', 'rangoli-petal');
        svg.appendChild(petal);
      } else {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', size / 2.4);
        dot.setAttribute('class', 'rangoli-petal');
        svg.appendChild(dot);
      }
    }
  });
})();

/* ============================================================
   4. Ambience — a continuous slow drift of paisleys, peacock
      feathers, marigolds and petals across the whole page.
   ============================================================ */
(function seedAmbience() {
  const field = document.getElementById('ambience');
  if (!field || prefersReducedMotion) return;
  const NS = 'http://www.w3.org/2000/svg';
  const motifs = [
    { symbol: '#motif-paisley', cls: 'ambience__item--paisley', w: 30, h: 45 },
    { symbol: '#motif-feather', cls: 'ambience__item--feather', w: 22, h: 60 },
    { symbol: '#motif-marigold', cls: 'ambience__item--marigold', w: 26, h: 26 },
  ];
  const COUNT = 16;

  for (let i = 0; i < COUNT; i += 1) {
    const useEmoji = i % 4 === 3;
    let el;
    if (useEmoji) {
      el = document.createElement('span');
      el.className = 'ambience__item ambience__item--petal';
      el.style.width = '10px';
      el.style.height = '10px';
    } else {
      const m = motifs[i % motifs.length];
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 150');
      svg.setAttribute('width', m.w);
      svg.setAttribute('height', m.h);
      svg.setAttribute('aria-hidden', 'true');
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', m.symbol);
      svg.appendChild(use);
      svg.classList.add('ambience__item', m.cls);
      el = svg;
    }
    const left = Math.random() * 100;
    const duration = 26 + Math.random() * 30;
    const delay = -(Math.random() * duration);
    const driftX = (Math.random() - 0.5) * 220;
    const driftRot = 120 + Math.random() * 240;
    const opacity = 0.25 + Math.random() * 0.4;

    el.style.left = `${left}%`;
    el.style.setProperty('--drift-x', `${driftX}px`);
    el.style.setProperty('--drift-rot', `${driftRot}deg`);
    el.style.setProperty('--drift-opacity', opacity.toFixed(2));
    el.style.animationDuration = `${duration}s, ${duration}s`;
    el.style.animationDelay = `${delay}s, ${delay}s`;
    field.appendChild(el);
  }
})();

/* ============================================================
   5. Hero scroll cue — nudge the page toward the story.
   ============================================================ */
(function scrollCue() {
  const cue = document.getElementById('scrollCue');
  if (!cue) return;
  cue.addEventListener('click', () => {
    document.getElementById('story')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

/* ============================================================
   6. Countdown — live ticking units in the hero.
   ============================================================ */
(function countdown() {
  const days = document.getElementById('cd-days');
  const hours = document.getElementById('cd-hours');
  const mins = document.getElementById('cd-mins');
  const secs = document.getElementById('cd-secs');
  if (!days || !hours || !mins || !secs) return;

  function pad(n) { return String(Math.max(0, n)).padStart(2, '0'); }

  function tick() {
    const diff = WEDDING_DATE.getTime() - Date.now();
    if (diff <= 0) {
      days.textContent = hours.textContent = mins.textContent = secs.textContent = '00';
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    days.textContent = pad(d);
    hours.textContent = pad(h);
    mins.textContent = pad(m);
    secs.textContent = pad(s);
  }

  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   7. Scroll reveal — IntersectionObserver toggles `.is-visible`
      on every `.reveal` and `[data-vignette]` element so CSS
      can choreograph the illustrated story as it scrolls in.
   ============================================================ */
(function scrollReveal() {
  const targets = document.querySelectorAll('.reveal, [data-vignette]');
  if (!targets.length) return;

  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.28, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el) => observer.observe(el));
})();

/* ============================================================
   8. Flip cards — tap to flip, with a haptic tick; native
      action buttons on the back faces wired to real behaviour.
   ============================================================ */
(function flipCards() {
  const cards = document.querySelectorAll('.flip-card');
  cards.forEach((card) => {
    card.addEventListener('click', (event) => {
      if (event.target.closest('[data-jump], #addToCalendarBtn, #directionsBtn')) return;
      const expanded = card.getAttribute('aria-expanded') === 'true';
      card.setAttribute('aria-expanded', String(!expanded));
      vibrate(expanded ? 8 : [10, 30, 10]);
    });
  });

  document.querySelectorAll('[data-jump]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const target = document.querySelector(btn.dataset.jump);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ============================================================
   9. Add to calendar — generates a downloadable .ics file.
   ============================================================ */
(function addToCalendar() {
  const btn = document.getElementById('addToCalendarBtn');
  if (!btn) return;
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dhwani and Vraj//Wedding//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', 'UID:dhwani-vraj-wedding-19july2026@invite',
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      'DTSTART:20260719T210000Z', 'DTEND:20260720T030000Z',
      'SUMMARY:Dhwani \\& Vraj\\\'s Wedding',
      `DESCRIPTION:Join us as we celebrate the wedding of Dhwani \\& Vraj at ${VENUE_NAME}\\, ${VENUE_ADDRESS}. Doors open 5:00 PM.`,
      `LOCATION:${VENUE_NAME}\\, ${VENUE_ADDRESS}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dhwani-and-vraj-wedding.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    vibrate([10, 40, 10]);
  });
})();

/* ============================================================
   10. Directions — opens the venue in the guest's maps app.
   ============================================================ */
(function directions() {
  const btn = document.getElementById('directionsBtn');
  if (!btn) return;
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    const destination = encodeURIComponent(`${VENUE_NAME}, ${VENUE_ADDRESS}`);
    const isAppleDevice = /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    const url = isAppleDevice
      ? `https://maps.apple.com/?daddr=${destination}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
    window.open(url, '_blank', 'noopener');
    vibrate(10);
  });
})();

/* ============================================================
   11. RSVP form — progressive disclosure, reactive lamp that
       brightens as required fields are completed, Supabase
       submission, success overlay + confetti.
   ============================================================ */
(function rsvpForm() {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  const nameInput = document.getElementById('guestName');
  const attendingRadios = form.querySelectorAll('input[name="attending"]');
  const attendingFields = document.getElementById('attendingFields');
  const guestCount = document.getElementById('guestCount');
  const guestCountSpecify = document.getElementById('guestCountSpecify');
  const foodCount = document.getElementById('foodCount');
  const foodCountSpecify = document.getElementById('foodCountSpecify');
  const contactNumber = document.getElementById('contactNumber');
  const message = document.getElementById('message');
  const status = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  const lampFlame = document.querySelector('#rsvpLamp .diya-flame');
  const lampCaption = document.getElementById('rsvpLampCaption');
  const captions = [
    'Fill in the details below — your lantern is waiting to be lit 🪔',
    'A little spark — keep going ✨',
    'It’s starting to glow…',
    'Almost bright enough to light the way!',
    'Your lantern is ready to rise 🪔',
  ];

  function wireSelectSpecify(select, specifyInput) {
    select?.addEventListener('change', () => {
      const needsSpecify = select.value === 'more';
      specifyInput.hidden = !needsSpecify;
      if (!needsSpecify) specifyInput.value = '';
      updateLamp();
    });
  }
  wireSelectSpecify(guestCount, guestCountSpecify);
  wireSelectSpecify(foodCount, foodCountSpecify);

  attendingRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      const attending = form.querySelector('input[name="attending"]:checked')?.value;
      attendingFields.hidden = attending !== 'yes';
      vibrate(8);
      updateLamp();
    });
  });

  function requiredFields() {
    return [nameInput, contactNumber, ...attendingRadios];
  }

  function completionRatio() {
    const fields = requiredFields();
    let filled = 0;
    if (nameInput?.value.trim()) filled += 1;
    if (contactNumber?.value.trim()) filled += 1;
    if (form.querySelector('input[name="attending"]:checked')) filled += 1;
    return filled / 3;
  }

  function updateLamp() {
    if (!lampFlame) return;
    const ratio = completionRatio();
    const scale = 0.3 + ratio * 0.7;
    const opacity = 0.18 + ratio * 0.82;
    lampFlame.style.transform = `scaleY(${scale.toFixed(2)})`;
    lampFlame.style.opacity = opacity.toFixed(2);
    if (ratio >= 1) {
      lampFlame.style.animation = 'flame-flicker 1.8s ease-in-out infinite';
    } else {
      lampFlame.style.animation = 'none';
    }
    const idx = Math.min(captions.length - 1, Math.round(ratio * (captions.length - 1)));
    if (lampCaption) lampCaption.textContent = captions[idx];
  }

  [nameInput, contactNumber].forEach((input) => {
    input?.addEventListener('input', updateLamp);
  });
  updateLamp();

  function setStatus(text, kind) {
    status.textContent = text;
    status.classList.remove('is-error', 'is-success');
    if (kind) status.classList.add(kind);
  }

  function fireConfetti() {
    if (prefersReducedMotion) return;
    const colors = ['#d8a13a', '#c2415a', '#f0962f', '#0e6e6e', '#fffaf2'];
    for (let i = 0; i < 28; i += 1) {
      const piece = document.createElement('span');
      const size = 6 + Math.random() * 8;
      Object.assign(piece.style, {
        position: 'fixed',
        zIndex: '120',
        left: `${50 + (Math.random() - 0.5) * 60}%`,
        top: '38%',
        width: `${size}px`,
        height: `${size * 0.4}px`,
        background: colors[i % colors.length],
        borderRadius: '2px',
        pointerEvents: 'none',
        transform: `rotate(${Math.random() * 360}deg)`,
        transition: 'transform 1.4s cubic-bezier(.2,.7,.2,1), top 1.4s cubic-bezier(.2,.7,.2,1), opacity 1.4s ease',
        opacity: '1',
      });
      document.body.appendChild(piece);
      requestAnimationFrame(() => {
        piece.style.top = `${70 + Math.random() * 25}%`;
        piece.style.transform = `translateX(${(Math.random() - 0.5) * 220}px) rotate(${Math.random() * 720}deg)`;
        piece.style.opacity = '0';
      });
      setTimeout(() => piece.remove(), 1600);
    }
  }

  function showSuccess(name, attending) {
    const overlay = document.getElementById('successOverlay');
    const successName = document.getElementById('successName');
    const successMessage = document.getElementById('successMessage');
    if (!overlay) return;
    successName.textContent = name || 'friend';
    successMessage.textContent = attending === 'yes'
      ? 'Your lantern just rose into our wall of wishes — we cannot wait to celebrate with you!'
      : 'Thank you for letting us know — you’ll be in our hearts on the big day.';
    overlay.hidden = false;
    fireConfetti();
    vibrate([10, 50, 10, 50, 20]);
    document.getElementById('successClose')?.addEventListener('click', () => { overlay.hidden = true; }, { once: true });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const attending = form.querySelector('input[name="attending"]:checked')?.value;
    const contact = contactNumber.value.trim();

    if (!name || !attending || !contact) {
      setStatus('Please fill in your name, attendance, and contact number.', 'is-error');
      vibrate([20, 30, 20]);
      return;
    }

    let guests = null;
    let meals = null;
    if (attending === 'yes') {
      guests = guestCount.value === 'more' ? guestCountSpecify.value : guestCount.value;
      meals = foodCount.value === 'more' ? foodCountSpecify.value : foodCount.value;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    setStatus('Lighting your lantern…');

    const payload = {
      guest_name: name,
      attending: attending === 'yes',
      guest_count: guests ? Number(guests) : null,
      food_count: meals ? Number(meals) : null,
      contact_number: contact,
      message: message.value.trim() || null,
    };

    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error('offline');
      const { error } = await supabase.from('rsvps').insert(payload);
      if (error) throw error;
      setStatus('Your RSVP has been received — thank you! 🪔', 'is-success');
      showSuccess(name, attending);
      form.reset();
      attendingFields.hidden = true;
      guestCountSpecify.hidden = true;
      foodCountSpecify.hidden = true;
      updateLamp();
    } catch (err) {
      console.error('RSVP submission failed:', err);
      setStatus('Something went wrong sending your RSVP. Please try again in a moment, or reach out to us directly.', 'is-error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  });
})();

/* ============================================================
   12. Lantern Wall — floating lanterns with gentle randomized
       drift/sway "physics", a live count, realtime updates from
       Supabase, and tap-to-reveal wish popovers.
   ============================================================ */
(function lanternWall() {
  const field = document.getElementById('lanternField');
  const countEl = document.getElementById('lanternCount');
  const sky = document.getElementById('lanternSky');
  const wish = document.getElementById('lanternWish');
  const wishName = document.getElementById('lanternWishName');
  const wishText = document.getElementById('lanternWishText');
  const wishClose = document.getElementById('lanternWishClose');
  if (!field || !countEl) return;

  const lanternColors = ['#f0962f', '#c2415a', '#d8a13a', '#0e6e6e'];
  const seen = new Set();
  let total = 0;

  function firstName(fullName) {
    return (fullName || '').trim().split(/\s+/)[0] || 'A guest';
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function openWish(name, text) {
    if (!wish) return;
    wishName.textContent = `${firstName(name)}'s wish`;
    wishText.textContent = text || 'is wishing the happy couple a lifetime of love and laughter 🪔';
    wish.hidden = false;
    requestAnimationFrame(() => wish.classList.add('is-open'));
    vibrate(8);
  }
  function closeWish() {
    wish?.classList.remove('is-open');
    setTimeout(() => { if (wish) wish.hidden = true; }, 450);
  }
  wishClose?.addEventListener('click', closeWish);
  wish?.addEventListener('click', (e) => { if (e.target === wish) closeWish(); });

  function renderLantern(row) {
    if (seen.has(row.id)) return;
    seen.add(row.id);

    const empty = field.querySelector('.lantern-field__empty');
    if (empty) empty.remove();

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lantern';
    btn.setAttribute('aria-label', `Read ${firstName(row.guest_name)}’s lantern wish`);

    const color = lanternColors[total % lanternColors.length];
    const floatDur = 5 + Math.random() * 4;
    const swayDur = 3.5 + Math.random() * 3;
    const swayAmount = 10 + Math.random() * 18;
    btn.style.setProperty('--lantern-color', color);
    btn.style.setProperty('--lantern-glow', color + 'aa');
    btn.style.setProperty('--float-dur', `${floatDur.toFixed(2)}s`);
    btn.style.setProperty('--sway-dur', `${swayDur.toFixed(2)}s`);
    btn.style.setProperty('--sway-amount', `${swayAmount.toFixed(0)}px`);
    btn.style.setProperty('--float-delay', `-${(Math.random() * floatDur).toFixed(2)}s`);
    btn.style.setProperty('--sway-delay', `-${(Math.random() * swayDur).toFixed(2)}s`);

    btn.innerHTML = `
      <span class="lantern__body"><span class="lantern__cap"></span><span class="lantern__base"></span></span>
      <span class="lantern__name">${escapeHtml(firstName(row.guest_name))}</span>
    `;
    btn.addEventListener('click', () => openWish(row.guest_name, row.wish));

    field.appendChild(btn);
    total += 1;
    countEl.textContent = String(total);
  }

  function scatterStars() {
    if (!sky || prefersReducedMotion) return;
    for (let i = 0; i < 40; i += 1) {
      const star = document.createElement('span');
      star.className = 'lantern-wall__star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 70}%`;
      star.style.animationDuration = `${2 + Math.random() * 4}s`;
      star.style.animationDelay = `-${Math.random() * 4}s`;
      sky.appendChild(star);
    }
  }
  scatterStars();

  async function loadLanternWall() {
    try {
      const supabase = await getSupabase();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('lantern_wall')
        .select('id, guest_name, wish, created_at')
        .order('created_at', { ascending: true })
        .limit(120);
      if (error) throw error;
      (data || []).forEach(renderLantern);
    } catch (err) {
      console.error('Could not load lantern wall:', err);
    }
  }

  function subscribeLanternWall() {
    getSupabase().then((supabase) => {
      if (!supabase) return;
      supabase
        .channel('lantern_wall_inserts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lantern_wall' }, (payload) => {
          renderLantern(payload.new);
        })
        .subscribe();
    });
  }

  loadLanternWall();
  subscribeLanternWall();
})();

/* ============================================================
   13. Share & footer back-to-top niceties.
   ============================================================ */
(function shareInvite() {
  const link = document.querySelector('.footer__back');
  link?.addEventListener('click', (event) => {
    event.preventDefault();
    document.getElementById('top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
