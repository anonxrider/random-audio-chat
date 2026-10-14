const CALLS_BASE_URL = 'https://rtc.live.cloudflare.com/v1';

export interface CallsConfig {
  appId: string | undefined;
  appSecret: string | undefined;
  isConfigured: boolean;
}

export function getCloudflareCallsConfig(): CallsConfig {
  const appId = process.env.CLOUDFLARE_CALLS_APP_ID?.trim();
  const appSecret = process.env.CLOUDFLARE_CALLS_APP_SECRET?.trim();

  const isConfigured = Boolean(
    appId &&
    appSecret &&
    appId !== 'your_cloudflare_calls_app_id_here' &&
    appSecret !== 'your_cloudflare_calls_app_secret_here'
  );

  return { appId, appSecret, isConfigured };
}

export async function callsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const { appId, appSecret, isConfigured } = getCloudflareCallsConfig();

  if (!isConfigured || !appId || !appSecret) {
    throw new Error('CLOUDFLARE_CONFIG_MISSING: Cloudflare Calls credentials are missing or not set in .env.local');
  }

  const url = `${CALLS_BASE_URL}/apps/${appId}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${appSecret}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.errors?.[0]?.message || data?.messages?.[0] || response.statusText || 'Calls API Error';
    throw new Error(`Cloudflare Calls API Error (${response.status}): ${JSON.stringify(errorMsg)}`);
  }

  return data as T;
}

export interface CallsSessionResponse {
  sessionId: string;
}

export interface CallsSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface LocalTrackDescriptor {
  location: 'local';
  mid: string;
  trackName: string;
}

export interface RemoteTrackDescriptor {
  location: 'remote';
  sessionId: string;
  trackName: string;
}

export interface NewTracksResponse {
  sessionDescription?: CallsSessionDescription;
  tracks?: Array<{
    location: string;
    mid: string;
    trackName: string;
    status?: string;
    sessionId?: string;
  }>;
  requiresImmediateRenegotiation?: boolean;
}

export async function createCallsSession(): Promise<CallsSessionResponse> {
  return callsRequest<CallsSessionResponse>('/sessions/new', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function publishLocalTracks(
  sessionId: string,
  sessionDescription: CallsSessionDescription,
  tracks: LocalTrackDescriptor[]
): Promise<NewTracksResponse> {
  return callsRequest<NewTracksResponse>(`/sessions/${sessionId}/tracks/new`, {
    method: 'POST',
    body: JSON.stringify({
      sessionDescription,
      tracks,
    }),
  });
}

export async function subscribeRemoteTracks(
  sessionId: string,
  tracks: RemoteTrackDescriptor[]
): Promise<NewTracksResponse> {
  return callsRequest<NewTracksResponse>(`/sessions/${sessionId}/tracks/new`, {
    method: 'POST',
    body: JSON.stringify({
      tracks,
    }),
  });
}

export async function renegotiateCallsSession(
  sessionId: string,
  sessionDescription: CallsSessionDescription
): Promise<unknown> {
  return callsRequest(`/sessions/${sessionId}/renegotiate`, {
    method: 'PUT',
    body: JSON.stringify({
      sessionDescription,
    }),
  });
}

export async function closeCallsTracks(
  sessionId: string,
  tracks: Array<{ mid?: string; trackName?: string }>
): Promise<unknown> {
  return callsRequest(`/sessions/${sessionId}/tracks/close`, {
    method: 'PUT',
    body: JSON.stringify({
      tracks,
    }),
  });
}
