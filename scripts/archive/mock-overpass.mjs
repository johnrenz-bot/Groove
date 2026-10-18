/**
 * Test double for the Overpass API — NOT part of the app.
 *
 * WHY
 *   The Studio Locator's OSM validation is the part that is hardest to test
 *   against the real service: the public Overpass instances are frequently
 *   unreachable from CI (which is exactly why `/api/studios` carries a fallback
 *   list and a 12-second per-attempt budget), and even when reachable they will
 *   not return a nameless element, a coordinate-less relation and a
 *   `remark` on demand.
 *
 *   So this stands in for Overpass with a deliberately nasty payload, and the
 *   route is pointed at it via `OVERPASS_API_URL`. Every assertion about
 *   "unnamed", "without a usable location" and "beyond the limit" is made
 *   against rows that really exist.
 *
 *   Modes, switched with `?mode=`:
 *     mixed    (default) valid + unnamed + no-coordinates + out-of-range +
 *              a centre-only relation + a remark
 *     empty    a well-formed response with no elements at all
 *     remark   no elements, but a remark (the "area not found" shape)
 *     fail     HTTP 504, the shared-instance-busy reality
 *
 * USAGE
 *   node scripts/mock-overpass.mjs          # listens on :3999
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 3999);

/** Built around the locator's own default centre so coordinates are in range. */
const CENTER = { lat: 14.8139, lon: 121.0453 };

const near = (dLat, dLon) => ({
  lat: Number((CENTER.lat + dLat).toFixed(7)),
  lon: Number((CENTER.lon + dLon).toFixed(7)),
});

const MIXED = {
  version: 0.6,
  generator: 'mock-overpass',
  remark: 'runtime error: Query timed out in "query" at line 1',
  elements: [
    // ── valid ──────────────────────────────────────────────────────────────
    {
      type: 'node',
      id: 1001,
      ...near(0.001, 0.001),
      tags: { amenity: 'dance', name: 'Valid Dance Hall', 'addr:street': 'Main St' },
    },
    // A way with no lat/lon but a `center` — `out center` supplies one.
    {
      type: 'way',
      id: 1002,
      center: near(0.002, -0.002),
      tags: { building: 'dance', name: 'Valid Arts Centre', 'addr:city': 'Bulacan' },
    },
    // Named via `official_name` rather than `name` — still usable.
    {
      type: 'node',
      id: 1003,
      ...near(-0.001, 0.003),
      tags: { amenity: 'theatre', official_name: 'Official Name Theatre' },
    },
    // Named via `operator` — also accepted by the route.
    {
      type: 'node',
      id: 1004,
      ...near(0.004, 0.001),
      tags: { leisure: 'dance', operator: 'Operator Run Studio' },
    },

    // ── must be skipped ────────────────────────────────────────────────────
    // No name at all: nothing a user could act on.
    { type: 'node', id: 2001, ...near(0.001, 0.002), tags: { amenity: 'dance' } },
    // Name present but only whitespace.
    { type: 'node', id: 2002, ...near(0.001, 0.004), tags: { name: '   ' } },
    // Named, but no coordinate and no center.
    { type: 'node', id: 2003, tags: { amenity: 'dance', name: 'No Coordinates' } },
    // Named relation whose center is missing lat.
    { type: 'relation', id: 2004, center: { lon: CENTER.lon }, tags: { name: 'Half A Centre' } },
    // Coordinates outside the valid range — must not reach Leaflet.
    {
      type: 'node',
      id: 2005,
      lat: 999,
      lon: 999,
      tags: { amenity: 'dance', name: 'Impossible Coordinates' },
    },
    // Malformed types: no `type`, non-numeric `id`.
    { id: 2006, ...near(0.003, 0.003), tags: { name: 'No Type' } },
    { type: 'node', id: 'not-a-number', ...near(0.003, 0.005), tags: { name: 'Bad Id' } },
  ],
};

const EMPTY = { version: 0.6, generator: 'mock-overpass', elements: [] };
const REMARK_ONLY = { version: 0.6, generator: 'mock-overpass', remark: 'area not found', elements: [] };

const server = http.createServer((req, res) => {
  const mode = new URL(req.url, 'http://localhost').searchParams.get('mode') ?? 'mixed';

  if (mode === 'fail') {
    res.writeHead(504, { 'Content-Type': 'text/plain' });
    res.end('Gateway Timeout');
    return;
  }

  const body =
    mode === 'empty' ? EMPTY : mode === 'remark' ? REMARK_ONLY : MIXED;

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

server.listen(PORT, () => {
  console.log(`mock Overpass listening on http://localhost:${PORT}/api/interpreter`);
});