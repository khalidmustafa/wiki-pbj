#!/usr/bin/env node
// Melengkapi frontmatter di content/ untuk mesin pencari, sebelum Quartz membangun situs:
//   description  ringkasan halaman (dipakai meta description, og:description, twitter:description)
//   modified     tanggal reviu/cek sebenarnya (dipakai tanggal halaman dan <lastmod> sitemap)
// Isi di konten/ (hasil ekspor KMP) tidak diubah; yang diubah hanya salinan di content/.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import yaml from "js-yaml"

const AKAR = new URL("../content/", import.meta.url).pathname
const PANJANG_MAKS = 160

function semuaMd(dir) {
  const hasil = []
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama)
    if (statSync(p).isDirectory()) hasil.push(...semuaMd(p))
    else if (nama.endsWith(".md")) hasil.push(p)
  }
  return hasil
}

// Ubah markdown sebaris menjadi teks polos.
function polos(s) {
  return s
    .replace(/\[\^[^\]]+\]/g, "") // rujukan catatan kaki
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // gambar
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // tautan
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/(\*\*|__|\*|_|`)/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Potong pada batas kata, paling panjang PANJANG_MAKS karakter.
function potong(s) {
  if (s.length <= PANJANG_MAKS) return s
  const t = s.slice(0, PANJANG_MAKS - 1)
  const i = t.lastIndexOf(" ")
  return (i > 80 ? t.slice(0, i) : t).replace(/[\s,;:.]+$/, "") + "…"
}

// Paragraf pertama (baris berurutan) yang memenuhi syarat, mulai dari indeks awal.
function paragrafPertama(baris, mulai, cocok) {
  for (let i = mulai; i < baris.length; i++) {
    const b = baris[i]
    if (b.startsWith("## ") && i > mulai) break
    if (!cocok(b)) continue
    const isi = [b]
    for (let j = i + 1; j < baris.length && cocok(baris[j]) && baris[j].trim() !== ""; j++)
      isi.push(baris[j])
    return isi.join(" ")
  }
  return null
}

const biasa = (b) =>
  b.trim() !== "" && !b.startsWith(">") && !b.startsWith("#") && !b.startsWith("|") && !b.startsWith("---")

function cariBagian(baris, judul) {
  return baris.findIndex((b) => b.trim().toLowerCase() === judul)
}

function deskripsi(jenis, judul, fm, badan) {
  const baris = badan.split("\n")
  if (jenis === "artikel") {
    const p = paragrafPertama(baris, 0, biasa)
    return p && polos(p)
  }
  if (jenis === "glosarium") {
    const i = cariBagian(baris, "## definisi")
    if (i < 0) return null
    const k = baris.findIndex((b, j) => j > i && b.startsWith("> "))
    if (k < 0) return null
    const isi = []
    for (let j = k; j < baris.length && baris[j].startsWith(">"); j++) isi.push(baris[j].replace(/^>\s?/, ""))
    return polos(isi.join(" "))
  }
  if (jenis === "tanya-jawab") {
    const i = cariBagian(baris, "## jawaban")
    if (i < 0) return null
    const p = paragrafPertama(baris, i + 1, biasa)
    return p && polos(p.replace(/^\s*(\d+\.|[-*])\s+/, ""))
  }
  if (jenis === "regulasi") {
    const status = fm.status_hukum
    return polos(judul) + (status ? `. Status hukum: ${String(status).trim()}.` : ".")
  }
  return null
}

let jumlahDesk = 0
let jumlahTgl = 0
for (const berkas of semuaMd(AKAR)) {
  const relatif = berkas.slice(AKAR.length)
  const jenis = relatif.split("/")[0]
  const teks = readFileSync(berkas, "utf8")
  const m = teks.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) continue
  const fmTeks = m[1]
  let fm
  try {
    fm = yaml.load(fmTeks, { schema: yaml.JSON_SCHEMA }) || {}
  } catch {
    continue
  }
  const badan = teks.slice(m[0].length)
  const tambahan = []

  if (fm.description === undefined) {
    const d = deskripsi(jenis, String(fm.title ?? ""), fm, badan)
    if (d) {
      tambahan.push(`description: ${JSON.stringify(potong(d))}`)
      jumlahDesk++
    }
  }
  if (fm.modified === undefined && fm.lastmod === undefined && fm.updated === undefined) {
    const tgl = [fm.tanggal_reviu, fm.tanggal_cek, fm.tanggal_acuan]
      .map((t) => (t == null ? "" : String(t)))
      .find((t) => /^\d{4}-\d{2}-\d{2}$/.test(t))
    if (tgl) {
      tambahan.push(`modified: '${tgl}'`)
      jumlahTgl++
    }
  }
  if (tambahan.length === 0) continue
  writeFileSync(berkas, `---\n${fmTeks}\n${tambahan.join("\n")}\n---\n${badan}`)
}
console.log(`seo-isi: description ditambahkan ${jumlahDesk}, modified ditambahkan ${jumlahTgl}`)
