export interface DiskFile {
  name: string;
  mime_type?: string;
  preview?: string;
  size?: number;
  file?: string;
  type?: string;
}

function extractPublicKey(url: string): string {
  // Handle formats:
  // https://disk.yandex.ru/d/ABC123
  // https://yadi.sk/d/ABC123
  // https://disk.yandex.ru/client/disk?path=... (not supported)
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/d\/([^/]+)/);
    if (match) {
      return `https://disk.yandex.ru/d/${match[1]}`;
    }
  } catch {
    // not a valid URL, use as-is
  }
  return url;
}

export async function fetchPublicFolder(publicUrl: string): Promise<DiskFile[]> {
  const normalizedUrl = extractPublicKey(publicUrl);
  const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(
    normalizedUrl
  )}&limit=100`;

  console.log(`[Yandex.Disk] Fetching folder: ${normalizedUrl}`);

  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[Yandex.Disk] API error ${res.status}: ${text}`);
    throw new Error(`Yandex.Disk API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const items: DiskFile[] = data._embedded?.items || [];

  console.log(`[Yandex.Disk] Found ${items.length} items`);

  return items
    .filter((item: DiskFile) => item.type === "file" || item.mime_type?.startsWith("image/"))
    .map((item: DiskFile) => ({
      name: item.name,
      mime_type: item.mime_type,
      preview: item.preview,
      size: item.size,
      file: item.file,
      type: item.type,
    }));
}
