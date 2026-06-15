/**
 * Client-side discover engine v2
 *
 * 改进点:
 * 1. 搜索查询基于地区文化特色优化
 * 2. 分类使用智能规则引擎(非简单关键词匹配)
 * 3. 价值分析基于地区文化差异做深度解读
 * 4. 热点总结结构化,包含"是什么+为什么重要+怎么用"
 */

import type { Trend, Region, TrendCategory, TrendScores, ResourceType, Platform } from "@/types/trend";
import {
  REGION_CULTURE,
  getOptimizedQueries,
  classifyCategoryAdvanced,
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

    // 平台检测(更精确)
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

  // 评分(基于地区文化加权)
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

// ============ V2 评分(地区文化加权) ============

function calculateScoresV2(text: string, item: RawItem, region: Region, category: TrendCategory): TrendScores {
  const culture = REGION_CULTURE[region];

  let categoryAffinity = 2;
  let adaptationCost = 3;
  let mobileFit = 3;
  let audienceMatch = 2;
  let freshness = 3;
  let marketHeat = 2;

  // === Category Affinity(与游戏资源的亲和度)===
  if (/skin|costume|outfit|armor|character|avatar|cosplay|fashion|style/.test(text)) categoryAffinity += 2;
  else if (/dance|emote|move|gesture|challenge|choreography/.test(text)) categoryAffinity += 2;
  else if (/weapon|gun|sword|blade|neon|glow/.test(text)) categoryAffinity += 2;
  else if (/meme|funny|sticker|emoji|spray|graffiti|art/.test(text)) categoryAffinity += 1;
  else if (/music|song|beat|rhythm|audio|sound/.test(text)) categoryAffinity += 1;
  if (/gaming|game|gamer|esport|streamer|free\s*fire|pubg|mobile\s*legends/.test(text)) categoryAffinity += 1;
  // 动漫/二次元天然高亲和
  if (/anime|manga|cosplay|waifu|chibi/.test(text)) categoryAffinity += 1;

  // === Adaptation Cost(改造成本,高分=容易改造)===
  if (/simple|minimal|clean|flat|2d|cartoon|chibi|icon/.test(text)) adaptationCost += 1;
  if (/complex|detailed|realistic|photorealistic|intricate/.test(text)) adaptationCost -= 1;
  if (/neon|glow|cyber|futuristic|tech/.test(text)) adaptationCost += 1; // 与BS风格吻合
  if (/skull|mask|helmet|armor/.test(text)) adaptationCost += 1; // 容易做角色设计

  // === Mobile Fit(手机屏幕辨识度)===
  if (/bold|bright|colorful|vibrant|contrast|neon|fluorescent/.test(text)) mobileFit += 1;
  if (/subtle|pastel|minimalist|tiny\s*detail/.test(text)) mobileFit -= 1;
  if (/silhouette|iconic|recognizable|big|large/.test(text)) mobileFit += 1;

  // === Audience Match(地区受众匹配 - 核心改进)===
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

// ============ V2 资源建议(地区差异化) ============

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

// ============ 热点总结 ============

function buildSmartSummary(
  item: RawItem,
  category: TrendCategory,
  region: Region,
  resourceTypes: ResourceType[]
): string {
  const title = item.title;
  const desc = stripHtml(item.description || "");
  const text = `${title} ${desc}`.toLowerCase();

  // 直接对搜索内容做中文总结
  return generateChineseSummary(title, desc, text, category, region);
}

/**
 * 生成详细中文热点总结
 * 核心原则：从英文标题+描述中提取所有有价值的具体信息，翻译并扩展成详细的中文解读
 * 要求：至少3-5句话，包含具体细节（名字、数字、来源、传播情况）
 */
function generateChineseSummary(
  title: string,
  desc: string,
  text: string,
  category: TrendCategory,
  region: Region
): string {
  const regionName = region === "SEA" ? "东南亚" : "拉美";
  const parts: string[] = [];

  // ===== 第一层：识别核心主题，生成详细中文描述 =====

  // 提取具体数字
  const numbers = text.match(/(\d+(?:\.\d+)?\s*(?:million|billion|m|k|b)\b|\d{2,}\s*(?:views|likes|shares|followers))/gi);
  const numberInfo = numbers ? `（传播数据：${numbers.slice(0, 2).join("、")}）` : "";

  // 提取人名/作品名等具体名词
  const properNouns = extractProperNouns(text);

  if (/brain\s*rot|skibidi|gyatt|rizz|sigma|ohio|npc\s*stream/.test(text)) {
    const match = text.match(/\b(skibidi\s*toilet|skibidi|gyatt|rizz|sigma\s*male|sigma|ohio|npc\s*stream|brain\s*rot)\b/i);
    const meme = match?.[0] || "Brain Rot";
    parts.push(`"${meme}"——这是当前全球Z世代/Alpha世代年轻人中最火爆的网络迷因之一${numberInfo}`);
    parts.push(`该梗属于"抽象系/无厘头"风格，以极度荒诞、魔性洗脑为核心特征，在TikTok和YouTube Shorts上病毒式传播`);
    parts.push(`${regionName}地区的年轻玩家对此类梗接受度极高，是他们日常社交中的通用语言和身份符号`);
    if (/skibidi/.test(text)) parts.push("Skibidi Toilet系列以马桶+人头的诡异3D动画闻名，全系列播放量超百亿，已成为Z世代文化现象级IP");
  } else if (/dance|choreography|challenge/.test(text)) {
    parts.push(`一段新的舞蹈/动作挑战正在社交平台上爆火${numberInfo}`);
    if (/kpop|k-pop/.test(text)) {
      const artist = text.match(/\b(blackpink|bts|newjeans|stray kids|seventeen|aespa|ive|le sserafim|twice|itzy|nct)\b/i);
      parts.push(`来源于K-pop${artist ? `组合${artist[0]}的` : ""}编舞，K-pop舞蹈挑战是TikTok上传播最快的内容类型之一`);
      parts.push(`${regionName}拥有庞大的K-pop粉丝群体，他们会积极模仿和传播这类舞蹈挑战`);
    } else if (/reggaeton|latin|perreo/.test(text)) {
      parts.push("来源于拉丁音乐/Reggaeton的舞蹈风格，动作热情奔放，在拉美年轻人中具有强烈的文化认同感");
    } else {
      parts.push("该舞蹈动作简单魔性、容易模仿，用户参与门槛低，导致短时间内大量翻拍传播");
    }
    parts.push("舞蹈挑战类内容天然适合转化为游戏内表情动作——玩家看到熟悉的舞蹈会立刻产生购买欲望");
  } else if (/anime|manga/.test(text)) {
    const animeMatch = text.match(/\b(one piece|jujutsu kaisen|demon slayer|chainsaw man|dragon ball|naruto|spy x family|frieren|oshi no ko|attack on titan|my hero academia|bleach|hunter x hunter)\b/i);
    if (animeMatch) {
      const anime = animeMatch[0];
      parts.push(`动漫《${anime}》的梗/名场面/角色正在${regionName}社交媒体上广泛传播${numberInfo}`);
      parts.push(`《${anime}》在${regionName}年轻玩家中拥有极高认知度和情感连接，相关二创内容（梗图、cosplay、同人）传播力极强`);
      parts.push("动漫IP联动是射击手游最成熟的变现模式之一，Free Fire等竞品已多次验证：动漫联动皮肤付费率远超原创设计");
    } else {
      parts.push(`动漫/二次元相关的梗、cosplay或同人内容正在${regionName}年轻群体中热传${numberInfo}`);
      parts.push(`${regionName}的手游玩家与动漫受众高度重叠，动漫梗是他们社交的共同语言`);
    }
  } else if (/gaming|game|gamer|streamer|esport/.test(text)) {
    const gameMatch = text.match(/\b(free fire|fortnite|mobile legends|genshin impact|valorant|pubg|minecraft|roblox|league of legends|apex legends|call of duty|among us)\b/i);
    if (gameMatch) {
      parts.push(`游戏《${gameMatch[0]}》社区产生的热梗/名场面正在玩家群体中广泛传播${numberInfo}`);
      parts.push(`该梗来源于玩家自身的游戏文化，目标受众100%重合——Bloodstrike玩家必然对此产生共鸣`);
    } else {
      parts.push(`游戏圈/游戏主播产出的热梗或整活内容正在玩家社区广泛传播${numberInfo}`);
    }
    parts.push("游戏梗转化为游戏内资源有天然的受众基础，玩家使用时会产生社群归属感和表达欲");
  } else if (/kpop|k-?pop|blackpink|bts|newjeans|stray\s*kids|seventeen|aespa|ive|le\s*sserafim/.test(text)) {
    const artist = text.match(/\b(blackpink|bts|newjeans|stray kids|seventeen|aespa|ive|le sserafim|twice|itzy|enhypen|txt|nct)\b/i);
    parts.push(`K-pop${artist ? `顶流${artist[0]}` : "相关内容"}在${regionName}社交平台上引发热议和大量二创${numberInfo}`);
    parts.push(`K-pop是${regionName}年轻人（尤其15-25岁）最核心的流行文化之一，粉丝群体消费力强且社交传播积极`);
    parts.push("K-pop元素（舞台造型、应援色、舞蹈动作）视觉辨识度极高，天然适合转化为游戏内时装和表情");
  } else if (/reggaeton|bad\s*bunny|peso\s*pluma|feid|karol\s*g/.test(text)) {
    const artist = text.match(/\b(bad bunny|peso pluma|feid|karol g|shakira|rauw alejandro|daddy yankee|ozuna|j balvin|anuel)\b/i);
    parts.push(`拉丁音乐${artist ? `巨星${artist[0]}` : ""}相关的梗/舞蹈/视觉元素在拉美社交平台上爆火${numberInfo}`);
    parts.push("Reggaeton/Latin Trap是拉美Z世代的文化图腾，其视觉风格（荧光、街头、链条、纹身）与射击游戏暗黑潮流美学高度契合");
    parts.push("拉丁音乐人自带强烈视觉IP——独特的穿搭风格、标志性动作和态度，可直接转化为角色皮肤设计灵感");
  } else if (/football|soccer|messi|neymar|vinicius|mbappe/.test(text)) {
    const player = text.match(/\b(messi|neymar|vinicius|mbappe|ronaldo|haaland|endrick)\b/i);
    parts.push(`足球${player ? `巨星${player[0]}` : ""}相关的梗/庆祝动作/名场面在拉美球迷玩家中疯传${numberInfo}`);
    parts.push("足球在拉美是宗教级文化符号，球星的一个庆祝动作就能成为全民模仿的梗——传播力碾压一切");
    parts.push("庆祝动作天然适合做游戏内击杀/胜利表情，球衣配色风格也可融入角色皮肤设计");
  } else if (/cute|kawaii|capybara|cat|pet|animal|dog|raccoon/.test(text)) {
    const animal = text.match(/\b(capybara|cat|dog|raccoon|hamster|duck|frog|axolotl|shiba|corgi|panda)\b/i);
    parts.push(`${animal ? animal[0] + "（" + translateAnimal(animal[0]) + "）" : "萌系动物"}相关的梗在${regionName}社交平台上大量传播${numberInfo}`);
    parts.push("萌宠/可爱动物类内容是全年龄段通杀的流量密码，尤其受东南亚年轻用户喜爱（可爱文化根基深厚）");
    parts.push("这类形象非常适合做游戏内盘盘(PlayPal)伴侣、武器挂件等可爱向付费道具，付费门槛低但复购率高");
  } else if (/cosplay/.test(text)) {
    parts.push(`一组cosplay/装扮内容在${regionName}社交平台上走红${numberInfo}`);
    parts.push(`${regionName}拥有活跃的cosplay社区，玩家对"能在游戏里还原cosplay"的皮肤设计接受度极高`);
  } else if (/meme|funny|viral|trend/.test(text)) {
    parts.push(`一个新的网络热梗正在${regionName}社交平台上快速传播${numberInfo}`);
    if (desc.length > 30) {
      parts.push(`内容概要：${smartTranslate(desc.slice(0, 200))}`);
    }
    parts.push(`该梗具有高传播性和社交属性，${regionName}年轻玩家群体是主要受众`);
  } else {
    parts.push(`该话题正在${regionName}年轻玩家群体中流行${numberInfo}`);
    if (desc.length > 30) {
      parts.push(`具体内容：${smartTranslate(desc.slice(0, 200))}`);
    }
  }

  // ===== 补充信息 =====
  if (properNouns.length > 0 && parts.length < 4) {
    parts.push(`涉及关键词：${properNouns.slice(0, 5).join("、")}`);
  }

  return parts.join("。") + "。";
}

/** 从文本中提取有价值的专有名词 */
function extractProperNouns(text: string): string[] {
  const nouns: string[] = [];
  // 游戏名
  const games = text.match(/\b(free fire|fortnite|mobile legends|genshin impact|valorant|pubg|minecraft|roblox|apex legends|call of duty|among us|league of legends)\b/gi);
  if (games) nouns.push(...games.map(g => g));
  // 动漫名
  const animes = text.match(/\b(one piece|jujutsu kaisen|demon slayer|chainsaw man|dragon ball|naruto|spy x family|frieren|attack on titan|bleach)\b/gi);
  if (animes) nouns.push(...animes.map(a => a));
  // 人名/组合名
  const people = text.match(/\b(blackpink|bts|newjeans|stray kids|messi|neymar|bad bunny|peso pluma|mrbeast|pewdiepie|ive|aespa)\b/gi);
  if (people) nouns.push(...people.map(p => p));
  return Array.from(new Set(nouns));
}

/** 动物名中英对照 */
function translateAnimal(name: string): string {
  const map: Record<string, string> = {
    capybara: "水豚", cat: "猫", dog: "狗", raccoon: "浣熊",
    hamster: "仓鼠", duck: "鸭子", frog: "青蛙", axolotl: "六角恐龙",
    shiba: "柴犬", corgi: "柯基", panda: "熊猫",
  };
  return map[name.toLowerCase()] || name;
}

/** 简易英转中关键信息提取（非AI翻译，但提取核心内容） */
function smartTranslate(desc: string): string {
  // 去掉无用前缀
  let cleaned = desc.replace(/^(a |the |an |this |these |that |those )/i, "").trim();
  // 如果太长截断
  if (cleaned.length > 180) cleaned = cleaned.slice(0, 180) + "...";
  // 替换常见词汇为中文
  cleaned = cleaned
    .replace(/\bviral\b/gi, "病毒式传播")
    .replace(/\btrending\b/gi, "热门")
    .replace(/\bmillion\b/gi, "百万")
    .replace(/\bbillion\b/gi, "十亿")
    .replace(/\bviews\b/gi, "播放量")
    .replace(/\blikes\b/gi, "点赞")
    .replace(/\bfollowers\b/gi, "粉丝")
    .replace(/\bchallenge\b/gi, "挑战")
    .replace(/\bdance\b/gi, "舞蹈")
    .replace(/\bfunny\b/gi, "搞笑")
    .replace(/\bgaming\b/gi, "游戏")
    .replace(/\bgamer\b/gi, "玩家")
    .replace(/\bstreamer\b/gi, "主播")
    .replace(/\bcosplay\b/gi, "角色扮演")
    .replace(/\bskin\b/gi, "皮肤")
    .replace(/\bevent\b/gi, "活动")
    .replace(/\bcollaboration\b/gi, "联动");
  return cleaned;
}

// ============ Compliance Check ============

function checkCompliance(text: string): string | undefined {
  const celebs = /taylor swift|drake|messi|ronaldo|blackpink|bts|mrbeast|pewdiepie|shakira|bad bunny|neymar|mbapp|jisoo|jennie|lisa|ive |aespa|stray kids|newjeans|peso pluma|karol g|feid/i;
  if (celebs.test(text)) {
    return "\u26a0\ufe0f 涉及真人肖像权,需规避直接使用真人形象,建议提取视觉风格/动作元素进行二次创作";
  }
  const ips = /marvel|disney|one piece|naruto|demon slayer|jujutsu|dragon ball|pokemon|hello kitty|sanrio|star wars|harry potter|dc comics|batman|spider.?man|genshin|honkai|mobile legends/i;
  if (ips.test(text)) {
    return "\u26a0\ufe0f 涉及第三方IP版权,需获取授权或仅参考视觉风格方向,不可直接使用角色/标志";
  }
  const sensitive = /politic|election|president|religious|mosque|church|temple|protest|military coup|territorial|separatist|genocide/i;
  if (sensitive.test(text)) {
    return "\u26a0\ufe0f 涉及政治/宗教敏感内容,建议仅提取非争议性视觉元素,规避文化冲突";
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
