import * as FileSystem from "expo-file-system/legacy";

// For emulator: http://10.0.2.2:8000
// For real device: your ngrok HTTPS URL
const API_BASE = "http://10.0.2.2:8000";

type PresignItem = {
  key: string;
  uploadUrl: string;
  headers: Record<string, string>; // { "Content-Type": "image/jpeg" }
};

export async function initWatchPresign(count: number, contentTypes: string[]) {
  const res = await fetch(`${API_BASE}/watches/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ count, contentTypes }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ watchId: number; uploads: PresignItem[] }>;
}
export async function putToS3(
  uploadUrl: string,
  fileUri: string,
  headers: Record<string, string>
) {
  console.log("PUT S3", { uploadUrl: uploadUrl.slice(0, 90) + "…", headers, fileUri });

  const res = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers,
  });

  console.log("PUT S3 result", res.status, (res.body || "").slice(0, 200));

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`S3 upload failed: ${res.status} ${res.body?.slice(0, 200)}`);
  }
}
export async function finalizeWatch(
  watchId: number,
  keys: string[],
  analyze = true
) {
  const photos = keys.map((key) => ({ key }));
  const res = await fetch(`${API_BASE}/watches/${watchId}/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos, analyze }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // watch with signed photo URLs + ai
}
