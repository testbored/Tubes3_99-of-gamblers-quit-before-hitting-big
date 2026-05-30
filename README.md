# Tubes3_99-of-gamblers-quit-before-hitting-big
## Judol Detector
Ringkasan singkat: ekstensi Chrome yang mendeteksi token perjudian (judol) di halaman web menggunakan hirarki pencocokan: 
>Exact (KMP/BM)
>Regex
>Fuzzy (Weighted Levenshtein)
Algoritma diimplementasikan di `src/algorithms`, sedangkan build extension menggunakan `esbuild` untuk membundel content script agar siap dijalankan di Chrome.

## Penjelasan algoritma
- KMP (Knuth-Morris-Pratt): algoritma pencarian substring linear-time yang membangun tabel LPS (longest proper prefix which is also suffix) untuk menghindari pemeriksaan ulang karakter.
- Boyer-Moore: algoritma pencarian dari kanan ke kiri yang memakai tabel bad-character dan good-suffix untuk melakukan lompatan lebih jauh saat mismatch.
- Regex: dipakai untuk menangkap pola umum seperti `<kata><angka>` misalnya `MAXWIN234` atau `SLOT99`.
- Weighted Levenshtein: dipakai untuk fuzzy matching dengan bobot lebih kecil pada substitusi karakter yang mirip secara visual.

## Requirement dan instalasi
- Node.js 18+ dan npm
- Development dependencies: `esbuild` dan `typescript` (didefinisikan di `package.json`)

Instal:
```bash
npm install
```

Kalau `npm run build:ext` memunculkan prompt instalasi, jalankan `npm install` sekali lagi agar `esbuild` benar-benar terpasang di `node_modules`.

## Langkah build dan load ekstensi di Chrome
1. Build artifact ke `dist/`:
```bash
npm run build:ext
```
	Proses build ini menjalankan TypeScript compiler lalu memakai `esbuild` untuk membundel content script menjadi satu file yang lebih stabil saat dijalankan di Chrome.
2. Buka `chrome://extensions/`, aktifkan *Developer mode* lalu klik *Load unpacked*.
3. Pilih folder `dist/` di root proyek. Ekstensi akan dimuat.

Struktur hasil build yang penting:
- `dist/manifest.json` sebagai konfigurasi extension.
- `dist/content/content.js` sebagai loader content script.
- `dist/src/entry/content.js` sebagai hasil kompilasi TypeScript.
- `dist/content/highlight.css` untuk styling highlight.

Untuk pengembangan, jalankan build lagi setelah mengedit `src/` lalu reload ekstensi di Chrome.

## Catatan build
- `npm run build:ext` adalah perintah utama untuk menghasilkan folder `dist/`.
- `scripts/build-extension.js` menangani dua tahap: compile TypeScript dan bundling dengan `esbuild`.

## Author (nanti diurutin nim yeah)

| No | Nama | NIM |
|---|---|---|
| 1 | Nathan E.C. Marpaung | 13524062 |
| 2 | Bernhard Aprillio Pramana | 13524074 |
| 3 | Mahmudia Kimdaro Amin | 13524083 |


