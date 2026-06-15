# Regional Trend Resource Planner MVP

面向游戏运营和活动策划的 MVP 工具，用于管理 LATAM / SEA 区域热点，并将热点转化为可执行的游戏资源建议。

当前版本适合演示：

- Dashboard 热点列表和筛选
- 自动搜索地区热点，并展示原始来源
- 热点录入页 `/add`
- 热点详情页 `/trend/[id]`
- AI 分析接口 `/api/analyze`
- 无数据库时的 mock 数据和 localStorage 草稿
- 无 `OPENAI_API_KEY` 时的 mock fallback 分析

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- App Router
- Vercel 部署

## Project Structure

```text
app/
  page.tsx                 # Dashboard
  add/page.tsx             # Manual trend input
  trend/[id]/page.tsx      # Trend detail and AI analysis display
  api/analyze/route.ts     # AI analysis API route
  api/discover/route.ts    # Public-source trend discovery API route
components/
  AddTrendForm.tsx
  AnalysisResult.tsx
  Badge.tsx
  DiscoveredTrendCard.tsx
  FilterBar.tsx
  TrendCard.tsx
  TrendDashboard.tsx
  TrendDiscoveryPanel.tsx
data/
  mockTrends.ts            # Mock trend and resource suggestion data
lib/
  analysisPrompt.ts        # AI prompt and JSON schema
  discoveryQueries.ts      # Region/category query templates
  discoverySources.ts      # GDELT and RSS source adapters
  mockTrendAnalysis.ts     # Detail page mock analysis adapter
  trendLabels.ts           # Enum labels and filter options
types/
  analysis.ts              # API request/response types
  discovery.ts             # Discovery API and source types
  trend.ts                 # Trend and resource suggestion types
```

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment file:

```bash
copy .env.example .env.local
```

Start the dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is already in use, Next.js may start on `3001` or another port. Use the URL printed in the terminal.

## Environment Variables

Required for real AI output:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Optional:

```bash
OPENAI_MODEL=gpt-4.1-mini
```

Behavior:

- If `OPENAI_API_KEY` is configured, `/api/analyze` calls the OpenAI Responses API.
- If `OPENAI_API_KEY` is missing or the model call fails, `/api/analyze` returns a mock fallback with the same response shape.
- Do not commit `.env.local`. It is already ignored by `.gitignore`.

## Automatic Trend Discovery

The dashboard includes an MVP discovery panel that calls:

```text
GET /api/discover?region=LATAM
GET /api/discover?region=SEA
```

Current public sources:

- GDELT DOC API JSON
- Google News RSS search

The response separates:

- `summary`: generated trend summary for planners
- `sources`: original source name, source title, source link, and publish time when available

If public-source fetching fails, the API returns a small mock fallback so the demo remains usable.

## Useful Commands

Run development server:

```bash
npm run dev
```

Run production build check:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Run production server after build:

```bash
npm run build
npm run start
```

## Push Code To GitHub

### 1. Create A GitHub Repository

1. Open GitHub.
2. Click **New repository**.
3. Repository name example: `regional-trend-resource-planner`.
4. Keep it public or private, depending on your needs.
5. Do not initialize with README, `.gitignore`, or license if you want to push this local project directly.
6. Create the repository.

### 2. Initialize Git Locally

Run these commands in the project folder:

```bash
cd "C:\Users\lixuanpeng\Documents\New project"
git init
git add .
git commit -m "Initial MVP project"
```

### 3. Connect Remote And Push

Replace `<your-github-username>` and `<repo-name>`:

```bash
git branch -M main
git remote add origin https://github.com/<your-github-username>/<repo-name>.git
git push -u origin main
```

After this, refresh the GitHub repository page. The code should appear there.

## Deploy To Vercel

### Option A: Deploy From GitHub UI

1. Open Vercel.
2. Click **Add New** -> **Project**.
3. Import the GitHub repository.
4. Framework Preset should be detected as **Next.js**.
5. Keep default commands:
   - Install Command: `npm install`
   - Build Command: `npm run build`
   - Output Directory: default
6. Add environment variables:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` if you want to override the default model
7. Click **Deploy**.

### Option B: Deploy With Vercel CLI

Install the CLI if needed:

```bash
npm install -g vercel
```

Login:

```bash
vercel login
```

Deploy:

```bash
vercel
```

For production deployment:

```bash
vercel --prod
```

## Deployment Checklist

Before deploying:

- `npm run build` passes
- `npm run lint` passes
- `.env.local` is not committed
- `OPENAI_API_KEY` is configured in Vercel if real AI output is needed
- Mock links like `https://example.com/...` are acceptable for demo data or replaced with real source URLs
- No private API keys, passwords, tokens, or internal-only URLs are hardcoded

## Current Limitations

- `/add` saves drafts to browser localStorage only.
- Dashboard still reads from local mock data.
- Automatic discovery results are not persisted.
- AI results are not persisted to a database.
- Detail pages use mock analysis generated from local trend data.
- There is no login, role control, crawler, scheduler, or database permission layer.

## Next Steps

Recommended expansion order:

1. Persist trends and AI analysis results in a database.
2. Make `/add` save new trends to the backend.
3. Let users save discovered trends into the dashboard trend pool.
4. Store AI analysis output and display the stored result on `/trend/[id]`.
5. Add resource-type, lifecycle, risk, and priority filters to the detail workflow.
6. Add editor fields for planners to adjust AI suggestions.
7. Add export to CSV or planning brief.
8. Add simple authentication before using real internal data.
