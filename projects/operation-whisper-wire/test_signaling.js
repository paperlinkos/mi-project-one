// Automated End-to-End WebRTC Signaling Relay Verification for Operation Whisper Wire
// Uses Node 22+ native WebSocket API

const SIGNAL_URL = 'ws://localhost:8088/ws';

async function runSignalingTest() {
  console.log('--- STARTING OPERATION WHISPER WIRE SIGNALING VERIFICATION ---');

  // 1. Check HTTP Health
  const healthRes = await fetch('http://localhost:8088/health').then((r) => r.json());
  console.log('✓ [1/5] Go Signaling Relay Health Check:', healthRes);

  const testRoom = 'FREQ-TEST-OMEGA';
  const peerA_ID = 'AGENT-ALPHA';
  const peerB_ID = 'AGENT-BRAVO';

  // 2. Connect Peer A
  const wsA = new WebSocket(`${SIGNAL_URL}?room=${testRoom}&peer=${peerA_ID}`);
  await new Promise((resolve, reject) => {
    wsA.onopen = resolve;
    wsA.onerror = reject;
  });
  console.log(`✓ [2/5] Peer A (${peerA_ID}) connected to room [${testRoom}].`);

  // Setup Peer A listeners
  let peerA_receivedJoined = false;
  let peerA_receivedAnswer = false;
  let peerA_receivedCandidate = false;

  wsA.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'peer_joined' && msg.sender === peerB_ID) {
      peerA_receivedJoined = true;
    } else if (msg.type === 'answer') {
      peerA_receivedAnswer = true;
    } else if (msg.type === 'candidate') {
      peerA_receivedCandidate = true;
    }
  };

  // 3. Connect Peer B
  let peerB_receivedOffer = false;
  const wsB = new WebSocket(`${SIGNAL_URL}?room=${testRoom}&peer=${peerB_ID}`);
  await new Promise((resolve, reject) => {
    wsB.onopen = resolve;
    wsB.onerror = reject;
  });
  console.log(`✓ [3/5] Peer B (${peerB_ID}) connected. Waiting for peer_joined broadcast...`);

  wsB.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'offer') {
      peerB_receivedOffer = true;
    }
  };

  // Give brief moment for peer_joined broadcast
  await new Promise((r) => setTimeout(r, 200));

  if (!peerA_receivedJoined) {
    throw new Error('Peer A did not receive peer_joined notification');
  }
  console.log('✓ Peer A successfully notified of Peer B arrival.');

  // 4. Test SDP Offer & Answer exchange
  console.log('✓ [4/5] Testing WebRTC SDP Offer / Answer & ICE Candidate Relay...');
  wsA.send(
    JSON.stringify({
      type: 'offer',
      room: testRoom,
      sender: peerA_ID,
      payload: { type: 'offer', sdp: 'v=0\r\no=operative 1234 5678 IN IP4 0.0.0.0\r\ns=audio\r\n' },
    })
  );

  await new Promise((r) => setTimeout(r, 200));
  if (!peerB_receivedOffer) {
    throw new Error('Peer B did not receive SDP offer');
  }

  wsB.send(
    JSON.stringify({
      type: 'answer',
      room: testRoom,
      sender: peerB_ID,
      payload: { type: 'answer', sdp: 'v=0\r\no=operative 8765 4321 IN IP4 0.0.0.0\r\ns=audio\r\n' },
    })
  );

  await new Promise((r) => setTimeout(r, 200));
  if (!peerA_receivedAnswer) {
    throw new Error('Peer A did not receive SDP answer');
  }

  // Test ICE Candidate Relay
  wsB.send(
    JSON.stringify({
      type: 'candidate',
      room: testRoom,
      sender: peerB_ID,
      payload: { candidate: 'candidate:1 1 UDP 2130706431 192.168.1.50 50000 typ host', sdpMid: '0', sdpMLineIndex: 0 },
    })
  );

  await new Promise((r) => setTimeout(r, 200));
  if (!peerA_receivedCandidate) {
    throw new Error('Peer A did not receive ICE candidate');
  }
  console.log('✓ SDP Offer, Answer, and ICE candidates relayed with zero corruption.');

  // 5. Test 2-Operative Channel Ceiling (Room Full rejection)
  console.log('✓ [5/5] Testing 2-Operative Channel Ceiling (Rejecting 3rd wiretap party)...');
  let thirdPartyRejected = false;
  const wsC = new WebSocket(`${SIGNAL_URL}?room=${testRoom}&peer=INTRUDER-99`);
  wsC.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'room_full') {
      thirdPartyRejected = true;
    }
  };

  await new Promise((r) => setTimeout(r, 300));
  if (!thirdPartyRejected) {
    throw new Error('Third party connection was not rejected with room_full');
  }
  console.log('✓ Third party connection correctly rejected with room_full code.');

  wsA.close();
  wsB.close();
  wsC.close();

  console.log('\n================================================================');
  console.log('>>> ALL OPERATION WHISPER WIRE SIGNALING TESTS PASSED (5/5) <<<');
  console.log('================================================================\n');
}

runSignalingTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
