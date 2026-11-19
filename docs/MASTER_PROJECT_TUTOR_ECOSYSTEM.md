# TopsCore LMS — Master Project: Tutor Ecosystem & Attendance Blueprint
**Document Version:** 3.0 (Ironclad Architecture — Production Ready)  
**Status:** Approved for Implementation  
**Location in Repository:** `docs/MASTER_PROJECT_TUTOR_ECOSYSTEM.md`  
**Companion Interactive Mockup:** `docs/mockup_tutor_student_ecosystem.html`  

---

## 1. Executive Summary & Operational Principles

This master document establishes the authoritative design and implementation contract for upgrading TopsCore LMS from an Admin-only classroom management model to a **tri-role ecosystem** (**Admin**, **Tutor**, and **Student**).

### Core Operational Principles:
1. **Single-Shot Classroom Proximity Check-in:**
   * When the tutor activates session attendance, all students present in the classroom ($\le 10$ meters) are **automatically marked as PRESENT once**.
   * Only late arrivals or students with indoor GPS blindspots need to walk up to scan the tutor's dynamic barcode.
2. **Session Lifecycle & Auto-Alpha Lockdown:**
   * Tutors explicitly end class via `[ CLOSE SESSION ]`.
   * Unrecorded students are **automatically assigned status `ABSENT (ALPHA)`**, creating an immutable audit trail for the 20/24 session quota.
3. **Session Modes (Regular vs. Exam):**
   * **Regular Meeting:** Records daily class attendance.
   * **Exam Session:** Records attendance **and automatically redirects the student's device to the active Test Arena**.
4. **Three-Column Fine-Paid-Debt Ledger (PUNISHMENT):**
   * **FINE:** $\text{Words} \times \text{IDR } 2,000$.
   * **PAID:** Tutor taps the payment button and inputs the cash/transfer received (supports full or partial payments).
   * **DEBT:** Remaining balance ($\text{DEBT} = \text{FINE} - \text{PAID}$).
5. **Universal Tutor Class Access (Initial Phase):**
   * Managed under **A — ADMIN** (Tutor Management).
   * In this initial phase, all tutors can access, take attendance, grade, and record discipline for **all classes across all levels**.

---

## 2. Multi-Role Architecture & Access SSOT

```
                               ┌────────────────────────────────────────┐
                               │        SUPABASE DATABASE (SSOT)        │
                               │  PostgreSQL • Storage • Realtime Auth  │
                               └───────────────────┬────────────────────┘
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────────┐
                ▼                                  ▼                                  ▼
       ┌─────────────────┐                ┌─────────────────┐                ┌─────────────────┐
       │ STUDENT PORTALS │                │   TUTOR APP     │                │  ADMIN MASTER   │
       │   (PWA / Web)   │                │ (Mobile PWA)    │                │  (Workstation)  │
       ├─────────────────┤                ├─────────────────┤                ├─────────────────┤
       │ • top.tops-core │                │ • tutor.tops-   │                │ • Full ABCD     │
       │ • cec.tops-core │                │   core (Private)│                │   Navigation    │
       │ • Auto-Locked   │                │ • 2-Blade Top   │                │ • Pillar A:     │
       │   Institution   │                │   Navigation    │                │   Tutor Master  │
       │ • Dock: Attend  │                │ • Universal     │                │ • Pillar C:     │
       │   & Debt Tab    │                │   Class Access  │                │   20/24 Matrix  │
       └─────────────────┘                └─────────────────┘                └─────────────────┘
```

### 2.1 Student Multi-Tenancy
* **TOP Entrance:** `top.tops-core.com` $\rightarrow$ Institution auto-locked to **TOP**.
* **CEC Entrance:** `cec.tops-core.com` $\rightarrow$ Institution auto-locked to **CEC**.
* Skips institution picker step; streamlines login directly to: Program $\rightarrow$ Batch $\rightarrow$ Name $\rightarrow$ PIN.

### 2.2 Tutor Access & Administration (Pillar A — ADMIN)
* Sub-section under **A — ADMIN**: **`TUTOR MANAGEMENT`**.
* Super Admin generates secure, invite-only onboarding QR codes.
* Tutors scan to install the Tutor PWA and authenticate with their Tutor PIN.
* **Initial Access Policy:** Every tutor has universal access to all active levels and classes.

---

## 3. Class Structure & Session Quotas (CEC SSOT)

Each level in the **CEC Program** contains exactly **5 Classes**:

| Level | Class 1 (Level Focus) | Classes 2–5 (Standardized) | Session Quota |
| :---: | :--- | :--- | :---: |
| **1st Level** | **Basic English** (`CEC-1BASIC`) | Vocabulary, Speaking, Grammar, Storytelling | Vocab: **24 Sessions**<br>Others: **20 Sessions** |
| **2nd Level** | **Grammar for Speaking** (`CEC-2GFS`) | Vocabulary, Speaking, Grammar, Storytelling | Vocab: **24 Sessions**<br>Others: **20 Sessions** |
| **3rd Level** | **Pronunciation** (`CEC-3PRON`) | Vocabulary, Speaking, Grammar, Storytelling | Vocab: **24 Sessions**<br>Others: **20 Sessions** |

---

## 4. Operational Workflows

### 4.1 Attendance Protocol (Proximity + Late-Arrival Barcode)
```
TUTOR OPENS CLASS SESSION ➔ CLICKS [ ACTIVATE ATTENDANCE ]
                    │
   Single-Shot Relative GPS Proximity Check
    (All Student Devices in Classroom Zone)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
 Distance <= 10m           Late Arrivals /
 (Seated in Room)         Distance > 10m
        │                       │
        ▼                       ▼
★ AUTO-PRESENT ★          Student walks to tutor
• Single-shot check-in    Taps [ SCAN BARCODE ]
• No barcode scan needed!       │
                                ▼
                         Scans Tutor's QR
                                │
                                ▼
                         ★ PRESENT (QR) ★
```

### 4.2 Session Lifecycle & Auto-Alpha Lockdown
1. **Activation:** Tutor selects class, session number, and mode (**Regular Meeting** vs. **Exam Session**), then taps `[ ACTIVATE ATTENDANCE ]`.
2. **Active State:** In-room students auto-check in via 10m beacon; latecomers scan QR.
3. **Closing Class:** Tutor taps `[ CLOSE SESSION / FINISH CLASS ]`.
4. **Auto-Alpha Execution:** Any student in the batch roster with status remaining `UNCHECKED` is **automatically updated to `ABSENT (ALPHA)`**.
5. **Lockdown:** The session is marked `LOCKED`. No further scans or proximity checks are accepted.

### 4.3 Three-Column Punishment Ledger (FINE - PAID - DEBT)
* **Word Logging:** Tutor taps `+1 Word` or `+5 Words` when an Indonesian word is spoken.
* **Column 1 — FINE:** Total fine accumulated:
  $$\text{FINE} = \text{Total Words Spoken} \times \text{IDR } 2,000$$
* **Column 2 — PAID:** Tutor taps the payment cell/button and enters the cash/transfer amount received (supports partial or full payment).
* **Column 3 — DEBT:** Remaining liability:
  $$\text{DEBT} = \text{FINE} - \text{PAID}$$
  * If $\text{DEBT} > 0$: Displayed in bold red (`--grade-e`).
  * If $\text{DEBT} = 0$: Displayed in emerald green (`--grade-a`) marked **SETTLED**.

---

## 5. UI Layout Specifications & Invariants

### 5.1 Strict Spatial Invariants
* **Strict 100vh Lock:** `height: 100vh; overflow: hidden;` across all main views. Zero outer page scroll; scrolling is strictly confined to internal table containers (`overflow-y: auto`).
* **Banners:** Top Banner locked to `60px`; Bottom Banner locked to `60px`.
* **Action Buttons:** **Strictly 50px** height (`height: 50px; min-height: 50px;`).
* **Margins & Padding:** Strict **10px container gap** and **10px card internal padding**.
* **Typography:**
  * `Outfit`: Headings, banners, badges, 50px action button text.
  * `Inter`: Body, student names, descriptions, metadata.
  * `JetBrains Mono`: Timestamps, monetary values, percentages, codes.
* **Strict Zero Sub-12px:** Minimum font size across all elements is **12px**.
* **Strict Zero Emojis:** 100% clean vector SVG icons.

### 5.2 Tutor Mobile Dashboard (2-Blade Top Navigation)
* **Header (60px):** Institution badge, Level/Class title, Session selector, 10m Beacon live status.
* **Top 2-Blade Navigation Bar (44px):**
  * **Blade 1:** `CLASS & ATTENDANCE`
  * **Blade 2:** `DISCIPLINE & FINE`
* **Blade 1 Workspace (Class & Attendance):**
  * Top Action Buttons (50px): `[ EXCUSED / SICK ]` and `[ MANUAL GRADING ]`.
  * Mode Selector: `Regular Meeting` | `Exam Session (Auto-Redirect)`.
  * Compact Session QR & Beacon card.
  * Attendance Roster Stream (Scrollable table).
  * Session Closer: `[ CLOSE SESSION / FINISH CLASS (50px) ]`.
* **Blade 2 Workspace (Discipline & Fine):**
  * Class Fine Total Recap (Total Fines, Total Paid, Total Outstanding Debt).
  * Student Violation Ledger:
    * Columns: Student Name, Words, **FINE**, **PAID**, **DEBT**.
    * Touch Steppers (50px): `+1 Word`, `+5 Words`, `-1 Undo`.
    * Payment Input: Modal/drawer to enter payment and update debt in real time.

### 5.3 Student Dashboard Integration (Bottom Dock Blade)
* **Clean Single-Screen Flow:**
  1. Top Header (60px)
  2. Hero Identity Bar (Photo 3:4, Name, Biodata)
  3. 3-Pillar Grade Card (Grade, Description, Rate)
  4. Next Assignment Bar (Task card + Start button)
  5. **Bottom Dock Panel with 3 Blades:**
     * Blade 1: `MY RANK` (Batch Leaderboard table)
     * Blade 2: `COMPLETED TESTS` (Test results table)
     * Blade 3: `ATTEND & FINE` (Session status, 10m proximity confirmation, 50px fallback barcode scanner, English Zone Fine/Paid/Debt card, and 20-session attendance grid).

---

## 6. Implementation Phasing

1. **Phase 1: Database Migration (Supabase)**
   * Tables: `class_sessions`, `attendance_logs`, `language_violations`, `tutor_profiles`.
   * Enforce constraints for 20/24 quotas and auto-alpha triggers.
2. **Phase 2: Mobile Tutor Workstation**
   * 100vh shell, 60px banners, 50px buttons, 2-blade top tabs.
   * Proximity beacon broadcaster, dynamic QR generator, live attendance stream.
   * Fine-Paid-Debt accounting ledger with real-time Supabase replication.
3. **Phase 3: Student Dashboard Dock Integration & Proximity Receiver**
   * Single-shot proximity receiver ($\le 10$m auto-present).
   * 50px scan button fallback with in-browser HTML5 QR scanner.
   * Integrated Attend & Fine blade inside bottom dock.
4. **Phase 4: Admin Master Integration (Pillars A & C)**
   * Pillar A: Tutor Management & Invite QR Generator.
   * Pillar C: Full 20/24 Session Attendance Matrix.
5. **Phase 5: End-to-End Verification**
   * Automated tests (`npm.cmd run test:fast`, `npm.cmd run test:table`).
   * Visual invariant audit (7 pillars, strict 100vh lock, zero outer scroll).
