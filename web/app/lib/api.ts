export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

export interface RoomSummary {
  name: string;
  subject: string;
  locked: boolean;
  has_password: boolean;
  lobby_enabled: boolean;
  e2ee_enabled: boolean;
  active_participants: number;
  last_active_at: number;
}

export interface RoomStats {
  room: string;
  active_participants: number;
  sfu_peers: number;
  sfu_udp_addr: string;
  speaker_stats: Array<{
    id: string;
    display_name: string;
    speaking_ms: number;
    breakout_id: string | null;
    is_moderator: boolean;
  }>;
}

export interface SharedFileMeta {
  id: string;
  room_name: string;
  sender_name: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  created_at: number;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getMe: () => req<{ user: SessionUser | null }>("/api/auth/me"),
  login: (email: string, password: string) =>
    req<{ user: SessionUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, display_name: string, password: string) =>
    req<{ user: SessionUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, display_name, password }),
    }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  listRooms: () => req<{ rooms: RoomSummary[] }>("/api/rooms"),
  createRoom: (payload: { name: string; subject?: string; password?: string; lobby_enabled?: boolean }) =>
    req<{ room: RoomSummary }>("/api/rooms", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getRoom: (name: string) => req<{ room: RoomSummary }>(`/api/rooms/${encodeURIComponent(name)}`),
  mintToken: (name: string, display_name: string, moderator: boolean) =>
    req<{ token: string; room: string; moderator: boolean }>(`/api/rooms/${encodeURIComponent(name)}/token`, {
      method: "POST",
      body: JSON.stringify({ display_name, moderator }),
    }),
  getRoomStats: (name: string) => req<RoomStats>(`/api/rooms/${encodeURIComponent(name)}/stats`),
  listRoomFiles: (name: string) =>
    req<{ files: SharedFileMeta[] }>(`/api/rooms/${encodeURIComponent(name)}/files`),
  uploadRoomFile: (
    name: string,
    payload: { filename: string; mime_type: string; data_base64: string; sender_name: string },
  ) =>
    req<{ file: SharedFileMeta }>(`/api/rooms/${encodeURIComponent(name)}/files`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  roomFileDownloadUrl: (roomName: string, fileId: string) =>
    `/api/rooms/${encodeURIComponent(roomName)}/files/${encodeURIComponent(fileId)}`,
  submitFeedback: (name: string, rating: number, comment: string) =>
    req<{ ok: boolean; id: string }>(`/api/rooms/${encodeURIComponent(name)}/feedback`, {
      method: "POST",
      body: JSON.stringify({ rating, comment }),
    }),
};
