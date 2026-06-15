/**
 * Bloodstrike 热梗资源雷达 - 核心发现引擎 v3
 * 
 * 数据源: Bing News RSS (中国可访问, 带图片) + Google News RSS
 * 评分: 6维度规则评分, >=18分入选
 * 分析: 中文策划视角深度分析
 * 合规: 自动检测肖像权/IP/政治宗教风险
 */

import type { Trend, Region, TrendCategory, TrendScores, ResourceType, Platform } from "@/types/trend";

// ============ Utilities ============

async function fetchWithTimeout(url: string, timeoutMs = 8000, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

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

export async function discoverTrends(region: Region): Promise<Trend[]> {
  console.info(`[discover] Starting discovery for ${region}`);
  const rawItems = await fetchAllSources(region);
  console.info(`[discover] Got ${rawItems.length} raw items for ${region}`);

  const scored = rawItems
    .map((item) => processTrend(item, region))
    .filter((t): t is Trend => t !== null && t.scores.total >= 18)
    // NSFW / inappropriate content filter
    .filter((t) => !isInappropriate(t.title + " " + t.summary))
    .sort((a, b) => b.scores.total - a.scores.total);

  console.info(`[discover] ${scored.length} trends passed threshold for ${region}`);
  return scored.slice(0, 50);
}

// ============ NSFW / Inappropriate Content Filter ============

function isInappropriate(text: string): boolean {
  const lower = text.toLowerCase();
  const blocked = [
    // NSFW
    "porn", "xxx", "nsfw", "nude", "naked", "sex ", "sexual", "erotic",
    "hentai", "onlyfans", "stripper", "strip club", "adult film",
    "prostitut", "escort", "orgasm", "fetish", "bondage", "milf",
    "explicit", "x-rated", "xrated", "playboy", "brazzers",
    // Violence / tragedy
    "gore", "murder", "suicide", "self-harm", "terrorist",
    "drug dealer", "cartel violence", "mass shooting",
    "child abuse", "pedophil", "trafficking",
    "chokes to death", "killed", "dies", "dead body", "homicide",
    "rape", "assault", "stabbed", "shooting victim",
    "overdose", "fentanyl death",
    // Other inappropriate for gaming context
    "lawsuit", "scam", "fraud", "arrest", "prison",
    "bankruptcy", "divorce",
  ];
  return blocked.some(word => lower.includes(word));
}

// ============ Source Fetching ============

// ============ Source Fetching ============

async function fetchAllSources(region: Region): Promise<RawItem[]> {
  const queries = getSearchQueries(region);
  const allItems: RawItem[] = [];

  // Search Bing News for YouTube/TikTok/Discord content specifically
  const fetchers = queries.map(q => fetchBingNews(q));

  const results = await Promise.allSettled(fetchers);
  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    }
  }

  // Deduplicate by normalized title
  const seen = new Set<string>();
  const deduped = allItems.filter((item) => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Enrich items without thumbnails using Bing Image Search (batch 5 at a time)
  const needsImage = deduped.filter(item => !item.thumbnailUrl);
  if (needsImage.length > 0) {
    const batches = [];
    for (let i = 0; i < Math.min(needsImage.length, 20); i += 5) {
      batches.push(needsImage.slice(i, i + 5));
    }
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(async (item) => {
          const img = await searchBingImage(item.title);
          if (img) item.thumbnailUrl = img;
        })
      );
    }
  }

  return deduped;
}

// ============ Search Queries ============

function getSearchQueries(region: Region): string[] {
  const year = new Date().getFullYear();

  // Core platform queries (short = more results from Bing)
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
  // LATAM
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

// ============ Bing News RSS (主力, 有图片) ============

async function fetchBingNews(query: string): Promise<RawItem[]> {
  try {
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=en-US&safeSearch=Strict`;
    const res = await fetchWithTimeout(url, 10000);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseBingRSS(xml);
  } catch {
    return [];
  }
}

function parseBingRSS(xml: string): RawItem[] {
  const items: RawItem[] = [];
  const entries = xml.split("<item>").slice(1);

  for (const entry of entries.slice(0, 8)) {
    const title = extractCData(entry, "title") || extractTag(entry, "title");
    const link = extractTag(entry, "link");
    const pubDate = extractTag(entry, "pubDate");
    const desc = extractCData(entry, "description") || extractTag(entry, "description") || "";

    // Try to extract image
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

    // Extract real URL from Bing redirect link
    const realUrl = extractRealUrl(link);

    const cleanedTitle = cleanTitle(stripHtml(title));
    const fullText = `${cleanedTitle} ${stripHtml(desc)}`.toLowerCase();

    // Detect platform from content
    let platform: Platform = "tiktok"; // default since our queries target these platforms
    if (/youtube|youtuber/.test(fullText)) platform = "youtube";
    else if (/tiktok|tik tok/.test(fullText)) platform = "tiktok";
    else if (/discord/.test(fullText)) platform = "web";

    // Only light filter: skip obviously unrelated (pure politics/finance without any entertainment value)
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

// (Google News removed - only using Bing News RSS for reliable China access)

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
  // 真人/名人肖像权
  const celebs = /taylor swift|drake|messi|ronaldo|blackpink|bts|mrbeast|pewdiepie|shakira|bad bunny|neymar|mbapp|jisoo|jennie|lisa|ive |aespa|stray kids/i;
  if (celebs.test(text)) {
    return "⚠️ 涉及真人肖像权，需规避直接使用真人形象，建议提取视觉风格/动作元素进行二次创作";
  }

  // 第三方IP
  const ips = /marvel|disney|one piece|naruto|demon slayer|jujutsu|dragon ball|pokemon|hello kitty|sanrio|star wars|harry potter|dc comics|batman|spider.?man|genshin/i;
  if (ips.test(text)) {
    return "⚠️ 涉及第三方IP版权，需获取授权或仅参考视觉风格方向，不可直接使用角色/标志";
  }

  // 政治/宗教敏感
  const sensitive = /politic|election|president|religious|mosque|church|temple|protest|military coup|territorial|separatist|genocide/i;
  if (sensitive.test(text)) {
    return "⚠️ 涉及政治/宗教敏感内容，建议仅提取非争议性视觉元素，规避文化冲突";
  }

  return undefined;
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
  const resourceNames = resourceTypes.map(rt => RESOURCE_NAMES[rt]).join("、");
  const platformName = item.platform === "tiktok" ? "TikTok" : item.platform === "youtube" ? "YouTube" : "网络";

  // Part 1: What is this trend? (use actual description)
  const whatIs = desc.length > 20 ? desc.slice(0, 200) : item.title;

  // Part 2: Why it matters for game resources (specific to content)
  const analysis = buildSpecificAnalysis(item.title, desc, category, resourceTypes, regionName, platformName);

  // Part 3: Actionable suggestion
  const action = buildActionSuggestion(resourceTypes, item.title, desc);

  return `【热点概述】${whatIs}\n\n【价值分析】${analysis}\n\n【资源建议】${action}`;
}

function buildSpecificAnalysis(
  title: string, desc: string, category: TrendCategory,
  resourceTypes: ResourceType[], regionName: string, platformName: string
): string {
  const text = `${title} ${desc}`.toLowerCase();

  // Detect specific content characteristics
  const traits: string[] = [];

  // Visual characteristics
  if (/dance|choreography|move/.test(text)) traits.push("具有明确的动作编排，可直接转化为游戏内表情动作");
  if (/cute|kawaii|adorable|animal|pet|capybara|raccoon|cat|dog/.test(text)) traits.push("萌系/动物元素在东南亚拉美年轻玩家中有极高接受度，适合做盘盘/挂件等可爱向资源");
  if (/cosplay|costume|outfit|skin/.test(text)) traits.push("角色装扮元素可直接参考做角色皮肤设计");
  if (/song|music|beat|rhythm/.test(text)) traits.push("音乐/节奏元素可用于大厅主题或动作配乐");
  if (/meme|funny|humor|joke/.test(text)) traits.push("梗图的社交传播性强，做成喷漆/表情后玩家会主动使用和分享");
  if (/viral|trending|challenge/.test(text)) traits.push(`当前在${platformName}上爆火，时效性强，建议快速响应`);
  if (/anime|manga|cartoon/.test(text)) traits.push("动漫元素在目标市场玩家群体中认知度极高");
  if (/neon|glow|cyber|futuristic/.test(text)) traits.push("视觉风格与Bloodstrike赛博朋克美学高度契合");
  if (/festival|holiday|celebration|carnival/.test(text)) traits.push(`${regionName}本地节日元素，能触发玩家文化认同感和付费意愿`);
  if (/mask|face|filter|effect/.test(text)) traits.push("面部/滤镜效果可转化为角色皮肤头部设计或特效");
  if (/skull|skeleton|death|dark/.test(text)) traits.push("暗黑/骷髅美学适合做高级感角色皮肤或处决特效");
  if (/graffiti|art|street|paint/.test(text)) traits.push("涂鸦/街头艺术风格适合做喷漆或武器皮肤贴图");

  if (traits.length === 0) {
    traits.push(`该内容在${platformName}上获得大量关注，表明${regionName}玩家对此类内容有兴趣`);
  }

  return traits.slice(0, 3).join("。") + "。";
}

function buildActionSuggestion(resourceTypes: ResourceType[], title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  const suggestions: string[] = [];

  for (const rt of resourceTypes.slice(0, 2)) {
    switch (rt) {
      case "character_skin":
        if (/anime|cosplay/.test(text)) suggestions.push("提取动漫角色的配色方案和服装元素，融入BS战术装甲设计");
        else if (/animal|creature/.test(text)) suggestions.push("做动物主题皮套角色皮肤，类似萝莉成功案例");
        else suggestions.push("提取核心视觉元素做角色皮肤主题，强调剪影辨识度");
        break;
      case "emote":
        if (/dance/.test(text)) suggestions.push("直接复刻该趋势的标志性动作为游戏内表情，3-5秒循环");
        else suggestions.push("提取梗图中的标志性动作/姿态作为表情动作");
        break;
      case "spray":
        suggestions.push("将梗图核心视觉简化为2D喷漆图案，保留梗的辨识度");
        break;
      case "playpal":
        suggestions.push("做成可爱的浮游伴侣，chibi化设计，待机动画引用趋势元素");
        break;
      case "weapon_skin":
        suggestions.push("提取趋势的配色方案和视觉符号作为武器表面图案");
        break;
      case "finisher":
        suggestions.push("用趋势的视觉能量做2-3秒击杀终结特效动画");
        break;
      case "event_bundle":
        suggestions.push("打包为限时活动礼包，含角色皮+武器皮+配件，统一主题");
        break;
      default:
        suggestions.push(`转化为${RESOURCE_NAMES[rt]}，融入趋势的核心视觉语言`);
    }
  }

  return suggestions.join("；") + "。";
}

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
  playpal: "盘盘",
};

// ============ Classification ============

function classifyCategory(text: string): TrendCategory {
  if (/festival|holiday|christmas|new year|carnival|eid|diwali|songkran|dia de|lunar|navidad|carnaval|semana santa|hari raya|ramadan|fiestas patrias/.test(text)) return "festival";
  if (/earthquake|election|war|disaster|breaking|crisis|championship|copa|world cup|olympics|tournament/.test(text)) return "big_event";
  if (/movie|film|series|show|netflix|anime|drama|episode|trailer|season|telenovela|marvel|dc|one piece|naruto|jujutsu|k-drama/.test(text)) return "film_tv";
  if (/tradition|culture|heritage|folklore|custom|ritual|batik|calavera|lucha libre|folk|indigenous/.test(text)) return "culture";
  if (/meme|viral|challenge|funny|joke|humor|prank|reaction|roast|fail/.test(text)) return "meme";
  if (/fashion|music|dance|k-pop|idol|aesthetic|style|streetwear|reggaeton|trap|funk|graffiti|neon|cyberpunk|cosplay|art/.test(text)) return "pop_element";
  return "pop_element";
}

// ============ Scoring ============

function calculateScores(text: string, item: RawItem, region: Region): TrendScores {
  const categoryAffinity = scoreAffinity(text);
  const adaptationCost = scoreAdaptation(text);
  const mobileFit = scoreMobile(text, item.platform);
  const audienceMatch = scoreAudience(text, region);
  const freshness = scoreFreshness(item.publishedAt);
  const marketHeat = scoreHeat(item.engagement);

  return {
    categoryAffinity, adaptationCost, mobileFit, audienceMatch, freshness, marketHeat,
    total: categoryAffinity + adaptationCost + mobileFit + audienceMatch + freshness + marketHeat,
  };
}

function scoreAffinity(text: string): number {
  const keywords = [
    "skin", "costume", "cosplay", "outfit", "mask", "armor", "helmet",
    "weapon", "gun", "sword", "blade", "mecha", "robot", "cyber",
    "neon", "glow", "effect", "particle", "explosion", "fire", "lightning",
    "dance", "emote", "gesture", "pose", "challenge",
    "skull", "demon", "dragon", "monster", "warrior", "ninja", "samurai",
    "graffiti", "spray", "sticker", "tattoo",
    "car", "vehicle", "motorcycle", "drift",
    "pet", "companion", "mascot", "creature", "animal", "capybara", "cat", "dog",
    "anime", "manga", "character", "avatar", "hero",
    "festival", "carnival", "celebration", "firework",
    "streetwear", "fashion", "sneaker", "drip",
    "lucha", "luchador", "wrestling", "calavera",
    "cute", "chibi", "kawaii",
  ].filter(k => text.includes(k)).length;

  if (keywords >= 5) return 5;
  if (keywords >= 3) return 4;
  if (keywords >= 2) return 3;
  if (keywords >= 1) return 2;
  return 1;
}

function scoreAdaptation(text: string): number {
  const easy = ["color", "pattern", "filter", "pose", "dance", "emoji", "sticker",
    "face", "mask", "hat", "accessory", "icon", "gesture", "art", "animal", "cute",
    "graffiti", "spray", "logo", "skull", "neon", "glow", "capybara", "cat"
  ].filter(k => text.includes(k)).length;
  const hard = ["political", "documentary", "investigation", "debate",
    "interview", "editorial", "opinion", "controversy", "lawsuit"
  ].filter(k => text.includes(k)).length;

  if (hard >= 2) return 1;
  if (hard >= 1) return 2;
  if (easy >= 3) return 5;
  if (easy >= 2) return 4;
  if (easy >= 1) return 3;
  return 3;
}

function scoreMobile(text: string, platform: Platform): number {
  let score = 3;
  if (platform === "tiktok") score = 4;
  const friendly = ["short", "bold", "bright", "colorful", "neon", "clear",
    "simple", "cartoon", "pixel", "icon", "emoji", "sticker", "dance", "challenge", "viral", "cute"
  ].filter(k => text.includes(k)).length;
  if (friendly >= 3) return 5;
  if (friendly >= 2) return Math.min(score + 1, 5);
  return score;
}

function scoreAudience(text: string, region: Region): number {
  let score = 3;
  const youth = ["gaming", "gamer", "free fire", "pubg", "mobile legend",
    "challenge", "viral", "tiktok", "dance", "anime", "k-pop",
    "meme", "funny", "music", "streamer", "esports", "cosplay",
    "reggaeton", "trap", "funk", "hip hop", "sneaker", "streetwear",
    "cute", "pet", "animal", "capybara"
  ].filter(k => text.includes(k)).length;
  if (youth >= 4) score = 5;
  else if (youth >= 2) score = 4;
  else if (youth >= 1) score = Math.min(score + 1, 5);
  return score;
}

function scoreFreshness(publishedAt?: string): number {
  if (!publishedAt) return 3;
  const hours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hours <= 24) return 5;
  if (hours <= 72) return 4;
  if (hours <= 168) return 3;
  if (hours <= 336) return 2;
  return 1;
}

function scoreHeat(engagement?: { views?: number; likes?: number; shares?: number }): number {
  if (!engagement) return 3;
  const total = (engagement.views || 0) + (engagement.likes || 0) * 10 + (engagement.shares || 0) * 20;
  if (total >= 10_000_000) return 5;
  if (total >= 1_000_000) return 4;
  if (total >= 100_000) return 3;
  if (total >= 10_000) return 2;
  return 2;
}

// ============ Resource Suggestion ============

function suggestResourceTypes(text: string, category: TrendCategory): ResourceType[] {
  const types: ResourceType[] = [];

  if (/character|cosplay|outfit|costume|avatar|hero|skin|armor|warrior|ninja|samurai|luchador/.test(text)) types.push("character_skin");
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
  const names = types.map(t => RESOURCE_NAMES[t]).join("、");
  return `可转化为${names}`;
}

// ============ XML Parsing ============

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
  // Bing News RSS links look like:
  // http://www.bing.com/news/apiclick.aspx?...&url=https%3a%2f%2freal-site.com%2farticle&...
  // We need to extract and decode the real URL from the 'url=' parameter
  try {
    const decoded = bingLink.replace(/&amp;/g, "&");
    const match = decoded.match(/[?&]url=([^&]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch { /* fall through */ }
  return bingLink; // fallback to original
}

function safeDate(dateStr: string): string | undefined {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

// ============ Bing Image Search (for thumbnails) ============

async function searchBingImage(query: string): Promise<string | null> {
  try {
    const searchQuery = query.slice(0, 60);
    // Add safeSearch=strict to avoid NSFW images
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&first=1&count=1&mkt=en-US&safeSearch=Strict`;
    const res = await fetchWithTimeout(url, 5000, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/);
    if (match && match[1]) {
      const imgUrl = match[1];
      // Filter out logos, tiny images, and suspicious URLs
      if (/logo|icon|favicon|pixel|tracking|ad\.|banner/i.test(imgUrl)) return null;
      return imgUrl;
    }
    return null;
  } catch {
    return null;
  }
}
