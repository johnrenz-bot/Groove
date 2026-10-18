/**
 * Second test double: Overpass that answers 200 with ZERO elements.
 *
 * Separate from `mock-overpass.mjs` — and on a separate port — on purpose. The
 * `/api/studios` route caches its upstream fetch with `next: { revalidate: 600 }`,
 * and that cache key is the ENDPOINT URL. Running the "no results" case against
 * the same host:port as the "mixed payload" case would replay the first cached
 * response and quietly test nothing.
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 3998);

http
  .createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    // A well-formed Overpass response that simply found nothing.
    res.end(JSON.stringify({ version: 0.6, generator: 'mock-overpass', elements: [] }));
  })
  .listen(PORT, () => {
    console.log(`mock Overpass (empty) listening on http://localhost:${PORT}/api/interpreter`);
  });