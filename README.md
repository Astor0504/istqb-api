# ISTQB CTFL 學習網站

靜態講義 + Azure 自然語音朗讀 + Claude AI 教練。

## 功能

- 📚 22 課 ISTQB CTFL v4.0.1 講義（ADHD 友善版面）
- 🔊 Azure Speech TTS（台灣腔自然語音，HsiaoChen / HsiaoYu / YunJhe）
- 🧠 Claude AI 學習教練（後端代理，金鑰不外洩）
- 📝 測驗、筆記、搜尋、番茄鐘
- 🌙 明暗主題、進度追蹤

## 本機啟動

```bash
# 1. 複製環境變數範本
cp .env.example .env
# 編輯 .env 填入 AZURE_KEY / ANTHROPIC_KEY

# 2. 啟動（需要 Node 18+）
node server.js
# 或
npm start
```

開啟 http://localhost:5173

## 環境變數

| 變數 | 必填 | 說明 |
|---|---|---|
| `AZURE_KEY` | TTS 必填 | Azure Speech subscription key |
| `AZURE_REGION` | | 預設 `eastasia` |
| `ANTHROPIC_KEY` | AI 必填 | Claude API key |
| `ANTHROPIC_MODEL` | | 預設 `claude-haiku-4-5` |
| `PORT` | | 預設 `5173` |
| `ALLOWED_ORIGINS` | ⚠️ 正式環境必設 | CORS 白名單，逗號分隔。例：`https://istqb.example.com` |
| `RATE_LIMIT_RPM` | | 每 IP 每分鐘請求數，預設 60 |

## 資訊安全重點

✅ **Azure 與 Anthropic 金鑰只存在於後端環境變數**
✅ 前端透過 `/tts`、`/chat` 代理呼叫
✅ 每 IP 速率限制防濫用
✅ TTS 語音白名單（只允許 `zh-TW/CN/HK-*Neural`）
✅ payload 長度限制
⚠️ 正式部署請把 `ALLOWED_ORIGINS` 改成具體網域，不要用 `*`
⚠️ 不要把 `.env` 提交到 Git（已在 `.gitignore`）

## 部署到雲端

### Render.com（免費）
1. 推到 GitHub
2. New → Web Service → 連結 repo
3. Build Command：留空
   Start Command：`node server.js`
4. Environment 填入所有環境變數
5. 部署完成

### Railway / Fly.io / VPS
同理：確保 Node 18+、設環境變數、`node server.js`。

### 別用 GitHub Pages / Netlify / Vercel 靜態託管
這專案需要 Node 後端，純靜態平台不能跑。

## 成本估算

| 服務 | 免費額度 | 超出後 |
|---|---|---|
| Azure Speech F0 | 每月 50 萬字 | 不能超過（升 S0 → $4/百萬字）|
| Claude Haiku | 無 | ~$0.25/百萬 tokens |
| Render Free | 750 小時/月 | 閒置會休眠 |

一般自用每月幾乎 0 成本。
