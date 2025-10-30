// src/auth/session.ts
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

type MaybeSession = { clientId: string | null; apiKey: string | null };
type Session = { clientId: string; apiKey: string };

const K_ID = "clientId";
const K_KEY = "apiKey";

const SECURE_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function get(key: string): Promise<string | null> {
  const v = await SecureStore.getItemAsync(key);
  if (v) return v;
  return AsyncStorage.getItem(key); // fallback
}

async function set(key: string, val: string): Promise<void> {
  if (typeof val !== "string") throw new Error(`SecureStore value for ${key} must be string`);
  await SecureStore.setItemAsync(key, val, SECURE_OPTS);
  await AsyncStorage.setItem(key, val);
}

export async function saveSession(id: unknown, key: unknown): Promise<void> {
  if (typeof id !== "string" || typeof key !== "string") {
    throw new Error("saveSession: id/key must be strings");
  }
  await set(K_ID, id);
  await set(K_KEY, key);
}

export async function loadSession(): Promise<MaybeSession> {
  const clientId = await get(K_ID);
  const apiKey = await get(K_KEY);
  return { clientId, apiKey };
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(K_ID);
  await SecureStore.deleteItemAsync(K_KEY);
  await AsyncStorage.multiRemove([K_ID, K_KEY]);
}

// Ensure we return a NON-nullable Session
export async function ensureSession(apiBase: string): Promise<Session> {
  const s = await loadSession();
  if (s.clientId && s.apiKey) return { clientId: s.clientId, apiKey: s.apiKey };

  const r = await fetch(`${apiBase}/session/anon`, { method: "POST" });
  const txt = await r.text();
  if (!r.ok) throw new Error(`session/anon failed: ${r.status} ${txt.slice(0,200)}`);

  let j: any;
  try { j = JSON.parse(txt); } catch { throw new Error("session/anon returned non-JSON"); }

  const clientId = typeof j?.clientId === "string" ? j.clientId : "";
  const apiKey   = typeof j?.apiKey   === "string" ? j.apiKey   : "";
  if (!clientId || !apiKey) throw new Error(`Bad session payload: ${txt.slice(0,200)}`);

  await saveSession(clientId, apiKey);
  return { clientId, apiKey };
}

// Prefer requiring apiBase so we can auto-create if missing
export async function authHeaders(apiBase: string): Promise<Record<string,string>> {
  const s = await ensureSession(apiBase);
  if (!s.clientId || !s.apiKey) throw new Error("No session after ensureSession");
  return { "X-Client-Id": s.clientId, Authorization: `Bearer ${s.apiKey}` };
}
