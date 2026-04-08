const fs = require('fs');
const path = require('path');

/**
 * Generate proper PCM WAV files with short tones for SFX
 * and simple sine wave "music" for music tracks.
 */

function createWav(sampleRate, durationSec, frequency, amplitude = 0.5) {
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataSize = numSamples * 2; // 16-bit samples
    const buffer = Buffer.alloc(44 + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20);  // PCM format
    buffer.writeUInt16LE(1, 22);  // mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
    buffer.writeUInt16LE(2, 32);  // block align
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Generate sine wave with envelope
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Envelope: quick attack, sustain, quick release
        let env = 1;
        const attackTime = 0.01;
        const releaseStart = durationSec - 0.05;
        if (t < attackTime) env = t / attackTime;
        else if (t > releaseStart) env = (durationSec - t) / (durationSec - releaseStart);
        
        const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * env;
        const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
}

// Create a simple "melody" as music
function createMusicWav(sampleRate, durationSec) {
    const numSamples = Math.floor(sampleRate * durationSec);
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Simple melody notes (C major scale pattern)
    const notes = [262, 294, 330, 349, 392, 440, 494, 523];
    const noteLen = 0.25; // seconds per note
    
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const noteIdx = Math.floor(t / noteLen) % notes.length;
        const freq = notes[noteIdx];
        const noteT = (t % noteLen) / noteLen;
        
        // Envelope
        let env = 1;
        if (noteT < 0.05) env = noteT / 0.05;
        else if (noteT > 0.85) env = (1 - noteT) / 0.15;
        
        // Mix harmonics for richer sound
        const sample = (
            Math.sin(2 * Math.PI * freq * t) * 0.4 +
            Math.sin(2 * Math.PI * freq * 2 * t) * 0.2 +
            Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
        ) * 0.3 * env;
        
        const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
        buffer.writeInt16LE(intSample, 44 + i * 2);
    }
    
    return buffer;
}

const sfxDir = path.join(__dirname, '../data/audio/sfx');
const musicDir = path.join(__dirname, '../data/audio/music');

if (!fs.existsSync(sfxDir)) fs.mkdirSync(sfxDir, { recursive: true });
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

const SR = 44100;

// SFX files with different frequencies for different sounds
const sfxConfig = {
    'menu_move.wav':    { freq: 800,  dur: 0.08 },
    'menu_select.wav':  { freq: 1200, dur: 0.12 },
    'pause.wav':        { freq: 400,  dur: 0.15 },
    'piece_move.wav':   { freq: 600,  dur: 0.05 },
    'piece_rotate.wav': { freq: 900,  dur: 0.06 },
    'piece_drop.wav':   { freq: 200,  dur: 0.15 },
    'piece_lock.wav':   { freq: 300,  dur: 0.1  },
    'line_clear.wav':   { freq: 1000, dur: 0.3  },
    'tetris.wav':       { freq: 1500, dur: 0.5  },
    'level_up.wav':     { freq: 1800, dur: 0.4  },
    'game_over.wav':    { freq: 150,  dur: 0.8  },
    'move.wav':         { freq: 500,  dur: 0.05 },
    'rotate.wav':       { freq: 700,  dur: 0.06 },
    'drop.wav':         { freq: 250,  dur: 0.12 },
    'lock.wav':         { freq: 350,  dur: 0.08 },
    'clear.wav':        { freq: 1100, dur: 0.25 },
    'levelup.wav':      { freq: 1600, dur: 0.35 },
    'gameover.wav':     { freq: 180,  dur: 0.6  },
    'hold.wav':         { freq: 650,  dur: 0.07 },
};

for (const [file, { freq, dur }] of Object.entries(sfxConfig)) {
    fs.writeFileSync(path.join(sfxDir, file), createWav(SR, dur, freq));
    console.log(`  SFX: ${file} (${freq}Hz, ${dur}s)`);
}

// Music files (longer sine wave melodies saved as .wav for now)
// Note: .mp3 files need to be actual mp3 - we'll save as wav and rename
// Howler supports both wav and mp3
const menuMusic = createMusicWav(SR, 8);
fs.writeFileSync(path.join(musicDir, 'menu.mp3'), menuMusic);
console.log('  Music: menu.mp3 (8s melody)');

const gameMusic = createMusicWav(SR, 16);
fs.writeFileSync(path.join(musicDir, 'game.mp3'), gameMusic);
console.log('  Music: game.mp3 (16s melody)');

console.log('\nAudio assets generated!');
