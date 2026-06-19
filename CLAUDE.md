# ISTQB 證照站

## 部署
- **Vercel（主）**: https://istqb-api-alpha.vercel.app
- **Netlify（301→Vercel）**: https://gleeful-gumption-2a8d84-istqb.netlify.app
- **GitHub**: Astor0504/istqb-api

## 環境變數（Vercel Production）
- `ANTHROPIC_KEY`、`ANTHROPIC_MODEL=claude-sonnet-4-6`（考題深度解析用 Sonnet）
- `AZURE_KEY`、`AZURE_REGION=eastasia`
- `ALLOWED_ORIGINS` — CORS 白名單已設定

## 為什麼用 Sonnet 不用 Haiku
ISTQB 題目常涉及多層邏輯推理（例：決策覆蓋 vs 條件覆蓋差異、不同測試層級的邊界）。Haiku 在這類題型準確度不夠，使用者實測後決定升級 Sonnet。**不要為省 token 降回 Haiku**。

## 內容慣例
- 題目解析要**先給答案，再給推理**（結論前置）
- 錯誤選項要逐一說明「為什麼錯」，不是只點出對的
- 相關知識連結用 anchor，不用另開頁（減少點擊決策成本）

## 參考資源（WebFetch 白名單已加）
- istqb.org、astqb.org、gasq.org、www.istqb.guru、testing101.net
