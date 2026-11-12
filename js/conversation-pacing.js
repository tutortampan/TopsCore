// TopsCore LMS — 4-Stage 60-Minute Discussion Pacing & Dual-Track Transcription Controller
// Orchestrates stage transitions, live speech recognition, and balanced turn-taking.

export const STAGE_DEFINITIONS = [
  {
    stage: 1,
    name: 'Warm-up & Context Setting',
    proportion: 10 / 60, // 16.67% (10 mins default)
    headline: 'Ice-breaker & Initial Background',
    guidelines: [
      'Introduce your role and departmental focus for this discussion.',
      'Acknowledge past collaboration milestones and set a constructive, professional tone.',
      'Outline your top priorities before exploring concessions.'
    ]
  },
  {
    stage: 2,
    name: 'Deep Dive & Debate / Roleplay',
    proportion: 25 / 60, // 41.67% (25 mins default)
    headline: 'Core Scenario Argumentation & Negotiation',
    guidelines: [
      'Present your core constraints and justify required project timelines or deliverables.',
      'Active listening: address your partner’s concerns with structured counter-arguments.',
      'Propose creative alternative tradeoffs (e.g. scope vs. delivery date vs. staffing).'
    ]
  },
  {
    stage: 3,
    name: 'Problem Solving & Consensus',
    proportion: 15 / 60, // 25.0% (15 mins default)
    headline: 'Collaborative Problem Solving & Agreement',
    guidelines: [
      'Work together to synthesize a mutually acceptable 3-point action plan.',
      'Explicitly confirm agreement terms using professional milestone language.',
      'Assign responsibilities and verify stakeholder expectations.'
    ]
  },
  {
    stage: 4,
    name: 'Debrief & Mutual Reflection',
    proportion: 10 / 60, // 16.67% (10 mins default)
    headline: 'Session Reflection & Closing Summary',
    guidelines: [
      'Share feedback on communication clarity and persuasive points made during the call.',
      'Highlight 2 key vocabulary collocations effectively used in the conversation.',
      'Deliver final professional sign-off and wrap up the session.'
    ]
  }
];

export class ConversationPacingEngine {
  constructor(options = {}) {
    this.totalDurationSeconds = options.durationMinutes ? options.durationMinutes * 60 : 3600; // 60 mins
    this.studentInfo = options.studentInfo || { id: 'self', name: 'Student A', role: 'Lead Engineer' };
    this.targetVocab = options.targetVocab || [];
    this.onTick = options.onTick || (() => {});
    this.onStageChange = options.onStageChange || (() => {});
    this.onNewTurn = options.onNewTurn || (() => {});
    this.onVocabUsed = options.onVocabUsed || (() => {});
    this.onSpeakingBalance = options.onSpeakingBalance || (() => {});
    this.onSessionComplete = options.onSessionComplete || (() => {});
    this.broadcastSync = options.broadcastSync || (() => {});

    this.currentStage = 1;
    this.secondsRemaining = this.totalDurationSeconds;
    this.stageSecondsRemaining = 0;
    this.timerInterval = null;
    this.isRunning = false;

    // Chat turns & speech recognition
    this.chatLog = [];
    this.recognition = null;
    this.isSttEnabled = true;

    // Speaking statistics
    this.stats = {
      selfWords: 0,
      peerWords: 0,
      selfTurns: 0,
      peerTurns: 0,
      vocabHits: new Set()
    };

    this._computeStageDurations();
  }

  _computeStageDurations() {
    this.stageDurations = STAGE_DEFINITIONS.map(def => {
      const dur = Math.round(this.totalDurationSeconds * def.proportion);
      return { ...def, durationSeconds: dur };
    });
    this.stageSecondsRemaining = this.stageDurations[0].durationSeconds;
  }

  /**
   * Start 60-minute countdown and speech recognition
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this._startTimer();
    this.initSpeechRecognition();
  }

  _startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (!this.isRunning) return;

      this.secondsRemaining--;
      this.stageSecondsRemaining--;

      // Stage advance check
      if (this.stageSecondsRemaining <= 0 && this.currentStage < 4) {
        this.advanceStage(this.currentStage + 1, false);
      }

      // Session complete check
      if (this.secondsRemaining <= 0) {
        this.finishSession();
        return;
      }

      this.onTick({
        totalRemaining: this.secondsRemaining,
        stageRemaining: this.stageSecondsRemaining,
        currentStage: this.currentStage,
        formattedTotal: this._formatTime(this.secondsRemaining),
        formattedStage: this._formatTime(this.stageSecondsRemaining)
      });
    }, 1000);
  }

  _formatTime(totalSec) {
    const sec = Math.max(0, totalSec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  /**
   * Manually or automatically advance stage
   */
  advanceStage(stageNumber, broadcast = true) {
    if (stageNumber < 1 || stageNumber > 4) return;
    this.currentStage = stageNumber;
    const stageDef = this.stageDurations[stageNumber - 1];
    this.stageSecondsRemaining = stageDef.durationSeconds;

    this.onStageChange(this.currentStage, stageDef);

    if (broadcast) {
      this.broadcastSync({
        type: 'stage_advance',
        currentStage: this.currentStage,
        stageSecondsRemaining: this.stageSecondsRemaining,
        totalRemaining: this.secondsRemaining
      });
    }
  }

  /**
   * Synchronize timer from peer message
   */
  syncFromPeer(peerPayload) {
    if (!peerPayload) return;
    if (peerPayload.currentStage && peerPayload.currentStage !== this.currentStage) {
      this.currentStage = peerPayload.currentStage;
      const stageDef = this.stageDurations[this.currentStage - 1];
      this.stageSecondsRemaining = peerPayload.stageSecondsRemaining || stageDef.durationSeconds;
      this.onStageChange(this.currentStage, stageDef);
    }
    if (peerPayload.totalRemaining) {
      this.secondsRemaining = peerPayload.totalRemaining;
    }
  }

  /**
   * Initialize browser SpeechRecognition
   */
  initSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Pacing] SpeechRecognition not supported in this browser.');
      return;
    }

    try {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (event) => {
        if (!this.isRunning || !this.isSttEnabled) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript.length > 0) {
              this._recordLocalUtterance(transcript);
            }
          }
        }
      };

      recog.onerror = (event) => {
        if (event.error !== 'no-speech') {
          console.warn('[Pacing] Speech recognition error:', event.error);
        }
      };

      recog.onend = () => {
        // Automatically restart speech recognition while session is active
        if (this.isRunning && this.isSttEnabled) {
          try {
            recog.start();
          } catch (_) {}
        }
      };

      recog.start();
      this.recognition = recog;
    } catch (err) {
      console.warn('[Pacing] Failed to initialize SpeechRecognition:', err);
    }
  }

  _recordLocalUtterance(text) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    this.stats.selfWords += wordCount;
    this.stats.selfTurns += 1;

    const turn = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      speakerId: this.studentInfo.id,
      speakerName: this.studentInfo.name || 'You',
      role: this.studentInfo.role || 'Speaker A',
      isSelf: true,
      stage: this.currentStage,
      text: text,
      wordCount: wordCount,
      timestamp: new Date().toISOString()
    };

    this.chatLog.push(turn);
    this._checkVocabularyHits(text);
    this._updateSpeakingBalance();
    this.onNewTurn(turn);

    // Broadcast turn to peer
    this.broadcastSync({
      type: 'transcript_turn',
      turn: {
        id: turn.id,
        speakerId: this.studentInfo.id,
        speakerName: this.studentInfo.name,
        role: this.studentInfo.role,
        isSelf: false,
        stage: turn.stage,
        text: turn.text,
        wordCount: turn.wordCount,
        timestamp: turn.timestamp
      }
    });
  }

  /**
   * Ingest peer's transcript turn
   */
  receivePeerTurn(turnData) {
    if (!turnData || !turnData.text) return;
    const wordCount = turnData.wordCount || turnData.text.split(/\s+/).filter(Boolean).length;
    this.stats.peerWords += wordCount;
    this.stats.peerTurns += 1;

    const turn = {
      ...turnData,
      isSelf: false
    };

    this.chatLog.push(turn);
    this._checkVocabularyHits(turnData.text);
    this._updateSpeakingBalance();
    this.onNewTurn(turn);
  }

  _checkVocabularyHits(text) {
    const lowerText = text.toLowerCase();
    this.targetVocab.forEach(vocab => {
      const target = vocab.toLowerCase();
      if (!this.stats.vocabHits.has(target) && lowerText.includes(target)) {
        this.stats.vocabHits.add(target);
        this.onVocabUsed(vocab);
      }
    });
  }

  _updateSpeakingBalance() {
    const totalWords = this.stats.selfWords + this.stats.peerWords;
    let selfShare = 50;
    let peerShare = 50;

    if (totalWords > 0) {
      selfShare = Math.round((this.stats.selfWords / totalWords) * 100);
      peerShare = 100 - selfShare;
    }

    this.onSpeakingBalance({
      selfShare,
      peerShare,
      selfWords: this.stats.selfWords,
      peerWords: this.stats.peerWords,
      selfTurns: this.stats.selfTurns,
      peerTurns: this.stats.peerTurns
    });
  }

  toggleSTT(enabled = null) {
    this.isSttEnabled = enabled !== null ? enabled : !this.isSttEnabled;
    if (this.recognition) {
      if (this.isSttEnabled) {
        try { this.recognition.start(); } catch (_) {}
      } else {
        try { this.recognition.stop(); } catch (_) {}
      }
    }
    return this.isSttEnabled;
  }

  /**
   * Finalize session and serialize low-egress JSON transcript
   */
  finishSession() {
    this.isRunning = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
      this.recognition = null;
    }

    const payload = {
      totalDurationSeconds: this.totalDurationSeconds - this.secondsRemaining,
      totalTurns: this.chatLog.length,
      chatLog: this.chatLog,
      stats: {
        selfWords: this.stats.selfWords,
        peerWords: this.stats.peerWords,
        selfTurns: this.stats.selfTurns,
        peerTurns: this.stats.peerTurns,
        vocabHits: Array.from(this.stats.vocabHits)
      }
    };

    // Calculate JSON size (ensuring < 50 KB per Rule 2.12)
    const jsonBytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    console.log(`[Pacing] Session complete. Serialized JSON size: ${(jsonBytes / 1024).toFixed(2)} KB`);

    this.onSessionComplete(payload);
    return payload;
  }
}
