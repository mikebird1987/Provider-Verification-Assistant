"use strict";
const express = require("express");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.set("trust proxy", 1);
// Serve logo.png locally (on Vercel, public/ is served by CDN before reaching this function)
app.use(express.static(path.join(__dirname, "../public")));

// ─── Brand ───────────────────────────────────────────────────────────────────
const PURPLE = "#23004B";
const BLUE   = "#320FFF";
const YELLOW = "#FFBE00";

// ─── CMS API ─────────────────────────────────────────────────────────────────
const CMS_BASE    = "https://npiregistry.cms.hhs.gov/api/";
const CMS_VERSION = "2.1";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT     = 200;

// ─── HTML escape ─────────────────────────────────────────────────────────────
function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// ─── Rate limiting (60 req / min per IP, best-effort — resets on cold start) ─
const rlMap = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rlMap) if (v.until < now) rlMap.delete(k);
}, 60_000).unref();

function checkRateLimit(ip) {
  const now = Date.now();
  const e = rlMap.get(ip);
  if (!e || e.until < now) { rlMap.set(ip, { n: 1, until: now + 60_000 }); return false; }
  e.n++;
  return e.n > 60;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f8f7fb;color:#1a1a1a;line-height:1.6}
a{color:${BLUE}}a:hover{text-decoration:none}
header{background:${PURPLE};padding:.5rem 1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
.site-logo{height:90px;width:auto;display:block}
.site-badge{background:${YELLOW};color:${PURPLE};font-size:.68rem;font-weight:700;padding:.15rem .5rem;border-radius:3px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
main{max-width:980px;margin:2rem auto;padding:0 1.25rem}
h2{color:${PURPLE};margin:1.5rem 0 .75rem;font-size:1.2rem}
h3{color:${BLUE};margin:1rem 0 .4rem;font-size:.95rem;font-weight:700}
.intro{background:#fff;border:1px solid #e0daf0;border-radius:6px;padding:1.25rem 1.5rem;margin-bottom:1.5rem}
.intro p{margin:.4rem 0;font-size:.93rem}
.form-card{background:#fff;border:1px solid #e0daf0;border-radius:6px;padding:1.25rem 1.5rem}
.form-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:.75rem;margin:.75rem 0 1rem}
label{display:block;font-size:.82rem;font-weight:600;color:${PURPLE};margin-bottom:.25rem}
input,select{width:100%;padding:.42rem .6rem;border:1px solid #ccc;border-radius:4px;font-size:.88rem;font-family:inherit;background:#fff}
input:focus,select:focus{outline:2px solid ${BLUE};border-color:${BLUE}}
.form-actions{display:flex;gap:.75rem;align-items:center;flex-wrap:wrap;margin-top:.5rem}
.btn{display:inline-block;background:${BLUE};color:#fff;border:none;padding:.55rem 1.4rem;border-radius:4px;font-size:.9rem;font-weight:600;cursor:pointer;text-decoration:none;transition:background .15s}
.btn:hover{background:${PURPLE};color:#fff}
.btn-reset{background:#e8e4f0;color:${PURPLE};text-decoration:none}
.btn-reset:hover{background:#d0c8f0;color:${PURPLE}}
.examples{margin-top:1.25rem}
.examples h3{font-size:.85rem;color:#555;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.5rem}
.example-links{display:flex;flex-wrap:wrap;gap:.4rem}
.example-links a{background:#f0edff;border:1px solid #c8bef5;color:${BLUE};padding:.28rem .65rem;border-radius:4px;font-size:.8rem;text-decoration:none}
.example-links a:hover{background:${BLUE};color:#fff;border-color:${BLUE}}
.disclaimer{background:#fffbea;border-left:4px solid ${YELLOW};padding:.7rem 1rem;margin:1rem 0;font-size:.82rem;border-radius:0 4px 4px 0;color:#555}
.summary{background:#fff;border:1px solid #e0daf0;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0;font-size:.88rem}
.summary p{margin:.2rem 0}
.summary .label{font-weight:600;color:${PURPLE}}
.api-link{font-size:.78rem;color:#666;word-break:break-all}
.result-count{font-weight:700;font-size:1rem;color:${PURPLE};margin:.75rem 0}
.result-card{background:#fff;border:1px solid #e0daf0;border-radius:6px;margin:1rem 0;overflow:hidden}
.result-header{background:${PURPLE};color:#fff;padding:.55rem 1rem;font-size:.82rem;font-weight:600;display:flex;align-items:center;gap:.75rem}
.result-header .npi-badge{background:${YELLOW};color:${PURPLE};padding:.1rem .45rem;border-radius:3px;font-size:.75rem;font-weight:700}
.result-plain{background:#f0edff;padding:.6rem 1rem;font-size:.83rem;border-bottom:1px solid #e0daf0;line-height:1.5}
.result-body{padding:.75rem 1rem}
table.detail{border-collapse:collapse;width:100%;font-size:.83rem;margin:.25rem 0}
table.detail td,table.detail th{padding:.35rem .6rem;border:1px solid #ece8f5;vertical-align:top;text-align:left}
table.detail th{background:#f5f3ff;font-weight:600;color:${PURPLE};width:36%;white-space:nowrap}
.taxonomy-row{margin:.2rem 0;font-size:.83rem}
.tag{display:inline-block;background:${BLUE};color:#fff;font-size:.7rem;padding:.1rem .38rem;border-radius:3px;margin:.1rem 0}
.tag-primary{background:${YELLOW};color:${PURPLE};font-weight:700}
.no-results{background:#fff;border:1px solid #e0daf0;border-radius:6px;padding:2rem 1.5rem;text-align:center;color:#666;margin:1rem 0}
.error-box{background:#fff3f3;border:1px solid #f5c0c0;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0;color:#8b0000;font-size:.9rem}
.pagination{display:flex;gap:1rem;margin:1.5rem 0;align-items:center;flex-wrap:wrap}
.page-info{font-size:.85rem;color:#666}
.nav-links{margin:1rem 0;font-size:.88rem;display:flex;gap:1rem;flex-wrap:wrap}
footer{text-align:center;padding:2rem 1rem;font-size:.78rem;color:#999;border-top:1px solid #e0daf0;margin-top:3rem}
footer a{color:#999}
@media(max-width:600px){.form-grid{grid-template-columns:1fr}main{padding:0 1rem}}
`;

// ─── Layout ───────────────────────────────────────────────────────────────────
function layout({ title, description, canonical, body }) {
  description = description || "Search the official CMS/NPPES NPI Registry for licensed healthcare providers and organizations.";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ""}
<style>${CSS}</style>
</head>
<body>
<header>
  <a href="/"><img class="site-logo" src="/logo.png" alt="Provider Verification Assistant GPT"></a>
  <span class="site-badge">CMS/NPPES Public Data</span>
</header>
<main>${body}</main>
<footer>
  <p>Data sourced from <a href="https://npiregistry.cms.hhs.gov/">CMS/NPPES NPI Registry</a> — public, no login required, no data stored.</p>
  <p>Issuance of an NPI does not ensure or validate licensure or credentialing.</p>
</footer>
</body>
</html>`;
}

// ─── Search form ──────────────────────────────────────────────────────────────
function searchForm(params = {}) {
  const states = ["","AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","GU","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","MP","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VI","VA","WA","WV","WI","WY"];
  const stateOpts = states.map(s =>
    `<option value="${esc(s)}"${params.state === s ? " selected" : ""}>${esc(s || "— All States —")}</option>`
  ).join("");
  const enumOpts = [
    ["", "— Any Type —"],
    ["NPI-1", "NPI-1 — Individual"],
    ["NPI-2", "NPI-2 — Organization"],
  ].map(([v, l]) => `<option value="${esc(v)}"${params.enumeration_type === v ? " selected" : ""}>${esc(l)}</option>`).join("");
  const limitOpts = [10, 25, 50, 100, 200].map(n =>
    `<option value="${n}"${String(params.limit || "25") === String(n) ? " selected" : ""}>${n} results</option>`
  ).join("");

  return `<form method="GET" action="/search">
<div class="form-card">
<h2>Search the NPI Registry</h2>
<div class="form-grid">
  <div><label for="f-npi">NPI Number</label><input id="f-npi" name="number" value="${esc(params.number)}" placeholder="10-digit NPI" maxlength="10"></div>
  <div><label for="f-first">First Name</label><input id="f-first" name="first_name" value="${esc(params.first_name)}" placeholder="e.g. John"></div>
  <div><label for="f-last">Last Name</label><input id="f-last" name="last_name" value="${esc(params.last_name)}" placeholder="e.g. Smith"></div>
  <div><label for="f-org">Organization Name</label><input id="f-org" name="organization_name" value="${esc(params.organization_name)}" placeholder="e.g. Mayo Clinic"></div>
  <div><label for="f-city">City</label><input id="f-city" name="city" value="${esc(params.city)}" placeholder="e.g. Austin"></div>
  <div><label for="f-state">State</label><select id="f-state" name="state">${stateOpts}</select></div>
  <div><label for="f-zip">ZIP / Postal Code</label><input id="f-zip" name="postal_code" value="${esc(params.postal_code)}" placeholder="e.g. 78701"></div>
  <div><label for="f-tax">Taxonomy / Specialty</label><input id="f-tax" name="taxonomy_description" value="${esc(params.taxonomy_description)}" placeholder="e.g. Family Medicine"></div>
  <div><label for="f-type">Provider Type</label><select id="f-type" name="enumeration_type">${enumOpts}</select></div>
  <div><label for="f-limit">Results per page</label><select id="f-limit" name="limit">${limitOpts}</select></div>
</div>
<div class="form-actions">
  <button type="submit" class="btn">Search NPI Registry</button>
  <a href="/" class="btn btn-reset">Clear</a>
</div>
</div>
</form>`;
}

// ─── CMS API fetch ────────────────────────────────────────────────────────────
async function fetchNpi(params) {
  const q = new URLSearchParams({ version: CMS_VERSION, ...params });
  const url = `${CMS_BASE}?${q.toString()}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!resp.ok) return { data: null, url, error: `CMS API returned HTTP ${resp.status}` };
    const data = await resp.json();
    return { data, url, error: null };
  } catch (e) {
    if (e && e.name === "TimeoutError")
      return { data: null, url, error: "The CMS/NPPES API did not respond within 8 seconds. Please try again." };
    return { data: null, url, error: `Could not reach the CMS/NPPES API: ${e ? e.message : String(e)}` };
  }
}

// ─── Result rendering ─────────────────────────────────────────────────────────
function renderProvider(r, index) {
  const npi  = r.number || "Unknown";
  const type = r.enumeration_type || "";
  const b    = r.basic || {};
  const isOrg = type === "NPI-2";

  const displayName = isOrg
    ? (b.organization_name || "Unknown Organization")
    : [b.first_name, b.middle_name, b.last_name].filter(Boolean).join(" ") || b.name || "Unknown Provider";
  const credential  = b.credential ? `, ${b.credential}` : "";
  const fullName    = displayName + credential;
  const statusLabel = b.status === "A" ? "Active" : b.status === "D" ? "Deactivated" : (b.status || "Unknown");

  const taxonomies = r.taxonomies || [];
  const primaryTax = taxonomies.find(t => t.primary) || taxonomies[0];
  const taxDesc    = primaryTax ? (primaryTax.desc || "") : "";

  const addresses    = r.addresses || [];
  const practiceAddr = addresses.find(a => a.address_purpose === "LOCATION") || addresses[0];
  const mailingAddr  = addresses.find(a => a.address_purpose === "MAILING");

  const addrLine = practiceAddr
    ? [practiceAddr.city, practiceAddr.state, (practiceAddr.postal_code || "").slice(0, 5)].filter(Boolean).join(", ")
    : "";
  const phone = practiceAddr ? (practiceAddr.telephone_number || "") : "";

  const plainParts = [
    `NPI: ${npi}`,
    `Name: ${fullName}`,
    `Type: ${isOrg ? "Organization" : "Individual"}`,
    taxDesc  && `Taxonomy: ${taxDesc}`,
    addrLine && `Practice location: ${addrLine}`,
    phone    && `Phone: ${phone}`,
    b.last_updated && `Last updated: ${b.last_updated}`,
    `Status: ${statusLabel}`,
  ].filter(Boolean);

  const taxRows = taxonomies.map(t =>
    `<div class="taxonomy-row">${t.primary ? `<span class="tag tag-primary">Primary</span> ` : `<span class="tag">Taxonomy</span> `}${esc(t.desc || "")}${t.code ? ` <small>(${esc(t.code)})</small>` : ""}${t.license ? ` — License: ${esc(t.license)} ${t.state ? `(${esc(t.state)})` : ""}` : ""}</div>`
  ).join("");

  function fmtAddr(a) {
    const lines = [a.address_1, a.address_2, [a.city, a.state, a.postal_code].filter(Boolean).join(", ")].filter(Boolean);
    return lines.map(esc).join("<br>")
      + (a.telephone_number ? `<br>Phone: ${esc(a.telephone_number)}` : "")
      + (a.fax_number       ? `<br>Fax: ${esc(a.fax_number)}`        : "");
  }

  const otherNames = (r.other_names || []).map(n =>
    `${esc(n.organization_name || "")} <small>(${esc(n.type_display_name || n.type || "")})</small>`
  ).join("; ");

  return `<div class="result-card" id="result-${index}">
  <div class="result-header">
    <span class="npi-badge">NPI ${esc(npi)}</span>
    <span>${esc(fullName)}</span>
    <span style="margin-left:auto;opacity:.8;font-weight:400">${esc(type)} · ${esc(statusLabel)}</span>
  </div>
  <div class="result-plain">${plainParts.map(esc).join(" &nbsp;|&nbsp; ")}</div>
  <div class="result-body">
    <table class="detail">
      <tr><th>NPI</th><td>${esc(npi)}</td></tr>
      <tr><th>Entity Type</th><td>${esc(type)} (${isOrg ? "Organization" : "Individual Provider"})</td></tr>
      <tr><th>Status</th><td>${esc(statusLabel)}</td></tr>
      ${isOrg  ? `<tr><th>Legal Business Name</th><td>${esc(b.organization_name || "")}</td></tr>` : ""}
      ${!isOrg ? `<tr><th>Provider Name</th><td>${esc(fullName)}</td></tr>` : ""}
      ${!isOrg && b.gender ? `<tr><th>Gender</th><td>${b.gender === "M" ? "Male" : b.gender === "F" ? "Female" : esc(b.gender)}</td></tr>` : ""}
      ${otherNames  ? `<tr><th>Other Names</th><td>${otherNames}</td></tr>` : ""}
      ${taxRows     ? `<tr><th>Taxonomy / Specialty</th><td>${taxRows}</td></tr>` : ""}
      ${practiceAddr ? `<tr><th>Practice Address</th><td>${fmtAddr(practiceAddr)}</td></tr>` : ""}
      ${mailingAddr && mailingAddr !== practiceAddr ? `<tr><th>Mailing Address</th><td>${fmtAddr(mailingAddr)}</td></tr>` : ""}
      ${b.enumeration_date ? `<tr><th>Enumeration Date</th><td>${esc(b.enumeration_date)}</td></tr>` : ""}
      ${b.last_updated     ? `<tr><th>Last Updated</th><td>${esc(b.last_updated)}</td></tr>`         : ""}
    </table>
  </div>
</div>`;
}

// ─── GET / ────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  const body = `
<div class="intro">
  <h2>Welcome — Search Public NPI Registry Data</h2>
  <p>This tool searches the <a href="https://npiregistry.cms.hhs.gov/">CMS/NPPES NPI Registry</a> — the official U.S. government database of healthcare providers and organizations. It requires no login and stores nothing.</p>
  <p>Enter one or more fields below and click <strong>Search NPI Registry</strong> to see results. Each result page has a unique public URL that can be bookmarked, shared, or read by ChatGPT's browser.</p>
</div>
${searchForm()}
<div class="examples">
  <h3>Example Searches</h3>
  <div class="example-links">
    <a href="/search?first_name=John&last_name=Smith&state=TX">John Smith in Texas</a>
    <a href="/search?organization_name=clinic&state=TX">Clinics in Texas</a>
    <a href="/search?taxonomy_description=family&state=TX">Family Medicine in Texas</a>
    <a href="/search?number=1003000126">NPI 1003000126 (direct lookup)</a>
    <a href="/search?last_name=Johnson&state=CA">Johnson in California</a>
    <a href="/search?organization_name=Mayo+Clinic">Mayo Clinic</a>
    <a href="/search?taxonomy_description=cardiology&state=NY">Cardiology in New York</a>
    <a href="/search?last_name=Patel&city=Houston&state=TX">Patel in Houston TX</a>
  </div>
</div>`;
  res.send(layout({ title: "NPI Registry Search for ChatGPT", body }));
});

// ─── GET /search ──────────────────────────────────────────────────────────────
app.get("/search", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const ip = req.ip || (req.socket && req.socket.remoteAddress) || "unknown";
  if (checkRateLimit(ip)) {
    res.status(429).send(layout({
      title: "Rate Limited — NPI Registry Search",
      body: `<div class="error-box"><h2>Too Many Requests</h2><p>You have sent too many requests. Please wait a minute and try again.</p><p><a href="/">Back to Search</a></p></div>`,
    }));
    return;
  }

  const raw = k => String(req.query[k] == null ? "" : req.query[k]).trim();
  const p = {
    number:               raw("number"),
    first_name:           raw("first_name"),
    last_name:            raw("last_name"),
    organization_name:    raw("organization_name"),
    city:                 raw("city"),
    state:                raw("state").toUpperCase(),
    postal_code:          raw("postal_code"),
    taxonomy_description: raw("taxonomy_description"),
    enumeration_type:     raw("enumeration_type"),
    limit:                raw("limit") || String(DEFAULT_LIMIT),
    skip:                 raw("skip")  || "0",
  };

  const limit = Math.min(Math.max(parseInt(p.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip  = Math.max(parseInt(p.skip, 10) || 0, 0);

  const hasMeaningful = !!(p.number || p.first_name || p.last_name || p.organization_name ||
    p.city || p.state || p.postal_code || p.taxonomy_description);

  if (!hasMeaningful) {
    res.send(layout({
      title: "Search — NPI Registry Search for ChatGPT",
      body: `${searchForm(p)}
<div class="error-box">
  <strong>Please enter at least one search field</strong> (NPI number, name, organization, city, state, ZIP, or specialty).
  Enumeration type alone is not a sufficient search criterion.
</div>`,
    }));
    return;
  }

  const cmsParams = { limit: String(limit), skip: String(skip) };
  if (p.number)               cmsParams.number               = p.number;
  if (p.first_name)           cmsParams.first_name           = p.first_name;
  if (p.last_name)            cmsParams.last_name            = p.last_name;
  if (p.organization_name)    cmsParams.organization_name    = p.organization_name;
  if (p.city)                 cmsParams.city                 = p.city;
  if (p.state)                cmsParams.state                = p.state;
  if (p.postal_code)          cmsParams.postal_code          = p.postal_code;
  if (p.taxonomy_description) cmsParams.taxonomy_description = p.taxonomy_description;
  if (p.enumeration_type)     cmsParams.enumeration_type     = p.enumeration_type;

  const searchedAt = new Date().toUTCString();
  const { data, url: cmsUrl, error } = await fetchNpi(cmsParams);

  const searchQs = new URLSearchParams();
  if (p.number)               searchQs.set("number", p.number);
  if (p.first_name)           searchQs.set("first_name", p.first_name);
  if (p.last_name)            searchQs.set("last_name", p.last_name);
  if (p.organization_name)    searchQs.set("organization_name", p.organization_name);
  if (p.city)                 searchQs.set("city", p.city);
  if (p.state)                searchQs.set("state", p.state);
  if (p.postal_code)          searchQs.set("postal_code", p.postal_code);
  if (p.taxonomy_description) searchQs.set("taxonomy_description", p.taxonomy_description);
  if (p.enumeration_type)     searchQs.set("enumeration_type", p.enumeration_type);
  searchQs.set("limit", String(limit));
  if (skip > 0) searchQs.set("skip", String(skip));
  const canonicalPath = `/search?${searchQs.toString()}`;

  const searchTerms = [];
  if (p.number)               searchTerms.push(`NPI: ${p.number}`);
  if (p.first_name)           searchTerms.push(`First name: ${p.first_name}`);
  if (p.last_name)            searchTerms.push(`Last name: ${p.last_name}`);
  if (p.organization_name)    searchTerms.push(`Organization: ${p.organization_name}`);
  if (p.city)                 searchTerms.push(`City: ${p.city}`);
  if (p.state)                searchTerms.push(`State: ${p.state}`);
  if (p.postal_code)          searchTerms.push(`ZIP: ${p.postal_code}`);
  if (p.taxonomy_description) searchTerms.push(`Taxonomy: ${p.taxonomy_description}`);
  if (p.enumeration_type)     searchTerms.push(`Type: ${p.enumeration_type}`);

  const searchType = p.organization_name || p.enumeration_type === "NPI-2"
    ? "organization" : (p.first_name || p.last_name) && !p.organization_name
    ? "individual provider" : "provider or organization";

  if (error) {
    res.send(layout({
      title: "Search Error — NPI Registry Search for ChatGPT",
      canonical: canonicalPath,
      body: `${searchForm(p)}
<div class="error-box">
  <h2>CMS API Error</h2>
  <p>${esc(error)}</p>
  <p style="margin-top:.5rem"><a class="api-link" href="${esc(cmsUrl)}">${esc(cmsUrl)}</a></p>
</div>`,
    }));
    return;
  }

  if (data && data.Errors && data.Errors.length) {
    const errMsg = data.Errors.map(e => e.description || "Unknown error").join("; ");
    res.send(layout({
      title: "Search Error — NPI Registry Search for ChatGPT",
      canonical: canonicalPath,
      body: `${searchForm(p)}
<div class="error-box">
  <h2>CMS/NPPES Returned an Error</h2>
  <p>${esc(errMsg)}</p>
  <p style="margin-top:.5rem;font-size:.8rem">This usually means an invalid parameter value. Please check your search fields and try again.</p>
</div>`,
    }));
    return;
  }

  const results  = (data && data.results) ? data.results : [];
  const total    = (data && data.result_count != null) ? data.result_count : results.length;
  const returned = results.length;

  const prevSkip = skip - limit;
  const nextSkip = skip + limit;
  const prevQs = new URLSearchParams(searchQs); prevQs.set("skip", String(Math.max(prevSkip, 0)));
  const nextQs = new URLSearchParams(searchQs); nextQs.set("skip", String(nextSkip));

  const pagination = `<div class="pagination">
    ${skip > 0      ? `<a class="btn btn-reset" href="/search?${prevQs.toString()}">← Previous</a>` : ""}
    <span class="page-info">Showing ${skip + 1}–${skip + returned} of ${total} results</span>
    ${returned >= limit ? `<a class="btn" href="/search?${nextQs.toString()}">Next →</a>` : ""}
  </div>`;

  const resultCards = results.map((r, i) => renderProvider(r, skip + i + 1)).join("");

  const body = `
${searchForm(p)}
<div class="disclaimer">
  This page displays public NPI Registry data from CMS/NPPES. Issuance of an NPI does not ensure or validate licensure or credentialing.
</div>
<div class="summary">
  <p><span class="label">Search terms:</span> ${esc(searchTerms.join(" · ") || "None")}</p>
  <p><span class="label">Search type:</span> ${esc(searchType)}</p>
  <p><span class="label">Results returned:</span> ${returned} of ${total} total matches</p>
  <p><span class="label">Page:</span> ${Math.floor(skip / limit) + 1} (records ${skip + 1}–${skip + returned})</p>
  <p><span class="label">Searched at:</span> ${esc(searchedAt)}</p>
  <p><span class="label">Raw CMS API URL:</span> <a class="api-link" href="${esc(cmsUrl)}">${esc(cmsUrl)}</a></p>
</div>
${returned === 0
  ? `<div class="no-results"><p><strong>No matching NPI records found.</strong></p><p style="margin-top:.5rem;color:#888">Try broadening your search — remove some filters, check spelling, or use a partial name.</p></div>`
  : `<p class="result-count">${total} result${total !== 1 ? "s" : ""} found — showing ${returned} on this page</p>${pagination}${resultCards}${pagination}`
}
<div class="nav-links">
  <a href="/">← New Search</a>
  <a href="${esc(cmsUrl)}" target="_blank" rel="noopener">View Raw CMS API Response</a>
</div>`;

  res.send(layout({ title: `${searchTerms.join(", ")} — NPI Registry Search`, canonical: canonicalPath, body }));
});

// ─── GET /debug-request ───────────────────────────────────────────────────────
app.get("/debug-request", (req, res) => {
  const info = {
    method:    req.method,
    url:       req.url,
    path:      req.path,
    query:     req.query,
    userAgent: req.headers["user-agent"] || "(none)",
    accept:    req.headers["accept"]     || "(none)",
    host:      req.headers["host"]       || "(none)",
    ip:        req.ip || (req.socket && req.socket.remoteAddress) || "(unknown)",
    timestamp: new Date().toISOString(),
    status:    200,
  };
  const rows = Object.entries(info).map(([k, v]) =>
    `<tr><th>${esc(k)}</th><td><code>${esc(typeof v === "object" ? JSON.stringify(v, null, 2) : String(v))}</code></td></tr>`
  ).join("");
  res.setHeader("Cache-Control", "no-store");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Debug Request — NPI Registry</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem}
h1{color:#23004B}table{border-collapse:collapse;width:100%}
th,td{padding:.4rem .75rem;border:1px solid #ddd;text-align:left;vertical-align:top}
th{background:#f5f3ff;color:#23004B;width:30%}code{font-size:.85rem;white-space:pre-wrap}</style>
</head>
<body>
<h1>Debug Request</h1>
<p>HTTP 200 — server is reachable. This page shows what the server received.</p>
<table>${rows}</table>
<p style="margin-top:1rem"><a href="/">← Back to Search</a></p>
</body></html>`);
});

// ─── GET /static-test ────────────────────────────────────────────────────────
app.get("/static-test", (_req, res) => {
  const ts = new Date().toISOString();
  res.setHeader("Cache-Control", "no-store");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Static Test — NPI Registry</title>
<style>body{font-family:system-ui,sans-serif;max-width:600px;margin:3rem auto;padding:0 1rem;color:#1a1a1a}
h1{color:#23004B}p{margin:.75rem 0}.ok{color:#1a7f1a;font-weight:700}</style>
</head>
<body>
<h1>Static Test OK</h1>
<p class="ok">If you can read this page, the server is publicly reachable.</p>
<p>This page does NOT call the CMS API. It is purely static server-rendered HTML.</p>
<p>Timestamp: ${esc(ts)}</p>
<p>Server: NPI Registry Search for ChatGPT (Express/Node.js)</p>
<p><a href="/debug-request">View request details</a> &nbsp;|&nbsp; <a href="/">Back to Search</a></p>
</body></html>`);
});

// ─── GET /mock-search ────────────────────────────────────────────────────────
app.get("/mock-search", (_req, res) => {
  const ts = new Date().toISOString();
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const mockResults = [
    { npi: "1003000126", name: "SMITH JOHN A",  credential: "MD", type: "NPI-1 (Individual)",   status: "Active", taxonomy: "Internal Medicine (207R00000X)",         address: "123 Medical Dr, Austin, TX 78701",     phone: "512-555-0100", enumDate: "2006-01-01", lastUpdated: "2023-04-15" },
    { npi: "1992703719", name: "MAYO CLINIC",    credential: "",   type: "NPI-2 (Organization)", status: "Active", taxonomy: "General Acute Care Hospital (282N00000X)", address: "200 First St SW, Rochester, MN 55905", phone: "507-284-2511", enumDate: "2006-02-15", lastUpdated: "2024-01-20" },
    { npi: "1174511174", name: "PATEL PRIYA S",  credential: "DO", type: "NPI-1 (Individual)",   status: "Active", taxonomy: "Family Medicine (207Q00000X)",             address: "456 Health Blvd, Houston, TX 77001",   phone: "713-555-0200", enumDate: "2010-07-22", lastUpdated: "2022-11-03" },
  ];
  const cards = mockResults.map(r => `
<div style="background:#fff;border:1px solid #e0daf0;border-radius:6px;margin:1rem 0;overflow:hidden">
  <div style="background:#23004B;color:#fff;padding:.55rem 1rem;font-size:.85rem;font-weight:600">
    <span style="background:#FFBE00;color:#23004B;padding:.1rem .4rem;border-radius:3px;font-size:.75rem;margin-right:.6rem">NPI ${esc(r.npi)}</span>
    ${esc(r.name)}${r.credential ? `, ${esc(r.credential)}` : ""}
    <span style="float:right;font-weight:400;opacity:.8">${esc(r.type)} · ${esc(r.status)}</span>
  </div>
  <div style="background:#f0edff;padding:.5rem 1rem;font-size:.82rem;border-bottom:1px solid #e0daf0">
    NPI: ${esc(r.npi)} | Name: ${esc(r.name)}${r.credential ? `, ${esc(r.credential)}` : ""} | Taxonomy: ${esc(r.taxonomy)} | Location: ${esc(r.address)} | Phone: ${esc(r.phone)} | Status: ${esc(r.status)}
  </div>
  <div style="padding:.75rem 1rem">
    <table style="border-collapse:collapse;width:100%;font-size:.83rem">
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;width:35%;text-align:left;color:#23004B">NPI</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.npi)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Name</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.name)}${r.credential ? `, ${esc(r.credential)}` : ""}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Entity Type</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.type)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Status</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.status)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Taxonomy</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.taxonomy)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Practice Address</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.address)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Phone</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.phone)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Enumeration Date</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.enumDate)}</td></tr>
      <tr><th style="background:#f5f3ff;padding:.35rem .6rem;border:1px solid #ece8f5;text-align:left;color:#23004B">Last Updated</th><td style="padding:.35rem .6rem;border:1px solid #ece8f5">${esc(r.lastUpdated)}</td></tr>
    </table>
  </div>
</div>`).join("");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mock Search — NPI Registry Search for ChatGPT</title>
<meta name="description" content="Mock NPI search results — no CMS API call. Confirms server is reachable by ChatGPT.">
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8f7fb;color:#1a1a1a;line-height:1.6;margin:0}
header{background:#23004B;padding:1rem 1.5rem}header a{color:#fff;font-size:1.1rem;font-weight:700;text-decoration:none}
main{max-width:960px;margin:2rem auto;padding:0 1.25rem}
.notice{background:#fffbea;border-left:4px solid #FFBE00;padding:.75rem 1rem;margin:1rem 0;font-size:.85rem;border-radius:0 4px 4px 0}
.summary{background:#fff;border:1px solid #e0daf0;border-radius:6px;padding:1rem 1.25rem;margin:1rem 0;font-size:.88rem}
.summary p{margin:.2rem 0}.label{font-weight:600;color:#23004B}
footer{text-align:center;padding:2rem;font-size:.78rem;color:#999;border-top:1px solid #e0daf0;margin-top:3rem}</style>
</head>
<body>
<header><a href="/">Provider Verification Assistant GPT</a></header>
<main>
<h2 style="color:#23004B;margin:1.5rem 0 .5rem">Mock Search Results (No CMS API Call)</h2>
<div class="notice">
  <strong>Diagnostic page.</strong> Fake sample NPI records — no CMS API was called.
  If this page loads but <a href="/search?first_name=John&amp;last_name=Smith&amp;state=TX">/search</a> fails,
  the issue is CMS API connectivity, not the app.
</div>
<div class="summary">
  <p><span class="label">Search terms (mock):</span> First name: John · Last name: Smith · State: TX</p>
  <p><span class="label">Results returned:</span> 3 (fake sample data)</p>
  <p><span class="label">Generated at:</span> ${esc(ts)}</p>
  <p><span class="label">CMS API called:</span> No — this is a static mock page</p>
</div>
<p style="font-weight:700;color:#23004B;margin:.75rem 0">3 results found (mock data)</p>
${cards}
<p style="margin-top:1.5rem"><a href="/">← Real Search</a> &nbsp;|&nbsp; <a href="/static-test">Static Test</a> &nbsp;|&nbsp; <a href="/debug-request">Debug Request</a></p>
</main>
<footer>Fictional sample data for diagnostic purposes only.</footer>
</body></html>`);
});

// ─── GET /health ─────────────────────────────────────────────────────────────
app.get("/health",  (_req, res) => { res.setHeader("Content-Type", "text/plain"); res.send("ok"); });
app.get("/healthz", (_req, res) => { res.setHeader("Content-Type", "text/plain"); res.send("ok"); });

// ─── GET /robots.txt ─────────────────────────────────────────────────────────
app.get("/robots.txt", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"]  || req.headers.host || "localhost";
  res.setHeader("Content-Type", "text/plain");
  res.send([
    "User-agent: OAI-SearchBot", "Allow: /", "",
    "User-agent: ChatGPT-User",  "Allow: /", "",
    "User-agent: GPTBot",        "Allow: /", "",
    "User-agent: *",             "Allow: /", "",
    `Sitemap: ${proto}://${host}/sitemap.xml`,
  ].join("\n"));
});

// ─── GET /sitemap.xml ────────────────────────────────────────────────────────
app.get("/sitemap.xml", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host  = req.headers["x-forwarded-host"]  || req.headers.host || "localhost";
  const base  = `${proto}://${host}`;
  const paths = [
    "/", "/search", "/static-test", "/mock-search",
    "/search?first_name=John&last_name=Smith&state=TX",
    "/search?organization_name=clinic&state=TX",
    "/search?taxonomy_description=family+medicine&state=TX",
    "/search?number=1003000126",
    "/search?last_name=Johnson&state=CA",
    "/search?organization_name=Mayo+Clinic",
    "/search?taxonomy_description=cardiology&state=NY",
  ];
  const urls = paths.map(p => `
  <url>
    <loc>${esc(base + p)}</loc>
    <changefreq>${p === "/" ? "weekly" : "daily"}</changefreq>
    <priority>${p === "/" ? "1.0" : "0.8"}</priority>
  </url>`).join("");
  res.setHeader("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}\n</urlset>`);
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).send(layout({
    title: "Page Not Found — NPI Registry Search",
    body: `<div class="error-box"><h2>Page Not Found</h2><p>The page you requested does not exist.</p><p style="margin-top:.75rem"><a href="/">Back to Search</a></p></div>`,
  }));
});

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).send(layout({
    title: "Server Error — NPI Registry Search",
    body: `<div class="error-box"><h2>Something went wrong</h2><p>An unexpected error occurred. Please try again.</p><p style="margin-top:.75rem"><a href="/">Back to Search</a></p></div>`,
  }));
});

module.exports = app;
