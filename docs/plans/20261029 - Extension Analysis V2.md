# 🔬 Analisis Ekstensi v2 — TopsCore Maximum Build

> **Stack Aktual:** Vanilla JS + CSS + HTML | TypeScript (Edge Functions/Deno) | Supabase PostgreSQL | Playwright E2E  
> **No framework:** Tidak ada React/Vue/Angular/Tailwind  
> **AI-first workflow:** 99% kode ditulis AI  
> **Temuan kritis:** Deno (wajib untuk Edge Functions) belum ada ekstensinya!

---

## 📋 Status 13 Ekstensi Saat Ini

| # | Ekstensi | Verdict | Alasan |
|---|----------|---------|--------|
| 1 | `christian-kohler.npm-intellisense` | 🔴 **HAPUS** | AI handles imports. Tidak ada bundler/webpack — import langsung CDN |
| 2 | `ckolkman.vscode-postgres` | 🟢 **PERTAHANKAN** | Koneksi langsung ke Supabase PostgreSQL |
| 3 | `dbaeumer.vscode-eslint` | 🟡 **PERTAHANKAN** | ESLint — tangkap bug runtime sebelum AI sempat review |
| 4 | `esbenp.prettier-vscode` | 🟢 **PERTAHANKAN** | Formatter — konsistensi kode wajib |
| 5 | `formulahendry.auto-rename-tag` | 🔴 **HAPUS** | HTML files hanya 25 buah, AI rewrite total bukan rename tag |
| 6 | `jeff-hykin.better-js-syntax` | 🟢 **PERTAHANKAN** | Better JS highlighting — stack utama JS |
| 7 | `kanezal.better-antigravity` | 🟢 **PERTAHANKAN** | Antigravity IDE enhancer |
| 8 | `ms-vscode.powershell` | 🟢 **PERTAHANKAN** | `.ps1` scripts ada 14 file di project |
| 9 | `mtxr.sqltools` | 🟢 **PERTAHANKAN** | SQL runner — Supabase migrations & queries langsung |
| 10 | `streetsidesoftware.code-spell-checker` | 🔴 **HAPUS** | AI checks spelling. Overhead tidak perlu, sering false-positive di kode |
| 11 | `usernamehw.errorlens` | 🟢 **PERTAHANKAN** | Error inline — visual feedback instant |
| 12 | `yandeu.five-server` | 🟢 **PERTAHANKAN** | Live server HTML — TopsCore adalah static HTML |
| 13 | `yutengjing.better-colorizer` | 🔴 **HAPUS** | Pure cosmetic — AI tidak peduli warna token |

---

## 🗑️ HAPUS (3 ekstensi)

```
christian-kohler.npm-intellisense   ← redundan dengan AI
formulahendry.auto-rename-tag       ← jarang dipakai, AI rewrite anyway
streetsidesoftware.code-spell-checker ← false positives, AI lebih baik
yutengjing.better-colorizer         ← cosmetic only
```

---

## 📦 INSTALL KRITIS (yang benar-benar dibutuhkan)

| Ekstensi | Prioritas | Alasan |
|----------|-----------|--------|
| `denoland.vscode-deno` | 🚨 **KRITIS** | Deno dipakai untuk SEMUA Edge Functions (`supabase/functions/**`) — `.vscode/settings.json` sudah config Deno tapi ekstensinya belum ada! IntelliSense, type checking, import resolution semua broken tanpa ini |
| `eamodio.gitlens` | 🔴 **TINGGI** | Git blame inline, history per baris, branch comparison — wajib untuk project di Phase 186 dengan 186+ commits |
| `rangav.vscode-thunder-client` | 🔴 **TINGGI** | Test Edge Functions (REST API) langsung dari IDE — menggantikan Postman/curl |
| `ms-playwright.playwright` | 🟡 **SEDANG** | Playwright E2E test runner — project punya `playwright.config.js` + banyak `.spec.js` |
| `christian-kohler.path-intellisense` | 🟡 **SEDANG** | Autocomplete path file `../js/auth.js` — berguna untuk static HTML imports |

---

## ✅ HASIL AKHIR (13 ekstensi yang benar-benar dipakai)

```
denoland.vscode-deno          ← Deno/Edge Functions TypeScript
eamodio.gitlens               ← Git history & blame
rangav.vscode-thunder-client  ← API tester Edge Functions
ms-playwright.playwright      ← E2E test runner
christian-kohler.path-intellisense ← Path autocomplete

ckolkman.vscode-postgres      ← Supabase/PostgreSQL
dbaeumer.vscode-eslint        ← JS linting
esbenp.prettier-vscode        ← Code formatter
jeff-hykin.better-js-syntax  ← Better JS highlighting
kanezal.better-antigravity    ← IDE enhancer
ms-vscode.powershell          ← PowerShell scripts
mtxr.sqltools                 ← SQL editor & runner
usernamehw.errorlens          ← Error inline
yandeu.five-server            ← Live HTML server
```
