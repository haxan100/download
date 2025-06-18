const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ganti ini dengan URL playlist YouTube kamu
const playlistUrl = 'https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj'; // contoh: Top 50 Global

const outputFolder = './music';
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// Fungsi download
function downloadTop10FromPlaylist() {
  console.log('Mulai download Top 10...');
  try {
    execSync(
      `yt-dlp --extract-audio --audio-format mp3 --playlist-items 1-10 -o "${outputFolder}/%(title)s.%(ext)s" ${playlistUrl}`,
      { stdio: 'inherit' }
    );
    console.log('✅ Selesai download Top 10');
  } catch (err) {
    console.error('❌ Gagal:', err.message);
  }
}

downloadTop10FromPlaylist();
