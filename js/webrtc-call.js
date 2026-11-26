// TopsCore LMS — WebRTC P2P Audio Connection Engine
// Opus audio streaming with direct P2P mesh & Web Audio API VU visualizer.
// Zero raw audio egress to server (Rule 2.12 compliance).

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
];

export class WebRTCCallEngine {
  constructor(options = {}) {
    this.signalingSend = options.signalingSend || (() => {});
    this.onRemoteStream = options.onRemoteStream || (() => {});
    this.onLocalVolume = options.onLocalVolume || (() => {});
    this.onRemoteVolume = options.onRemoteVolume || (() => {});
    this.onConnectionStateChange = options.onConnectionStateChange || (() => {});

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.remoteAudioElem = null;

    this.audioContext = null;
    this.localAnalyser = null;
    this.remoteAnalyser = null;
    this.volumeInterval = null;
    this.isMuted = false;
    this.isClosed = false;

    // Speaking activity tracking
    this.localSpeakingSeconds = 0;
    this.remoteSpeakingSeconds = 0;
  }

  /**
   * Request microphone access and prepare audio visualizer
   */
  async initLocalMedia() {
    if (this.localStream) return this.localStream;

    try {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
      } catch (constraintErr) {
        if (constraintErr.name === 'OverconstrainedError' || constraintErr.name === 'NotReadableError' || /iPad|iPhone|iPod/.test(navigator.userAgent)) {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } else {
          throw constraintErr;
        }
      }

      this._initAudioContext();
      this._attachLocalAnalyser(this.localStream);
      this._startVolumePolling();
      return this.localStream;
    } catch (err) {
      console.error('[WebRTC] Microphone access denied or failed:', err);
      throw err;
    }
  }

  _initAudioContext() {
    if (!this.audioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(() => {});
        }
      }
    }
  }

  _attachLocalAnalyser(stream) {
    if (!this.audioContext || !stream) return;
    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      this.localAnalyser = this.audioContext.createAnalyser();
      this.localAnalyser.fftSize = 256;
      source.connect(this.localAnalyser);
    } catch (e) {
      console.warn('[WebRTC] Could not attach local analyser:', e);
    }
  }

  _attachRemoteAnalyser(stream) {
    if (!this.audioContext || !stream) return;
    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      this.remoteAnalyser = this.audioContext.createAnalyser();
      this.remoteAnalyser.fftSize = 256;
      source.connect(this.remoteAnalyser);
    } catch (e) {
      console.warn('[WebRTC] Could not attach remote analyser:', e);
    }
  }

  _startVolumePolling() {
    if (this.volumeInterval) clearInterval(this.volumeInterval);

    const localData = new Uint8Array(128);
    const remoteData = new Uint8Array(128);

    this.volumeInterval = setInterval(() => {
      if (this.isClosed) return;

      // Local Volume
      let localVol = 0;
      if (this.localAnalyser && !this.isMuted) {
        this.localAnalyser.getByteFrequencyData(localData);
        let sum = 0;
        for (let i = 0; i < localData.length; i++) sum += localData[i];
        const avg = sum / localData.length;
        localVol = Math.min(100, Math.round((avg / 128) * 100));
        if (localVol > 12) {
          this.localSpeakingSeconds += 0.1;
        }
      }
      this.onLocalVolume(localVol, this.localSpeakingSeconds);

      // Remote Volume
      let remoteVol = 0;
      if (this.remoteAnalyser) {
        this.remoteAnalyser.getByteFrequencyData(remoteData);
        let sum = 0;
        for (let i = 0; i < remoteData.length; i++) sum += remoteData[i];
        const avg = sum / remoteData.length;
        remoteVol = Math.min(100, Math.round((avg / 128) * 100));
        if (remoteVol > 12) {
          this.remoteSpeakingSeconds += 0.1;
        }
      }
      this.onRemoteVolume(remoteVol, this.remoteSpeakingSeconds);
    }, 100);
  }

  /**
   * Instantiate RTCPeerConnection
   */
  _ensurePeerConnection() {
    if (this.peerConnection) return this.peerConnection;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peerConnection = pc;

    // Attach local tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle incoming audio track
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this._playRemoteAudio(this.remoteStream);
        this._attachRemoteAnalyser(this.remoteStream);
        this.onRemoteStream(this.remoteStream);
      }
    };

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingSend({
          type: 'candidate',
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Connection state monitor
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Connection state changed:', state);
      this.onConnectionStateChange(state);
    };

    return pc;
  }

  _playRemoteAudio(stream) {
    if (typeof document === 'undefined') return;
    if (!this.remoteAudioElem) {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.remoteAudioElem = audio;
    }
    this.remoteAudioElem.srcObject = stream;
    this.remoteAudioElem.play().catch(e => {
      console.warn('[WebRTC] Autoplay requires user interaction:', e);
    });
  }

  /**
   * Initiator creates WebRTC Offer
   */
  async createOffer() {
    await this.initLocalMedia();
    const pc = this._ensurePeerConnection();

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });
    await pc.setLocalDescription(offer);

    this.signalingSend({
      type: 'offer',
      sdp: pc.localDescription
    });
    return offer;
  }

  /**
   * Peer handles Offer and responds with Answer
   */
  async handleOffer(offerSdp) {
    await this.initLocalMedia();
    const pc = this._ensurePeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.signalingSend({
      type: 'answer',
      sdp: pc.localDescription
    });
    return answer;
  }

  /**
   * Initiator handles incoming Answer
   */
  async handleAnswer(answerSdp) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answerSdp));
  }

  /**
   * Both peers handle incoming ICE candidates
   */
  async handleCandidate(candidateData) {
    if (!this.peerConnection || !candidateData) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (err) {
      console.warn('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  /**
   * Toggle microphone mute state
   */
  toggleMute(forceMute = null) {
    if (!this.localStream) return false;
    this.isMuted = forceMute !== null ? forceMute : !this.isMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isMuted;
    });
    return this.isMuted;
  }

  /**
   * Clean termination of peer connection, streams, and visualizers
   */
  close() {
    this.isClosed = true;
    if (this.volumeInterval) {
      clearInterval(this.volumeInterval);
      this.volumeInterval = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.remoteAudioElem) {
      this.remoteAudioElem.pause();
      this.remoteAudioElem.remove();
      this.remoteAudioElem = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}
