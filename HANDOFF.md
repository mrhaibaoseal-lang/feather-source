# 交接：私人 Feather 商店（自動上架所有 iOS App）

## 目標
使用者（老鼠公爵）用 Feather 側載自己做的 App。想要一個**私人的 AltStore 格式來源**：
- 收錄自己所有 iOS 專案的 App，像一個商店
- 專案一更新（push → GitHub Actions 打包），Feather 重新整理就能下載新版
- 全域設定：新專案只要加一個 step 就自動上架，不用改中央設定
- 不公開列出（來源網址含秘密字串）

## 環境事實
- 電腦是 **Windows**，本機無法編譯 iOS。所有 IPA 都由 **GitHub Actions macOS runner** 打包成未簽名 IPA，Feather 再用使用者自己的憑證簽。
- GitHub 帳號：`mrhaibaoseal-lang`，專案 repo 都是 **public**（public repo 的 macOS Actions 分鐘數免費；改 private 會很快用完免費額度，所以不建議改）。
- 已有 Cloudflare 帳號、用過 wrangler。
- 專案目前在 `C:\Users\mrhai\.gemini\antigravity\scratch\`（以前用 Antigravity 建的，現在改用 Claude Code，資料夾還沒搬）。

## iOS 專案現況
| 本機資料夾 | GitHub repo | workflow | 產出 IPA | 圖示 |
|---|---|---|---|---|
| shift-pay-app（打工薪水帳） | shift-pay-app | `.github/workflows/build-ipa.yml` | `ShiftPay-iOS27-Feather.ipa` | `ios/ShiftPayApp/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` |
| smart-ledger（靠北我錢呢 / ImbrokeAF，Expo） | pocket-guardian | `.github/workflows/build-sidestore-ipa.yml` | `PocketGuardian-SideStore.ipa` | `assets/icon.png` |
| lazy-todo-ios（LazyTodo） | **尚無 remote**（可能是 `wake-up`，要問使用者） | `.github/workflows/build.yml` | `LazyTodo-unsigned.ipa` | 無 |
| octagon-cards | octagon-cards | `.github/workflows/build-unsigned-ipa.yml`（只在 push `v*` tag 時觸發） | `OctagonCards-unsigned.ipa` | 無 |

shift-pay-app 本來就有一個 `latest-feather` release 和 `feather-repo.json`（舊的單一 App 來源），保留不動即可。

## 架構（已寫好，在 `feather-source/` 資料夾）
1. **`action.yml`（composite action）**：各專案 workflow 最後呼叫。它會：
   - 從 IPA 讀 Info.plist（bundle ID、版本、build、名稱、MinimumOSVersion）
   - 用內建 `github.token` 建立 GitHub Release，tag 為 `feather-v<版本>-<build>`
   - 上傳 IPA（和可選的 `feather-icon.png`）
   - 在 release 說明裡藏 `<!-- feather {json} -->` 中繼資料
   - 同版本重發會覆蓋並發出 warning
   - **每個 repo 不需要任何 secret**，只需要 `permissions: contents: write`
2. **`worker/worker.js`（Cloudflare Worker）**：Feather 讀取 `/<SECRET>/source.json` 時，即時列出使用者所有非 fork、非封存的 repo，讀每個 repo 最近 30 個 release，挑出有 feather 中繼資料和 .ipa 的版本（每個 App 最多 10 版），組成 AltStore v2 格式的 source.json（也有舊版欄位相容）。快取 60 秒，加 `?fresh` 可跳過快取。路徑不對回 404。
   - `wrangler.toml` vars：`GITHUB_USER=mrhaibaoseal-lang`、`SOURCE_NAME=老鼠公爵的私人商店`、`DEVELOPER_NAME=老鼠公爵`
   - secrets：`SECRET`（隨機字串）、`GH_TOKEN`（fine-grained token，public repos 唯讀，避免 API 限流）
   - 已用模擬資料測過，輸出格式正確。

## 待辦（請 Claude Code 執行）
1. （可選，先問使用者）把專案從 `.gemini\antigravity\scratch` 搬到 `C:\Users\mrhai\Projects\`。搬之前確認每個 repo 沒有未 commit 的變更；`node_modules` 可刪掉再重裝。
2. 把 `feather-source` 建成 **public** repo `mrhaibaoseal-lang/feather-source`，push 到 `main`（其他專案用 `@main` 引用它）。
3. 修改四個專案的 workflow：
   - 頂層加 `permissions: contents: write`（shift-pay-app 已經有）
   - 在 job 最後加：
     ```yaml
           - name: Publish to private Feather source
             uses: mrhaibaoseal-lang/feather-source@main
             with:
               ipa: <上表的 IPA 檔名>
               icon: <上表的圖示，沒有就省略這行>
     ```
   - commit 並 push。lazy-todo-ios 沒有 remote，要先問使用者連到哪個 repo。
4. 在 `feather-source\worker` 執行：
   - `npx wrangler deploy`
   - `npx wrangler secret put SECRET`：產生 32 字元隨機字串，並告訴使用者
   - `npx wrangler secret put GH_TOKEN`：停下來向使用者要 token
5. 確認至少一個專案的 Actions 跑完、release 出現，再打開 `https://feather-source.<子網域>.workers.dev/<SECRET>/source.json?fresh` 檢查內容，最後把來源網址給使用者加進 Feather。

## 注意事項
- 每次發佈都要**調高版本號**，Feather 才會顯示有更新。
  - smart-ledger：`app.json` 的 `version`，以及 workflow 裡 widget Info.plist 和 build settings 寫死的 `3.3.0`。
- octagon-cards 要 push `v*` tag 才會打包上架。
- 「私人」的範圍：商店清單藏在秘密網址後面。但因為 repo 是 public，IPA 本身在 GitHub Releases 上仍然看得到，這點使用者已知。
- 使用者偏好：精準、同儕程度的技術說明，繁體中文。
