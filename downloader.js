const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const outputFolder = path.join(__dirname, 'music');
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

async function downloadAsMp3(query) {
  return new Promise((resolve, reject) => {
    const cmd = `yt-dlp -x --audio-format mp3 "ytsearch1:${query}" -o "${outputFolder}/%(title)s.%(ext)s"`;
    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ Error downloading ${query}: ${err.message}`);
        return reject(err);
      }
      resolve();
    });
  });
}

module.exports = { downloadAsMp3 };
