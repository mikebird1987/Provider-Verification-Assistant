# Provider Verification Assistant GPT — NPI Registry Search

A public, server-rendered Node.js/Express web app that wraps the free
[CMS/NPPES NPI Registry API](https://npiregistry.cms.hhs.gov/).
ChatGPT's built-in browser can fetch and read every page directly from HTML.

**No OpenAI API. No Custom GPT Actions. No login. No database. No environment variables required.**

---

## Recommended Hosting: Vercel (Free Hobby Tier)

Vercel is the best fit because:
- Supports Node.js/Express serverless functions natively
- No build step required — plain JavaScript
- `public/` folder is served as CDN-cached static assets automatically
- Free Hobby tier includes serverless functions, HTTPS, and a `.vercel.app` domain
- No `x-robots-tag` blocking (unlike Replit dev previews)
- ChatGPT can browse `.vercel.app` domains without restrictions

---

## Project Structure

```
npi-registry-search/
├── api/
│   └── index.js      ← Express app (all routes, all HTML rendering)
├── public/
│   └── logo.png      ← Logo image (served by Vercel CDN)
├── vercel.json       ← Vercel routing config
├── package.json      ← Only dependency: express
├── server.js         ← Local development entry point
└── README.md
```

---

## Step 1 — Run Locally

```bash
npm install
npm start
```

Then open: http://localhost:3000

Test pages locally:

| URL | Expected |
|-----|----------|
| http://localhost:3000/ | Home page with search form |
| http://localhost:3000/static-test | Static HTML, no CMS call |
| http://localhost:3000/mock-search | Mock NPI results, no CMS call |
| http://localhost:3000/search?number=1003000126 | Real NPI lookup |
| http://localhost:3000/health | Plain text: `ok` |
| http://localhost:3000/robots.txt | Bot access rules |
| http://localhost:3000/debug-request | Shows request headers |

---

## Step 2 — Deploy to Vercel

### Option A — Vercel CLI (fastest, no GitHub required)

```bash
# Install Vercel CLI (one time)
npm install -g vercel

# Inside the project folder:
vercel
```

Follow the prompts:
- "Set up and deploy?" → **Y**
- "Which scope?" → your personal account
- "Link to existing project?" → **N**
- "Project name?" → `npi-registry-search` (or anything you like)
- "In which directory is your code?" → **.** (current directory)
- "Want to override settings?" → **N**

Vercel will print your public URL, e.g.:
```
✅ Production: https://npi-registry-search.vercel.app
```

To deploy future updates:
```bash
vercel --prod
```

---

### Option B — GitHub + Vercel Dashboard

1. Create a GitHub account at https://github.com if you don't have one
2. Create a new repository (e.g. `npi-registry-search`)
3. Push this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/npi-registry-search.git
   git push -u origin main
   ```
4. Go to https://vercel.com and sign in with GitHub
5. Click **"Add New Project"**
6. Import the `npi-registry-search` repository
7. Leave all settings as default — click **Deploy**
8. Done. Your public URL will be `https://npi-registry-search.vercel.app` (or similar)

Future updates: just `git push` and Vercel redeploys automatically.

---

## Step 3 — Verify After Deployment

Replace `YOUR_URL` with your actual Vercel URL in these commands:

```bash
# All should return 200
curl -I https://YOUR_URL/
curl -I https://YOUR_URL/static-test
curl -I https://YOUR_URL/mock-search
curl -I https://YOUR_URL/health
curl -I https://YOUR_URL/robots.txt
curl -I https://YOUR_URL/sitemap.xml

# Test with ChatGPT-User agent
curl -I -A "Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0; +https://openai.com/bot" https://YOUR_URL/

# Confirm results are in raw HTML (should print NPI number)
curl -s https://YOUR_URL/search?number=1003000126 | grep "1003000126"

# Confirm no x-robots-tag blocking (should print nothing)
curl -sI https://YOUR_URL/ | grep -i x-robots
```

---

## Environment Variables

**None required.** The app connects only to the public CMS/NPPES API
(`https://npiregistry.cms.hhs.gov/api/`) which needs no credentials.

If you ever want to change the port locally:
```bash
PORT=8080 npm start
```

---

## Public Routes After Deployment

| Route | Description |
|-------|-------------|
| `GET /` | Home page with search form |
| `GET /search?...` | Server-rendered NPI search results |
| `GET /health` | Health check — returns plain text `ok` |
| `GET /robots.txt` | Bot access rules (OAI-SearchBot, ChatGPT-User allowed) |
| `GET /sitemap.xml` | XML sitemap with example search URLs |
| `GET /static-test` | Static page, no CMS call — ChatGPT connectivity test |
| `GET /mock-search` | Fake NPI results, no CMS call — isolates app vs CMS issues |
| `GET /debug-request` | Shows request headers received by server |

Search parameters accepted by `/search`:

| Parameter | Example |
|-----------|---------|
| `number` | `?number=1003000126` |
| `first_name` | `?first_name=John` |
| `last_name` | `?last_name=Smith` |
| `organization_name` | `?organization_name=Mayo+Clinic` |
| `city` | `?city=Austin` |
| `state` | `?state=TX` |
| `postal_code` | `?postal_code=78701` |
| `taxonomy_description` | `?taxonomy_description=cardiology` |
| `enumeration_type` | `?enumeration_type=NPI-1` or `NPI-2` |
| `limit` | `?limit=25` (max 200) |
| `skip` | `?skip=25` (for pagination) |

---

## ChatGPT Browser Compatibility Checklist

Use this to verify the deployment works for ChatGPT before sharing the URL.

### Connectivity

- [ ] `GET /static-test` returns HTTP 200 and displays visible HTML text
- [ ] `GET /mock-search` returns HTTP 200 and displays 3 fake NPI result cards
- [ ] `GET /debug-request` returns HTTP 200 and shows request headers
- [ ] `GET /` returns HTTP 200 with complete HTML page

### Search Results

- [ ] `GET /search?number=1003000126` returns HTTP 200
- [ ] `GET /search?first_name=John&last_name=Smith&state=TX` returns HTTP 200
- [ ] View Page Source on `/search` shows NPI numbers in raw HTML (not JavaScript-rendered)
- [ ] Results load without JavaScript
- [ ] Results load without cookies or sessions
- [ ] Results load without login or authentication

### Bot Access

- [ ] `GET /robots.txt` returns `Allow: /` for `ChatGPT-User`, `OAI-SearchBot`, and `GPTBot`
- [ ] `GET /sitemap.xml` returns valid XML
- [ ] No `x-robots-tag: noindex` header on any response (check with `curl -sI URL | grep x-robots`)
- [ ] Response includes `Content-Type: text/html; charset=utf-8`

### Dynamic Search Headers

- [ ] `/search` response includes `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
- [ ] `/search` response includes `Pragma: no-cache`
- [ ] `/search` response includes `Expires: 0`

### No Problematic Features

- [ ] No redirects before showing search results (check with `curl -sI URL | grep location`)
- [ ] No CAPTCHA
- [ ] No anti-bot middleware
- [ ] No SPA shell — results are in the first HTTP response body
- [ ] No client-side routing — every URL works as a direct GET request
- [ ] No Replit-specific URLs, auth, or environment variables

### Error Handling

- [ ] CMS API timeout returns a readable HTML error page (not a crash)
- [ ] `/search` with no parameters returns a validation message, not a 500
- [ ] Unknown routes return 404 with a readable HTML page, not a stack trace

---

## Give ChatGPT These Exact URLs

After deployment, replace `YOUR_URL` with your Vercel domain.

**Step 1 — connectivity test (no CMS API):**
```
Browse this URL and tell me what you see: https://YOUR_URL/static-test
```

**Step 2 — mock results test (no CMS API):**
```
Browse this URL and read the NPI results: https://YOUR_URL/mock-search
```

**Step 3 — real NPI lookup:**
```
Browse this URL and tell me the provider details: https://YOUR_URL/search?number=1003000126
```

**Step 4 — real name search:**
```
Browse this URL and list the providers: https://YOUR_URL/search?first_name=John&last_name=Smith&state=TX
```

---

## Known Limitations

| Limitation | Detail |
|------------|--------|
| Rate limiting resets | In-memory rate limiter; resets on each cold start (serverless). Acceptable for low-traffic use. |
| CMS API dependency | Real `/search` results depend on CMS/NPPES being reachable. If CMS is down, a readable error page is shown. |
| CMS timeout | CMS API calls timeout at 8 seconds. Vercel function max duration is set to 15 seconds. |
| Pagination state | "Previous/Next" links are fully stateless URL-based — no session required. |
| No caching of results | `/search` is always no-cache; each request hits the CMS API fresh. |

---

## Tech Stack

- **Runtime:** Node.js ≥ 18 (uses built-in `fetch` and `AbortSignal.timeout`)
- **Framework:** Express 4
- **Build step:** None — plain CommonJS JavaScript
- **Static assets:** `public/logo.png` (served by Vercel CDN or Express locally)
- **External API:** CMS/NPPES NPI Registry (`https://npiregistry.cms.hhs.gov/api/`)
- **No database, no auth, no secrets, no env vars required**
