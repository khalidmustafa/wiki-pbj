# Wiki PBJ

Sumber situs [wiki.pengadaan.id](https://wiki.pengadaan.id), rujukan terbuka pengadaan barang/jasa di Indonesia yang dikelola KMP.

## Struktur

| Lokasi | Isi | Disunting di |
| --- | --- | --- |
| `konten/`, `LISENSI.md`, `ekspor.json` | Isi wiki hasil ekspor harian (21.00 WIB) dari repository sumber KMP | Repository sumber KMP. Folder ini **ditimpa** setiap ekspor |
| `halaman/` | Beranda, penafian, cara mengusulkan perbaikan | Repository ini |
| `quartz.config.yaml`, `quartz/`, `package*.json` | Generator situs [Quartz](https://quartz.jzhao.xyz) v5.1.0 | Repository ini |
| `skrip/susun-isi.sh` | Menggabungkan `konten/`, `halaman/`, `LISENSI.md` ke `content/` sebelum build | Repository ini |
| `.github/workflows/terbitkan-situs.yml` | Build dan terbitkan ke GitHub Pages | Repository ini |

## Menjalankan di komputer sendiri

```bash
npm ci
./skrip/susun-isi.sh
npx quartz build -d content -o public --serve
```

## Usulan perbaikan

Lewat [formulir Usulan perbaikan](https://github.com/khalidmustafa/wiki-pbj/issues/new?template=usulan-perbaikan.yml). Redaksi KMP menelaah setiap usulan.

## Lisensi

- Tulisan karya KMP: CC BY 4.0 (lihat `LISENSI.md`).
- Kode Quartz: MIT (lihat `LICENSE.txt`).
