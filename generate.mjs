import fs from "fs";
import path from "path";

const ROOT = process.cwd(); // seikei-soudan フォルダで実行する前提
const INPUT = path.join(ROOT, "questions.json");
const OUT_DIR = ROOT; // ここに吐く

function esc(s=""){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function clip(s="", n=110){
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function ensureDir(p){
  fs.mkdirSync(p, { recursive:true });
}

function loadJson(){
  if(!fs.existsSync(INPUT)){
    throw new Error(`questions.json が見つかりません: ${INPUT}`);
  }
  const raw = fs.readFileSync(INPUT, "utf-8");
  const arr = JSON.parse(raw);
  if(!Array.isArray(arr)) throw new Error("questions.json は配列(JSON Array)である必要があります");
  return arr;
}

function pageHtml({id, title, body}){
  const t = esc(title || "質問");
  const desc = esc(clip(body || "", 120));
  const canonical = `https://seikei-qa.github.io/seikei-soudan/q/${encodeURIComponent(id)}.html`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${t} | 整形相談室</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${t}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary">
</head>
<body>
  <main style="max-width:820px;margin:28px auto;padding:0 14px;font-family:system-ui,-apple-system,Segoe UI,Roboto,'Noto Sans JP',sans-serif;">
    <h1 style="font-size:20px;line-height:1.35;margin:0 0 10px 0;">${t}</h1>
    <div style="white-space:pre-wrap;line-height:1.7;color:#111;">${esc(body || "")}</div>

    <hr style="margin:18px 0;border:none;border-top:1px solid #eee">

    <a href="../q.html?id=${encodeURIComponent(id)}" style="display:inline-block;padding:10px 12px;border:1px solid #ddd;border-radius:10px;text-decoration:none;">
      回答を見る / 回答する
    </a>

    <div style="margin-top:14px;font-size:12px;color:#666;">
      ※このページは検索向けの表示です。実際の回答・投稿はアプリページで行えます。
    </div>
  </main>
</body>
</html>`;
}

function run(){
  ensureDir(OUT_DIR);

 const raw = loadJson();

const qs = (raw || [])
  .map(x => {
    if (!x) return null;

    // Firestore形式: { id, data:{ title, body, deleted } }
    if (x.data) {
      if (x.data.deleted) return null;
      return { id: x.id, title: x.data.title || "", body: x.data.body || "" };
    }

    // あなたの形式: { id, title, body }
    if (x.deleted) return null;
    return { id: x.id, title: x.title || "", body: x.body || "" };
  })
  .filter(q => q && q.id && (q.title || q.body));

  // 出力先: seikei-soudan/q/ に置きたいので、OUT_DIR は最終的にそこへコピーする
  const Q_DIR = path.join(OUT_DIR, "q");
  ensureDir(Q_DIR);

  for(const q of qs){
    const html = pageHtml(q);
    fs.writeFileSync(path.join(Q_DIR, `${q.id}.html`), html, "utf-8");
  }

  // sitemap もついでに作る（任意だけど効果大）
  const urls = qs.map(q => `https://seikei-qa.github.io/seikei-soudan/q/${q.id}.html`);
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
  fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), sm, "utf-8");

  console.log(`OK: ${qs.length} 件生成しました -> ${OUT_DIR}`);
}

run();
