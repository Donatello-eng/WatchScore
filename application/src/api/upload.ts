// src/api/upload.ts
import { Platform } from "react-native";

export const API = "http://10.0.2.2:8000"; // ← FORCE this for now while testing emulator
console.log("API base =", API);

function guessMimeType(nameOrUri: string) {
  const ext = nameOrUri.split(".").pop()?.toLowerCase().split("?")[0];
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
    case "heif":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

/** Upload up to 3 images for a session. */
export async function uploadSession(sessionId: string, images: string[]) {
  const form = new FormData();
  form.append("sessionId", sessionId);

  images.slice(0, 3).forEach((uri, idx) => {
    const name = `photo_${idx + 1}.${
      (uri.split(".").pop() || "jpg").split("?")[0]
    }`;
    form.append("files", { uri, name, type: guessMimeType(uri) } as any);
  });

  const res = await fetch(`${API}/sessions/${sessionId}/upload`, {
    method: "POST",
    body: form, // don't set Content-Type manually
  });

  if (!res.ok)
    throw new Error((await res.text()) || `Upload failed ${res.status}`);
  return res.json();
}

/** Ask server to analyze the uploaded photos for this session. */
export async function analyzeSession(sessionId: string) {
  const res = await fetch(`${API}/sessions/${sessionId}/analyze`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(await res.text());
  // shape: { status: "DONE", sessionId, watch, ai }
  return res.json() as Promise<{
    status: string;
    sessionId: string;
    watch: any;
    ai: any;
  }>;
}

/** Fetch a watch later (e.g., on a details screen). */
export async function getWatch(watchId: number) {
  const res = await fetch(`${API}/watches/${watchId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { id, name, brand, model, photos[], analysis, ai }
}
