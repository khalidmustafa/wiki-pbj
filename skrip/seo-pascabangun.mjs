#!/usr/bin/env node
// Penyesuaian hasil build Quartz (public/) untuk mesin pencari:
//   - <link rel="canonical"> di setiap halaman
//   - judul tab "Judul – Wiki PBJ"
//   - noindex untuk halaman kutipan (tetap bisa dibuka dan ditautkan) dan halaman 404
//   - data terstruktur schema.org (WebSite di beranda, Article di artikel)
//   - sitemap.xml tanpa halaman kutipan
//   - robots.txt yang menunjuk ke sitemap
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs"
import { join } from "node:path"

const SITUS = "https://wiki.pengadaan.id"
const NAMA = "Wiki PBJ"
const PUB = new URL("../public/", import.meta.url).pathname
const NOINDEX = [/^kutipan\//]

function semuaHtml(dir) {
  const hasil = []
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) hasil.push(...semuaHtml(p))
    else if (nama.endsWith(".html")) hasil.push(p)
  }
  return hasil
}

function urlDari(relatif) {
  if (relatif === "index.html") return `${SITUS}/`
  if (relatif.endsWith("/index.html")) return `${SITUS}/${relatif.slice(0, -"index.html".length)}`
  return `${SITUS}/${relatif.replace(/\.html$/, "")}`
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
const unesc = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
const meta = (html, nama) =>
  (html.match(new RegExp(`<meta (?:name|property)="${nama}" content="([^"]*)"`)) || [])[1]

const penerbit = { "@type": "Organization", name: "KMP", url: SITUS }
const lisensi = "https://creativecommons.org/licenses/by/4.0/"

let n = 0
let nNoindex = 0
for (const berkas of semuaHtml(PUB)) {
  const relatif = berkas.slice(PUB.length)
  let html = readFileSync(berkas, "utf8")
  if (!html.includes("</head>")) continue
  if (html.includes('http-equiv="refresh"')) continue // halaman alihan alias: sudah canonical + noindex dari Quartz
  const tambahan = []
  const is404 = relatif === "404.html"
  const url = urlDari(relatif)

  if (is404 || NOINDEX.some((r) => r.test(relatif))) {
    if (!html.includes('name="robots"')) tambahan.push('<meta name="robots" content="noindex, follow"/>')
    nNoindex++
  }
  if (!is404 && !html.includes('rel="canonical"')) tambahan.push(`<link rel="canonical" href="${esc(url)}"/>`)

  // Judul tab: "Judul – Wiki PBJ" (beranda tetap "Wiki PBJ")
  html = html.replace(/<title>([^<]*)<\/title>/, (asli, t) =>
    t === NAMA || t.endsWith(` – ${NAMA}`) ? asli : `<title>${t} – ${NAMA}</title>`,
  )

  const judul = unesc(meta(html, "og:title") || "")
  const desk = unesc(meta(html, "description") || "")
  if (relatif === "index.html") {
    tambahan.push(
      `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: NAMA,
        url: `${SITUS}/`,
        inLanguage: "id",
        description: desk,
        publisher: penerbit,
        license: lisensi,
      })}</script>`,
    )
  } else if (relatif.startsWith("artikel/") && !relatif.endsWith("index.html")) {
    const tgl = (html.match(/<time datetime="([^"]+)"/) || [])[1]
    const data = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: judul,
      description: desk,
      url,
      mainEntityOfPage: url,
      inLanguage: "id",
      image: `${SITUS}/static/og-image.png`,
      publisher: penerbit,
      author: penerbit,
      license: lisensi,
      isPartOf: { "@type": "WebSite", name: NAMA, url: `${SITUS}/` },
    }
    if (tgl) data.dateModified = tgl
    tambahan.push(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`)
  }

  if (tambahan.length) html = html.replace("</head>", `${tambahan.join("")}</head>`)
  writeFileSync(berkas, html)
  n++
}

// sitemap.xml: buang halaman yang diberi noindex
const peta = join(PUB, "sitemap.xml")
let nBuang = 0
if (existsSync(peta)) {
  const xml = readFileSync(peta, "utf8")
  const baru = xml.replace(/<url>[\s\S]*?<\/url>/g, (u) => {
    const loc = (u.match(/<loc>([^<]*)<\/loc>/) || [])[1] || ""
    const rel = loc.replace(`${SITUS}/`, "")
    if (NOINDEX.some((r) => r.test(rel))) {
      nBuang++
      return ""
    }
    return u
  })
  writeFileSync(peta, baru)
}

writeFileSync(join(PUB, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITUS}/sitemap.xml\n`)
console.log(`seo-pascabangun: ${n} halaman, ${nNoindex} noindex, ${nBuang} URL dibuang dari sitemap, robots.txt ditulis`)
