const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Folder output
const outputFolder = path.join(__dirname, 'music');
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// Ambil URL dari input terminal
const url = process.argv[2];
if (!url || !url.startsWith('http')) {
  console.error('❌ Masukkan link YouTube yang valid. Contoh: node download_by_link.js https://www.youtube.com/watch?v=abc123');
  process.exit(1);
}

async function downloadFromLink(link) {
  return new Promise((resolve, reject) => {
    console.log(`🎧 Download dari link: ${link}`);
    const cmd = `yt-dlp -x --audio-format mp3 "${link}" -o "${outputFolder}/%(title)s.%(ext)s"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Gagal download:`, err.message);
        return reject(err);
      }
      console.log('✅ Selesai download MP3');
      resolve();
    });
  });
}

downloadFromLink(url);
