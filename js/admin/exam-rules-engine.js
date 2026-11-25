/**
 * TopsCore LMS — Exam Rules & Assessment Calculation Engine (SSOT)
 * Authoritative system engine for computing step scores, exam quotas, rubrics, and certificate transcripts.
 * Directly codified from institutional spreadsheets (NILAI TUTOR MATERI, KALKULASI NILAI AKHIR, LEMBAR NILAI EXAM, PLACEMENT TEST).
 */

export const EXAM_RULES_SCHEMA = {
  // ── 0. DIAGNOSTIC PHASE: PLACEMENT TEST ──
  PLACEMENT: {
    title: 'Diagnostic Placement Test',
    stage: 'PRE_CAMP',
    components: {
      speaking: {
        maxScore: 25,
        type: 'ORAL_INTERVIEW',
        questions: [
          { no: 1, topic: 'Introduction', text: 'What is your name?', maxPoints: 2.5 },
          { no: 2, topic: 'Introduction', text: 'Where are you from?', maxPoints: 2.5 },
          { no: 3, topic: 'Introduction', text: 'How old are you?', maxPoints: 2.5 },
          { no: 4, topic: 'Introduction', text: 'How many brothers and sisters do you have?', maxPoints: 2.5 },
          { no: 5, topic: 'Hobby', text: 'What is your hobby?', maxPoints: 2.5 },
          { no: 6, topic: 'Hobby', text: 'Why do you like it?', maxPoints: 2.5 },
          { no: 7, topic: 'Favorites', text: 'What is your favorite food and drink?', maxPoints: 2.5 },
          { no: 8, topic: 'Ambition', text: 'What is your ambition / dream?', maxPoints: 2.5 },
          { no: 9, topic: 'Ambition', text: 'How will you catch your dream?', maxPoints: 2.5 },
          { no: 10, topic: 'Family', text: 'Tell me about your weekend activity with your family.', maxPoints: 2.5 }
        ]
      },
      vocabulary: {
        baselineTarget: 30,
        maxPoints: 50,
        description: 'Initial vocabulary inventory check upon camp admission.'
      },
      grammar: {
        baselineTarget: 25,
        maxPoints: 50,
        description: 'Baseline sentence structure and affirmative/negative pattern diagnostic.'
      }
    }
  },

  // ── 1. 1ST STEP (MONTH 1 / LEVEL 1) ──
  STEP_1: {
    levelNumber: 1,
    levelName: '1st Step (Level 1)',
    totalDataPoints: 52,
    attendanceQuota: 40, // 4 weeks x 10 sessions (Mon-Fri 2x/day)
    academicAssessmentsCount: 12,
    components: {
      vocabulary: {
        type: 'CUMULATIVE_DEPOSIT',
        count: 4,
        weeks: {
          W1: { minTarget: 60, maxTarget: 90, standardDenominator: 98 },
          W2: { minTarget: 120, maxTarget: 210, standardDenominator: 266 },
          W3: { minTarget: 180, maxTarget: 300, standardDenominator: 431 },
          W4: { minTarget: 240, maxTarget: 450, standardDenominator: 574 }
        }
      },
      grammar: {
        count: 2,
        weeks: {
          W1: { minTarget: 8, maxTarget: 15, denominator: 15 },
          W2: { minTarget: 12, maxTarget: 20, denominator: 20 }
        }
      },
      basicEnglish: {
        count: 2,
        weeks: {
          W1: { minTarget: 60, maxTarget: 100, denominator: 100 },
          W2: { minTarget: 60, maxTarget: 100, denominator: 100 }
        }
      },
      speaking: {
        count: 4, // W1, W2, W3, W4 (Practice)
        weeks: {
          W1: { minTarget: 10, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W2: { minTarget: 10, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W3: { minTarget: 10, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W4: { minTarget: 10, maxTarget: 25, denominator: 25, rubricScale: 5, label: 'Practice' }
        }
      }
    }
  },

  // ── 2. 2ND STEP (MONTH 2 / LEVEL 2) ──
  STEP_2: {
    levelNumber: 2,
    levelName: '2nd Step (Level 2)',
    totalDataPoints: 51,
    attendanceQuota: 40,
    academicAssessmentsCount: 11,
    components: {
      vocabulary: {
        type: 'CUMULATIVE_DEPOSIT',
        count: 4,
        weeks: {
          W1: { minTarget: 75, maxTarget: 120, standardDenominator: 120 },
          W2: { minTarget: 155, maxTarget: 280, standardDenominator: 280 },
          W3: { minTarget: 235, maxTarget: 440, standardDenominator: 440 },
          W4: { minTarget: 315, maxTarget: 600, standardDenominator: 600 }
        }
      },
      grammar: {
        count: 2,
        weeks: {
          W1: { minTarget: 10, maxTarget: 30, denominator: 30 },
          W2: { minTarget: 17, maxTarget: 30, denominator: 30 }
        }
      },
      gfs: { // Grammar for Speaking
        count: 2,
        weeks: {
          W1: { minTarget: 12, maxTarget: 20, denominator: 20 },
          W2: { minTarget: 12, maxTarget: 20, denominator: 20 }
        }
      },
      speaking: {
        count: 3,
        weeks: {
          W1: { minTarget: 12, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W2: { minTarget: 12, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W3: { minTarget: 12, maxTarget: 25, denominator: 25, rubricScale: 5 }
        }
      }
    }
  },

  // ── 3. 3RD STEP (MONTH 3 / LEVEL 3) ──
  STEP_3: {
    levelNumber: 3,
    levelName: '3rd Step (Level 3)',
    totalDataPoints: 51, // 11 Academic + 40 Attendance
    attendanceQuota: 40,
    academicAssessmentsCount: 11,
    components: {
      vocabulary: {
        type: 'CUMULATIVE_DEPOSIT',
        count: 4,
        weeks: {
          W1: { minTarget: 90, maxTarget: 150, standardDenominator: 150 },
          W2: { minTarget: 215, maxTarget: 400, standardDenominator: 400 },
          W3: { minTarget: 340, maxTarget: 650, standardDenominator: 650 },
          W4: { minTarget: 415, maxTarget: 800, standardDenominator: 800 }
        }
      },
      grammar: {
        count: 2,
        weeks: {
          W1: { minTarget: 8, maxTarget: 15, denominator: 15 },
          W2: { minTarget: 8, maxTarget: 15, denominator: 15 }
        }
      },
      pronunciation: {
        count: 2,
        weeks: {
          W1: { minTarget: 10, maxTarget: 25, denominator: 25 },
          W2: { minTarget: 10, maxTarget: 25, denominator: 25 }
        }
      },
      speaking: {
        count: 3,
        weeks: {
          W1: { minTarget: 15, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W2: { minTarget: 15, maxTarget: 25, denominator: 25, rubricScale: 5 },
          W3: { minTarget: 15, maxTarget: 25, denominator: 25, rubricScale: 5 }
        }
      }
    }
  },

  // ── 4. FINAL EVALUATIONS (2 INDEPENDENT PANELS) ──
  FINAL_EVALUATION: {
    title: 'Camp Graduation Final Evaluations',
    panels: {
      mainExaminer: {
        title: 'Panel 1: Main Examiner (Final Exam)',
        leadExaminers: ['Mr. Sigit', 'Ms. Yesy'],
        maxTotal: 100,
        parameters: [
          { id: 'fluency', label: 'Fluency (Kelancaran Berbicara)', minPts: 1, maxPts: 25 },
          { id: 'pronunciation', label: 'Pronunciation (Pelafalan Kata)', minPts: 1, maxPts: 25 },
          { id: 'idea', label: 'Idea / Content (Pengembangan Ide & Logika)', minPts: 1, maxPts: 25 },
          { id: 'grammar', label: 'Grammar (Ketepatan Tata Bahasa)', minPts: 1, maxPts: 25 }
        ]
      },
      speakingTutor: {
        title: 'Panel 2: Speaking Tutor (Final Practice)',
        leadExaminers: ['Mr. Adam', 'Speaking Tutors'],
        maxTotal: 100,
        parameters: [
          { id: 'fluency', label: 'Fluency (Kelancaran)', minPts: 1, maxPts: 25 },
          { id: 'pronunciation', label: 'Pronunciation (Pelafalan)', minPts: 1, maxPts: 25 },
          { id: 'grammar', label: 'Grammar (Tata Bahasa)', minPts: 1, maxPts: 25 },
          { id: 'comprehension', label: 'Comprehension (Daya Tangkap Tanya-Jawab)', minPts: 1, maxPts: 25 }
        ]
      }
    }
  },

  // ── 5. TELLING STORY WEEKLY PROGRESSION RUBRICS ──
  RUBRICS: {
    TELLING_STORY_WEEKLY: {
      W1: {
        focus: 'Sentence Formation & Basic Grammar',
        indicators: [
          { score: 1, text: 'Belum bisa menyusun kalimat dengan benar dan masih banyak kesalahan.' },
          { score: 2, text: 'Bisa membuat kalimat sederhana, tetapi masih ada beberapa kesalahan.' },
          { score: 3, text: 'Bisa membuat beberapa kalimat dengan cukup benar, hanya sedikit kesalahan.' },
          { score: 4, text: 'Bisa menyusun kalimat dengan benar dan runtut.' },
          { score: 5, text: 'Bisa menyusun kalimat dengan sangat baik, rapi, dan hampir tidak ada kesalahan.' }
        ]
      },
      W2: {
        focus: 'Daily Routine Narrative & Coherence',
        indicators: [
          { score: 1, text: 'Belum bisa menceritakan kegiatan sehari-hari dengan jelas.' },
          { score: 2, text: 'Bisa menceritakan kegiatan sehari-hari secara sederhana, tetapi masih kurang runtut.' },
          { score: 3, text: 'Cerita sudah cukup jelas dan urut, masih ada sedikit kesalahan.' },
          { score: 4, text: 'Bisa menceritakan kegiatan sehari-hari dengan runtut dan jelas.' },
          { score: 5, text: 'Cerita sangat jelas, runtut, dan menggunakan kosakata yang baik.' }
        ]
      },
      W3: {
        focus: 'Narrative Volume & Target Sentences',
        indicators: [
          { score: 1, text: 'Cerita kurang dari 5 kalimat.' },
          { score: 2, text: 'Cerita 5 kalimat, belum sampai target.' },
          { score: 3, text: 'Cerita 10 kalimat, sudah sampai batas minimal.' },
          { score: 4, text: 'Cerita 15 kalimat, sesuai target.' },
          { score: 5, text: 'Cerita 20 kalimat lebih, sesuai target dan sangat baik.' }
        ]
      },
      W4: {
        focus: 'Spontaneous Delivery & Question Response',
        indicators: [
          { score: 1, text: 'Belum bisa bercerita dan belum bisa menjawab pertanyaan.' },
          { score: 2, text: 'Bisa bercerita sedikit dan menjawab pertanyaan dengan sangat singkat.' },
          { score: 3, text: 'Bisa bercerita dengan cukup jelas dan menjawab pertanyaan sederhana.' },
          { score: 4, text: 'Bisa bercerita dengan jelas dan menjawab pertanyaan dengan benar.' },
          { score: 5, text: 'Bisa bercerita dengan lancar dan menjawab pertanyaan dengan jelas dan percaya diri.' }
        ]
      }
    },

    // 5-Axis Speaking Matrix (Score 1–5 per parameter, Total 5–25)
    SPEAKING_5_AXIS: {
      fluency: [
        { score: 1, text: 'Belum bisa menyampaikan maksud.' },
        { score: 2, text: 'Sangat lambat dengan jeda sangat panjang tetapi ide masih dapat disampaikan.' },
        { score: 3, text: 'Aliran bicara cukup lancar, jeda kecil yang tidak terlalu mengganggu pemahaman.' },
        { score: 4, text: 'Hampir lancar, jeda minimal, kecepatan bicara alami.' },
        { score: 5, text: 'Sangat lancar, tidak ada jeda yang tidak perlu, aliran bicara mulus dan alami.' }
      ],
      pronunciation: [
        { score: 1, text: 'Pengucapan tidak jelas, banyak kata yang salah ucap, sulit dipahami.' },
        { score: 2, text: 'Beberapa kesalahan pengucapan yang membuat bagian tertentu sulit dimengerti.' },
        { score: 3, text: 'Umumnya dapat dimengerti, sedikit kesalahan pengucapan yang tidak menghalangi pemahaman.' },
        { score: 4, text: 'Pengucapan jelas dengan kesalahan yang jarang, mudah diikuti.' },
        { score: 5, text: 'Pengucapan sangat baik, intonasi alami, mudah dipahami.' }
      ],
      vocabulary: [
        { score: 1, text: 'Kosa kata sangat terbatas, sering menggunakan kata yang tidak sesuai, sulit mengekspresikan ide.' },
        { score: 2, text: 'Kosa kata terbatas tetapi masih dapat menyampaikan ide dasar.' },
        { score: 3, text: 'Kosa kata cukup untuk situasi sehari-hari, kesalahan minor.' },
        { score: 4, text: 'Kosa kata luas, kata-kata sesuai dengan konteks.' },
        { score: 5, text: 'Kosa kata luas, pilihan kata canggih, akurat dan sesuai dengan konteks.' }
      ],
      grammar: [
        { score: 1, text: 'Kesalahan tata bahasa yang sering, sulit dipahami.' },
        { score: 2, text: 'Kesalahan yang terlihat tetapi makna masih bisa dimengerti.' },
        { score: 3, text: 'Kesalahan tata bahasa minor, tetapi ide jelas.' },
        { score: 4, text: 'Hampir tidak ada kesalahan, kalimat kompleks digunakan dengan benar.' },
        { score: 5, text: 'Tanpa kesalahan, kalimat tersusun baik dan tata bahasa yang canggih.' }
      ],
      comprehension: [
        { score: 1, text: 'Kesulitan dalam memahami atau merespons dengan benar.' },
        { score: 2, text: 'Pemahaman dasar, memerlukan pengulangan yang berkali-kali.' },
        { score: 3, text: 'Memahami arti umum, mungkin melewatkan beberapa detail hingga harus diulang.' },
        { score: 4, text: 'Memahami sebagian besar detail, merespons dengan tepat.' },
        { score: 5, text: 'Pemahaman penuh, respons detail dengan mudah.' }
      ],
      totalBands: [
        { min: 1, max: 5, predicate: 'LESS', text: 'Kesulitan dalam memahami atau merespons dengan benar.' },
        { min: 6, max: 10, predicate: 'LESS', text: 'Pemahaman dasar, memerlukan pengulangan berkali-kali.' },
        { min: 11, max: 15, predicate: 'ENOUGH', text: 'Memahami arti umum, jeda minor.' },
        { min: 16, max: 20, predicate: 'GOOD', text: 'Memahami sebagian besar detail, respons tepat.' },
        { min: 21, max: 25, predicate: 'VERY GOOD', text: 'Pemahaman penuh, respons detail dengan mudah.' }
      ]
    }
  },

  // ── 6. CERTIFICATE PREDICATE SCALE (OFFICIAL TRANSCRIPT) ──
  CERTIFICATE_PREDICATES: [
    { min: 90.0, max: 100.0, predicate: 'EXCELLENT', color: 'var(--grade-star, #a855f7)', grade: '★' },
    { min: 80.0, max: 89.99, predicate: 'VERY GOOD', color: '#00c000', grade: 'A' },
    { min: 70.0, max: 79.99, predicate: 'GOOD',      color: '#95ff00', grade: 'B' },
    { min: 60.0, max: 69.99, predicate: 'ENOUGH',    color: '#ffff00', grade: 'C' },
    { min: 0.0,  max: 59.99, predicate: 'LESS',      color: '#ff0000', grade: 'E' }
  ]
};

/**
 * Calculates the authoritative Certificate Predicate for any numeric score (0–100)
 */
export function getCertificatePredicate(score) {
  const num = Math.max(0, Math.min(100, Number(score) || 0));
  for (const band of EXAM_RULES_SCHEMA.CERTIFICATE_PREDICATES) {
    if (num >= band.min) {
      return band.predicate;
    }
  }
  return 'LESS';
}

/**
 * Calculates Weekly Vocabulary Mastery Percentage against Step Targets
 */
export function calculateWeeklyVocabPercentage(wordsDeposited, step = 1, weekNum = 1) {
  const stepKey = `STEP_${step}`;
  const weekKey = `W${weekNum}`;
  const config = EXAM_RULES_SCHEMA[stepKey]?.components?.vocabulary?.weeks?.[weekKey];
  if (!config) return 0;
  const denom = config.standardDenominator || config.maxTarget || 100;
  const pct = ((Number(wordsDeposited) || 0) / denom) * 100;
  return Math.round(pct * 100) / 100;
}

/**
 * Calculates Step Average for Vocabulary (4 Weeks)
 */
export function calculateStepVocabAverage(w1, w2, w3, w4, step = 1) {
  const p1 = calculateWeeklyVocabPercentage(w1, step, 1);
  const p2 = calculateWeeklyVocabPercentage(w2, step, 2);
  const p3 = calculateWeeklyVocabPercentage(w3, step, 3);
  const p4 = calculateWeeklyVocabPercentage(w4, step, 4);
  const avg = (p1 + p2 + p3 + p4) / 4;
  return Math.round(avg * 100) / 100;
}

/**
 * Calculates Overall Subject Score across Steps (NA 1st + NA 2nd + NA 3rd) / StepsTaken
 */
export function calculateSubjectCompositeScore(stepScores = []) {
  const valid = stepScores.filter(s => typeof s === 'number' && !isNaN(s));
  if (valid.length === 0) return 0;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / valid.length) * 100) / 100;
}

/**
 * Computes Main Examiner Final Exam Score (4 Parameters x 25 = 100)
 */
export function calculateMainExaminerScore(fluency = 0, pronunciation = 0, idea = 0, grammar = 0) {
  const f = Math.max(0, Math.min(25, Number(fluency) || 0));
  const p = Math.max(0, Math.min(25, Number(pronunciation) || 0));
  const i = Math.max(0, Math.min(25, Number(idea) || 0));
  const g = Math.max(0, Math.min(25, Number(grammar) || 0));
  return f + p + i + g;
}

/**
 * Computes Speaking Tutor Final Practice Score (4 Parameters x 25 = 100)
 */
export function calculateSpeakingTutorScore(fluency = 0, pronunciation = 0, grammar = 0, comprehension = 0) {
  const f = Math.max(0, Math.min(25, Number(fluency) || 0));
  const p = Math.max(0, Math.min(25, Number(pronunciation) || 0));
  const g = Math.max(0, Math.min(25, Number(grammar) || 0));
  const c = Math.max(0, Math.min(25, Number(comprehension) || 0));
  return f + p + g + c;
}

/**
 * Generates Full Student Graduation Transcript Dossier
 * Codified from 'KALKULASI NILAI AKHIR' & 'ANGKET SERTIFIKAT'
 */
export function generateStudentCertificateTranscript({
  vocabScores = [],       // [naStep1, naStep2, naStep3]
  grammarScores = [],     // [naStep1, naStep2, naStep3]
  speakingScores = [],    // [naStep1, naStep2, naStep3]
  pronunciationScores = [],// [naStep3]
  practiceFinalScore = null // from Panel 2
}) {
  const naVocab = calculateSubjectCompositeScore(vocabScores);
  const naGrammar = calculateSubjectCompositeScore(grammarScores);
  const naSpeaking = calculateSubjectCompositeScore(speakingScores);
  const naPronunciation = calculateSubjectCompositeScore(pronunciationScores);
  const naPractice = practiceFinalScore != null ? Number(practiceFinalScore) : null;

  return {
    vocabulary: {
      score: naVocab,
      predicate: getCertificatePredicate(naVocab)
    },
    grammar: {
      score: naGrammar,
      predicate: getCertificatePredicate(naGrammar)
    },
    speaking: {
      score: naSpeaking,
      predicate: getCertificatePredicate(naSpeaking)
    },
    pronunciation: {
      score: naPronunciation,
      predicate: getCertificatePredicate(naPronunciation)
    },
    practice: {
      score: naPractice,
      predicate: naPractice != null ? getCertificatePredicate(naPractice) : '—'
    }
  };
}
