const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const videoFolder = 'output/';
const finalVideoPath = 'output/final_video.mp4';

// Ambil semua file video
const videoFiles = fs.readdirSync(videoFolder).filter(f => f.endsWith('.mp4'));

// Buat file list untuk ffmpeg
const listPath = path.join(videoFolder, 'video_list.txt');
fs.writeFileSync(listPath, videoFiles.map(f => `file '${path.join(videoFolder, f)}'`).join('\n'));

// Gabungkan semua video
const cmd = `ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${finalVideoPath}"`;
console.log('🔗 Menggabungkan video...');
execSync(cmd, { stdio: 'inherit' });

console.log(`✅ Video final disimpan di: ${finalVideoPath}`);
