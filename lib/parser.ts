import * as cheerio from "cheerio";

export async function fetchPageText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const html = await response.text();

  const $ = cheerio.load(html);

  // Remove script/style/nav/footer/header
  $("script, style, nav, footer, header, aside, .advertisement").remove();

  // Try to find main content
  let content = $("article, main, [role='main']").first().text();

  if (!content.trim()) {
    content = $("body").text();
  }

  return content
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim()
    .slice(0, 50000);
}

export function extractYouTubeVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
