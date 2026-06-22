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
    taxonomies.find((taxonomy) => taxonomy.primary === true) || taxonomies[0];

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

function getAuthorizedOfficial(item) {
  const basic = item.basic || {};

  return [
    basic.authorized_official_first_name,
    basic.authorized_official_last_name,
    basic.authorized_official_title_or_position,
  ]
    .filter(Boolean)
    .join(" - ");
}

export default async function LookupPage({ searchParams }) {
  const npi = getValue(searchParams, "npi") || getValue(searchParams, "number");

  if (!npi) {
    return (
      <main style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <h1>NPI Lookup</h1>
        <p>Error: Missing NPI number.</p>
        <p>Example: /lookup?npi=1578435020</p>
      </main>
    );
  }

  const cmsUrl = `https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${encodeURIComponent(
    npi
  )}`;

  let data = null;
  let error = null;

  try {
    const response = await fetch(cmsUrl, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`CMS NPI API returned status ${response.status}`);
    }

    data = await response.json();
  } catch (err) {
    error = err?.message || "Unable to fetch CMS NPI data.";
  }

  const item = data?.results?.[0];

  if (error) {
    return (
      <main style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <h1>NPI Lookup Error</h1>
        <p>{error}</p>
        <p>NPI searched: {npi}</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <h1>NPI Lookup Result</h1>
        <p>No matching NPI record found.</p>
        <p>NPI searched: {npi}</p>
      </main>
    );
  }

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px",
        lineHeight: "1.5",
      }}
    >
      <h1>NPI Lookup Result</h1>

      <p>
        <strong>Source:</strong> CMS/NPPES NPI Registry API
      </p>

      <p>
        <strong>CMS API URL:</strong>{" "}
        <code style={{ wordBreak: "break-all" }}>{cmsUrl}</code>
      </p>

      <h2>Provider Summary</h2>

      <dl>
        <dt>
          <strong>Legal Name</strong>
        </dt>
        <dd>{getProviderName(item) || "Not listed"}</dd>

        <dt>
          <strong>NPI</strong>
        </dt>
        <dd>{item.number || "Not listed"}</dd>

        <dt>
          <strong>Entity Type</strong>
        </dt>
        <dd>{item.enumeration_type || "Not listed"}</dd>

        <dt>
          <strong>Primary Taxonomy</strong>
        </dt>
        <dd>{getPrimaryTaxonomy(item) || "Not listed"}</dd>

        <dt>
          <strong>Practice Location</strong>
        </dt>
        <dd>{getLocationAddress(item) || "Not listed"}</dd>

        <dt>
          <strong>Phone</strong>
        </dt>
        <dd>{getPhone(item) || "Not listed"}</dd>

        <dt>
          <strong>Enumeration Date</strong>
        </dt>
        <dd>{item.basic?.enumeration_date || "Not listed"}</dd>

        <dt>
          <strong>Last Updated</strong>
        </dt>
        <dd>{item.basic?.last_updated || "Not listed"}</dd>

        <dt>
          <strong>Certification Date</strong>
        </dt>
        <dd>{item.basic?.certification_date || "Not listed"}</dd>

        <dt>
          <strong>Organization Subpart</strong>
        </dt>
        <dd>{item.basic?.organizational_subpart || "Not listed"}</dd>

        <dt>
          <strong>Authorized Official</strong>
        </dt>
        <dd>{getAuthorizedOfficial(item) || "Not listed"}</dd>

        <dt>
          <strong>Authorized Official Phone</strong>
        </dt>
        <dd>
          {item.basic?.authorized_official_telephone_number || "Not listed"}
        </dd>
      </dl>

      <p>
        <a href={`/search?npi=${encodeURIComponent(npi)}`}>
          View this NPI in the full search page
        </a>
      </p>
    </main>
  );
}
