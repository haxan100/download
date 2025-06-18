const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ambil MP3 dan gambar dari folder
const audioFolder = 'input/judul1/';
const imageFolder = 'input/judul1/images/';
const outputFolder = 'output/';

const mp3Files = fs.readdirSync(audioFolder).filter(f => f.endsWith('.mp3'));
const imageFiles = fs.readdirSync(imageFolder).filter(f => f.endsWith('.jpg'));

mp3Files.forEach((audioFile, index) => {
  const imageFile = imageFiles[index];
  if (imageFile) {
    const audioPath = path.join(audioFolder, audioFile);
    const imagePath = path.join(imageFolder, imageFile);
    const outputVideoPath = path.join(outputFolder, `scene_${String(index + 1).padStart(3, '0')}.mp4`);

    const cmd = `ffmpeg -loop 1 -framerate 2 -t 30 -i "${imagePath}" -i "${audioPath}" -c:v libx264 -c:a aac -strict experimental -shortest "${outputVideoPath}"`;
    console.log(`🎥 Membuat video untuk: ${audioFile}`);
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ Video disimpan di: ${outputVideoPath}`);
  }
});
