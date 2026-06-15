export type Region = "LATAM" | "SEA";

export type TrendCategory =
  | "meme"           // 网络热梗
  | "film_tv"        // 爆火影视
  | "festival"       // 节日假期
  | "culture"        // 文化特色
  | "big_event"      // 巨大事件
  | "pop_element";   // 流行元素

export type ResourceType =
  | "character_skin"
  | "weapon_skin"
  | "weapon_charm"
  | "finisher"
  | "emote"
  | "spray"
  | "lobby_theme"
  | "event_bundle"
  | "parachute_skin"
  | "vehicle_skin"
  | "playpal";

export type Platform = "tiktok" | "youtube" | "x" | "news" | "reddit" | "web" | "bing";

export type TrendScores = {
  categoryAffinity: number;
  adaptationCost: number;
  mobileFit: number;
  audienceMatch: number;
  freshness: number;
  marketHeat: number;
  total: number;
};

export type Trend = {
  id: string;
  title: string;
  summary: string;           // 一段简介/总结（中文）
  thumbnailUrl: string;
  platform: Platform;
  region: Region;
  category: TrendCategory;
  scores: TrendScores;
  resourceSuggestion: string; // 一句话说明可以生成什么资源
  suggestedResourceTypes: ResourceType[];
  sourceUrl: string;
  publishedAt?: string;
  engagement?: {
    views?: number;
    likes?: number;
    shares?: number;
  };
  complianceNote?: string;   // 合规提示（涉及肖像权/IP/政治宗教时显示）
};
