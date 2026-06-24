export const dynamic = "force-dynamic";

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

async function getNpiFromParams(params) {
  const resolvedParams = await params;
  return resolvedParams?.number || "";
}

export async function generateMetadata({ params }) {
  const npi = await getNpiFromParams(params);

  return {
    title: npi
      ? `NPI ${npi} Provider Lookup`
      : "NPI Provider Lookup",
    description: npi
      ? `CMS NPI Registry provider details for NPI ${npi}.`
      : "CMS NPI Registry provider lookup.",
  };
}

export default async function NpiNumberPage({ params }) {
  const npi = await getNpiFromParams(params);

  if (!npi) {
    return (
      <main style={{ fontFamily: "Arial, sans-serif", padding: "24px" }}>
        <h1>NPI Lookup Result</h1>
        <p>No NPI number was found in the URL.</p>
        <p>Use this format:</p>
        <p>
          <code>https://zai-me.me/npi/1578435020</code>
        </p>
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
        <p>No matching NPI record found for NPI {npi}.</p>
        <p>
          This page searches the public CMS/NPPES NPI Registry API and displays
          provider details when a matching NPI exists.
        </p>
        <p>
          <strong>CMS API URL:</strong>{" "}
          <code style={{ wordBreak: "break-all" }}>{cmsUrl}</code>
        </p>
      </main>
    );
  }

  const providerName = getProviderName(item);

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
      <h1>NPI {item.number} Provider Lookup</h1>

      <p>
        This page displays provider information from the public CMS/NPPES NPI
        Registry API for NPI <strong>{item.number}</strong>.
      </p>

      <p>
        <strong>Provider name:</strong> {providerName || "Not listed"}
      </p>

      <p>
        <strong>Source:</strong> CMS/NPPES NPI Registry API
      </p>

      <p>
        <strong>CMS API URL:</strong>{" "}
        <code style={{ wordBreak: "break-all" }}>{cmsUrl}</code>
      </p>

      <h2>Provider Summary</h2>

      <table>
        <tbody>
          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Legal Name
            </th>
            <td>{providerName || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>NPI</th>
            <td>{item.number || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Entity Type
            </th>
            <td>{item.enumeration_type || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Primary Taxonomy
            </th>
            <td>{getPrimaryTaxonomy(item) || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Practice Location
            </th>
            <td>{getLocationAddress(item) || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Mailing Address
            </th>
            <td>{getMailingAddress(item) || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>Phone</th>
            <td>{getPhone(item) || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Enumeration Date
            </th>
            <td>{item.basic?.enumeration_date || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Last Updated
            </th>
            <td>{item.basic?.last_updated || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Certification Date
            </th>
            <td>{item.basic?.certification_date || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Organization Subpart
            </th>
            <td>{item.basic?.organizational_subpart || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Authorized Official
            </th>
            <td>{getAuthorizedOfficial(item) || "Not listed"}</td>
          </tr>

          <tr>
            <th style={{ textAlign: "left", paddingRight: "16px" }}>
              Authorized Official Phone
            </th>
            <td>
              {item.basic?.authorized_official_telephone_number || "Not listed"}
            </td>
          </tr>
        </tbody>
      </table>

      <h2>About this page</h2>

      <p>
        This is a provider verification lookup page for a specific NPI number.
        It is intended to provide a readable web page version of the public CMS
        NPI Registry API response.
      </p>

      <p>
        <a href={`/lookup?npi=${encodeURIComponent(npi)}`}>
          View the query-based lookup version
        </a>
      </p>
    </main>
  );
}
