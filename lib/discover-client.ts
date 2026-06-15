/**
 * Client-side discover engine v2
 * 
 * 改进点：
 * 1. 搜索查询基于地区文化特色优化
 * 2. 分类使用智能规则引擎（非简单关键词匹配）
 * 3. 价值分析基于地区文化差异做深度解读
 * 4. 热点总结结构化，包含"是什么+为什么重要+怎么用"
 */

import type { Trend, Region, TrendCategory, TrendScores, ResourceType, Platform } from "@/types/trend";
import {
  REGION_CULTURE,
  getOptimizedQueries,
  classifyCategoryAdvanced,
  generateValueAnalysis,
  isMemeWorthy,
} from "@/lib/region-knowledge";

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
    .filter((item) => isMemeWorthy(item.title, item.description, region))
    .map((item) => processTrend(item, region))
    .filter((t): t is Trend => t !== null && t.scores.total >= 16)
    .filter((t) => !isInappropriate(t.title + " " + t.summary))
    .sort((a, b) => b.scores.total - a.scores.total);

  return scored.slice(0, 50);
}

// ============ Content Filter ============

function isInappropriate(text: string): boolean {
  const lower = text.toLowerCase();
  const blocked = [
    "porn", "xxx", "nsfw", "nude", "naked", "sex ", "sexual", "erotic",
    "hentai", "onlyfans", "stripper", "adult film",
    "prostitut", "escort", "orgasm", "fetish", "bondage",
    "gore", "murder", "suicide", "self-harm", "terrorist",
    "drug dealer", "cartel violence", "mass shooting",
    "child abuse", "pedophil", "trafficking",
    "rape", "assault", "stabbed", "shooting victim",
    "overdose", "fentanyl death",
    "lawsuit", "scam", "fraud", "arrest", "prison",
    "bankruptcy", "stock market", "interest rate", "federal reserve",
    "congressional", "parliament", "gdp growth", "inflation rate",
  ];
  return blocked.some(word => lower.includes(word));
}

// ============ CORS Proxy Fetch ============

async function proxyFetch(url: string): Promise<string> {
  // Try multiple proxies for reliability
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];
  
  for (const proxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 100) return text;
      }
    } catch {
      continue;
    }
  }
  return "";
}

// ============ Source Fetching ============

async function fetchAllSources(region: Region): Promise<RawItem[]> {
  const queries = getOptimizedQueries(region);
  const allItems: RawItem[] = [];

  // Batch fetch - max 4 concurrent
  const batchSize = 4;
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(q => fetchBingNews(q)));
    for (const result of results) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value);
      }
    }
  }

  // Deduplicate by normalized title
  const seen = new Set<string>();
  return allItems.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

    // 平台检测（更精确）
    let platform: Platform = "web";
    if (/tiktok|tik\s*tok/i.test(fullText)) platform = "tiktok";
    else if (/youtube|youtuber|yt\b/i.test(fullText)) platform = "youtube";
    else if (/\bx\.com|twitter|tweet/i.test(fullText)) platform = "x";
    else if (/reddit|subreddit/i.test(fullText)) platform = "reddit";

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

// ============ Processing (使用新引擎) ============

function processTrend(item: RawItem, region: Region): Trend | null {
  if (!item.title || item.title.length < 5) return null;

  const text = `${item.title} ${item.description}`.toLowerCase();
  
  // 使用智能分类
  const category = classifyCategoryAdvanced(item.title, item.description, region);
  
  // 评分（基于地区文化加权）
  const scores = calculateScoresV2(text, item, region, category);
  if (scores.categoryAffinity <= 1) return null;

  const suggestedTypes = suggestResourceTypesV2(text, category, region);
  const resourceSuggestion = buildResourceOneLiner(suggestedTypes);
  
  // 使用智能分析生成摘要
  const summary = buildSmartSummary(item, category, region, suggestedTypes);
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

// ============ V2 评分（地区文化加权） ============

function calculateScoresV2(text: string, item: RawItem, region: Region, category: TrendCategory): TrendScores {
  const culture = REGION_CULTURE[region];
  
  let categoryAffinity = 2;
  let adaptationCost = 3;
  let mobileFit = 3;
  let audienceMatch = 2;
  let freshness = 3;
  let marketHeat = 2;

  // === Category Affinity（与游戏资源的亲和度）===
  if (/skin|costume|outfit|armor|character|avatar|cosplay|fashion|style/.test(text)) categoryAffinity += 2;
  else if (/dance|emote|move|gesture|challenge|choreography/.test(text)) categoryAffinity += 2;
  else if (/weapon|gun|sword|blade|neon|glow/.test(text)) categoryAffinity += 2;
  else if (/meme|funny|sticker|emoji|spray|graffiti|art/.test(text)) categoryAffinity += 1;
  else if (/music|song|beat|rhythm|audio|sound/.test(text)) categoryAffinity += 1;
  if (/gaming|game|gamer|esport|streamer|free\s*fire|pubg|mobile\s*legends/.test(text)) categoryAffinity += 1;
  // 动漫/二次元天然高亲和
  if (/anime|manga|cosplay|waifu|chibi/.test(text)) categoryAffinity += 1;

  // === Adaptation Cost（改造成本，高分=容易改造）===
  if (/simple|minimal|clean|flat|2d|cartoon|chibi|icon/.test(text)) adaptationCost += 1;
  if (/complex|detailed|realistic|photorealistic|intricate/.test(text)) adaptationCost -= 1;
  if (/neon|glow|cyber|futuristic|tech/.test(text)) adaptationCost += 1; // 与BS风格吻合
  if (/skull|mask|helmet|armor/.test(text)) adaptationCost += 1; // 容易做角色设计

  // === Mobile Fit（手机屏幕辨识度）===
  if (/bold|bright|colorful|vibrant|contrast|neon|fluorescent/.test(text)) mobileFit += 1;
  if (/subtle|pastel|minimalist|tiny\s*detail/.test(text)) mobileFit -= 1;
  if (/silhouette|iconic|recognizable|big|large/.test(text)) mobileFit += 1;

  // === Audience Match（地区受众匹配 - 核心改进）===
  // 检查是否匹配该地区的热门IP
  const ipMatch = culture.hotIPs.filter(ip => text.includes(ip));
  if (ipMatch.length >= 2) audienceMatch += 3;
  else if (ipMatch.length === 1) audienceMatch += 2;
  
  // 检查是否匹配地区音乐口味
  if (culture.musicTaste.some(m => text.includes(m))) audienceMatch += 1;
  
  // 检查是否匹配地区游戏文化
  if (culture.gamingCulture.some(g => text.includes(g))) audienceMatch += 1;
  
  // 地区特定加分
  if (region === "SEA") {
    if (/kpop|k-?pop|blackpink|bts|newjeans|stray\s*kids/.test(text)) audienceMatch += 1;
    if (/kawaii|cute|chibi|adorable|pet/.test(text)) audienceMatch += 1;
    if (/indonesia|philippines|thailand|vietnam|malaysia|singapore/.test(text)) audienceMatch += 1;
  } else {
    if (/reggaeton|latin|cumbia|trap\s*latino|corridos/.test(text)) audienceMatch += 1;
    if (/football|soccer|futbol|copa|liga/.test(text)) audienceMatch += 1;
    if (/brazil|mexico|argentina|colombia|chile|peru/.test(text)) audienceMatch += 1;
    if (/skull|calavera|neon|graffiti|lowrider/.test(text)) audienceMatch += 1;
  }

  // === Freshness ===
  if (item.publishedAt) {
    const age = Date.now() - new Date(item.publishedAt).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    if (days <= 2) freshness = 5;
    else if (days <= 7) freshness = 4;
    else if (days <= 14) freshness = 3;
    else if (days <= 30) freshness = 2;
    else freshness = 1;
  }

  // === Market Heat ===
  if (/viral|explod|blow\s*up|million|billion|massive|huge/.test(text)) marketHeat += 2;
  else if (/popular|famous|hit|top|hot|trending|trend/.test(text)) marketHeat += 1;
  if (/tiktok|youtube|instagram/.test(text)) marketHeat += 1;

  // Clamp all to 1-5
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

// ============ V2 资源建议（地区差异化） ============

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

function suggestResourceTypesV2(text: string, category: TrendCategory, region: Region): ResourceType[] {
  const types: ResourceType[] = [];

  // 基于内容特征
  if (/skin|costume|outfit|cosplay|fashion|dress|wear|character|avatar|face|mask|armor/.test(text)) types.push("character_skin");
  if (/weapon|gun|sword|blade|neon|cyber|mecha|rifle/.test(text)) types.push("weapon_skin");
  if (/dance|move|gesture|challenge|emote|pose|choreography/.test(text)) types.push("emote");
  if (/meme|reaction|funny|sticker|emoji|graffiti|spray|art|skull|calavera/.test(text)) types.push("spray");
  if (/cute|pet|companion|mascot|chibi|creature|animal|capybara|cat|dog/.test(text)) types.push("playpal");
  if (/effect|explosion|fire|lightning|magic|kill|finisher/.test(text)) types.push("finisher");
  if (/music|beat|ambient|vibe|theme|aesthetic|song|audio/.test(text)) types.push("lobby_theme");
  if (/accessory|charm|pendant|miniature|keychain/.test(text)) types.push("weapon_charm");
  if (/car|vehicle|racing|drift|lowrider|motorcycle/.test(text)) types.push("vehicle_skin");
  if (/fly|sky|wing|parachute|glide/.test(text)) types.push("parachute_skin");
  if (/festival|event|celebration|holiday|bundle|seasonal|carnival/.test(text)) types.push("event_bundle");

  // 基于地区偏好补充
  if (types.length === 0) {
    if (region === "SEA") {
      switch (category) {
        case "meme": types.push("spray", "emote"); break;
        case "film_tv": types.push("character_skin", "weapon_skin"); break;
        case "festival": types.push("event_bundle", "character_skin"); break;
        case "culture": types.push("character_skin", "playpal"); break;
        case "big_event": types.push("event_bundle", "spray"); break;
        case "pop_element": types.push("character_skin", "emote", "playpal"); break;
      }
    } else {
      switch (category) {
        case "meme": types.push("spray", "emote"); break;
        case "film_tv": types.push("character_skin", "weapon_skin"); break;
        case "festival": types.push("event_bundle", "character_skin", "spray"); break;
        case "culture": types.push("character_skin", "vehicle_skin"); break;
        case "big_event": types.push("event_bundle", "character_skin"); break;
        case "pop_element": types.push("character_skin", "emote", "lobby_theme"); break;
      }
    }
  }

  return Array.from(new Set(types)).slice(0, 3);
}

function buildResourceOneLiner(types: ResourceType[]): string {
  const names = types.map(t => RESOURCE_NAMES[t]).join("\u3001");
  return `可转化为${names}`;
}

// ============ 智能摘要生成 ============

function buildSmartSummary(
  item: RawItem,
  category: TrendCategory,
  region: Region,
  resourceTypes: ResourceType[]
): string {
  const desc = stripHtml(item.description || "");
  const whatIs = desc.length > 20 ? desc.slice(0, 250) : item.title;
  
  // 使用知识库生成价值分析
  const valueAnalysis = generateValueAnalysis(item.title, item.description, category, region);
  
  // 生成具体的资源建议
  const resourceAdvice = buildSpecificResourceAdvice(item.title, item.description, resourceTypes, region);

  return `【热点概述】${whatIs}\n\n【价值分析】${valueAnalysis}\n\n【落地建议】${resourceAdvice}`;
}

function buildSpecificResourceAdvice(title: string, desc: string, types: ResourceType[], region: Region): string {
  const text = `${title} ${desc}`.toLowerCase();
  const suggestions: string[] = [];
  
  for (const rt of types.slice(0, 2)) {
    switch (rt) {
      case "character_skin":
        if (/anime|cosplay/.test(text)) suggestions.push("提取动漫角色配色+服装剪影融入BS战术装甲");
        else if (/kpop|idol/.test(text)) suggestions.push("参考偶像舞台造型做潮流向角色皮肤");
        else if (/skull|calavera|mask/.test(text)) suggestions.push("直接做骷髅/面具主题限定皮肤");
        else suggestions.push("提取视觉特征做限定主题角色皮肤");
        break;
      case "emote":
        if (/dance|choreography/.test(text)) suggestions.push("1:1还原舞蹈动作做全身表情");
        else suggestions.push("提取标志性动作做3-5秒循环表情");
        break;
      case "spray":
        suggestions.push("提取梗图核心视觉做2D喷漆，保证远距离可读");
        break;
      case "playpal":
        suggestions.push("做Q版/chibi化盘盘伴侣，加入趋势元素的待机动画");
        break;
      case "lobby_theme":
        suggestions.push("提取音乐节奏和视觉氛围做沉浸式大厅背景");
        break;
      case "event_bundle":
        suggestions.push("整合为3-5件套限时主题礼包（皮肤+武器+配件）");
        break;
      default:
        suggestions.push(`快速产出${RESOURCE_NAMES[rt]}类资源`);
    }
  }
  
  return suggestions.join("；") + "。建议在热度窗口期（1-2周内）完成初版概念。";
}

// ============ Compliance Check ============

function checkCompliance(text: string): string | undefined {
  const celebs = /taylor swift|drake|messi|ronaldo|blackpink|bts|mrbeast|pewdiepie|shakira|bad bunny|neymar|mbapp|jisoo|jennie|lisa|ive |aespa|stray kids|newjeans|peso pluma|karol g|feid/i;
  if (celebs.test(text)) {
    return "\u26a0\ufe0f 涉及真人肖像权，需规避直接使用真人形象，建议提取视觉风格/动作元素进行二次创作";
  }
  const ips = /marvel|disney|one piece|naruto|demon slayer|jujutsu|dragon ball|pokemon|hello kitty|sanrio|star wars|harry potter|dc comics|batman|spider.?man|genshin|honkai|mobile legends/i;
  if (ips.test(text)) {
    return "\u26a0\ufe0f 涉及第三方IP版权，需获取授权或仅参考视觉风格方向，不可直接使用角色/标志";
  }
  const sensitive = /politic|election|president|religious|mosque|church|temple|protest|military coup|territorial|separatist|genocide/i;
  if (sensitive.test(text)) {
    return "\u26a0\ufe0f 涉及政治/宗教敏感内容，建议仅提取非争议性视觉元素，规避文化冲突";
  }
  return undefined;
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
