const fs = require('fs');
const path = require('path');

// 44-byte minimal valid PCM WAV file (silence)
const dummyWav = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20, 
  0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 
  0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
]);

const sfxFiles = [
  'menu_move.wav', 'menu_select.wav', 'pause.wav', 'move.wav', 
  'rotate.wav', 'drop.wav', 'lock.wav', 'clear.wav', 
  'tetris.wav', 'levelup.wav', 'gameover.wav', 'hold.wav'
];

const musicFiles = [
  'menu.mp3', 'game.mp3'
];

const sfxDir = path.join(__dirname, '../data/audio/sfx');
const musicDir = path.join(__dirname, '../data/audio/music');

if (!fs.existsSync(sfxDir)) fs.mkdirSync(sfxDir, { recursive: true });
if (!fs.existsSync(musicDir)) fs.mkdirSync(musicDir, { recursive: true });

sfxFiles.forEach(file => fs.writeFileSync(path.join(sfxDir, file), dummyWav));
musicFiles.forEach(file => fs.writeFileSync(path.join(musicDir, file), dummyWav));

console.log('Dummy audio assets generated.');
