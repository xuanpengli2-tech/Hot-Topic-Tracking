/**
 * 地区文化知识库 - 东南亚 vs 拉美的流行文化差异
 * 
 * 用于指导搜索查询、分类判断和价值分析
 */

import type { Region, TrendCategory } from "@/types/trend";

// ============ 地区流行文化特征 ============

export const REGION_CULTURE: Record<Region, {
  name: string;
  topInterests: string[];
  hotIPs: string[];
  musicTaste: string[];
  festivals: { name: string; month: number[]; keywords: string[] }[];
  gamingCulture: string[];
  memeStyle: string[];
  aesthetics: string[];
}> = {
  SEA: {
    name: "东南亚",
    topInterests: [
      "K-pop (BLACKPINK, BTS, Stray Kids, NewJeans, SEVENTEEN, aespa, IVE, LE SSERAFIM)",
      "日本动漫 (One Piece, Jujutsu Kaisen, Demon Slayer, Chainsaw Man, Dragon Ball, Naruto)",
      "中国短剧/古装剧 (Hidden Love, ancient Chinese drama, 仙侠)",
      "泰国BL剧/偶像",
      "本地音乐 (印尼/菲律宾/泰国本地热歌)",
      "可爱文化 (萌宠, chibi, kawaii, 水豚capybara)",
      "Mobile Legends, Free Fire (东南亚国民游戏)",
      "Cosplay文化 (二次元cosplay在SEA极受欢迎)",
      "Mukbang/吃播/美食挑战",
    ],
    hotIPs: [
      "one piece", "jujutsu kaisen", "demon slayer", "chainsaw man", "dragon ball",
      "naruto", "attack on titan", "spy x family", "oshi no ko", "frieren",
      "blackpink", "bts", "stray kids", "newjeans", "seventeen", "aespa", "ive",
      "le sserafim", "nct", "twice", "enhypen", "txt", "itzy",
      "genshin impact", "honkai star rail", "mobile legends", "free fire",
      "hello kitty", "sanrio", "pokemon", "doraemon",
    ],
    musicTaste: [
      "kpop", "k-pop", "jpop", "j-pop", "cpop", "thai pop", "indonesian pop",
      "dangdut", "ppop", "opm", "thai ost", "bollywood",
    ],
    festivals: [
      { name: "Songkran (泼水节)", month: [4], keywords: ["songkran", "water festival", "thai new year"] },
      { name: "Hari Raya/Eid", month: [3, 4, 5], keywords: ["hari raya", "eid", "lebaran", "ramadan", "idul fitri"] },
      { name: "Chinese New Year", month: [1, 2], keywords: ["lunar new year", "chinese new year", "imlek"] },
      { name: "Diwali", month: [10, 11], keywords: ["diwali", "deepavali"] },
      { name: "Christmas", month: [12], keywords: ["christmas", "pasko"] },
      { name: "Mid-Autumn Festival", month: [9, 10], keywords: ["mid-autumn", "mooncake", "moon festival"] },
    ],
    gamingCulture: [
      "mobile legends", "free fire", "genshin impact", "honkai", "pubg mobile",
      "valorant", "mlbb", "arena of valor", "ragnarok", "tower of fantasy",
    ],
    memeStyle: [
      "cute/wholesome memes", "anime reaction images", "K-pop fancam edits",
      "chibi characters", "animal memes (capybara, cat)", "TikTok dance challenges",
      "brain rot humor", "relatable Asian student memes",
    ],
    aesthetics: [
      "kawaii/cute", "anime style", "neon pastel", "cyberpunk x anime",
      "K-pop idol aesthetic", "chibi", "pixel art", "soft gradient",
    ],
  },
  LATAM: {
    name: "拉美",
    topInterests: [
      "Reggaeton/Latin music (Bad Bunny, Peso Pluma, Feid, Karol G, Shakira, Rauw Alejandro)",
      "足球/Football (Messi, Neymar, Vinícius Jr, 世界杯, Copa América)",
      "日本动漫 (Dragon Ball, Naruto, One Piece 在拉美也极流行)",
      "Lucha Libre/摔角文化 (墨西哥面具, WWE)",
      "Día de Muertos/亡灵节 (骷髅, calavera, 花)",
      "Carnival/嘉年华 (巴西狂欢节, 桑巴, 荧光)",
      "Street art/涂鸦文化 (graffiti, neon, lowrider)",
      "Telenovela/拉美剧集",
      "Free Fire (拉美最流行的射击手游)",
    ],
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
      { name: "Día de Muertos", month: [10, 11], keywords: ["dia de muertos", "day of the dead", "calavera", "catrina", "ofrenda"] },
      { name: "Carnival", month: [2, 3], keywords: ["carnival", "carnaval", "samba", "rio carnival"] },
      { name: "Christmas/Navidad", month: [12], keywords: ["navidad", "christmas", "posadas", "nochebuena"] },
      { name: "Fiestas Patrias", month: [9], keywords: ["independencia", "fiestas patrias", "grito"] },
      { name: "Semana Santa", month: [3, 4], keywords: ["semana santa", "easter", "pascua"] },
      { name: "Halloween", month: [10], keywords: ["halloween", "noche de brujas"] },
    ],
    gamingCulture: [
      "free fire", "fortnite", "roblox", "gta", "minecraft",
      "call of duty mobile", "fifa", "ea fc", "league of legends",
    ],
    memeStyle: [
      "loud/chaotic humor", "football memes", "reggaeton edits",
      "skull/skeleton aesthetic", "exaggerated reactions", "family humor",
      "low-res deep-fried memes", "brainrot latino", "Drake/football crossover",
    ],
    aesthetics: [
      "vibrant neon", "skull/calavera", "street graffiti", "lowrider chrome",
      "tropical/carnival colors", "dark gothic x vibrant", "luchador masks",
      "cyberpunk x latin", "soccer jersey style",
    ],
  },
};

// ============ 分类关键词库（按地区细化） ============

export type CategoryRule = {
  category: TrendCategory;
  // 通用关键词
  keywords: RegExp;
  // 排除关键词（匹配则不应归入此类）
  excludeKeywords?: RegExp;
  // 地区加权
  regionBoost?: Partial<Record<Region, RegExp>>;
};

export const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "meme",
    keywords: /\bmeme\b|memes|viral\s+(challenge|trend|sound|audio)|tiktok\s+(trend|challenge|sound|dance)|brain\s*rot|shitpost|copypasta|reaction\s+meme|funny\s+video|comedy\s+skit|parody|duet\s+chain/i,
    excludeKeywords: /official\s+trailer|box\s+office|film\s+festival|movie\s+review|album\s+release/i,
  },
  {
    category: "film_tv",
    // 必须有明确的影视上下文：上映、预告、票房、剧集、流媒体首播
    keywords: /\b(movie|film|cinema)\b.{0,30}\b(release|premiere|trailer|box\s+office|sequel|reboot)|\b(series|drama|show|season)\b.{0,30}\b(new|premiere|finale|streaming|netflix|disney|hbo|amazon|hulu)|anime\s+(movie|film|season|episode|premiere)|bollywood|k-?drama|thai\s+drama|c-?drama|telenovela|\b(animated|animation)\s+(film|movie|series)/i,
    excludeKeywords: /tiktok\s+challenge|dance\s+trend|viral\s+meme/i,
  },
  {
    category: "festival",
    keywords: /\b(christmas|halloween|easter|eid|ramadan|diwali|lunar\s+new\s+year|chinese\s+new\s+year|songkran|carnival|carnaval|dia\s+de\s+muertos|day\s+of\s+the\s+dead|navidad|hari\s+raya|lebaran|mid-?autumn|thanksgiving|valentine|new\s+year|imlek|semana\s+santa|independence\s+day|national\s+day)\b/i,
  },
  {
    category: "culture",
    keywords: /\b(traditional|folklore|indigenous|heritage|cultural|ritual|ceremony|martial\s+art|local\s+cuisine|traditional\s+dance|batik|kebaya|ao\s+dai|hanbok|qipao)\b|\b(lucha\s+libre|capoeira|samba|gamelan|wayang|muay\s+thai|silat)\b/i,
    excludeKeywords: /tiktok|viral|trending|challenge/i,
  },
  {
    category: "big_event",
    keywords: /\b(world\s+cup|olympic|copa\s+america|super\s+bowl|grammy|oscar|met\s+gala|e3|gamescom|game\s+awards|world\s+championship|esports\s+(tournament|final|championship))\b|\b(earthquake|hurricane|typhoon|flood|breaking\s+news)\b/i,
  },
  {
    category: "pop_element",
    // 默认/兜底：流行音乐、时尚、名人、舞蹈、潮流
    keywords: /\b(kpop|k-?pop|jpop|reggaeton|trap|hip\s*hop|rap\b|idol|singer|artist|album|concert|tour|fashion|style|aesthetic|neon|cyberpunk|cosplay|streetwear|sneaker|collaboration|collab\b|brand|merch)\b/i,
  },
];

// ============ 搜索查询优化（按地区特色） ============

export function getOptimizedQueries(region: Region): string[] {
  const year = new Date().getFullYear();
  const culture = REGION_CULTURE[region];
  
  if (region === "SEA") {
    return [
      // K-pop + anime（东南亚两大支柱）
      `K-pop viral TikTok ${year}`,
      `BLACKPINK NewJeans Stray Kids viral`,
      `anime viral cosplay TikTok ${year}`,
      `One Piece Jujutsu Kaisen viral`,
      // 本地热门
      `TikTok Indonesia Philippines Thailand viral ${year}`,
      `viral dance challenge Southeast Asia`,
      `cute animal capybara cat viral TikTok`,
      `Mobile Legends Free Fire viral meme`,
      // 中国短剧在SEA
      `Chinese drama viral TikTok Southeast Asia`,
      // 节日
      `Songkran Eid Ramadan celebration ${year}`,
      // 游戏
      `gaming cosplay anime viral ${year}`,
      `TikTok kawaii cute trend ${year}`,
    ];
  }
  
  // LATAM
  return [
    // 拉丁音乐
    `reggaeton viral TikTok ${year}`,
    `Bad Bunny Peso Pluma Feid viral`,
    `Latin trap corridos tumbados viral`,
    // 足球
    `football soccer viral meme ${year}`,
    `Messi Neymar Vinicius viral`,
    // 动漫在拉美
    `Dragon Ball Naruto anime viral Latin America`,
    `anime cosplay viral TikTok ${year}`,
    // 文化特色
    `Dia de Muertos calavera skull trend`,
    `Carnival Brazil Mexico viral ${year}`,
    `lucha libre mask viral`,
    // 游戏
    `Free Fire Fortnite viral meme ${year}`,
    `TikTok Brazil Mexico viral trend ${year}`,
    // 街头文化
    `graffiti street art neon lowrider viral`,
    `TikTok dance Latin challenge ${year}`,
  ];
}

// ============ 智能分类引擎 ============

export function classifyCategoryAdvanced(title: string, description: string, region: Region): TrendCategory {
  const text = `${title} ${description}`.toLowerCase();
  const culture = REGION_CULTURE[region];
  
  // 1. 先检查是否匹配节日（节日判断最明确）
  for (const fest of culture.festivals) {
    if (fest.keywords.some(kw => text.includes(kw))) {
      return "festival";
    }
  }
  
  // 2. 按规则逐一匹配，但检查排除条件
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.test(text)) {
      // 如果有排除条件且匹配，跳过此规则
      if (rule.excludeKeywords && rule.excludeKeywords.test(text)) continue;
      
      // 特殊判断：film_tv 需要更严格验证
      if (rule.category === "film_tv") {
        // 必须包含具体的影视名或明确的影视上下文
        const hasFilmContext = /\b(trailer|premiere|season\s+\d|episode|box\s+office|streaming|netflix|disney|hbo|sequel|franchise|casting|directed\s+by|starring)\b/i.test(text);
        const hasSpecificTitle = hasKnownFilmTitle(text, region);
        if (!hasFilmContext && !hasSpecificTitle) continue;
      }
      
      return rule.category;
    }
  }
  
  // 3. 基于地区文化的智能推断
  // 检查是否匹配地区热门IP
  if (culture.hotIPs.some(ip => text.includes(ip))) {
    // 判断具体是音乐人、动漫还是其他
    if (culture.musicTaste.some(m => text.includes(m))) return "pop_element";
    if (/anime|manga|cosplay|weeb|otaku/.test(text)) return "pop_element";
    if (/meme|funny|reaction|shitpost/.test(text)) return "meme";
  }
  
  // 4. 默认归类
  if (/dance|challenge|trend|viral|sound/.test(text)) return "meme";
  return "pop_element";
}

// ============ 已知影视作品检测 ============

function hasKnownFilmTitle(text: string, region: Region): boolean {
  const globalFilms = [
    "avengers", "spider-man", "spiderman", "batman", "superman",
    "star wars", "harry potter", "lord of the rings", "fast and furious",
    "jurassic", "transformers", "mission impossible", "john wick",
    "dune", "barbie", "oppenheimer", "inside out", "frozen",
    "deadpool", "wolverine", "guardians of the galaxy",
  ];
  
  const animeFilms = [
    "one piece film", "dragon ball super", "demon slayer movie",
    "jujutsu kaisen", "my hero academia", "suzume", "your name",
    "spirited away", "howl", "studio ghibli",
  ];
  
  const allFilms = [...globalFilms, ...animeFilms];
  
  if (region === "LATAM") {
    allFilms.push("coco", "encanto", "book of life");
  }
  
  return allFilms.some(f => text.includes(f));
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
  
  // 1. 地区相关性分析
  const regionRelevance = analyzeRegionRelevance(text, region, culture);
  if (regionRelevance) analyses.push(regionRelevance);
  
  // 2. 游戏资源转化分析
  const gameRelevance = analyzeGameRelevance(text, category);
  if (gameRelevance) analyses.push(gameRelevance);
  
  // 3. 时效性和传播力分析
  const viralPotential = analyzeViralPotential(text);
  if (viralPotential) analyses.push(viralPotential);
  
  // 4. 玩家群体匹配分析
  const audienceMatch = analyzeAudienceMatch(text, region, culture);
  if (audienceMatch) analyses.push(audienceMatch);
  
  return analyses.slice(0, 3).join("。") + "。";
}

function analyzeRegionRelevance(text: string, region: Region, culture: typeof REGION_CULTURE.SEA): string | null {
  if (region === "SEA") {
    if (/kpop|k-?pop|blackpink|bts|stray\s*kids|newjeans|seventeen|aespa|ive|le\s*sserafim/.test(text)) {
      return "K-pop在东南亚拥有狂热粉丝基础，相关联动/视觉元素能直接引发玩家付费冲动和社交传播";
    }
    if (/anime|manga|one\s*piece|jujutsu|demon\s*slayer|chainsaw|dragon\s*ball|naruto/.test(text)) {
      return "日本动漫在东南亚年轻玩家中是第一认知IP，联动历史已被Free Fire/MLBB验证可行";
    }
    if (/chinese\s*drama|c-?drama|ancient|wuxia|仙侠/.test(text)) {
      return "中国短剧/仙侠古装在印尼、泰国年轻女性用户中爆火，可借势覆盖女性向玩家群体";
    }
    if (/cute|kawaii|capybara|cat|puppy|chibi|adorable/.test(text)) {
      return "可爱/萌系内容在东南亚全年龄段高接受度，水豚、猫等形象可直接做盘盘/挂件类资源";
    }
    if (/indonesia|philippines|thailand|vietnam|malaysia/.test(text)) {
      return `内容来源直指${culture.name}本地市场，文化亲近度极高，玩家会产生强烈认同感`;
    }
  } else {
    if (/reggaeton|bad\s*bunny|peso\s*pluma|feid|karol\s*g|trap\s*latino|corridos/.test(text)) {
      return "拉丁音乐是拉美Z世代的文化符号，音乐人形象/风格可直接转化为角色皮肤和大厅主题";
    }
    if (/football|soccer|messi|neymar|vinicius|copa|world\s*cup|futbol/.test(text)) {
      return "足球在拉美是宗教级文化，球星联动、球衣风格皮肤有极强的付费驱动力";
    }
    if (/dia\s*de\s*muertos|calavera|catrina|skull|skeleton/.test(text)) {
      return "亡灵节美学（骷髅、花朵、荧光）在拉美有深厚文化认同，视觉独特且适合暗黑风格射击游戏";
    }
    if (/lucha\s*libre|mask|luchador|wrestling/.test(text)) {
      return "Lucha Libre面具文化在墨西哥是国民级图腾，面具风格角色皮肤的辨识度和付费意愿极高";
    }
    if (/carnival|carnaval|samba|brazil|neon|fluorescent/.test(text)) {
      return "巴西嘉年华的荧光色彩和舞蹈能量完美契合射击游戏的动态视觉需求";
    }
    if (/graffiti|street\s*art|lowrider|chrome|urban/.test(text)) {
      return "街头涂鸦/Lowrider美学在拉美青年中代表态度和身份认同，适合喷漆和载具皮肤";
    }
  }
  return null;
}

function analyzeGameRelevance(text: string, category: TrendCategory): string | null {
  if (/dance|choreography|move|gesture|challenge/.test(text)) {
    return "包含明确的肢体动作/舞蹈编排，可1:1转化为游戏内表情动作，玩家使用频率和分享意愿高";
  }
  if (/cosplay|costume|outfit|fashion|style|aesthetic/.test(text)) {
    return "包含明确的视觉装扮元素，可直接提取配色/剪影做角色皮肤设计参考";
  }
  if (/meme|reaction|funny|sticker/.test(text)) {
    return "梗图/反应图的社交传播属性极强，做成喷漆后玩家会主动在对局中使用扩散";
  }
  if (/neon|glow|cyber|futuristic|holographic/.test(text)) {
    return "赛博/荧光视觉风格与Bloodstrike美术调性高度吻合，改造成本低且效果好";
  }
  if (/music|song|beat|rhythm|audio/.test(text)) {
    return "音频/音乐元素可用于大厅主题BGM或表情动作配乐，增强沉浸感";
  }
  return null;
}

function analyzeViralPotential(text: string): string | null {
  if (/million|billion|10m|100m|viral|explod|blow\s*up/.test(text)) {
    return "已在社交平台获得千万级传播量，证明内容有跨圈层传播力";
  }
  if (/trending|top\s*\d|#1|number\s*one|chart/.test(text)) {
    return "当前处于平台热门榜单，时效性强，建议在热度窗口期内快速响应";
  }
  return null;
}

function analyzeAudienceMatch(text: string, region: Region, culture: typeof REGION_CULTURE.SEA): string | null {
  const gamingKeywords = culture.gamingCulture.some(g => text.includes(g));
  if (gamingKeywords) {
    return `直接关联${culture.name}玩家日常接触的游戏文化，受众重合度极高`;
  }
  if (/gen\s*z|teen|youth|young|student|college/.test(text)) {
    return "受众画像与手游核心用户（15-25岁）高度重合，转化效率有保障";
  }
  return null;
}
