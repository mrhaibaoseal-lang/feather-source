# feather-source

私人 Feather 來源。分兩部分：

- `action.yml`：給各專案的 GitHub Actions 用。把 IPA 發佈成 Release（tag `feather-v<版本>-<build>`），release 說明裡藏一段 Feather 需要的資料。
- `worker/`：Cloudflare Worker。每次 Feather 讀取時，掃你所有 public repo 的 Release，即時組出 source.json（快取 60 秒）。

新專案要加入商店：在打包 IPA 的 workflow 最後加上下面這段，頂層加 `permissions: contents: write`：

```yaml
      - name: Publish to private Feather source
        uses: mrhaibaoseal-lang/feather-source@main
        with:
          ipa: 你的.ipa
          icon: 路徑/icon.png   # 可省略
```

## 部署 Worker（一次）

```powershell
cd worker
npx wrangler deploy
npx wrangler secret put SECRET     # 貼一串隨機字（藏網址用）
npx wrangler secret put GH_TOKEN   # GitHub fine-grained token，Public repositories 唯讀即可
```

來源網址：`https://feather-source.<你的子網域>.workers.dev/<SECRET>/source.json`
（加 `?fresh` 可跳過 60 秒快取）

發新版前記得調高版本號，否則 Feather 不會顯示「有更新」。
