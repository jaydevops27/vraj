# Dhwani & Vraj — Wedding RSVP Site 🪔

A custom-built, animated wedding invitation & RSVP site themed around an
Indian Gujarati wedding (marigold, mandala, diya, peacock, gold-on-maroon
palette). Instead of a generic form, every RSVP **lights a lantern** that
joins a live "Wall of Wishes" — guests watch the guest list grow in real
time as the big day approaches.

```
index.html        Public site: hero, countdown, details, lantern wall, RSVP form
admin.html        Private dashboard for Dhwani & Vraj to view/export responses
css/styles.css    Theme + animations for the public site
css/admin.css     Theme for the admin dashboard
js/main.js        Countdown, scroll reveals, form logic, live lantern wall
js/admin.js       Admin auth + response table + CSV export
js/supabase-config.js   <- put your Supabase project URL & anon key here
sql/schema.sql    Database schema + Row Level Security policies (run once)
```

No build step — it's plain HTML/CSS/JS and deploys as-is to any static host.

---

## 1. Create your free Supabase project (the database)

[Supabase](https://supabase.com) gives you a free hosted Postgres database,
instant REST API, realtime updates and authentication — everything this site
needs, with **no server to run or maintain**.

1. Go to https://supabase.com → **New project**. Pick any name/region/password
   (save the database password somewhere safe — you likely won't need it again).
2. Once the project is ready, open **SQL Editor → New query**, paste the
   entire contents of [`sql/schema.sql`](sql/schema.sql), and click **Run**.
   This creates:
   - `rsvps` — the full, private guest responses table
   - `lantern_wall` — a sanitized public feed (first name + attending status only)
   - a trigger that copies a safe snapshot from `rsvps` → `lantern_wall`
   - Row Level Security policies so that:
     - anyone can **submit** an RSVP (insert into `rsvps`)
     - **nobody** public can read phone numbers, messages or food choices
     - anyone can read the sanitized `lantern_wall` feed (for the live wall)
     - only **signed-in admin accounts** (you two) can read full `rsvps` data
3. Go to **Project Settings → API**. Copy the **Project URL** and the
   **`anon` `public`** key.
4. Open [`js/supabase-config.js`](js/supabase-config.js) and paste them in:

   ```js
   export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOి...';
   ```

   The `anon` key is *meant* to be public/exposed in client-side code — it
   only grants whatever the Row Level Security policies above allow.

## 2. Create your admin login (so only you two can see responses)

The `/admin` dashboard requires a real Supabase Auth account.

1. In Supabase: **Authentication → Providers** — make sure **Email** is
   enabled, and turn **off** "Allow new users to sign up" (Authentication →
   Settings) so strangers can't create accounts.
2. **Authentication → Users → Add user** — create one (or two) accounts with
   your own email + a password you choose. That's it — no email confirmation
   needed if you create them directly here.
3. Visit `your-site-url/admin.html`, sign in, and you'll see every response:
   name, attending status, headcount, Swaminarayan meal counts, contact
   number, and messages/song requests — plus a **CSV export** button and
   live counters (total guests, meals needed, etc).

## 3. Try it locally

Because the page uses ES modules (`import`/`export`), open it through a local
web server rather than double-clicking the file:

```bash
# from the project folder
python3 -m http.server 8080
# then open http://localhost:8080
```

Submit a test RSVP, then check **Table Editor → rsvps** and **lantern_wall**
in Supabase to confirm the row landed — and watch the lantern rise on the
page in real time.

## 4. Deploy (free static hosting)

**Vercel**
```bash
npm i -g vercel
vercel        # from inside this folder, follow the prompts
```

**Netlify** — drag-and-drop this folder onto https://app.netlify.com/drop,
or `npm i -g netlify-cli && netlify deploy --prod`.

**GitHub Pages** — push this folder to a repo and enable Pages on the
`main` branch (Settings → Pages).

No environment variables or build commands are needed — it's static files.

---

## Customizing

- **Wedding date/time** — `js/main.js`, the `WEDDING_DATE` line (kept in
  America/Toronto time, currently `2026-07-19T17:00:00-04:00`).
- **Colors** — CSS custom properties at the top of `css/styles.css`
  (`--maroon`, `--gold`, `--peacock`, `--marigold`, `--ivory`, `--blush`).
- **Copy/venue/RSVP deadline** — edit the text directly in `index.html`.
- **Lantern Wall privacy** — by design it shows only a guest's *first name*
  and a 💛/🌙 status, nothing private. If you'd rather it stayed completely
  private between you two, hide the `<section class="lantern-wall">` block
  in `index.html` and its nav anchor — the RSVP form and admin dashboard
  work independently of it.

## How data flows (for your peace of mind)

```
Guest fills RSVP form
        │
        ▼
 INSERT → rsvps  (private: phone, food prefs, message — admins only)
        │
        ▼  (Postgres trigger, runs automatically)
 INSERT → lantern_wall  (public: first name + attending status only)
        │
        ▼
 Realtime push → every visitor's browser → a new lantern rises 🪔
```
