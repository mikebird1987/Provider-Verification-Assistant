export const dynamic = "force-dynamic";

function getValue(searchParams, key) {
  const value = searchParams?.[key];

  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
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

function getLocationAddress(item) {
  const addresses = item.addresses || [];
  const location =
    addresses.find((address) => address.address_purpose === "LOCATION") ||
    addresses[0];

  if (!location) {
    return "";
  }

  return [
    location.address_1,
    location.address_2,
    location.city,
    location.state,
    location.postal_code,
    location.country_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function getMailingAddress(item) {
  const addresses = item.addresses || [];
  const mailing =
    addresses.find((address) => address.address_purpose === "MAILING") ||
    addresses[0];

  if (!mailing) {
    return "";
  }

  return [
    mailing.address_1,
    mailing.address_2,
    mailing.city,
    mailing.state,
    mailing.postal_code,
    mailing.country_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function getPhone(item) {
  const addresses = item.addresses || [];
  const location =
    addresses.find((address) => address.address_purpose === "LOCATION") ||
    addresses[0];

  return location?.telephone_number || "";
}

function getPrimaryTaxonomy(item) {
  const taxonomies = item.taxonomies || [];

  const primaryTaxonomy =
    taxonomies.find((taxonomy) => taxonomy.primary === true) ||
    taxonomies[0];

  if (!primaryTaxonomy) {
    return "";
  }

  return [
    primaryTaxonomy.desc,
    primaryTaxonomy.code ? `(${primaryTaxonomy.code})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function getAllTaxonomies(item) {
  const taxonomies = item.taxonomies || [];

  return taxonomies
    .map((taxonomy) =>
      [
        taxonomy.primary ? "Primary:" : "Secondary:",
        taxonomy.desc,
        taxonomy.code ? `(${taxonomy.code})` : "",
        taxonomy.state ? `State: ${taxonomy.state}` : "",
        taxonomy.license ? `License: ${taxonomy.license}` : "",
      ]
        .filter(Boolean)
        .join(" ")
    )
    .join("; ");
}

function buildCmsApiParams(searchParams) {
  const params = new URLSearchParams();

  // CMS/NPPES expects the NPI field to be called "number".
  // This supports both /search?npi=1234567890 and /search?number=1234567890.
  const npiValue = getValue(searchParams, "npi") || getValue(searchParams, "number");

  if (npiValue) {
    params.set("number", npiValue.trim());
  }

  const fieldMap = {
    first_name: "first_name",
    last_name: "last_name",
    organization_name: "organization_name",
    city: "city",
    state: "state",
    postal_code: "postal_code",
    taxonomy_description: "taxonomy_description",
    specialty: "taxonomy_description",
    enumeration_type: "enumeration_type",
  };

  for (const [pageField, cmsField] of Object.entries(fieldMap)) {
    const value = getValue(searchParams, pageField);

    if (value) {
      params.set(cmsField, value.trim());
    }
  }

  const limit = getValue(searchParams, "limit") || "25";
  const skip = getValue(searchParams, "skip") || "0";

  params.set("limit", limit);
  params.set("skip", skip);
  params.set("version", "2.1");

  return params;
}

function hasEnoughSearchCriteria(params) {
  // Enumeration type alone is not enough for CMS API searches.
  return (
    params.has("number") ||
    params.has("first_name") ||
    params.has("last_name") ||
    params.has("organization_name") ||
    params.has("city") ||
    params.has("state") ||
    params.has("postal_code") ||
    params.has("taxonomy_description")
  );
}

function buildQueryStringFromSearchParams(searchParams, changes) {
  const query = new URLSearchParams();

  const fields = [
    "npi",
    "number",
    "first_name",
    "last_name",
    "organization_name",
    "city",
    "state",
    "postal_code",
    "taxonomy_description",
    "specialty",
    "enumeration_type",
    "limit",
    "skip",
  ];

  for (const field of fields) {
    const value = getValue(searchParams, field);

    if (value) {
      query.set(field, value);
    }
  }

  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") {
      query.delete(key);
    } else {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

export default async function SearchPage({ searchParams }) {
  const cmsParams = buildCmsApiParams(searchParams);
  const hasSearch = hasEnoughSearchCriteria(cmsParams);

  let data = null;
  let error = null;
  let cmsUrl = "";

  if (hasSearch) {
    try {
      cmsUrl = `https://npiregistry.cms.hhs.gov/api/?${cmsParams.toString()}`;

      const response = await fetch(cmsUrl, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`CMS NPI API returned status ${response.status}`);
      }

      data = await response.json();
    } catch (err) {
      error = err?.message || "Unable to search the CMS NPI Registry API.";
    }
  }

  const results = data?.results || [];
  const resultCount = data?.result_count ?? 0;

  const currentSkip = Number(cmsParams.get("skip") || "0");
  const currentLimit = Number(cmsParams.get("limit") || "25");

  const nextSkip = currentSkip + currentLimit;
  const previousSkip = Math.max(0, currentSkip - currentLimit);

  const nextQuery = buildQueryStringFromSearchParams(searchParams, {
    skip: nextSkip,
  });

  const previousQuery = buildQueryStringFromSearchParams(searchParams, {
    skip: previousSkip,
  });

  const enteredNpi =
    getValue(searchParams, "npi") || getValue(searchParams, "number");

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px",
        lineHeight: "1.5",
      }}
    >
      <h1>Provider Verification Assistant</h1>

      <p>
        Search the CMS/NPPES NPI Registry by NPI number, provider name,
        organization name, location, or specialty.
      </p>

      <form
        method="GET"
        action="/search"
        style={{
          border: "1px solid #cccccc",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <h2>Search</h2>

        <div style={{ marginBottom: "12px" }}>
          <label>
            NPI Number
            <br />
            <input
              type="text"
              name="npi"
              defaultValue={enteredNpi}
              placeholder="Example: 1578435020"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            First Name
            <br />
            <input
              type="text"
              name="first_name"
              defaultValue={getValue(searchParams, "first_name")}
              placeholder="Example: John"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Last Name
            <br />
            <input
              type="text"
              name="last_name"
              defaultValue={getValue(searchParams, "last_name")}
              placeholder="Example: Smith"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Organization Name
            <br />
            <input
              type="text"
              name="organization_name"
              defaultValue={getValue(searchParams, "organization_name")}
              placeholder="Example: ABC Clinic"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            City
            <br />
            <input
              type="text"
              name="city"
              defaultValue={getValue(searchParams, "city")}
              placeholder="Example: Dallas"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            State
            <br />
            <input
              type="text"
              name="state"
              defaultValue={getValue(searchParams, "state")}
              placeholder="Example: TX"
              maxLength={2}
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            ZIP / Postal Code
            <br />
            <input
              type="text"
              name="postal_code"
              defaultValue={getValue(searchParams, "postal_code")}
              placeholder="Example: 75201"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Specialty / Taxonomy Description
            <br />
            <input
              type="text"
              name="taxonomy_description"
              defaultValue={
                getValue(searchParams, "taxonomy_description") ||
                getValue(searchParams, "specialty")
              }
              placeholder="Example: Family Medicine"
              style={{ width: "100%", maxWidth: "420px" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Enumeration Type
            <br />
            <select
              name="enumeration_type"
              defaultValue={getValue(searchParams, "enumeration_type")}
              style={{ width: "100%", maxWidth: "420px" }}
            >
              <option value="">Any</option>
              <option value="NPI-1">Individual Provider</option>
              <option value="NPI-2">Organization Provider</option>
            </select>
          </label>
        </div>

        <div style={{ marginBottom: "12px" }}>
          <label>
            Results Per Page
            <br />
            <select
              name="limit"
              defaultValue={getValue(searchParams, "limit") || "25"}
              style={{ width: "100%", maxWidth: "420px" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </label>
        </div>

        <input type="hidden" name="skip" value="0" />

        <button type="submit">Search NPI Registry</button>
      </form>

      {!hasSearch && (
        <section
          style={{
            border: "1px solid #f0c36d",
            background: "#fff8e5",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <h2>Enter at least one search field</h2>
          <p>
            Please enter at least one search field: NPI number, first name,
            last name, organization name, city, state, ZIP, or specialty.
            Enumeration type alone is not a sufficient search criterion.
          </p>

          <h3>Direct URL examples</h3>
          <ul>
            <li>
              <code>/search?npi=1578435020</code>
            </li>
            <li>
              <code>/search?number=1578435020</code>
            </li>
            <li>
              <code>/search?first_name=John&amp;last_name=Smith&amp;state=TX</code>
            </li>
            <li>
              <code>/search?organization_name=clinic&amp;state=TX</code>
            </li>
          </ul>
        </section>
      )}

      {error && (
        <section
          style={{
            border: "1px solid #cc0000",
            background: "#ffeeee",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <h2>Error</h2>
          <p>{error}</p>
        </section>
      )}

      {hasSearch && !error && (
        <section>
          <h2>Search Results</h2>

          <p>
            Total results reported by CMS API: <strong>{resultCount}</strong>
          </p>

          {cmsUrl && (
            <p>
              Source API request:{" "}
              <code style={{ wordBreak: "break-all" }}>{cmsUrl}</code>
            </p>
          )}

          {results.length === 0 && <p>No matching NPI records found.</p>}

          {results.map((item) => (
            <article
              key={item.number}
              style={{
                border: "1px solid #cccccc",
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
                <strong>Primary Taxonomy:</strong> {getPrimaryTaxonomy(item)}
              </p>

              <p>
                <strong>All Taxonomies:</strong> {getAllTaxonomies(item)}
              </p>

              <p>
                <strong>Location Address:</strong> {getLocationAddress(item)}
              </p>

              <p>
                <strong>Mailing Address:</strong> {getMailingAddress(item)}
              </p>

              <p>
                <strong>Phone:</strong> {getPhone(item)}
              </p>

              <p>
                <strong>Last Updated:</strong>{" "}
                {item.basic?.last_updated || "Not listed"}
              </p>
            </article>
          ))}

          {resultCount > currentLimit && (
            <nav
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "24px",
                marginBottom: "24px",
              }}
            >
              {currentSkip > 0 && (
                <a href={`/search?${previousQuery}`}>Previous results</a>
              )}

              {nextSkip < resultCount && (
                <a href={`/search?${nextQuery}`}>Next results</a>
              )}
            </nav>
          )}
        </section>
      )}
    </main>
  );
}
