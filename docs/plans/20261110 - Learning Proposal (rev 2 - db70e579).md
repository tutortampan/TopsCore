# Learning Proposal: Prompt Refinement Protocol & Plan Naming Standard

> **Command Invoked:** `/learn`  
> **Source Directive:** `"sebelum dibuat, coba perbiki prompt ini infact mulai sekarang saat saya buat perintah, perbaiki dulu promptnya kalau ada yang kurang jelas /learn"` dan `"setealh buat Plan namakan dengn 'tahunbulantanggalhariini - nama rencana'"`  
> **Classification:** **Rule** (Universal Behavioral Guardrail & Artifact Formatting Invariant)  
> **Target File:** [`AGENTS.md`](file:///d:/Tutor%20Tampan/TopsCore/AGENTS.md) (under Section 2: Non-Negotiable Business Rules)

---

## 1. Rationale & Problem Identification

### Current Behavior:
1. Ketika pengguna memberikan perintah dengan instruksi yang padat, beberapa kata typo, atau beberapa permintaan sekaligus dalam satu kalimat (misal kombinasi perintah analisis, pembuatan plan, penamaan file, dan `/learn`), agen terkadang langsung mengeksekusi tanpa terlebih dahulu menyajikan interpretasi terstruktur yang rapi.
2. Penamaan file artefak rencana (`/plan`) sebelumnya menggunakan nama deskriptif bebas tanpa standarisasi tanggal (misal `plan_global_master_edit_mode_enforcement.md`), sehingga menyulitkan pengurutan kronologis saat melihat riwayat artefak.

### User Correction:
Pengguna menginstruksikan dua hal penting:
1. **Perbaikan & Klarifikasi Prompt**: Mulai sekarang, setiap kali pengguna memberikan perintah, agen harus terlebih dahulu merapikan prompt tersebut (memperbaiki typo, memperjelas tujuan, menyusun ruang lingkup menjadi poin-poin terstruktur dan to-the-point) sebelum/bersamaan dengan menyajikan respons.
2. **Standar Penamaan Rencana**: Setiap artefak rencana (`/plan`) wajib dinamai dengan format:
   ```text
   YYYYMMDD - <Nama Rencana>.md
   ```
   (Contoh untuk hari ini 10 November 2026: `20261110 - Streamlining Data Hierarchy & UI Architecture.md`).

---

## 2. Proposed Rule Addition in `AGENTS.md`

Berikut adalah teks aturan yang akan ditambahkan ke [`AGENTS.md`](file:///d:/Tutor%20Tampan/TopsCore/AGENTS.md) di bawah Rule 2.27:

```markdown
## 2.28 Mandatory Prompt Refinement & Structured Intent Clarification (/learn)

Whenever the user submits a request, instruction, or prompt—especially one that is multi-faceted, contains typographical errors, or presents complex requirements—the agent MUST actively refine and structure the user's prompt.

Rules:
1. **Refined Prompt Presentation**: Before proceeding with heavy execution or in the opening section of planning responses, the agent MUST present a clear, polished, and structured version of the prompt (under a designated heading, e.g., `### 🎯 Refined Prompt / Rekonstruksi Perintah Terstruktur`).
2. **Clarity Without Scope Creep**: The refined prompt must faithfully preserve 100% of the user's actual intent, fix typos, eliminate ambiguities, and organize the goals into crisp, actionable bullet points without inferring unauthorized business rules.
3. **User Confirmation**: This ensures the user can immediately verify that the agent has accurately understood every nuance of the request.

## 2.29 Standard Plan Artifact Naming Convention (`YYYYMMDD - Plan Name.md`) (/learn)

All implementation plan artifacts generated via `/plan` MUST strictly follow the chronological date-prefixed naming convention:

```text
YYYYMMDD - <Descriptive Plan Name>.md
```

Rules:
- `YYYYMMDD`: 8-digit date string representing the current date (e.g. `20261110` for November 10, 2026).
- Separator: Space-hyphen-space (` - `).
- `<Descriptive Plan Name>`: Clean, concise, human-readable plan title in title case.
- Example: `20261110 - Data & Feature Streamlining Plan.md`.
- Legacy plan names without date prefixes must be avoided for new plans.
```

---

## 3. Immediate Application to Current Prompt

Aturan ini **langsung diterapkan** pada permintaan aktif ini:
1. Kami menyajikan **Refined Prompt** di respons obrolan.
2. Artefak rencana implementasi perapian data dan eliminasi fungsi ganda dinamai:
   `20261110 - Data & Feature Streamlining Plan.md`.
