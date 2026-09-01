import { useEffect, useState } from 'react';

type Health = {
  status: string;
  service: string;
  checks: { database: string };
};

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/health')
      .then((r) => r.json())
      .then(setHealth)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 640 }}>
      <h1>MillQ</h1>
      <p>Operational Core — foundation shell</p>
      <section>
        <h2>API health</h2>
        {error && <p role="alert">Cannot reach API: {error}</p>}
        {health && (
          <ul>
            <li>Status: {health.status}</li>
            <li>Database: {health.checks.database}</li>
          </ul>
        )}
        {!health && !error && <p>Checking…</p>}
      </section>
    </main>
  );
}
