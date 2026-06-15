/**
 * Client-side competitor reference fetcher.
 * Uses allorigins.win CORS proxy to fetch Bing News RSS.
 */

import type { Region } from "@/types/trend";

export type CompetitorRef = {
  id: string;
  game: "Free Fire" | "PUBG Mobile" | "CODM" | "Apex Legends";
  title: string;
  description: string;
  thumbnailUrl: string;
  sourceUrl: string;
  trendReference: string;
  resourceType: string;
  region: Region;
  publishedAt?: string;
};

async function proxyFetch(url: string): Promise<string> {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCompetitorsClient(region: Region): Promise<CompetitorRef[]> {
  const games: { name: CompetitorRef["game"]; queries: string[] }[] = [
    { name: "Free Fire", queries: getGameQueries("Free Fire", region) },
    { name: "PUBG Mobile", queries: getGameQueries("PUBG Mobile", region) },
    { name: "CODM", queries: getGameQueries("CODM", region) },
    { name: "Apex Legends", queries: getGameQueries("Apex Legends", region) },
  ];

  const all: CompetitorRef[] = [];

  for (const game of games) {
    for (const query of game.queries) {
      try {
        const items = await fetchBingNewsRSS(query);
        for (const item of items) {
          all.push({
            id: hashStr(`${game.name}-${item.url}`),
            game: game.name,
            title: item.title,
            description: item.description,
            thumbnailUrl: item.thumbnailUrl,
            sourceUrl: item.url,
            trendReference: extractTrendRef(item.title, item.description),
            resourceType: extractResourceType(item.title, item.description),
            region,
            publishedAt: item.publishedAt,
          });
        }
      } catch { /* skip */ }
    }
  }

  const seen = new Set<string>();
  return all.filter(item => {
    const key = item.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

function getGameQueries(game: string, region: Region): string[] {
  const year = new Date().getFullYear();
  const base = [
    `${game} skin collaboration ${year}`,
    `${game} costume event cosmetic ${year}`,
    `${game} cultural theme skin bundle ${year}`,
  ];
  if (region === "SEA") base.push(`${game} Southeast Asia event skin ${year}`);
  else base.push(`${game} Latin America event skin ${year}`);
  return base;
}

type RSSItem = { title: string; description: string; url: string; thumbnailUrl: string; publishedAt?: string };

async function fetchBingNewsRSS(query: string): Promise<RSSItem[]> {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`;
  const xml = await proxyFetch(url);
  if (!xml) return [];
  return parseBingRSS(xml);
}

function parseBingRSS(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const entries = xml.split("<item>").slice(1);

  for (const entry of entries.slice(0, 5)) {
    const title = extractCData(entry, "title") || extractTag(entry, "title");
    const link = extractTag(entry, "link");
    const pubDate = extractTag(entry, "pubDate");
    const desc = extractCData(entry, "description") || extractTag(entry, "description") || "";

    let img = extractTag(entry, "News:Image");
    if (!img) {
      const encMatch = entry.match(/enclosure[^>]+url="([^"]+)"/i);
      if (encMatch) img = encMatch[1];
    }
    if (!img) {
      const imgMatch = desc.match(/src="([^"]+)"/);
      if (imgMatch) img = imgMatch[1];
    }

    if (!title || !link) continue;

    items.push({
      title: stripHtml(title).replace(/\s+-\s+[^-]+$/, "").trim(),
      description: stripHtml(desc).slice(0, 300),
      url: link,
      thumbnailUrl: img || "",
      publishedAt: pubDate ? safeDate(pubDate) : undefined,
    });
  }
  return items;
}

function extractTrendRef(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  if (/collab|collaboration|x |crossover|partner/.test(text)) return "品牌/IP联动";
  if (/cultural|festival|holiday|lunar|eid|christmas|halloween|carnival/.test(text)) return "节日/文化主题";
  if (/anime|manga|one piece|naruto|dragon ball/.test(text)) return "动漫IP联动";
  if (/music|rapper|singer|kpop|k-pop/.test(text)) return "音乐/艺人联动";
  if (/movie|film|marvel|dc|star wars/.test(text)) return "影视IP联动";
  return "限时主题活动";
}

function extractResourceType(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  if (/skin|costume|outfit|character/.test(text)) return "角色皮肤";
  if (/weapon|gun|blade/.test(text)) return "武器皮肤";
  if (/emote|dance/.test(text)) return "表情/动作";
  if (/vehicle|car/.test(text)) return "载具皮肤";
  if (/bundle|pack|event/.test(text)) return "活动礼包";
  if (/pet|companion/.test(text)) return "宠物/伴侣";
  return "综合资源";
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
}

function extractCData(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
  return match ? match[1].trim() : "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

function hashStr(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function safeDate(s: string): string | undefined {
  try { const d = new Date(s); return isNaN(d.getTime()) ? undefined : d.toISOString(); } catch { return undefined; }
}
