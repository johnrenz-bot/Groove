import { GET } from '../app/api/studios/route';
import { NextRequest } from 'next/server';

async function main() {
  console.log('=== TEST 1: Default call without params ===');
  const req1 = new NextRequest('http://localhost:3000/api/studios');
  const res1 = await GET(req1);
  const data1 = await res1.json();
  console.log('Status 1:', res1.status);
  console.log('Center 1:', data1.center);
  console.log('Places count 1:', data1.places?.length);
  console.log('Places 1 sample:', JSON.stringify(data1.places?.slice(0, 3), null, 2));

  console.log('\n=== TEST 2: Radius call with radius=10km ===');
  const req2 = new NextRequest('http://localhost:3000/api/studios?lat=14.8139&lng=121.0453&radius=10');
  const res2 = await GET(req2);
  const data2 = await res2.json();
  console.log('Status 2:', res2.status);
  console.log('Places count 2:', data2.places?.length);
  console.log('Places 2 sample:', JSON.stringify(data2.places?.map((p: { name: string; distanceKm: number }) => ({ name: p.name, distanceKm: p.distanceKm })), null, 2));

  console.log('\n=== TEST 3: Radius call in Cebu (10.3157, 123.8854) ===');
  const req3 = new NextRequest('http://localhost:3000/api/studios?lat=10.3157&lng=123.8854&radius=25');
  const res3 = await GET(req3);
  const data3 = await res3.json();
  console.log('Status 3:', res3.status);
  console.log('Places count 3 (curated Bulacan studios should NOT show in Cebu):', data3.places?.length);
}

main().catch(console.error);
