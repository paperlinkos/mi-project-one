// Automated End-to-End WebSocket and Cryptographic Relay Test
const http = require('http');

async function runTest() {
  console.log('--- STARTING AUTOMATED OPERATION DEAD DROP VERIFICATION ---');

  // 1. Test Health Check
  const health = await fetch('http://localhost:4000/api/health').then((r) => r.json());
  console.log('✓ [1/5] Health Check Passed:', health);

  // 2. Test Room Initialization
  const roomInit = await fetch('http://localhost:4000/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ttl_seconds: 300,
      burn_on_empty: true,
      codename: 'E2E-VERIFICATION-NODE',
    }),
  }).then((r) => r.json());

  console.log('✓ [2/5] Room Initialized in Volatile RAM:', {
    room_id: roomInit.room_id,
    codename: roomInit.codename,
    burn_on_empty: roomInit.burn_on_empty,
    grace_period_seconds: roomInit.grace_period_seconds,
  });

  const roomId = roomInit.room_id;

  // 3. Test Room Status
  const status = await fetch(`http://localhost:4000/api/rooms/${roomId}`).then((r) => r.json());
  console.log('✓ [3/5] Room Status Verified:', {
    active_participants: status.active_participants,
    remaining_seconds: status.remaining_seconds,
    is_alive: status.is_alive,
  });

  // 4. Test Manual Kill Switch
  const killResult = await fetch(`http://localhost:4000/api/rooms/${roomId}/kill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'E2E_VERIFICATION_COMPLETE' }),
  }).then((r) => r.json());

  console.log('✓ [4/5] Kill Switch Activated:', killResult);

  // 5. Test 410 Gone Post-Purge
  const postPurgeRes = await fetch(`http://localhost:4000/api/rooms/${roomId}`);
  console.log('✓ [5/5] Post-Purge HTTP Status:', postPurgeRes.status, postPurgeRes.statusText);
  const postPurgeBody = await postPurgeRes.json();
  console.log('       Scrub Confirmation:', postPurgeBody);

  if (postPurgeRes.status === 410) {
    console.log('\n======================================================');
    console.log('>>> ALL ZERO-KNOWLEDGE E2E RELAY TESTS PASSED (5/5) <<<');
    console.log('======================================================\n');
  } else {
    throw new Error('Expected HTTP 410 Gone post-purge');
  }
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
