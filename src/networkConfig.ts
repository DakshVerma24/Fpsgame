// ================= Network & WebRTC Configuration =================

export interface SignalingBrokerDef {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  path: string;
}

export const SIGNALING_BROKERS: Record<string, SignalingBrokerDef> = {
  primary: {
    id: 'primary',
    name: 'PeerJS Global Cloud (0.peerjs.com)',
    host: '0.peerjs.com',
    port: 443,
    secure: true,
    path: '/'
  }
};

export function getSelectedBrokerId(): string {
  try {
    const fromStorage = localStorage.getItem('cyberfps_broker');
    if (fromStorage && SIGNALING_BROKERS[fromStorage]) return fromStorage;
    if (fromStorage && !SIGNALING_BROKERS[fromStorage]) {
      localStorage.setItem('cyberfps_broker', 'primary');
    }
  } catch (e) {}
  return 'primary';
}

export function setSelectedBrokerId(id: string) {
  try {
    if (SIGNALING_BROKERS[id]) {
      localStorage.setItem('cyberfps_broker', id);
    } else {
      localStorage.setItem('cyberfps_broker', 'primary');
    }
  } catch (e) {}
}

export interface CustomTurnSettings {
  enabled: boolean;
  turnUrl: string;
  url?: string;
  username: string;
  credential: string;
}

export function getCustomTurnSettings(): CustomTurnSettings {
  try {
    const raw = localStorage.getItem('cyberfps_custom_turn');
    if (raw) {
      const parsed = JSON.parse(raw);
      const urlVal = parsed.turnUrl || parsed.url || '';
      return {
        enabled: Boolean(parsed.enabled),
        turnUrl: urlVal,
        url: urlVal,
        username: parsed.username || '',
        credential: parsed.credential || ''
      };
    }
  } catch (e) {}
  return {
    enabled: true,
    turnUrl: 'turns:shikshaseva-fps-turn.metered.ca:443?transport=tcp',
    url: 'turns:shikshaseva-fps-turn.metered.ca:443?transport=tcp',
    username: '919e6b3e5701b28511e0229c',
    credential: 'HAkGfDMH9sbMSpCm'
  };
}

export function setCustomTurnSettings(settings: { enabled: boolean; turnUrl?: string; url?: string; username: string; credential: string }) {
  try {
    const urlVal = settings.turnUrl || settings.url || '';
    const normalized: CustomTurnSettings = {
      enabled: settings.enabled,
      turnUrl: urlVal,
      url: urlVal,
      username: settings.username,
      credential: settings.credential
    };
    localStorage.setItem('cyberfps_custom_turn', JSON.stringify(normalized));
  } catch (e) {}
}

export function getActiveIceServers(): RTCIceServer[] {
  const custom = getCustomTurnSettings();
  const servers: RTCIceServer[] = [];

  // If user entered custom TURN overrides, prioritize them first
  if (custom.enabled && custom.turnUrl && custom.username !== '919e6b3e5701b28511e0229c') {
    servers.push({
      urls: custom.turnUrl,
      username: custom.username || undefined,
      credential: custom.credential || undefined
    });
  }

  // 1. Dedicated Metered.ca TURN & STUN Cluster (Shikshaseva FPS fallback for all peer servers)
  // Bypasses symmetric NATs, cellular tethering, and strict educational/corporate firewalls on ports 80/443
  servers.push({
    urls: [
      'stun:shikshaseva-fps-turn.metered.ca:80',
      'stun:shikshaseva-fps-turn.metered.ca:443'
    ]
  });
  servers.push({
    urls: [
      'turn:shikshaseva-fps-turn.metered.ca:80',
      'turn:shikshaseva-fps-turn.metered.ca:80?transport=tcp',
      'turn:shikshaseva-fps-turn.metered.ca:443',
      'turns:shikshaseva-fps-turn.metered.ca:443',
      'turns:shikshaseva-fps-turn.metered.ca:443?transport=tcp'
    ],
    username: '919e6b3e5701b28511e0229c',
    credential: 'HAkGfDMH9sbMSpCm'
  });

  // 2. Cloudflare Global Anycast STUN (Ultra-fast 3478 Anycast)
  servers.push({ urls: 'stun:stun.cloudflare.com:3478' });

  // 3. Google Public STUN Servers (Global Anycast low-latency nodes)
  servers.push(
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  );

  // 4. OpenRelay Community High-Capacity Relays (Metered project - UDP/TCP 80 & 443)
  servers.push(
    { urls: 'stun:openrelay.metered.ca:80' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  );

  return servers;
}

export function buildPeerConfig(brokerId?: string): Record<string, any> {
  const chosenBrokerId = brokerId || getSelectedBrokerId();
  const broker = SIGNALING_BROKERS[chosenBrokerId] || SIGNALING_BROKERS.primary;
  const iceServers = getActiveIceServers();

  return {
    host: broker.host,
    port: broker.port,
    path: broker.path,
    secure: broker.secure,
    debug: 1,
    config: {
      iceServers,
      iceCandidatePoolSize: 10,
      sdpSemantics: 'unified-plan'
    }
  };
}

export interface DiagResult {
  signalingBrokerOk: boolean;
  signalingBrokerLatency: number;
  stunOk: boolean;
  turnRelayOk: boolean;
  turnOk: boolean;
  candidatesFound: number;
  durationMs: number;
  discoveredCandidates: { type: string; protocol: string; address?: string }[];
  summary: string;
}

// Live real-time WebRTC self-test
export async function testWebRtcConnectivity(
  onLogOrBroker?: string | ((msg: string) => void),
  maybeBroker?: string
): Promise<DiagResult> {
  const onLog: ((msg: string) => void) | undefined = typeof onLogOrBroker === 'function' ? onLogOrBroker : undefined;
  const brokerKey: string = typeof onLogOrBroker === 'string' ? onLogOrBroker : (maybeBroker || getSelectedBrokerId());

  const broker = SIGNALING_BROKERS[brokerKey] || SIGNALING_BROKERS.primary;
  const iceServers = getActiveIceServers();

  const log = (msg: string) => {
    if (onLog) onLog(msg);
  };

  const result: DiagResult = {
    signalingBrokerOk: false,
    signalingBrokerLatency: 0,
    stunOk: false,
    turnRelayOk: false,
    turnOk: false,
    candidatesFound: 0,
    durationMs: 0,
    discoveredCandidates: [],
    summary: 'Testing...'
  };

  log(`[Broker] Pinging ${broker.name} (${broker.host})...`);

  // 1. Test signaling server HTTPS ping
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    await fetch(`https://${broker.host}:${broker.port}${broker.path}`, {
      method: 'GET',
      mode: 'no-cors',
      signal: controller.signal
    });
    clearTimeout(timeout);
    result.signalingBrokerOk = true;
    result.signalingBrokerLatency = Date.now() - startTime;
    log(`[Broker] Response received in ${result.signalingBrokerLatency}ms ✅`);
  } catch (err) {
    result.signalingBrokerOk = false;
    result.signalingBrokerLatency = Date.now() - startTime;
    log(`[Broker] Signaling request timed out or blocked by network (${result.signalingBrokerLatency}ms) ⚠️`);
  }

  log(`[ICE] Querying ${iceServers.length} STUN/TURN relays (Google, Cloudflare, OpenRelay, Metered)...`);

  // 2. Test STUN and TURN ICE gathering
  return new Promise((resolve) => {
    let pc: RTCPeerConnection | null = null;
    let finishTimer: any = null;

    const cleanup = () => {
      if (finishTimer) clearTimeout(finishTimer);
      if (pc) {
        try { pc.close(); } catch (e) {}
        pc = null;
      }
    };

    const finalize = () => {
      cleanup();
      const hasStun = result.discoveredCandidates.some(c => c.type === 'srflx');
      const hasRelay = result.discoveredCandidates.some(c => c.type === 'relay');
      result.stunOk = hasStun;
      result.turnRelayOk = hasRelay;
      result.turnOk = hasRelay;
      result.candidatesFound = result.discoveredCandidates.length;
      result.durationMs = Date.now() - startTime;

      if (result.signalingBrokerOk && (hasStun || hasRelay)) {
        result.summary = hasRelay
          ? 'EXCELLENT: STUN & TURN Relay active. Strict NAT/cellular bypass ready!'
          : 'GOOD: STUN direct connection active. Ready for standard networks!';
      } else if (!result.signalingBrokerOk) {
        result.summary = `WARNING: Signaling broker ${broker.host} unreachable. Please check your network connection!`;
      } else {
        result.summary = 'NOTICE: Local network candidate gathered. Test completed.';
      }
      log(`[Summary] Diagnostics completed in ${result.durationMs}ms with ${result.candidatesFound} ICE candidates.`);
      resolve(result);
    };

    try {
      pc = new RTCPeerConnection({ iceServers });
      pc.createDataChannel('diagTest');

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const type = e.candidate.type; // 'host' | 'srflx' | 'relay' | 'prflx'
          const proto = e.candidate.protocol;
          result.discoveredCandidates.push({
            type,
            protocol: proto,
            address: e.candidate.address || undefined
          });
          if (type === 'relay') {
            result.turnRelayOk = true;
            result.turnOk = true;
            log(`[Candidate] 🚀 TURN Relay candidate gathered (${proto.toUpperCase()}) -> NAT traversal guaranteed!`);
          } else if (type === 'srflx') {
            result.stunOk = true;
            log(`[Candidate] 🌐 Public STUN reflexive IP gathered (${proto.toUpperCase()})`);
          } else if (type === 'host') {
            log(`[Candidate] 💻 Local LAN host IP candidate gathered`);
          }
        } else {
          log('[ICE] ICE gathering state reached complete.');
          finalize();
        }
      };

      pc.onicegatheringstatechange = () => {
        if (pc?.iceGatheringState === 'complete') {
          finalize();
        }
      };

      pc.createOffer()
        .then((offer) => pc?.setLocalDescription(offer))
        .catch(() => finalize());

      finishTimer = setTimeout(finalize, 6000);
    } catch (e) {
      finalize();
    }
  });
}
