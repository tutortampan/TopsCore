// TopsCore LMS — Peer-to-Peer 1-Hour Conversation Room Controller
// Wires WebRTC audio mesh, 4-stage pacing, Speech-to-Text, and 5-Pillar AI evaluation.

import { getSupabase } from './supabase.js';
import { WebRTCCallEngine } from './webrtc-call.js';
import { ConversationPacingEngine, STAGE_DEFINITIONS } from './conversation-pacing.js';
import { evaluateAndSaveConversation } from './conversation-eval.js';
import { getGradeColorByScore, GRADE_PALETTE, TOPSCORE_COLORS } from './grading.js';
import { getSvgIcon } from './svg-icons.js?v=20261114_v487';

class ConversationRoomApp {
  constructor() {
    this.sb = null;
    this.channel = null;
    this.webrtc = null;
    this.pacing = null;

    this.roomCode = null;
    this.testId = null;
    this.student = null;
    this.peer = null;
    this.isInitiator = false;

    this.topicData = {
      title: 'Cross-Cultural Project Deadline Settlement',
      category: 'Business & Workplace Negotiation',
      description: 'Two division leads must negotiate client feature deliveries, timeline delays, and resource allocations.',
      targetVocab: [
        'mutual concession',
        'milestone deliverable',
        'resource constraint',
        'contingency buffer',
        'equitable compromise',
        'stakeholder alignment'
      ]
    };

    this.avatarState = 'idle';
    this.currentVolume = 0;
    this.remoteVolume = 0;
    this._avatarIdleTimer = null;
    this._animFrame = null;
  }

  async init() {
    this.sb = await getSupabase();
    this._loadStudentSession();
    this._parseUrlParams();

    this._bindDomEvents();
    this.initWaveformVisualizer();
    this.setAvatarState('idle');

    if (!this.roomCode) {
      this._showLobbyModal();
    } else {
      await this.joinRoom(this.roomCode);
    }
  }

  setAvatarState(state) {
    const stage = document.getElementById('living-avatar-stage');
    const badge = document.getElementById('avatar-state-badge');
    const text = document.getElementById('avatar-state-text');
    const norm = String(state || 'idle').toLowerCase();

    if (stage) stage.dataset.state = norm;
    if (badge) {
      badge.className = `avatar-state-pill state-${norm}`;
    }
    if (text) {
      const labels = {
        idle: 'IDLE • READY',
        listening: `${getSvgIcon('mic', 12)} LISTENING...`,
        thinking: `${getSvgIcon('activity', 12)} THINKING...`,
        speaking: `${getSvgIcon('volume-2', 12)} SPEAKING...`
      };
      text.innerHTML = labels[norm] || norm.toUpperCase();
    }
    this.avatarState = norm;
  }

  initWaveformVisualizer() {
    const canvas = document.getElementById('conv-waveform-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Determine wave amplitude and color based on avatarState and current volume
      const state = this.avatarState || 'idle';
      let amp = 3;
      let strokeColor = 'rgba(56, 189, 248, 0.4)'; // idle blue

      if (state === 'listening') {
        amp = Math.max(8, (this.currentVolume || 0) * 0.4);
        strokeColor = (typeof TOPSCORE_COLORS !== 'undefined' ? TOPSCORE_COLORS.A : 'var(--grade-a)'); // Grade A Green
      } else if (state === 'thinking') {
        amp = 5 + Math.sin(phase * 2) * 3;
        strokeColor = '#818cf8'; // Indigo
      } else if (state === 'speaking') {
        amp = Math.max(12, (this.remoteVolume || 0) * 0.5);
        strokeColor = '#38bdf8'; // Tactical Blue
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = strokeColor;

      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin((x * 0.05) + phase) * amp * Math.sin((x / width) * Math.PI);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      phase += (state === 'idle' ? 0.04 : 0.12);
      this._animFrame = requestAnimationFrame(render);
    };

    render();
  }

  _loadStudentSession() {
    let session = null;
    try {
      const raw = sessionStorage.getItem('topscore_session') || localStorage.getItem('topscore_session');
      if (raw) session = JSON.parse(raw);
    } catch (_) {}

    if (session && session.student_id) {
      this.student = {
        id: session.student_id,
        name: session.student_name || 'Student A',
        role: session.assigned_role || 'Lead Engineer'
      };
    } else {
      // Demo / Test session
      const randId = 'std_' + Math.random().toString(36).substring(2, 8);
      this.student = {
        id: randId,
        name: 'You (Speaker A)',
        role: 'Lead Engineer'
      };
    }
  }

  _parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('room')) this.roomCode = params.get('room').toUpperCase();
    if (params.get('test_id')) this.testId = params.get('test_id');
    if (params.get('role')) this.student.role = params.get('role');
  }

  _bindDomEvents() {
    // Room code copy
    const roomCodeBadge = document.getElementById('room-code-badge');
    if (roomCodeBadge) {
      roomCodeBadge.onclick = () => {
        if (this.roomCode) {
          navigator.clipboard?.writeText(this.roomCode);
          roomCodeBadge.textContent = 'COPIED!';
          setTimeout(() => {
            roomCodeBadge.textContent = `ROOM: ${this.roomCode}`;
          }, 1500);
        }
      };
    }

    // Mic toggle
    const btnMic = document.getElementById('btn-toggle-mic');
    if (btnMic) {
      btnMic.onclick = () => {
        if (this.webrtc) {
          const isMuted = this.webrtc.toggleMute();
          const micIcon = document.getElementById('mic-icon');
          const micLabel = document.getElementById('mic-label');
          if (micIcon) micIcon.innerHTML = isMuted ? getSvgIcon('lock', 14) : getSvgIcon('mic', 14);
          if (micLabel) micLabel.textContent = isMuted ? 'Unmute' : 'Mute Mic';
          btnMic.classList.toggle('conv-btn-danger', isMuted);
        }
      };
    }

    // STT toggle
    const btnStt = document.getElementById('btn-toggle-stt');
    if (btnStt) {
      btnStt.onclick = () => {
        if (this.pacing) {
          const active = this.pacing.toggleSTT();
          btnStt.classList.toggle('conv-btn-active', active);
          btnStt.classList.toggle('conv-btn-secondary', !active);
          btnStt.querySelector('span:last-child').textContent = active ? 'STT: ON' : 'STT: OFF';
        }
      };
    }

    // Signal turn
    const btnTurn = document.getElementById('btn-turn-cue');
    if (btnTurn) {
      btnTurn.onclick = () => {
        this._broadcast({
          type: 'turn_cue',
          speakerName: this.student.name
        });
        this._showTurnSignal(`${this.student.name} requested turn.`);
      };
    }

    // Advance Stage
    const btnNext = document.getElementById('btn-next-stage');
    if (btnNext) {
      btnNext.onclick = () => {
        if (this.pacing) {
          const next = Math.min(4, this.pacing.currentStage + 1);
          this.pacing.advanceStage(next, true);
        }
      };
    }

    // End Session
    const btnEnd = document.getElementById('btn-end-session');
    if (btnEnd) {
      btnEnd.onclick = () => {
        if (confirm('Are you sure you want to end this conversation session and generate AI evaluations?')) {
          this.finishAndEvaluate();
        }
      };
    }

    // Return to dashboard
    const btnDash = document.getElementById('btn-return-dashboard');
    if (btnDash) {
      btnDash.onclick = () => {
        window.location.href = 'dashboard.html';
      };
    }

    // Lobby buttons
    const btnCreate = document.getElementById('btn-create-room');
    if (btnCreate) {
      btnCreate.onclick = () => {
        const randCode = 'CONV-' + Math.floor(1000 + Math.random() * 9000);
        this.isInitiator = true;
        this.joinRoom(randCode);
      };
    }

    const btnJoin = document.getElementById('btn-join-room');
    if (btnJoin) {
      btnJoin.onclick = () => {
        const inputCode = document.getElementById('input-room-code')?.value.trim().toUpperCase();
        if (inputCode) {
          this.joinRoom(inputCode);
        } else {
          alert('Please enter a valid room code.');
        }
      };
    }
  }

  _showLobbyModal() {
    const modal = document.getElementById('lobby-modal');
    if (modal) modal.style.display = 'flex';
  }

  _hideLobbyModal() {
    const modal = document.getElementById('lobby-modal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * Connect to Supabase Realtime channel and establish WebRTC mesh
   */
  async joinRoom(roomCode) {
    this.roomCode = roomCode;
    this._hideLobbyModal();

    const roomBadge = document.getElementById('room-code-badge');
    if (roomBadge) roomBadge.textContent = `ROOM: ${this.roomCode}`;

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomCode);
    window.history.replaceState({}, '', url.toString());

    // 1. Initialize Pacing Engine
    this.pacing = new ConversationPacingEngine({
      durationMinutes: 60,
      studentInfo: this.student,
      targetVocab: this.topicData.targetVocab,
      onTick: (tick) => this._renderTimerTick(tick),
      onStageChange: (stage, def) => this._renderStageChange(stage, def),
      onNewTurn: (turn) => this._appendTranscriptBubble(turn),
      onVocabUsed: (vocab) => this._markVocabUsed(vocab),
      onSpeakingBalance: (balance) => this._renderSpeakingBalance(balance),
      onSessionComplete: (payload) => this.finishAndEvaluate(payload),
      broadcastSync: (msg) => this._broadcast(msg)
    });

    // 2. Initialize WebRTC Call Engine
    this.webrtc = new WebRTCCallEngine({
      signalingSend: (signal) => this._broadcast({ type: 'webrtc_signal', signal }),
      onRemoteStream: () => {
        this._updateNetworkPill('connected', 'P2P Audio Connected');
      },
      onLocalVolume: (vol) => {
        const bar = document.getElementById('vu-bar-self');
        if (bar) bar.style.width = `${vol}%`;
        const card = document.getElementById('speaker-card-self');
        if (card) card.classList.toggle('speaking', vol > 15);

        this.currentVolume = vol;
        if (vol > 15) {
          this.setAvatarState('listening');
          clearTimeout(this._avatarIdleTimer);
          this._avatarIdleTimer = setTimeout(() => {
            if (this.avatarState === 'listening') this.setAvatarState('idle');
          }, 1200);
        }
      },
      onRemoteVolume: (vol) => {
        const bar = document.getElementById('vu-bar-peer');
        if (bar) bar.style.width = `${vol}%`;
        const card = document.getElementById('speaker-card-peer');
        if (card) card.classList.toggle('speaking', vol > 15);

        this.remoteVolume = vol;
        if (vol > 15) {
          this.setAvatarState('speaking');
          clearTimeout(this._avatarIdleTimer);
          this._avatarIdleTimer = setTimeout(() => {
            if (this.avatarState === 'speaking') this.setAvatarState('idle');
          }, 1200);
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          this._updateNetworkPill('connected', 'P2P Opus &bull; Active');
        } else if (state === 'disconnected' || state === 'failed') {
          this._updateNetworkPill('disconnected', 'Reconnecting...');
        }
      }
    });

    // 3. Connect Supabase Realtime Channel
    this._connectRealtimeChannel();

    // 4. Update UI labels
    const nameSelf = document.getElementById('name-self');
    if (nameSelf) nameSelf.textContent = this.student.name;
    const roleSelf = document.getElementById('role-self');
    if (roleSelf) roleSelf.textContent = this.student.role;

    // Start timer & STT
    this.pacing.start();
  }

  _connectRealtimeChannel() {
    const channelName = `conv_${this.roomCode}`;
    this.channel = this.sb.channel(channelName, {
      config: { broadcast: { self: false }, presence: { key: this.student.id } }
    });

    this.channel
      .on('broadcast', { event: 'room_msg' }, ({ payload }) => {
        this._handleBroadcastMessage(payload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        this._handlePresenceSync(state);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          this._updateNetworkPill('connecting', 'Waiting for peer...');
          await this.channel.track({
            id: this.student.id,
            name: this.student.name,
            role: this.student.role,
            onlineAt: new Date().toISOString()
          });

          // Announce presence
          this._broadcast({
            type: 'peer_joined',
            student: this.student
          });
        }
      });
  }

  _broadcast(msg) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'room_msg',
        payload: {
          senderId: this.student.id,
          ...msg
        }
      });
    }
  }

  async _handleBroadcastMessage(payload) {
    if (!payload || payload.senderId === this.student.id) return;

    switch (payload.type) {
      case 'peer_joined':
        this._onPeerJoined(payload.student);
        // If initiator, send offer
        if (this.isInitiator) {
          try {
            await this.webrtc.createOffer();
          } catch (e) {
            console.error('[Room] Failed to send offer:', e);
          }
        }
        break;

      case 'webrtc_signal':
        await this._handleWebRTCSignal(payload.signal);
        break;

      case 'transcript_turn':
        if (this.pacing && payload.turn) {
          this.pacing.receivePeerTurn(payload.turn);
        }
        break;

      case 'stage_advance':
        if (this.pacing) {
          this.pacing.syncFromPeer(payload);
        }
        break;

      case 'turn_cue':
        this._showTurnSignal(`${payload.speakerName || 'Peer'} signaled for a turn.`);
        break;

      case 'session_complete':
        this.finishAndEvaluate(payload.payload, false);
        break;
    }
  }

  _onPeerJoined(peerInfo) {
    this.peer = peerInfo;
    const namePeer = document.getElementById('name-peer');
    if (namePeer) namePeer.textContent = peerInfo.name;
    const rolePeer = document.getElementById('role-peer');
    if (rolePeer) rolePeer.textContent = peerInfo.role || 'Peer Discussion Partner';

    this._appendTranscriptBubble({
      isSelf: false,
      speakerName: 'System',
      text: `${peerInfo.name} joined the discussion room. Audio call initializing...`,
      timestamp: new Date().toISOString()
    });
  }

  async _handleWebRTCSignal(signal) {
    if (!signal) return;
    if (signal.type === 'offer') {
      await this.webrtc.handleOffer(signal.sdp);
    } else if (signal.type === 'answer') {
      await this.webrtc.handleAnswer(signal.sdp);
    } else if (signal.type === 'candidate') {
      await this.webrtc.handleCandidate(signal.candidate);
    }
  }

  _handlePresenceSync(state) {
    const userIds = Object.keys(state);
    if (userIds.length >= 2) {
      this._updateNetworkPill('connected', 'Peer Connected (2/2)');
    }
  }

  _updateNetworkPill(status, text) {
    const pill = document.getElementById('network-pill');
    const label = document.getElementById('network-text');
    if (pill) {
      pill.className = `conv-network-pill ${status}`;
    }
    if (label) {
      label.innerHTML = text;
    }
  }

  _renderTimerTick(tick) {
    const timerElem = document.getElementById('conv-timer');
    if (timerElem) {
      timerElem.textContent = `⏱️ ${tick.formattedTotal}`;
      timerElem.classList.toggle('warning', tick.totalRemaining < 300);
    }

    const stageBadge = document.getElementById('stage-timer-badge');
    if (stageBadge) {
      stageBadge.textContent = `Stage ${tick.currentStage} Time: ${tick.formattedStage}`;
    }
  }

  _renderStageChange(stageNum, stageDef) {
    // Update topbar pills
    const pills = document.querySelectorAll('#stage-pills .conv-stage-pill');
    pills.forEach((p, idx) => {
      const pStage = idx + 1;
      p.classList.toggle('active', pStage === stageNum);
      p.classList.toggle('completed', pStage < stageNum);
    });

    // Update left panel
    const currentBadge = document.getElementById('current-stage-badge');
    if (currentBadge) currentBadge.textContent = `Current Stage: ${stageDef.name}`;

    const currentTitle = document.getElementById('current-stage-title');
    if (currentTitle) currentTitle.textContent = stageDef.headline;

    const list = document.getElementById('current-stage-guidelines');
    if (list && stageDef.guidelines) {
      list.innerHTML = stageDef.guidelines.map(g => `<li>${g}</li>`).join('');
    }

    // System announcement
    this._appendTranscriptBubble({
      isSelf: false,
      speakerName: 'System',
      text: `Advanced to Stage ${stageNum}: ${stageDef.name}`,
      timestamp: new Date().toISOString()
    });
  }

  _appendTranscriptBubble(turn) {
    const feed = document.getElementById('transcript-feed');
    if (!feed) return;

    const bubble = document.createElement('div');
    const isSystem = turn.speakerName === 'System';
    bubble.className = `conv-turn-bubble ${isSystem ? 'system' : (turn.isSelf ? 'mine' : 'peer')}`;

    const timeStr = new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    bubble.innerHTML = `
      <div class="conv-turn-meta">
        <strong>${turn.speakerName}</strong>
        <span>${timeStr}</span>
      </div>
      <div>${turn.text}</div>
    `;

    feed.appendChild(bubble);
    feed.scrollTop = feed.scrollHeight;
  }

  _markVocabUsed(vocab) {
    const chips = document.querySelectorAll('#conv-vocab-chips .conv-vocab-chip');
    chips.forEach(chip => {
      if (chip.textContent.trim().toLowerCase() === vocab.toLowerCase()) {
        chip.classList.add('used');
      }
    });
  }

  _renderSpeakingBalance(balance) {
    const barA = document.getElementById('share-bar-a');
    const barB = document.getElementById('share-bar-b');
    const labelA = document.getElementById('share-label-a');
    const labelB = document.getElementById('share-label-b');

    if (barA) barA.style.width = `${balance.selfShare}%`;
    if (barB) barB.style.width = `${balance.peerShare}%`;
    if (labelA) labelA.textContent = `Speaker A: ${balance.selfShare}%`;
    if (labelB) labelB.textContent = `Speaker B: ${balance.peerShare}%`;
  }

  _showTurnSignal(text) {
    this._appendTranscriptBubble({
      isSelf: false,
      speakerName: 'System',
      text: text,
      timestamp: new Date().toISOString()
    });
  }

  async finishAndEvaluate(payload = null, broadcast = true) {
    if (this.webrtc) this.webrtc.close();
    const finalPayload = payload || (this.pacing ? this.pacing.finishSession() : { chatLog: [] });

    if (broadcast) {
      this._broadcast({
        type: 'session_complete',
        payload: finalPayload
      });
    }

    // Call 5-Pillar Evaluation
    const evalData = await evaluateAndSaveConversation({
      studentId: this.student.id,
      testId: this.testId,
      topic: this.topicData.title,
      targetVocab: this.topicData.targetVocab,
      chatLog: finalPayload.chatLog,
      totalDurationSeconds: finalPayload.totalDurationSeconds
    });

    this._showEvaluationModal(evalData);
  }

  _showEvaluationModal(evalData) {
    const modal = document.getElementById('eval-modal');
    if (!modal) return;

    const scoreElem = document.getElementById('modal-final-score');
    if (scoreElem) scoreElem.textContent = `${evalData.final_score}%`;

    const gradeBadge = document.getElementById('modal-final-grade');
    if (gradeBadge) {
      gradeBadge.textContent = evalData.grade;
      gradeBadge.style.background = evalData.color;
      gradeBadge.style.color = evalData.textColor || '#0F172A';
    }

    const predElem = document.getElementById('modal-final-predicate');
    if (predElem) predElem.textContent = `${evalData.predicate} Speaking Performance`;

    const sFluency = document.getElementById('score-fluency');
    if (sFluency) sFluency.textContent = `${evalData.pillars?.fluency?.score || 85}%`;

    const sVocab = document.getElementById('score-vocab');
    if (sVocab) sVocab.textContent = `${evalData.pillars?.vocabulary?.score || 85}%`;

    const sGrammar = document.getElementById('score-grammar');
    if (sGrammar) sGrammar.textContent = `${evalData.pillars?.grammar?.score || 85}%`;

    const sRelevance = document.getElementById('score-relevance');
    if (sRelevance) sRelevance.textContent = `${evalData.pillars?.relevance?.score || 85}%`;

    const sTurn = document.getElementById('score-turn');
    if (sTurn) sTurn.textContent = `${evalData.pillars?.turn_taking?.score || 85}%`;

    const feedbackElem = document.getElementById('modal-eval-feedback');
    if (feedbackElem) feedbackElem.textContent = evalData.feedback || '';

    modal.style.display = 'flex';
  }
}

// Auto-start on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new ConversationRoomApp();
    window.conversationRoomApp = app;
    window.convRoomApp = app;
    app.init().catch(err => console.error('[Room] Init failed:', err));
  });
}
