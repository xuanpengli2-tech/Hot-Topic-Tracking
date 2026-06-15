/**
 * Client-side version of the discover engine.
 * Uses allorigins.win as CORS proxy to fetch Bing News RSS from the browser.
 */

import type { Trend, Region, TrendCategory, TrendScores, ResourceType, Platform } from "@/types/trend";

// ============ Utilities ============

function hashId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}

// ============ Types ============

type RawItem = {
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  platform: Platform;
  publishedAt?: string;
  engagement?: { views?: number; likes?: number; shares?: number };
};

// ============ Main Entry ============

export async function discoverTrendsClient(region: Region): Promise<Trend[]> {
  const rawItems = await fetchAllSources(region);

  const scored = rawItems
    .map((item) => processTrend(item, region))
    .filter((t): t is Trend => t !== null && t.scores.total >= 18)
    .filter((t) => !isInappropriate(t.title + " " + t.summary))
    .sort((a, b) => b.scores.total - a.scores.total);

  return scored.slice(0, 50);
}

// ============ NSFW Filter ============

function isInappropriate(text: string): boolean {
  const lower = text.toLowerCase();
  const blocked = [
    "porn", "xxx", "nsfw", "nude", "naked", "sex ", "sexual", "erotic",
    "hentai", "onlyfans", "stripper", "strip club", "adult film",
    "prostitut", "escort", "orgasm", "fetish", "bondage", "milf",
    "explicit", "x-rated", "xrated", "playboy", "brazzers",
    "gore", "murder", "suicide", "self-harm", "terrorist",
    "drug dealer", "cartel violence", "mass shooting",
    "child abuse", "pedophil", "trafficking",
    "chokes to death", "killed", "dies", "dead body", "homicide",
    "rape", "assault", "stabbed", "shooting victim",
    "overdose", "fentanyl death",
    "lawsuit", "scam", "fraud", "arrest", "prison",
    "bankruptcy", "divorce",
  ];
  return blocked.some(word => lower.includes(word));
}

// ============ CORS Proxy Fetch ============

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

// ============ Source Fetching ============

async function fetchAllSources(region: Region): Promise<RawItem[]> {
  const queries = getSearchQueries(region);
  const allItems: RawItem[] = [];

  // Batch fetch - max 6 concurrent to avoid proxy rate limit
  const batchSize = 6;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(q => fetchBingNews(q)));
    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return allItems.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============ Search Queries ============

function getSearchQueries(region: Region): string[] {
  const year = new Date().getFullYear();
  const core = [
    `TikTok viral ${year}`,
    `TikTok trending meme ${year}`,
    `TikTok dance viral`,
    `TikTok challenge trend ${year}`,
    `YouTube viral trending ${year}`,
    `YouTube trending video ${year}`,
    `TikTok cosplay gaming`,
    `TikTok anime viral`,
    `Discord meme gaming viral`,
  ];

  if (region === "SEA") {
    return [
      ...core,
      `TikTok Indonesia viral`,
      `TikTok Philippines viral`,
      `TikTok Thailand viral`,
      `TikTok Vietnam trending`,
      `TikTok Malaysia viral`,
      `YouTube Indonesia trending`,
      `YouTube Philippines trending`,
      `TikTok K-pop dance Southeast Asia`,
      `TikTok anime cosplay Asia`,
      `TikTok cute animal pet viral Asia`,
      `TikTok capybara cat viral`,
      `TikTok festival celebration Asia ${year}`,
      `TikTok gaming Free Fire Mobile Legends`,
    ];
  }
  return [
    ...core,
    `TikTok Brazil viral`,
    `TikTok Mexico viral`,
    `TikTok Argentina viral`,
    `TikTok Colombia viral`,
    `YouTube Brazil trending`,
    `YouTube Mexico trending`,
    `TikTok reggaeton dance viral`,
    `TikTok anime cosplay Latin America`,
    `TikTok cute animal pet viral`,
    `TikTok capybara viral`,
    `TikTok Dia de Muertos Carnival`,
    `TikTok lucha libre mask Mexico`,
    `TikTok gaming Free Fire viral`,
    `TikTok graffiti street art neon`,
  ];
}

// ============ Bing News RSS ============

async function fetchBingNews(query: string): Promise<RawItem[]> {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=en-US&safeSearch=Strict`;
  const xml = await proxyFetch(url);
  if (!xml) return [];
  return parseBingRSS(xml);
}

function parseBingRSS(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const entries = xml.split("<item>").slice(1);

  for (const entry of entries.slice(0, 8)) {
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

    const realUrl = extractRealUrl(link);
    const cleanedTitle = cleanTitle(stripHtml(title));
    const fullText = `${cleanedTitle} ${stripHtml(desc)}`.toLowerCase();

    let platform: Platform = "tiktok";
    if (/youtube|youtuber/.test(fullText)) platform = "youtube";
    else if (/tiktok|tik tok/.test(fullText)) platform = "tiktok";
    else if (/discord/.test(fullText)) platform = "web";

    if (/stock market|interest rate|federal reserve|gdp growth|inflation rate|congressional|parliament/.test(fullText)) continue;

    items.push({
      title: cleanedTitle,
      description: stripHtml(desc).slice(0, 500),
      url: realUrl,
      thumbnailUrl: img || "",
      platform,
      publishedAt: pubDate ? safeDate(pubDate) : undefined,
    });
  }
  return items;
}

// ============ Processing ============

function processTrend(item: RawItem, region: Region): Trend | null {
  if (!item.title || item.title.length < 5) return null;

  const text = `${item.title} ${item.description}`.toLowerCase();
  const category = classifyCategory(text);
  const scores = calculateScores(text, item, region);
  if (scores.categoryAffinity <= 1) return null;

  const suggestedTypes = suggestResourceTypes(text, category);
  const resourceSuggestion = buildResourceOneLiner(suggestedTypes);
  const summary = buildChineseSummary(item, category, region, suggestedTypes);
  const complianceNote = checkCompliance(text);

  return {
    id: hashId(`${item.platform}-${item.url}-${item.title.slice(0, 30)}`),
    title: item.title,
    summary,
    thumbnailUrl: item.thumbnailUrl || "",
    platform: item.platform,
    region,
    category,
    scores,
    resourceSuggestion,
    suggestedResourceTypes: suggestedTypes,
    sourceUrl: item.url,
    publishedAt: item.publishedAt,
    engagement: item.engagement,
    complianceNote,
  };
}

// ============ Compliance Check ============

function checkCompliance(text: string): string | undefined {
  const celebs = /taylor swift|drake|messi|ronaldo|blackpink|bts|mrbeast|pewdiepie|shakira|bad bunny|neymar|mbapp|jisoo|jennie|lisa|ive |aespa|stray kids/i;
  if (celebs.test(text)) {
    return "\u26a0\ufe0f 涉及真人肖像权，需规避直接使用真人形象，建议提取视觉风格/动作元素进行二次创作";
  }
  const ips = /marvel|disney|one piece|naruto|demon slayer|jujutsu|dragon ball|pokemon|hello kitty|sanrio|star wars|harry potter|dc comics|batman|spider.?man|genshin/i;
  if (ips.test(text)) {
    return "\u26a0\ufe0f 涉及第三方IP版权，需获取授权或仅参考视觉风格方向，不可直接使用角色/标志";
  }
  const sensitive = /politic|election|president|religious|mosque|church|temple|protest|military coup|territorial|separatist|genocide/i;
  if (sensitive.test(text)) {
    return "\u26a0\ufe0f 涉及政治/宗教敏感内容，建议仅提取非争议性视觉元素，规避文化冲突";
  }
  return undefined;
}

// ============ Category Classification ============

function classifyCategory(text: string): TrendCategory {
  if (/meme|funny|joke|humor|viral challenge|prank|reaction/.test(text)) return "meme";
  if (/movie|film|series|netflix|anime|drama|trailer|cinema|tv show/.test(text)) return "film_tv";
  if (/christmas|halloween|new year|carnival|eid|diwali|lunar|festival|holiday|dia de|thanksgiving/.test(text)) return "festival";
  if (/tradition|cultural|heritage|folk|indigenous|local custom|ritual/.test(text)) return "culture";
  if (/earthquake|hurricane|olympic|world cup|election|pandemic|war|breaking/.test(text)) return "big_event";
  return "pop_element";
}

// ============ Scoring ============

function calculateScores(text: string, item: RawItem, region: Region): TrendScores {
  let categoryAffinity = 2;
  let adaptationCost = 3;
  let mobileFit = 3;
  let audienceMatch = 3;
  let freshness = 3;
  let marketHeat = 3;

  // Category Affinity
  if (/skin|costume|outfit|armor|character|avatar|cosplay/.test(text)) categoryAffinity += 2;
  else if (/dance|emote|move|gesture|challenge/.test(text)) categoryAffinity += 2;
  else if (/weapon|gun|sword|blade/.test(text)) categoryAffinity += 2;
  else if (/meme|funny|sticker|emoji|spray|graffiti/.test(text)) categoryAffinity += 1;
  else if (/music|song|beat|rhythm/.test(text)) categoryAffinity += 1;
  if (/gaming|game|gamer|esport|streamer/.test(text)) categoryAffinity += 1;

  // Adaptation Cost
  if (/simple|minimal|clean|flat|2d|cartoon|chibi/.test(text)) adaptationCost += 1;
  if (/complex|detailed|realistic|photorealistic|intricate/.test(text)) adaptationCost -= 1;
  if (/neon|glow|cyber|futuristic|tech/.test(text)) adaptationCost += 1;

  // Mobile Fit
  if (/bold|bright|colorful|vibrant|contrast|neon/.test(text)) mobileFit += 1;
  if (/subtle|pastel|minimalist|tiny detail/.test(text)) mobileFit -= 1;
  if (/silhouette|iconic|recognizable/.test(text)) mobileFit += 1;

  // Audience Match
  if (region === "SEA") {
    if (/kpop|k-pop|anime|manga|cute|kawaii|idol/.test(text)) audienceMatch += 2;
    else if (/indonesia|philippines|thailand|vietnam|malaysia|singapore/.test(text)) audienceMatch += 1;
  } else {
    if (/reggaeton|latin|brazil|mexico|carnival|soccer|futbol/.test(text)) audienceMatch += 2;
    else if (/argentina|colombia|chile|peru/.test(text)) audienceMatch += 1;
  }
  if (/gen.?z|youth|teen|young|student/.test(text)) audienceMatch += 1;

  // Freshness
  if (item.publishedAt) {
    const age = Date.now() - new Date(item.publishedAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    if (days <= 2) freshness = 5;
    else if (days <= 7) freshness = 4;
    else if (days <= 14) freshness = 3;
    else freshness = 2;
  }

  // Market Heat
  if (/viral|trending|explod|blow up|million|billion/.test(text)) marketHeat += 2;
  else if (/popular|famous|hit|top|hot/.test(text)) marketHeat += 1;

  // Clamp
  const clamp = (v: number) => Math.max(1, Math.min(5, v));
  categoryAffinity = clamp(categoryAffinity);
  adaptationCost = clamp(adaptationCost);
  mobileFit = clamp(mobileFit);
  audienceMatch = clamp(audienceMatch);
  freshness = clamp(freshness);
  marketHeat = clamp(marketHeat);

  return {
    categoryAffinity,
    adaptationCost,
    mobileFit,
    audienceMatch,
    freshness,
    marketHeat,
    total: categoryAffinity + adaptationCost + mobileFit + audienceMatch + freshness + marketHeat,
  };
}

// ============ Resource Suggestions ============

const RESOURCE_NAMES: Record<ResourceType, string> = {
  character_skin: "角色皮肤",
  weapon_skin: "枪皮",
  weapon_charm: "挂件",
  finisher: "处决动作",
  emote: "表情/动作",
  spray: "喷漆",
  lobby_theme: "大厅主题",
  event_bundle: "活动礼包",
  parachute_skin: "降落伞皮肤",
  vehicle_skin: "载具皮肤",
  playpal: "盘盘(PlayPal)",
};

function suggestResourceTypes(text: string, category: TrendCategory): ResourceType[] {
  const types: ResourceType[] = [];

  if (/skin|costume|outfit|cosplay|fashion|dress|wear|character|avatar|face|mask/.test(text)) types.push("character_skin");
  if (/weapon|gun|sword|blade|neon|cyber|mecha|rifle/.test(text)) types.push("weapon_skin");
  if (/dance|move|gesture|challenge|emote|pose|choreography/.test(text)) types.push("emote");
  if (/meme|reaction|face|funny|sticker|emoji|graffiti|spray|art|skull|calavera/.test(text)) types.push("spray");
  if (/cute|pet|companion|mascot|chibi|creature|animal|capybara|cat|dog/.test(text)) types.push("playpal");
  if (/effect|explosion|fire|lightning|magic|kill|finisher/.test(text)) types.push("finisher");
  if (/music|beat|ambient|vibe|theme|aesthetic/.test(text)) types.push("lobby_theme");
  if (/accessory|charm|pendant|miniature|keychain/.test(text)) types.push("weapon_charm");
  if (/car|vehicle|racing|drift|lowrider|motorcycle/.test(text)) types.push("vehicle_skin");
  if (/fly|sky|wing|parachute|glide/.test(text)) types.push("parachute_skin");
  if (/festival|event|celebration|holiday|bundle|seasonal|carnival/.test(text)) types.push("event_bundle");

  if (types.length === 0) {
    switch (category) {
      case "meme": types.push("spray", "emote"); break;
      case "film_tv": types.push("character_skin", "weapon_skin"); break;
      case "festival": types.push("event_bundle", "character_skin"); break;
      case "culture": types.push("character_skin", "spray"); break;
      case "big_event": types.push("spray", "event_bundle"); break;
      case "pop_element": types.push("character_skin", "emote"); break;
    }
  }

  return Array.from(new Set(types)).slice(0, 3);
}

function buildResourceOneLiner(types: ResourceType[]): string {
  const names = types.map(t => RESOURCE_NAMES[t]).join("\u3001");
  return `可转化为${names}`;
}

// ============ Chinese Summary ============

function buildChineseSummary(
  item: RawItem,
  category: TrendCategory,
  region: Region,
  resourceTypes: ResourceType[]
): string {
  const desc = stripHtml(item.description || "");
  const regionName = region === "SEA" ? "东南亚" : "拉美";
  const platformName = item.platform === "tiktok" ? "TikTok" : item.platform === "youtube" ? "YouTube" : "网络";

  const whatIs = desc.length > 20 ? desc.slice(0, 200) : item.title;
  const analysis = buildSpecificAnalysis(item.title, desc, category, resourceTypes, regionName, platformName);
  const action = `建议快速产出${resourceTypes.map(rt => RESOURCE_NAMES[rt]).join("/")}类资源，抓住热度窗口期。`;

  return `【热点概述】${whatIs}\n\n【价值分析】${analysis}\n\n【资源建议】${action}`;
}

function buildSpecificAnalysis(
  title: string, desc: string, _category: TrendCategory,
  _resourceTypes: ResourceType[], regionName: string, platformName: string
): string {
  const text = `${title} ${desc}`.toLowerCase();
  const traits: string[] = [];

  if (/dance|choreography|move/.test(text)) traits.push("具有明确的动作编排，可直接转化为游戏内表情动作");
  if (/cute|kawaii|adorable|animal|pet|capybara|raccoon|cat|dog/.test(text)) traits.push("萌系/动物元素在年轻玩家中有极高接受度，适合做盘盘/挂件等可爱向资源");
  if (/cosplay|costume|outfit|skin/.test(text)) traits.push("角色装扮元素可直接参考做角色皮肤设计");
  if (/song|music|beat|rhythm/.test(text)) traits.push("音乐/节奏元素可用于大厅主题或动作配乐");
  if (/meme|funny|humor|joke/.test(text)) traits.push("梗图的社交传播性强，做成喷漆/表情后玩家会主动使用和分享");
  if (/viral|trending|challenge/.test(text)) traits.push(`当前在${platformName}上爆火，时效性强，建议快速响应`);
  if (/anime|manga|cartoon/.test(text)) traits.push("动漫元素在目标市场玩家群体中认知度极高");
  if (/neon|glow|cyber|futuristic/.test(text)) traits.push("视觉风格与Bloodstrike赛博朋克美学高度契合");
  if (/festival|holiday|celebration|carnival/.test(text)) traits.push(`${regionName}本地节日元素，能触发玩家文化认同感和付费意愿`);

  if (traits.length === 0) {
    traits.push(`该内容在${platformName}上获得大量关注，表明${regionName}玩家对此类内容有兴趣`);
  }

  return traits.slice(0, 3).join("。") + "。";
}

// ============ XML Helpers ============

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : "";
}

function extractCData(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
  return match ? match[1].trim() : "";
}

function cleanTitle(title: string): string {
  return title.replace(/\s+-\s+[^-]+$/, "").replace(/<[^>]+>/g, "").trim();
}

function extractRealUrl(bingLink: string): string {
  try {
    const decoded = bingLink.replace(/&amp;/g, "&");
    const match = decoded.match(/[?&]url=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch { /* fall through */ }
  return bingLink;
}

function safeDate(dateStr: string): string | undefined {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}
