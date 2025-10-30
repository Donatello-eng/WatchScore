// src/api/http.ts
import { Platform } from "react-native";
import { authHeaders } from "../auth/session";
import { API_BASE } from "@/config/api";

//const API_BASE = "http://api.watchscore.bump.games";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = { "Content-Type": "application/json", ...(await authHeaders(API_BASE)), ...(init.headers || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}