/**
 * 地区文化知识库 + 搜索规则 + 梗过滤器
 *
 * 🔒 核心规则：只搜"有梗的"、玩家喜欢的流行热点
 * ❌ 不要普通新闻、行业报道、政策法规、经济数据
 * ✅ 要梗图、viral challenge、舞蹈挑战、游戏梗、动漫梗、搞笑整活
 */

import type { Region, TrendCategory } from "@/types/trend";

// ============ 地区流行文化特征 ============

export const REGION_CULTURE: Record<Region, {
  name: string;
  hotIPs: string[];
  musicTaste: string[];
  festivals: { name: string; keywords: string[] }[];
  gamingCulture: string[];
}> = {
  SEA: {
    name: "东南亚",
    hotIPs: [
      "one piece", "jujutsu kaisen", "demon slayer", "chainsaw man", "dragon ball",
      "naruto", "attack on titan", "spy x family", "oshi no ko", "frieren",
      "blackpink", "bts", "stray kids", "newjeans", "seventeen", "aespa", "ive",
      "le sserafim", "nct", "twice", "enhypen", "txt", "itzy",
      "genshin impact", "honkai star rail", "mobile legends", "free fire",
      "hello kitty", "sanrio", "pokemon", "doraemon",
    ],
    musicTaste: [
      "kpop", "k-pop", "jpop", "j-pop", "cpop", "thai pop", "dangdut", "ppop",
    ],
    festivals: [
      { name: "Songkran", keywords: ["songkran", "water festival", "thai new year"] },
      { name: "Hari Raya/Eid", keywords: ["hari raya", "eid", "lebaran", "ramadan", "idul fitri"] },
      { name: "Chinese New Year", keywords: ["lunar new year", "chinese new year", "imlek"] },
      { name: "Diwali", keywords: ["diwali", "deepavali"] },
      { name: "Christmas", keywords: ["christmas", "pasko"] },
    ],
    gamingCulture: [
      "mobile legends", "free fire", "genshin impact", "honkai", "pubg mobile",
      "valorant", "mlbb", "arena of valor", "ragnarok",
    ],
  },
  LATAM: {
    name: "拉美",
    hotIPs: [
      "dragon ball", "naruto", "one piece", "demon slayer", "jujutsu kaisen",
      "bad bunny", "peso pluma", "feid", "karol g", "shakira", "rauw alejandro",
      "daddy yankee", "ozuna", "anuel", "j balvin",
      "messi", "neymar", "vinicius", "cristiano", "copa america", "world cup",
      "lucha libre", "el santo", "rey mysterio", "wwe",
      "dia de muertos", "calavera", "catrina",
      "free fire", "fortnite", "roblox", "gta", "minecraft",
    ],
    musicTaste: [
      "reggaeton", "trap latino", "cumbia", "samba", "funk brasileiro",
      "corridos tumbados", "bachata", "latin pop", "urbano", "dembow",
    ],
    festivals: [
      { name: "Día de Muertos", keywords: ["dia de muertos", "day of the dead", "calavera", "catrina", "ofrenda"] },
      { name: "Carnival", keywords: ["carnival", "carnaval", "samba", "rio carnival"] },
      { name: "Christmas/Navidad", keywords: ["navidad", "christmas", "posadas", "nochebuena"] },
      { name: "Halloween", keywords: ["halloween", "noche de brujas"] },
    ],
    gamingCulture: [
      "free fire", "fortnite", "roblox", "gta", "minecraft",
      "call of duty mobile", "fifa", "ea fc", "league of legends",
    ],
  },
};

// ============ 搜索查询（只搜有梗的、玩家爱的内容） ============

/**
 * 🔒 搜索硬性规则（不可违反）：
 * 1. 只搜"有梗的"内容 - meme、viral challenge、trend、流行文化现象
 * 2. 不搜普通新闻 - 政治、经济、社会新闻、行业报道一律排除
 * 3. 必须是玩家会喜欢的 - 游戏、动漫、音乐、舞蹈、整活、搞笑、潮流
 * 4. 搜索词必须带传播性关键词 - "meme"或"viral"或"trend"或"challenge"或"funny"
 * 5. 地区差异化 - 搜该地区玩家真正追的梗和文化符号
 *
 * 不合格内容（必须过滤掉）：
 * ❌ "TikTok updates privacy policy" - 平台新闻
 * ❌ "Indonesia GDP grows 5%" - 经济新闻
 * ❌ "Celebrity gets married" - 八卦（除非变成了梗）
 * ✅ "Skibidi toilet meme takes over" - 有梗
 * ✅ "New TikTok dance challenge 100M views" - 挑战+传播力
 * ✅ "Gaming streamer catchphrase becomes meme" - 游戏+梗
 */
export function getOptimizedQueries(region: Region): string[] {
  const year = new Date().getFullYear();

  if (region === "SEA") {
    return [
      // 核心：梗/挑战/整活
      `TikTok meme viral ${year} funny`,
      `TikTok challenge trend ${year} dance`,
      `brain rot meme ${year} skibidi`,
      `viral meme internet culture ${year}`,
      `TikTok trend sound viral ${year}`,
      // 游戏梗
      `gaming meme viral ${year} funny`,
      `Mobile Legends meme funny viral`,
      `Free Fire meme viral funny`,
      `gaming TikTok trend viral ${year}`,
      `Genshin Impact meme viral funny`,
      // 动漫梗（SEA第一流行文化）
      `anime meme viral ${year} TikTok funny`,
      `One Piece meme viral funny`,
      `Jujutsu Kaisen meme trend viral`,
      `anime cosplay TikTok viral funny`,
      // K-pop梗和舞蹈挑战
      `K-pop dance challenge viral TikTok`,
      `K-pop meme funny viral trend`,
      // 萌宠梗（SEA特有）
      `cute animal meme capybara cat viral funny`,
      `kawaii meme trend TikTok viral`,
    ];
  }

  // LATAM
  return [
    // 核心：梗/挑战/整活
    `TikTok meme viral ${year} funny`,
    `TikTok challenge trend ${year} dance`,
    `brain rot meme ${year} skibidi`,
    `viral meme internet culture ${year}`,
    `TikTok trend sound viral ${year}`,
    // 游戏梗
    `gaming meme viral ${year} funny`,
    `Free Fire meme viral funny ${year}`,
    `Fortnite meme viral funny`,
    `gaming TikTok trend viral ${year}`,
    // 足球梗（拉美第一运动）
    `football soccer meme viral funny ${year}`,
    `Messi meme funny viral`,
    `football celebration meme trend`,
    // 拉丁音乐舞蹈梗
    `reggaeton dance challenge viral TikTok`,
    `Latin meme viral funny ${year}`,
    `Bad Bunny Peso Pluma meme trend viral`,
    // 动漫梗（拉美也极爱）
    `Dragon Ball meme viral funny`,
    `Naruto anime meme viral TikTok`,
    // 拉美特色梗
    `skull meme aesthetic trend ${year}`,
    `lucha libre meme funny viral`,
  ];
}

// ============ 梗过滤器：判断内容是否"有梗"值得展示 ============

/**
 * 🔒 isMemeWorthy - 核心过滤逻辑
 *
 * 规则：一条内容必须"有梗"才能展示给玩家。
 * "有梗"的定义：
 * - 有传播性（meme/viral/challenge/trend/funny/dance/cosplay）
 * - 或匹配地区玩家热爱的IP/游戏/动漫
 * - 或是节日梗/文化符号梗
 * - 或有明确的视觉梗/舞蹈/整活
 *
 * 即使搜出来了，以下内容也必须过滤掉：
 * - 普通新闻报道（政策/经济/产品发布/行业分析/社会新闻）
 * - 纯八卦无梗（明星结婚/分手/机场照，除非变成了梗）
 * - 广告/营销/PR稿
 */
export function isMemeWorthy(title: string, description: string, region: Region): boolean {
  const text = `${title} ${description}`.toLowerCase();

  // === 第一步：黑名单排除（普通新闻/行业内容） ===
  const NEWS_BLACKLIST = /\b(policy|regulation|revenue|quarterly|investor|government|ministry|parliament|official\s+statement|press\s+conference|gdp|inflation|unemployment|ipo|merger|acquisition|lawsuit|court|sentenced|legislation|trade\s+war|tariff|sanctions|budget|fiscal|monetary|central\s+bank|federal\s+reserve|stock\s+market|shares|dividend|earnings|forecast|analyst|report\s+shows|study\s+finds|research\s+suggests|according\s+to\s+experts|officials\s+say|authorities|investigation|indicted|convicted|arrested\s+for|charged\s+with|privacy\s+policy|terms\s+of\s+service|update\s+rolls\s+out|patch\s+notes|changelog|sdk|api\s+update|developer\s+conference|keynote|product\s+launch|price\s+increase|subscription|layoffs|restructuring|bankruptcy|filed\s+for|settlement)\b/i;

  if (NEWS_BLACKLIST.test(text)) {
    return false;
  }

  // === 第二步：必须通过至少一项"有梗"检测 ===
  const culture = REGION_CULTURE[region];

  // 检测1：传播性关键词（最核心）
  const VIRAL_KEYWORDS = /\b(meme|memes|viral|challenge|trend|trending|funny|hilarious|dance|cosplay|skit|parody|reaction|brain\s*rot|shitpost|fancam|edit|compilation|cringe|sus|rizz|sigma|skibidi|gyatt|ohio|npc\s+stream|duet|stitch|sound|audio\s+trend)\b/i;
  if (VIRAL_KEYWORDS.test(text)) return true;

  // 检测2：匹配地区热门IP/游戏
  const ipMatch = culture.hotIPs.some(ip => text.includes(ip));
  if (ipMatch) return true;

  // 检测3：匹配地区游戏文化
  const gameMatch = culture.gamingCulture.some(g => text.includes(g));
  if (gameMatch) return true;

  // 检测4：节日梗
  const festivalMatch = culture.festivals.some(f => f.keywords.some(kw => text.includes(kw)));
  if (festivalMatch) return true;

  // 检测5：视觉/动作/整活元素
  const VISUAL_MEME = /\b(cosplay|costume|outfit|dance|choreography|emote|gesture|sticker|emoji|graffiti|fan\s*art|drawing|animation|edit|transition|filter|effect|greenscreen|pov|asmr|mukbang|unboxing)\b/i;
  if (VISUAL_MEME.test(text)) return true;

  // 检测6：音乐/舞蹈相关（地区音乐口味）
  const musicMatch = culture.musicTaste.some(m => text.includes(m));
  if (musicMatch) return true;

  // 都不匹配 → 不够"有梗"，过滤掉
  return false;
}

// ============ 分类规则 ============

export type CategoryRule = {
  category: TrendCategory;
  keywords: RegExp;
  excludeKeywords?: RegExp;
};

export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "meme",
    keywords: /\bmeme\b|memes|viral\s+(challenge|trend|sound|audio)|tiktok\s+(trend|challenge|sound|dance)|brain\s*rot|shitpost|copypasta|reaction\s+meme|funny\s+video|comedy\s+skit|parody|duet\s+chain/i,
    excludeKeywords: /official\s+trailer|box\s+office|film\s+festival|movie\s+review|album\s+release/i,
  },
  {
    category: "film_tv",
    keywords: /\b(movie|film|cinema)\b.{0,30}\b(release|premiere|trailer|box\s+office|sequel|reboot)|\b(series|drama|show|season)\b.{0,30}\b(new|premiere|finale|streaming|netflix|disney|hbo|amazon|hulu)|anime\s+(movie|film|season|episode|premiere)|bollywood|k-?drama|thai\s+drama|c-?drama|telenovela|\b(animated|animation)\s+(film|movie|series)/i,
    excludeKeywords: /tiktok\s+challenge|dance\s+trend|viral\s+meme/i,
  },
  {
    category: "festival",
    keywords: /\b(christmas|halloween|easter|eid|ramadan|diwali|lunar\s+new\s+year|chinese\s+new\s+year|songkran|carnival|carnaval|dia\s+de\s+muertos|day\s+of\s+the\s+dead|navidad|hari\s+raya|lebaran|mid-?autumn|thanksgiving|valentine|new\s+year|imlek|semana\s+santa)\b/i,
  },
  {
    category: "culture",
    keywords: /\b(traditional|folklore|indigenous|heritage|cultural|ritual|ceremony|martial\s+art|batik|kebaya|ao\s+dai|hanbok)\b|\b(lucha\s+libre|capoeira|samba|gamelan|wayang|muay\s+thai|silat)\b/i,
    excludeKeywords: /tiktok|viral|trending|challenge/i,
  },
  {
    category: "big_event",
    keywords: /\b(world\s+cup|olympic|copa\s+america|super\s+bowl|grammy|oscar|met\s+gala|gamescom|game\s+awards|world\s+championship|esports\s+(tournament|final|championship))\b/i,
  },
  {
    category: "pop_element",
    keywords: /\b(kpop|k-?pop|jpop|reggaeton|trap|hip\s*hop|idol|singer|artist|concert|tour|fashion|aesthetic|neon|cyberpunk|cosplay|streetwear|sneaker|collaboration|collab\b|merch)\b/i,
  },
];

// ============ 智能分类引擎 ============

export function classifyCategoryAdvanced(title: string, description: string, region: Region): TrendCategory {
  const text = `${title} ${description}`.toLowerCase();
  const culture = REGION_CULTURE[region];

  // 1. 节日匹配
  for (const fest of culture.festivals) {
    if (fest.keywords.some(kw => text.includes(kw))) {
      return "festival";
    }
  }

  // 2. 按规则匹配
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) {
      if (rule.excludeKeywords && rule.excludeKeywords.test(text)) continue;

      if (rule.category === "film_tv") {
        const hasFilmContext = /\b(trailer|premiere|season\s+\d|episode|box\s+office|streaming|netflix|disney|hbo|sequel|franchise|directed\s+by|starring)\b/i.test(text);
        if (!hasFilmContext) continue;
      }

      return rule.category;
    }
  }

  // 3. 地区IP推断
  if (culture.hotIPs.some(ip => text.includes(ip))) {
    if (culture.musicTaste.some(m => text.includes(m))) return "pop_element";
    if (/anime|manga|cosplay/.test(text)) return "pop_element";
    if (/meme|funny|reaction/.test(text)) return "meme";
  }

  // 4. 默认
  if (/dance|challenge|trend|viral|sound|meme|funny/.test(text)) return "meme";
  return "pop_element";
}

// ============ 价值分析生成器 ============

export function generateValueAnalysis(
  title: string,
  description: string,
  category: TrendCategory,
  region: Region
): string {
  const text = `${title} ${description}`.toLowerCase();
  const culture = REGION_CULTURE[region];
  const analyses: string[] = [];

  // 地区相关性
  if (region === "SEA") {
    if (/kpop|k-?pop|blackpink|bts|stray\s*kids|newjeans|seventeen|aespa|ive|le\s*sserafim/.test(text)) {
      analyses.push("K-pop在东南亚拥有狂热粉丝基础，相关联动/视觉元素能直接引发玩家付费冲动和社交传播");
    }
    if (/anime|manga|one\s*piece|jujutsu|demon\s*slayer|chainsaw|dragon\s*ball|naruto/.test(text)) {
      analyses.push("日本动漫在东南亚年轻玩家中是第一认知IP，联动历史已被Free Fire/MLBB验证可行");
    }
    if (/cute|kawaii|capybara|cat|puppy|chibi|adorable/.test(text)) {
      analyses.push("可爱/萌系内容在东南亚全年龄段高接受度，水豚、猫等形象可直接做盘盘/挂件类资源");
    }
  } else {
    if (/reggaeton|bad\s*bunny|peso\s*pluma|feid|karol\s*g|trap\s*latino|corridos/.test(text)) {
      analyses.push("拉丁音乐是拉美Z世代的文化符号，音乐人形象/风格可直接转化为角色皮肤和大厅主题");
    }
    if (/football|soccer|messi|neymar|vinicius|copa|world\s*cup|futbol/.test(text)) {
      analyses.push("足球在拉美是宗教级文化，球星联动、球衣风格皮肤有极强的付费驱动力");
    }
    if (/dia\s*de\s*muertos|calavera|catrina|skull|skeleton/.test(text)) {
      analyses.push("亡灵节美学（骷髅、花朵、荧光）在拉美有深厚文化认同，视觉独特且适合暗黑风格射击游戏");
    }
    if (/lucha\s*libre|mask|luchador|wrestling/.test(text)) {
      analyses.push("Lucha Libre面具文化在墨西哥是国民级图腾，面具风格角色皮肤的辨识度和付费意愿极高");
    }
    if (/carnival|carnaval|samba|neon|fluorescent/.test(text)) {
      analyses.push("巴西嘉年华的荧光色彩和舞蹈能量完美契合射击游戏的动态视觉需求");
    }
    if (/graffiti|street\s*art|lowrider|chrome|urban/.test(text)) {
      analyses.push("街头涂鸦/Lowrider美学在拉美青年中代表态度和身份认同，适合喷漆和载具皮肤");
    }
  }

  // 游戏资源转化
  if (/dance|choreography|move|gesture|challenge/.test(text)) {
    analyses.push("包含明确的肢体动作/舞蹈编排，可1:1转化为游戏内表情动作，玩家使用频率和分享意愿高");
  }
  if (/cosplay|costume|outfit|fashion|style|aesthetic/.test(text)) {
    analyses.push("包含明确的视觉装扮元素，可直接提取配色/剪影做角色皮肤设计参考");
  }
  if (/meme|reaction|funny|sticker/.test(text)) {
    analyses.push("梗图/反应图的社交传播属性极强，做成喷漆后玩家会主动在对局中使用扩散");
  }
  if (/neon|glow|cyber|futuristic|holographic/.test(text)) {
    analyses.push("赛博/荧光视觉风格与Bloodstrike美术调性高度吻合，改造成本低且效果好");
  }

  // 传播力
  if (/million|billion|viral|explod|blow\s*up/.test(text)) {
    analyses.push("已在社交平台获得千万级传播量，证明内容有跨圈层传播力");
  }

  // 受众匹配
  const gamingMatch = culture.gamingCulture.some(g => text.includes(g));
  if (gamingMatch) {
    analyses.push(`直接关联${culture.name}玩家日常接触的游戏文化，受众重合度极高`);
  }

  if (analyses.length === 0) {
    analyses.push("该梗在年轻玩家群体中有传播度，可提取核心视觉/动作元素融入游戏资源");
  }

  return analyses.slice(0, 3).join("。") + "。";
}
