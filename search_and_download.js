const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Folder untuk menyimpan MP3
const outputFolder = path.join(__dirname, 'music');
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// Ambil input dari terminal: "ARTIS - JUDUL LAGU"
const query = process.argv.slice(2).join(' ');
if (!query) {
  console.error('❌ Masukkan nama artis dan judul lagu. Contoh: node search_and_download.js "Tulus - Hati-Hati di Jalan"');
  process.exit(1);
}

// Fungsi download
async function downloadSong(query) {
  return new Promise((resolve, reject) => {
    console.log(`🎧 Mencari dan download: ${query}`);
    const cmd = `yt-dlp -x --audio-format mp3 "ytsearch1:${query}" -o "${outputFolder}/%(title)s.%(ext)s"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Error download ${query}:`, err.message);
        return reject(err);
      }
      console.log('✅ Selesai:', query);
      resolve();
    });
  });
}

downloadSong(query);
