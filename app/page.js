export default function HomePage() {
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
      <h1>Provider Verification Assistant</h1>

      <p>
        This site searches the CMS/NPPES NPI Registry and displays provider
        information in a readable webpage format.
      </p>

      <section
        style={{
          border: "1px solid #cccccc",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <h2>Quick Test Links</h2>

        <ul>
          <li>
            <a href="/search?npi=1578435020">
              Test full search page with NPI 1578435020
            </a>
          </li>

          <li>
            <a href="/lookup?npi=1578435020">
              Test simple lookup page with NPI 1578435020
            </a>
          </li>

          <li>
            <a href="/search?first_name=John&last_name=Smith&state=TX">
              Test search by first name, last name, and state
            </a>
          </li>

          <li>
            <a href="/search?organization_name=clinic&state=TX">
              Test search by organization name and state
            </a>
          </li>
        </ul>
      </section>

      <section
        style={{
          border: "1px solid #cccccc",
          padding: "16px",
          marginBottom: "24px",
        }}
      >
        <h2>Search the NPI Registry</h2>

        <form method="GET" action="/search">
          <div style={{ marginBottom: "12px" }}>
            <label>
              NPI Number
              <br />
              <input
                type="text"
                name="npi"
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
                style={{ width: "100%", maxWidth: "420px" }}
                defaultValue=""
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
                style={{ width: "100%", maxWidth: "420px" }}
                defaultValue="25"
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
      </section>

      <section
        style={{
          border: "1px solid #cccccc",
          padding: "16px",
        }}
      >
        <h2>Direct URL Examples</h2>

        <p>
          These URLs are designed so tools like ChatGPT can open a search result
          directly:
        </p>

        <ul>
          <li>
            <code>/search?npi=1578435020</code>
          </li>
          <li>
            <code>/lookup?npi=1578435020</code>
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
    </main>
  );
}
