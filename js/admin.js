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

const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginStatus = document.getElementById('loginStatus');
const signedInAs = document.getElementById('signedInAs');
const signOutBtn = document.getElementById('signOutBtn');
const exportBtn = document.getElementById('exportBtn');
const statsEl = document.getElementById('stats');
const rsvpBody = document.getElementById('rsvpBody');

let currentRows = [];

function setLoginStatus(message, state) {
  loginStatus.textContent = message;
  loginStatus.dataset.state = state || '';
}

async function showDashboardForSession(session) {
  loginView.style.display = 'none';
  dashboardView.hidden = false;
  dashboardView.style.display = 'block';
  signedInAs.textContent = `Signed in as ${session.user.email}`;
  await loadResponses();
}

function showLogin() {
  dashboardView.hidden = true;
  dashboardView.style.display = 'none';
  loginView.style.display = 'flex';
}

// Restore existing session on load
const supabaseInit = await getSupabase();
if (!supabaseInit) {
  setLoginStatus('Could not reach the backend — check your connection and try again.', 'error');
} else {
  const { data: { session: existingSession } } = await supabaseInit.auth.getSession();
  if (existingSession) {
    await showDashboardForSession(existingSession);
  }

  supabaseInit.auth.onAuthStateChange((_event, session) => {
    if (session) showDashboardForSession(session);
    else showLogin();
  });
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoginStatus('Signing in…', '');
  loginBtn.disabled = true;

  const supabase = await getSupabase();
  if (!supabase) {
    loginBtn.disabled = false;
    setLoginStatus('Could not reach the backend — check your connection and try again.', 'error');
    return;
  }

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  loginBtn.disabled = false;
  if (error) {
    setLoginStatus(error.message || 'Could not sign in. Check your email and password.', 'error');
    return;
  }
  setLoginStatus('Welcome back! 🪔', 'success');
  await showDashboardForSession(data.session);
});

signOutBtn.addEventListener('click', async () => {
  const supabase = await getSupabase();
  if (supabase) await supabase.auth.signOut();
  loginForm.reset();
  setLoginStatus('', '');
  showLogin();
});

async function loadResponses() {
  rsvpBody.innerHTML = '<tr><td colspan="7" class="muted">Loading responses…</td></tr>';

  const supabase = await getSupabase();
  if (!supabase) {
    rsvpBody.innerHTML = '<tr><td colspan="7" class="muted">Could not reach the backend — check your connection and try again.</td></tr>';
    return;
  }

  const { data, error } = await supabase
    .from('rsvps')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    rsvpBody.innerHTML = `<tr><td colspan="7" class="muted">Could not load responses: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  currentRows = data || [];
  renderStats(currentRows);
  renderTable(currentRows);
}

function renderStats(rows) {
  const attending = rows.filter((r) => r.attending);
  const declined = rows.filter((r) => !r.attending);
  const totalGuests = attending.reduce((sum, r) => sum + (r.guest_count || 0), 0);
  const totalSwaminarayan = attending.reduce((sum, r) => sum + (r.food_count || 0), 0);

  const cards = [
    { label: 'Total responses', value: rows.length },
    { label: 'Attending', value: attending.length },
    { label: 'Not attending', value: declined.length },
    { label: 'Total guests coming', value: totalGuests },
    { label: 'Swaminarayan meals needed', value: totalSwaminarayan },
  ];

  statsEl.innerHTML = cards
    .map((c) => `<div class="stat"><strong>${c.value}</strong><span>${escapeHtml(c.label)}</span></div>`)
    .join('');
}

function renderTable(rows) {
  if (rows.length === 0) {
    rsvpBody.innerHTML = '<tr><td colspan="7" class="muted">No RSVPs yet — once guests respond, they\'ll appear here.</td></tr>';
    return;
  }

  rsvpBody.innerHTML = rows
    .map((r) => {
      const submitted = new Date(r.created_at).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const attendingPill = r.attending
        ? '<span class="pill pill--yes">Yes 😊</span>'
        : '<span class="pill pill--no">No 😔</span>';
      const guests = r.attending ? formatCount(r.guest_count) : '—';
      const food = r.attending ? formatCount(r.food_count) : '—';

      return `
        <tr>
          <td>${escapeHtml(submitted)}</td>
          <td>${escapeHtml(r.guest_name)}</td>
          <td>${attendingPill}</td>
          <td>${escapeHtml(guests)}</td>
          <td>${escapeHtml(food)}</td>
          <td>${escapeHtml(r.contact_number)}</td>
          <td>${r.message ? escapeHtml(r.message) : '<span class="muted">—</span>'}</td>
        </tr>
      `;
    })
    .join('');
}

function formatCount(count) {
  if (count === null || count === undefined) return '—';
  return String(count);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

exportBtn.addEventListener('click', () => {
  if (currentRows.length === 0) return;

  const headers = [
    'Submitted', 'Name', 'Attending', 'Guest Count',
    'Swaminarayan Meals', 'Contact Number', 'Message',
  ];
  const lines = [headers.join(',')];

  currentRows.forEach((r) => {
    const row = [
      new Date(r.created_at).toISOString(),
      r.guest_name,
      r.attending ? 'Yes' : 'No',
      r.guest_count ?? '',
      r.food_count ?? '',
      r.contact_number,
      r.message ?? '',
    ].map(csvEscape);
    lines.push(row.join(','));
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dhwani-vraj-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
