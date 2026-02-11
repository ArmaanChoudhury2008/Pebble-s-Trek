// Simple Web Audio API synthesizer for game sound effects
// This avoids the need for external audio files and ensures offline functionality.
// NOW PLAYING: Simulation of "Time Machine" by Waterflame (Geometry Dash)

let audioCtx: AudioContext | null = null;
let bgmGainNode: GainNode | null = null;
let isBgmStarted = false;
let isSfxPlaying = false;
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let beatIndex = 0;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

// --- BGM Logic ---

export const startBGM = () => {
  const ctx = getAudioContext();
  if (isBgmStarted) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
  }
  
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // Master Gain for BGM
  bgmGainNode = ctx.createGain();
  // Loud and punchy mix
  bgmGainNode.gain.value = 0.35; 
  bgmGainNode.connect(ctx.destination);

  isBgmStarted = true;
  beatIndex = 0;

  // Clear any existing interval
  if (schedulerInterval) clearInterval(schedulerInterval);

  // Time Machine is approx 143 BPM.
  // 60 / 143 = 0.419s per beat.
  // 16th note = 0.105s (105ms)
  const stepDuration = 105; 

  schedulerInterval = setInterval(() => {
    // If SFX is playing, silence BGM (do not schedule new notes)
    if (isSfxPlaying || !bgmGainNode) return;
    
    playTimeMachineBeat(ctx, bgmGainNode, beatIndex);
    beatIndex = (beatIndex + 1) % 64; // Extended loop to 64 steps for the full riff
  }, stepDuration);
};

export const stopBGM = () => {
    isBgmStarted = false;
    if (schedulerInterval) clearInterval(schedulerInterval);
    if (bgmGainNode) {
        bgmGainNode.disconnect();
        bgmGainNode = null;
    }
};

const playTimeMachineBeat = (ctx: AudioContext, output: GainNode, step: number) => {
    const now = ctx.currentTime;
    
    // "Time Machine" Main Riff Transcription
    // Key: G Minor
    // Progression: G Minor | Eb Major | Bb Major | F Major
    
    // --- DRUMS ---
    // Classic Techno/Dubstep beat
    const isKick = step % 4 === 0;
    const isSnare = step % 8 === 4;
    const isHat = step % 2 === 0 && !isSnare; // Off-beat hats usually

    if (isKick) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gain);
        gain.connect(output);
        osc.start(now);
        osc.stop(now + 0.5);
    }
    
    if (isSnare) {
         // Heavy clap/snare layer
         const bufferSize = ctx.sampleRate * 0.15;
         const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
         const data = buffer.getChannelData(0);
         for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
         
         const noise = ctx.createBufferSource();
         noise.buffer = buffer;
         const gain = ctx.createGain();
         
         const filter = ctx.createBiquadFilter();
         filter.type = 'bandpass';
         filter.frequency.value = 1500;
         filter.Q.value = 1;
         
         gain.gain.setValueAtTime(0.8, now);
         gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
         
         noise.connect(filter);
         filter.connect(gain);
         gain.connect(output);
         noise.start(now);
    }

    if (step % 2 === 0) { // High hats
         const bufferSize = ctx.sampleRate * 0.05;
         const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
         const data = buffer.getChannelData(0);
         for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
         
         const noise = ctx.createBufferSource();
         noise.buffer = buffer;
         const gain = ctx.createGain();
         
         const filter = ctx.createBiquadFilter();
         filter.type = 'highpass';
         filter.frequency.value = 7000;
         
         // Accentuate the off-beat hat
         const vol = (step % 4 === 2) ? 0.3 : 0.1;

         gain.gain.setValueAtTime(vol, now);
         gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
         
         noise.connect(filter);
         filter.connect(gain);
         gain.connect(output);
         noise.start(now);
    }

    // --- BASS ---
    // G (49Hz), Eb (38.89Hz), Bb (58.27Hz), F (43.65Hz)
    // 64 step loop: 16 steps per chord
    let bassFreq = 0;
    if (step < 16) bassFreq = 49.00; // G1
    else if (step < 32) bassFreq = 38.89; // Eb1
    else if (step < 48) bassFreq = 58.27; // Bb1
    else bassFreq = 43.65; // F1

    // Sidechain pumping bass on every off-beat
    // 16th note bassline
    const oscBass = ctx.createOscillator();
    const gainBass = ctx.createGain();
    oscBass.type = 'sawtooth';
    oscBass.frequency.setValueAtTime(bassFreq, now);

    const filterBass = ctx.createBiquadFilter();
    filterBass.type = 'lowpass';
    filterBass.frequency.setValueAtTime(300, now);
    
    // Sidechain volume ducking
    if (step % 4 === 0) { // Kick hit
        gainBass.gain.setValueAtTime(0.0, now); 
        gainBass.gain.linearRampToValueAtTime(0.7, now + 0.1); 
    } else {
        gainBass.gain.setValueAtTime(0.7, now);
        gainBass.gain.setValueAtTime(0.7, now + 0.1); // Sustain
    }
    // Quick release
    gainBass.gain.exponentialRampToValueAtTime(0.01, now + 0.105);

    oscBass.connect(filterBass);
    filterBass.connect(gainBass);
    gainBass.connect(output);
    oscBass.start(now);
    oscBass.stop(now + 0.105);

    // --- LEAD MELODY ---
    // Replicating the "Time Machine" Drop Arpeggio
    // Frequencies: G4=392, A4=440, Bb4=466, C5=523, D5=587, Eb5=622, F5=698, G5=784
    
    let note = 0;
    const s = step % 16; // The riff repeats essentially every bar with variation, but let's map it to the chord
    
    // Basic Riff Pattern (Approximate):
    // 0: Root(High) 2: Root 4: 5th 6: 3rd 8: Root 10: 7th 12: 5th 14: 3rd
    // Adjusted for G Minor: G5, D5, Bb4, G4...
    
    // G Minor Section (0-15)
    if (step < 16) {
       const notes = [784, 0, 784, 587, 466, 0, 587, 392, 784, 0, 784, 587, 466, 0, 587, 392];
       note = notes[s];
    }
    // Eb Major Section (16-31)
    // Eb, Bb, G, Eb... (Eb5=622, Bb4=466, G4=392)
    else if (step < 32) {
       const notes = [622, 0, 622, 466, 392, 0, 466, 311, 622, 0, 622, 466, 392, 0, 466, 311];
       note = notes[s];
    }
    // Bb Major Section (32-47)
    // Bb, F, D, Bb... (Bb5=932, F5=698, D5=587, Bb4=466)
    else if (step < 48) {
       const notes = [932, 0, 932, 698, 587, 0, 698, 466, 932, 0, 932, 698, 587, 0, 698, 466];
       note = notes[s];
    }
    // F Major Section (48-63)
    // F, C, A, F... (F5=698, C5=523, A4=440, F4=349)
    else {
       const notes = [698, 0, 698, 523, 440, 0, 523, 349, 698, 0, 698, 523, 440, 0, 523, 349];
       note = notes[s];
    }

    if (note > 0) {
        const oscLead = ctx.createOscillator();
        const gainLead = ctx.createGain();
        // Time Machine has a very square/pulse lead sound
        oscLead.type = 'square'; 
        oscLead.frequency.setValueAtTime(note, now);

        // Filter envelope for "pluck"
        const filterLead = ctx.createBiquadFilter();
        filterLead.type = 'lowpass';
        filterLead.frequency.setValueAtTime(1500, now);
        filterLead.frequency.exponentialRampToValueAtTime(300, now + 0.1);

        gainLead.gain.setValueAtTime(0.25, now);
        gainLead.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscLead.connect(filterLead);
        filterLead.connect(gainLead);
        gainLead.connect(output);
        oscLead.start(now);
        oscLead.stop(now + 0.1);
    }
};

const duckBGM = (durationMs: number) => {
    if (!isBgmStarted) return;
    isSfxPlaying = true;
    
    // Immediately mute BGM output node to cut tails
    if (bgmGainNode) {
        const ctx = getAudioContext();
        bgmGainNode.gain.cancelScheduledValues(ctx.currentTime);
        bgmGainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.015);
    }

    setTimeout(() => {
        // Only resume if BGM is still supposed to be running
        if (isBgmStarted) {
            isSfxPlaying = false;
            if (bgmGainNode) {
                const ctx = getAudioContext();
                bgmGainNode.gain.cancelScheduledValues(ctx.currentTime);
                // Return to the new high volume
                bgmGainNode.gain.setTargetAtTime(0.35, ctx.currentTime, 0.5); 
            }
        }
    }, durationMs);
};

// --- SFX Functions ---

export const playSuccessSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  
  // Pause BGM
  duckBGM(1500);

  const now = ctx.currentTime;
  
  // Play a cheerful major triad arpeggio (C6, E6, G6)
  // Higher pitch for a "chime" effect
  const notes = [1046.50, 1318.51, 1567.98]; 
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + i * 0.1);
    
    // Envelope for a bell-like tone
    gain.gain.setValueAtTime(0, now + i * 0.1);
    // Increased to 0.9 (near max)
    gain.gain.linearRampToValueAtTime(0.9, now + i * 0.1 + 0.02); 
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.8);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.8);
  });
};

export const playFailureSound = () => {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  
  // Pause BGM
  duckBGM(500);

  const now = ctx.currentTime;
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  // Low pitch sawtooth wave sliding down ("Bonk")
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.3); 
  
  // Increased to 1.0 (max)
  gain.gain.setValueAtTime(1.0, now); 
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(now);
  osc.stop(now + 0.3);
};

export const playSmashSound = () => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    
    // Pause BGM
    duckBGM(300);

    const now = ctx.currentTime;
    
    // Create noise buffer for impact sound
    const bufferSize = ctx.sampleRate * 0.15; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    
    // Lowpass filter to make it a dull thud rather than hiss
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    // Increased to 1.0 (max)
    gain.gain.setValueAtTime(1.0, now); 
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
};
