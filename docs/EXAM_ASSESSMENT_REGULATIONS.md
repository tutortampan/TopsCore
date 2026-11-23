# TopsCore LMS — Authoritative Exam & Assessment Engine Regulations (SSOT)

> **Document Authority:** DECISION-078 & Academic Assessment Directorate  
> **Source Institutional Documents:** `NILAI TUTOR MATERI`, `KALKULASI NILAI AKHIR`, `LEMBAR NILAI EXAM`, `PLACEMENT TEST`, `ANGKET SERTIFIKAT`  
> **Implementation Engine:** `js/admin/exam-rules-engine.js` (Core Logic) & `js/admin/exam-rules.js` (Workstation UI)  
> **Applicability:** All Camp Levels (1st Step, 2nd Step, 3rd Step), Diagnostic Placement, and Final Graduation Examinations.

---

## 1. Executive Summary & Assessment Lifecycle

TopsCore LMS implements an automated, mathematically rigorous, and auditable evaluation lifecycle directly codified from institutional scoring sheets:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEMIC ASSESSMENT LIFECYCLE                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │    DIAGNOSTIC PHASE: PLACEMENT TEST     │
                      │  • 10 Speaking Questions (0–25 Pts)     │
                      │  • Vocabulary Baseline (Target 30 Words)│
                      │  • Grammar Baseline (Target 25 Pts)     │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        1ST STEP (MONTH 1 / LVL 1)       │
                      │  • 40 Attendance Sessions (2x/day)      │
                      │  • 4x Vocabulary Mastery (W1–W4)        │
                      │  • 2x Grammar Mastery (W1, W2)          │
                      │  • 2x Basic English Test (W1, W2)       │
                      │  • 4x Telling Story Practice (W1–W4)    │
                      │  ★ TOTAL: 52 DATA POINTS                │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        2ND STEP (MONTH 2 / LVL 2)       │
                      │  • 40 Attendance Sessions (2x/day)      │
                      │  • 4x Vocabulary Mastery (W1–W4)        │
                      │  • 2x Grammar Mastery (W1, W2)          │
                      │  • 2x Grammar for Speaking / GFS (W1,W2)│
                      │  • 3x Telling Story Practice (W1–W3)    │
                      │  ★ TOTAL: 51 DATA POINTS                │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │        3RD STEP (MONTH 3 / LVL 3)       │
                      │  • 40 Attendance Sessions (2x/day)      │
                      │  • 4x Vocabulary Mastery (W1–W4)        │
                      │  • 2x Complex Grammar Mastery (W1, W2)  │
                      │  • 2x Pronunciation Mastery (W1, W2)    │
                      │  • 3x Speaking Practice (W1–W3)         │
                      │  ★ TOTAL: 11 ACADEMIC POINTS (+ 40 ATT) │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │            FINAL EVALUATIONS            │
                      │  1. FINAL EXAM (Main Examiner — 100 Pts)│
                      │     Fluency, Pronunciation, Idea, Gram  │
                      │  2. FINAL PRACTICE (Tutor — 100 Pts)    │
                      │     Fluency, Pronunciation, Gram, Comp  │
                      │  ★ TOTAL: 2 PANELS / 8 PARAMETERS       │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │      OFFICIAL TRANSCRIPT & DIPLOMA      │
                      │  • Vocabulary Predicate                 │
                      │  • Grammar Predicate                    │
                      │  • Speaking Predicate                   │
                      │  • Pronunciation Predicate              │
                      │  • Practice Predicate                   │
                      │  ★ SCALE: LESS, ENOUGH, GOOD, V.GOOD, ★ │
                      └─────────────────────────────────────────┘
```

---

## 2. Master Quotas & Assessment Points Matrix

| Phase / Class Level | Assessment Components | Frequency / Test Distribution | Total Assessment Points |
| :--- | :--- | :--- | :--- |
| **Placement Test (Diagnostic)** | • 10-Prompt Speaking Baseline (0–25 Pts)<br>• Baseline Vocabulary (Target: 30 words)<br>• Baseline Grammar (Target: 25 pts) | 1 time at camp admission (1-on-1 interview) | **3 Baseline Indicators** |
| **1st Step (Month 1 / Level 1)** | • Attendance (Mon–Fri, 2 sessions/day)<br>• Vocabulary Mastery (Cumulative target)<br>• Grammar Mastery<br>• Basic English Test<br>• Weekly Speaking Practice (Telling Story) | • Attendance: 40 sessions (4 weeks × 10 sessions)<br>• Vocabulary: 4 assessments (W1, W2, W3, W4)<br>• Grammar: 2 assessments (W1, W2)<br>• Basic English: 2 assessments (W1, W2)<br>• Speaking: 4 assessments (W1, W2, W3, W4) | **52 Data Points** per student<br>(12 Academic + 40 Attendance) |
| **2nd Step (Month 2 / Level 2)** | • Attendance (Mon–Fri, 2 sessions/day)<br>• Vocabulary Mastery (Intermediate)<br>• Advanced Grammar Mastery<br>• GFS (Grammar for Speaking)<br>• Weekly Speaking Practice (Telling Story) | • Attendance: 40 sessions (4 weeks × 10 sessions)<br>• Vocabulary: 4 assessments (W1, W2, W3, W4)<br>• Grammar: 2 assessments (W1, W2)<br>• GFS: 2 assessments (W1, W2)<br>• Speaking: 3 assessments (W1, W2, W3) | **51 Data Points** per student<br>(11 Academic + 40 Attendance) |
| **3rd Step (Month 3 / Level 3)** | • Attendance (Mon–Fri, 2 sessions/day)<br>• Vocabulary Mastery (Advanced)<br>• Complex Grammar Mastery<br>• Pronunciation Mastery<br>• Weekly Speaking Practice | • Attendance: 40 sessions (4 weeks × 10 sessions)<br>• Vocabulary: 4 assessments (W1, W2, W3, W4)<br>• Grammar: 2 assessments (W1, W2)<br>• Pronunciation: 2 assessments (W1, W2)<br>• Speaking: 3 assessments (W1, W2, W3) | **11 Academic Points** (+ 40 Attendance Sessions) |
| **Final Evaluations (Graduation)** | • **1. Final Exam** (Main Examiner Panel — 100 Pts)<br>• **2. Final Practice** (Speaking Tutor Panel — 100 Pts) | 2 Independent Assessment Panels<br>(4 standardized parameters per panel @ 25 Pts) | **8 Total Parameters**<br>(Max 100 Pts per Panel) |

---

## 3. Mathematical Scoring Formulas & Grade Aggregation (KALKULASI NILAI AKHIR SSOT)

The grading engine (`js/admin/exam-rules-engine.js`) programmatically computes weekly scores, step averages, and transcript composite results using the exact formulas from the institutional ledger:

### 3.1 Vocabulary Mastery Engine
* **Weekly Percentage Formula:**
  $$\text{Week \%} = \min\left(100\%, \frac{\text{Words Deposited}}{\text{Standard Denominator}} \times 100\right)$$
  * **Step 1 Denominators:** W1 = 98 words, W2 = 266 words, W3 = 431 words, W4 = 574 words.
  * **Step 2 Denominators:** W1 = 120 words, W2 = 280 words, W3 = 440 words, W4 = 600 words.
  * **Step 3 Denominators:** W1 = 150 words, W2 = 400 words, W3 = 650 words, W4 = 800 words.
* **Step Average (NA Step):**
  $$\text{NA Step} = \frac{\text{W1\%} + \text{W2\%} + \text{W3\%} + \text{W4\%}}{4}$$
* **Composite Subject Total (NA Total Vocab):**
  $$\text{NA Total} = \frac{\text{NA Step 1} + \text{NA Step 2} + \text{NA Step 3}}{3}$$

### 3.2 Grammar, Basic English & GFS Engine
* **Test Percentage:**
  $$\text{Test \%} = \frac{\text{Score Earned}}{\text{Target Max Points}} \times 100$$
  * **Step 1:** Test 1 (Max 15 Pts), Test 2 (Max 20 Pts) | Basic English: Test 1 & 2 (Max 100 Pts).
  * **Step 2:** Test 1 (Max 30 Pts), Test 2 (Max 30 Pts) | GFS: Test 1 & 2 (Max 20 Pts).
  * **Step 3:** Test 1 (Max 15 Pts), Test 2 (Max 15 Pts).
* **Step Average:**
  $$\text{NA Step} = \frac{\text{Test 1\%} + \text{Test 2\%}}{2}$$

### 3.3 Speaking & Telling Story Engine
* **Periodic Test Percentage:**
  $$\text{Session \%} = \frac{\text{Points Earned}}{25} \times 100$$
* **Step Average:**
  * Step 1: Average of 2 periodic tests (or 4 including practice).
  * Step 2 & 3: Average of 3 Speaking sessions.
* **Composite Total:**
  $$\text{NA Total Speaking} = \frac{\text{NA Step 1} + \text{NA Step 2} + \text{NA Step 3}}{3}$$

### 3.4 Official Certificate Predicate Scale (ANGKET SERTIFIKAT)
Every composite subject score maps to an authoritative institutional predicate:

| Numeric Percentage Range | Official Certificate Predicate | Letter Grade | Hex Color Token |
| :---: | :---: | :---: | :---: |
| **90.00% – 100.00%** | **EXCELLENT** | ★ (Star) | `#c084fc` |
| **80.00% – 89.99%** | **VERY GOOD** | A | `#00c000` |
| **70.00% – 79.99%** | **GOOD** | B | `#95ff00` |
| **60.00% – 69.99%** | **ENOUGH** | C | `#ffff00` |
| **0.00% – 59.99%** | **LESS** | E | `#ff0000` |

---

## 4. Final Evaluations: Dual Examiner Panels Architecture

Graduation evaluation requires **2 Independent Double-Blind Panels**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DUAL FINAL EVALUATION PANELS                    │
├───────────────────────────────────┬────────────────────────────────────┤
│ PANEL 1: MAIN EXAMINER            │ PANEL 2: SPEAKING TUTOR            │
│ (Final Exam — Theoretical Panel)  │ (Final Practice — Practical Panel) │
├───────────────────────────────────┼────────────────────────────────────┤
│ Lead: Mr. Sigit / Ms. Yesy        │ Lead: Mr. Adam / Speaking Tutors   │
│ 1. Fluency: 1 – 25 Pts            │ 1. Fluency: 1 – 25 Pts             │
│ 2. Pronunciation: 1 – 25 Pts      │ 2. Pronunciation: 1 – 25 Pts       │
│ 3. Idea / Content: 1 – 25 Pts     │ 3. Grammar: 1 – 25 Pts             │
│ 4. Grammar: 1 – 25 Pts            │ 4. Comprehension: 1 – 25 Pts       │
├───────────────────────────────────┼────────────────────────────────────┤
│ Panel 1 Total: Max 100 Pts        │ Panel 2 Total: Max 100 Pts         │
└───────────────────────────────────┴────────────────────────────────────┘
```

* **Execution Protocol:**
  1. Student appears individually before the Board of Examiners.
  2. Spontaneous prompt cards are provided dynamically without rehearsal.
  3. Examiners grade independently into their respective scorecards.
  4. Panel 1 contributes to academic theoretical honors; Panel 2 produces the official **FINAL SCORE PRACTICE** on the certificate.

---

## 5. Telling Story Weekly Progression Rubrics

### Week 1: Sentence Formation & Basic Grammar
1. Belum bisa menyusun kalimat dengan benar dan masih banyak kesalahan.
2. Bisa membuat kalimat sederhana, tetapi masih ada beberapa kesalahan.
3. Bisa membuat beberapa kalimat dengan cukup benar, hanya sedikit kesalahan.
4. Bisa menyusun kalimat dengan benar dan runtut.
5. Bisa menyusun kalimat dengan sangat baik, rapi, dan hampir tidak ada kesalahan.

### Week 2: Daily Routine Narrative & Coherence
1. Belum bisa menceritakan kegiatan sehari-hari dengan jelas.
2. Bisa menceritakan kegiatan sehari-hari secara sederhana, tetapi masih kurang runtut.
3. Cerita sudah cukup jelas dan urut, masih ada sedikit kesalahan.
4. Bisa menceritakan kegiatan sehari-hari dengan runtut dan jelas.
5. Cerita sangat jelas, runtut, dan menggunakan kosakata yang baik.

### Week 3: Narrative Volume & Target Sentences
1. Cerita kurang dari 5 kalimat.
2. Cerita 5 kalimat, belum sampai target.
3. Cerita 10 kalimat, sudah sampai batas minimal.
4. Cerita 15 kalimat, sesuai target.
5. Cerita 20 kalimat lebih, sesuai target dan sangat baik.

### Week 4: Spontaneous Delivery & Question Response
1. Belum bisa bercerita dan belum bisa menjawab pertanyaan.
2. Bisa bercerita sedikit dan menjawab pertanyaan dengan sangat singkat.
3. Bisa bercerita dengan cukup jelas dan menjawab pertanyaan sederhana.
4. Bisa bercerita dengan jelas dan menjawab pertanyaan dengan benar.
5. Bisa bercerita dengan lancar dan menjawab pertanyaan dengan jelas dan percaya diri.

---

## 6. 5-Axis Analytical Speaking Matrix (Score 1–5 per parameter)

1. **Fluency (Kefasihan):**
   * 1: Belum bisa menyampaikan maksud.
   * 2: Sangat lambat dengan jeda sangat panjang tetapi ide masih dapat disampaikan.
   * 3: Aliran bicara cukup lancar, jeda kecil yang tidak terlalu mengganggu pemahaman.
   * 4: Hampir lancar, jeda minimal, kecepatan bicara alami.
   * 5: Sangat lancar, tidak ada jeda yang tidak perlu, aliran bicara mulus dan alami.
2. **Pronunciation (Pengucapan):**
   * 1: Pengucapan tidak jelas, banyak kata yang salah ucap, sulit dipahami.
   * 2: Beberapa kesalahan pengucapan yang membuat bagian tertentu sulit dimengerti.
   * 3: Umumnya dapat dimengerti, sedikit kesalahan pengucapan yang tidak menghalangi pemahaman.
   * 4: Pengucapan jelas dengan kesalahan yang jarang, mudah diikuti.
   * 5: Pengucapan sangat baik, intonasi alami, mudah dipahami.
3. **Vocabulary (Kosakata):**
   * 1: Kosa kata sangat terbatas, sering menggunakan kata yang tidak sesuai, sulit mengekspresikan ide.
   * 2: Kosa kata terbatas tetapi masih dapat menyampaikan ide dasar.
   * 3: Kosa kata cukup untuk situasi sehari-hari, kesalahan minor.
   * 4: Kosa kata luas, kata-kata sesuai dengan konteks.
   * 5: Kosa kata luas, pilihan kata canggih, akurat dan sesuai dengan konteks.
4. **Grammar (Tata Bahasa):**
   * 1: Kesalahan tata bahasa yang sering, sulit dipahami.
   * 2: Kesalahan yang terlihat tetapi makna masih bisa dimengerti.
   * 3: Kesalahan tata bahasa minor, tetapi ide jelas.
   * 4: Hampir tidak ada kesalahan, kalimat kompleks digunakan dengan benar.
   * 5: Tanpa kesalahan, kalimat tersusun baik dan tata bahasa yang canggih.
5. **Comprehension (Pemahaman & Daya Tangkap):**
   * 1: Kesulitan dalam memahami atau merespons dengan benar.
   * 2: Pemahaman dasar, memerlukan pengulangan yang berkali-kali.
   * 3: Memahami arti umum, mungkin melewatkan beberapa detail hingga harus diulang.
   * 4: Memahami sebagian besar detail, merespons dengan tepat.
   * 5: Pemahaman penuh, respons detail dengan mudah.
* **Total Composite Bands (5–25 Points):**
  * 1 – 10 Pts: **LESS**
  * 11 – 15 Pts: **ENOUGH**
  * 16 – 20 Pts: **GOOD**
  * 21 – 25 Pts: **VERY GOOD**
