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

  if (!location) return "";

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
  const primary =
    taxonomies.find((taxonomy) => taxonomy.primary === true) || taxonomies[0];

  if (!primary) return "";

  return [
    primary.desc,
    primary.code ? `(${primary.code})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function LookupPage({ searchParams }) {
  const npi = getValue(searchParams, "npi") || getValue(searchParams, "number");

  if (!npi) {
    return (
      <main>
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
    const response = await fetch(cmsUrl, { cache: "no-store" });

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
      <main>
        <h1>NPI Lookup Error</h1>
        <p>{error}</p>
        <p>NPI searched: {npi}</p>
      </main>
    );
  }

  if (!item) {
    return (
      <main>
        <h1>NPI Lookup Result</h1>
        <p>No matching NPI record found.</p>
        <p>NPI searched: {npi}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>NPI Lookup Result</h1>

      <p>Source: CMS/NPPES NPI Registry API</p>
      <p>CMS API URL: {cmsUrl}</p>

      <h2>Provider Summary</h2>

      <dl>
        <dt>Legal Name</dt>
        <dd>{getProviderName(item)}</dd>

        <dt>NPI</dt>
        <dd>{item.number}</dd>

        <dt>Entity Type</dt>
        <dd>{item.enumeration_type}</dd>

        <dt>Primary Taxonomy</dt>
        <dd>{getPrimaryTaxonomy(item)}</dd>

        <dt>Practice Location</dt>
        <dd>{getLocationAddress(item)}</dd>

        <dt>Phone</dt>
        <dd>{getPhone(item)}</dd>

        <dt>Enumeration Date</dt>
        <dd>{item.basic?.enumeration_date || "Not listed"}</dd>

        <dt>Last Updated</dt>
        <dd>{item.basic?.last_updated || "Not listed"}</dd>

        <dt>Organization Subpart</dt>
        <dd>{item.basic?.organizational_subpart || "Not listed"}</dd>

        <dt>Authorized Official</dt>
        <dd>
          {[
            item.basic?.authorized_official_first_name,
            item.basic?.authorized_official_last_name,
            item.basic?.authorized_official_title_or_position,
          ]
            .filter(Boolean)
            .join(" - ") || "Not listed"}
        </dd>

        <dt>Authorized Official Phone</dt>
        <dd>{item.basic?.authorized_official_telephone_number || "Not listed"}</dd>
      </dl>
    </main>
  );
}
