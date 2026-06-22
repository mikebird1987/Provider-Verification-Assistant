export const dynamic = "force-dynamic";

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getProviderName(item) {
  const basic = item.basic || {};

  if (basic.organization_name) {
    return basic.organization_name;
  }

  return [
    basic.first_name,
    basic.middle_name,
    basic.last_name,
    basic.credential,
  ]
    .filter(Boolean)
    .join(" ");
}

function getAddress(item) {
  const addresses = item.addresses || [];
  const location =
    addresses.find((a) => a.address_purpose === "LOCATION") || addresses[0];

  if (!location) return "";

  return [
    location.address_1,
    location.address_2,
    location.city,
    location.state,
    location.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function getTaxonomies(item) {
  return (item.taxonomies || [])
    .map((t) => `${t.desc || ""}${t.code ? ` (${t.code})` : ""}`)
    .filter(Boolean)
    .join("; ");
}

export default async function SearchPage({ searchParams }) {
  const params = new URLSearchParams();

  const allowedFields = [
    "number",
    "npi",
    "first_name",
    "last_name",
    "organization_name",
    "city",
    "state",
    "postal_code",
    "taxonomy_description",
    "enumeration_type",
    "limit",
    "skip",
  ];

  for (const field of allowedFields) {
    const value = searchParams[field];
    if (!value) continue;

    if (field === "npi") {
      params.set("number", value);
    } else {
      params.set(field, value);
    }
  }

  params.set("version", "2.1");

  if (!params.has("limit")) {
    params.set("limit", "25");
  }

  const hasSearch =
    params.has("number") ||
    params.has("first_name") ||
    params.has("last_name") ||
    params.has("organization_name");

  let data = null;
  let error = null;

  if (hasSearch) {
    try {
      const url = `https://npiregistry.cms.hhs.gov/api/?${params.toString()}`;
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`CMS API returned ${response.status}`);
      }

      data = await response.json();
    } catch (err) {
      error = err.message;
    }
  }

  const results = data?.results || [];

  return (
    <main style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
      <h1>NPI Registry Search</h1>

      <form method="GET" action="/search">
        <p>
          <label>
            NPI Number:
            <br />
            <input name="npi" defaultValue={searchParams.npi || searchParams.number || ""} />
          </label>
        </p>

        <p>
          <label>
            First Name:
            <br />
            <input name="first_name" defaultValue={searchParams.first_name || ""} />
          </label>
        </p>

        <p>
          <label>
            Last Name:
            <br />
            <input name="last_name" defaultValue={searchParams.last_name || ""} />
          </label>
        </p>

        <p>
          <label>
            Organization Name:
            <br />
            <input
              name="organization_name"
              defaultValue={searchParams.organization_name || ""}
            />
          </label>
        </p>

        <p>
          <label>
            State:
            <br />
            <input name="state" defaultValue={searchParams.state || ""} />
          </label>
        </p>

        <p>
          <button type="submit">Search</button>
        </p>
      </form>

      {error && (
        <section>
          <h2>Error</h2>
          <p>{esc(error)}</p>
        </section>
      )}

      {!hasSearch && (
        <section>
          <h2>How to search</h2>
          <p>Use the form above or add search terms to the URL.</p>
          <p>Example: /search?npi=1578435020</p>
        </section>
      )}

      {hasSearch && (
        <section>
          <h2>Search Results</h2>
          <p>Total results from CMS API: {data?.result_count ?? results.length}</p>

          {results.length === 0 && <p>No matching NPI records found.</p>}

          {results.map((item) => (
            <article
              key={item.number}
              style={{
                border: "1px solid #ccc",
                padding: "16px",
                marginBottom: "16px",
              }}
            >
              <h3>{getProviderName(item) || "Unnamed Provider"}</h3>
              <p>
                <strong>NPI:</strong> {item.number}
              </p>
              <p>
                <strong>Enumeration Type:</strong> {item.enumeration_type}
              </p>
              <p>
                <strong>Address:</strong> {getAddress(item)}
              </p>
              <p>
                <strong>Taxonomy:</strong> {getTaxonomies(item)}
              </p>
              <p>
                <strong>Last Updated:</strong> {item.basic?.last_updated}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
