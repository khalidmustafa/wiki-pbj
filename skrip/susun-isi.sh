#!/usr/bin/env bash
# Menyusun folder content/ untuk Quartz dari:
#   konten/     isi hasil ekspor otomatis dari repository KMP (jangan disunting di sini)
#   halaman/    halaman situs (beranda, penafian, usulan perbaikan)
#   LISENSI.md  teks lisensi hasil ekspor, ditayangkan sebagai /lisensi
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf content
mkdir content
if [ -d konten ]; then cp -r konten/. content/; fi
cp -r halaman/. content/
if [ -f LISENSI.md ]; then
  { printf -- '---\ntitle: Lisensi\n---\n\n'; sed '1{/^# /d}' LISENSI.md; } > content/lisensi.md
fi
echo "content/: $(find content -name '*.md' | wc -l) halaman"
node skrip/seo-isi.mjs
