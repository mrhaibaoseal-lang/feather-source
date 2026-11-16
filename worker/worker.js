// 私人 Feather / AltStore 來源：即時從你的 GitHub Releases 產生 source.json
// 網址：https://<worker>.workers.dev/<SECRET>/source.json
// 環境變數：GITHUB_USER（vars）、SECRET、GH_TOKEN（secrets，GH_TOKEN 可省略但建議設）
const MAX_VERSIONS = 10;
const CACHE_SECONDS = 60;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname !== `/${env.SECRET}/source.json`) return new Response("Not found", { status: 404 });

    const cache = caches.default;
    const cacheKey = new Request(url.toString());
    if (!url.searchParams.has("fresh")) {
      const hit = await cache.match(cacheKey);
      if (hit) return hit;
    }

    const gh = (path) =>
      fetch(`https://api.github.com${path}`, {
        headers: {
          "User-Agent": "feather-source-worker",
          Accept: "application/vnd.github+json",
          ...(env.GH_TOKEN ? { Authorization: `Bearer ${env.GH_TOKEN}` } : {}),
        },
      }).then((r) => (r.ok ? r.json() : []));

    const repos = (await gh(`/users/${env.GITHUB_USER}/repos?per_page=100&sort=pushed`))
      .filter((r) => !r.fork && !r.archived);

    const perRepo = await Promise.all(
      repos.map(async (repo) => {
        const releases = await gh(`/repos/${repo.full_name}/releases?per_page=30`);
        const versions = [];
        let meta = null, icon = "";
        for (const rel of releases) {
          const m = (rel.body || "").match(/<!-- feather (\{.*?\}) -->/s);
          const ipa = rel.assets.find((a) => a.name.endsWith(".ipa"));
          if (!m || !ipa) continue;
          const info = JSON.parse(m[1]);
          if (!meta) {
            meta = info;
            icon = rel.assets.find((a) => a.name === "feather-icon.png")?.browser_download_url || "";
          }
          if (info.bundleIdentifier !== meta.bundleIdentifier) continue;
          versions.push({
            version: info.version,
            buildVersion: info.buildVersion,
            date: rel.published_at,
            localizedDescription: (rel.body || "").replace(/<!-- feather .*? -->/s, "").trim(),
            downloadURL: ipa.browser_download_url,
            size: ipa.size,
            minOSVersion: info.minOSVersion,
          });
          if (versions.length >= MAX_VERSIONS) break;
        }
        if (!meta) return null;
        const latest = versions[0];
        return {
          name: meta.name,
          bundleIdentifier: meta.bundleIdentifier,
          developerName: env.DEVELOPER_NAME || env.GITHUB_USER,
          localizedDescription: meta.description || meta.name,
          iconURL: icon || `https://github.com/${env.GITHUB_USER}.png?size=512`, // Feather 不接受空字串
          tintColor: env.TINT || "#7B6CF6",
          versions,
          // 舊版 AltStore 欄位（相容用）
          version: latest.version,
          versionDate: latest.date,
          downloadURL: latest.downloadURL,
          size: latest.size,
        };
      })
    );

    const source = {
      name: env.SOURCE_NAME || "我的私人商店",
      identifier: `io.github.${env.GITHUB_USER}.private`.toLowerCase(),
      apps: perRepo.filter(Boolean),
      news: [],
    };

    const res = new Response(JSON.stringify(source, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
      },
    });
    ctx.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  },
};
