export default function AboutPage() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section className="panel">
        <h1 style={{ marginTop: 0 }}>About this project</h1>
        <p>
          This full-stack weather application was built by <strong>Tati Karizska</strong> as
          the technical assessment for an AI Engineer Intern role.
        </p>
        <p className="muted">
          It covers Tech Assessment #1 (frontend weather UX, geolocation, 5-day forecast,
          error handling) and Tech Assessment #2 (REST APIs, SQLite persistence with CRUD,
          extra API integrations, multi-format export).
        </p>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Product Manager Accelerator (PM Accelerator)</h2>
        <p>
          Product Manager Accelerator helps professionals break into product management and
          grow into strong PMs through mentorship, projects, and career support.
        </p>
        <p>
          Learn more on LinkedIn:{" "}
          <a
            href="https://www.linkedin.com/company/product-manager-accelerator/"
            target="_blank"
            rel="noreferrer"
          >
            Product Manager Accelerator
          </a>
        </p>
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Tech stack</h2>
        <ul>
          <li>Next.js 15 (App Router) + TypeScript + React</li>
          <li>Prisma + SQLite</li>
          <li>Open-Meteo (current, forecast, historical archive) + Open-Meteo Geocoding</li>
          <li>OpenStreetMap embeds, Wikipedia summary, YouTube links (optional API key)</li>
        </ul>
      </section>
    </div>
  );
}
