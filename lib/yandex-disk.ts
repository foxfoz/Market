export interface DiskFile {
  name: string;
  mime_type?: string;
  preview?: string;
  size?: number;
  file?: string;
  type?: string;
}

export async function fetchPublicFolder(publicUrl: string): Promise<DiskFile[]> {
  const apiUrl = `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(
    publicUrl
  )}&limit=100`;

  const res = await fetch(apiUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Yandex.Disk API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const items: DiskFile[] = data._embedded?.items || [];

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
