const fs = require('fs');
const path = require('path');
const axios = require('axios');
const puppeteer = require('puppeteer');
const { execSync } = require('child_process');

// 1. Path Folder Input & Output
const inputFolder = path.resolve(__dirname, '../input/judul1');  // Path folder input
const outputFolder = path.resolve(__dirname, 'output');
const imagesFolder = path.resolve(__dirname, 'images_temp');
const finalVideoPath = path.join(outputFolder, 'final_video.mp4');

// Buat folder output jika belum ada
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);
if (!fs.existsSync(imagesFolder)) fs.mkdirSync(imagesFolder);

// 2. Baca naskah.txt dan pisah jadi segmen
const naskahPath = path.join(inputFolder, 'naskah.txt');
const naskah = fs.readFileSync(naskahPath, 'utf-8');
const segmen = naskah.split('\n'); // Pisahkan per paragraf

// 3. Cari gambar berdasarkan teks segmen dari Lexica
async function scrapeLexica(keyword, total, index) {
  const folderName = `/`; // Folder untuk menyimpan gambar berdasarkan indeks
  const folderPath = path.join(imagesFolder, folderName);
  await fs.promises.mkdir(folderPath, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const url = `https://lexica.art/?q=${encodeURIComponent(keyword)}`;

  try {
    console.log(`🔍 Mencari gambar untuk: ${keyword}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    // Tunggu gambar muncul
    await page.waitForSelector('img');

    // Ambil semua URL gambar
    const imageUrls = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => img.src).filter(src => src.includes('https://image.lexica.art/'));
    });

    const sliced = imageUrls.slice(0, total); // Ambil jumlah gambar sesuai total

    // Unduh gambar yang ditemukan
    for (let i = 0; i < sliced.length; i++) {
      const imgUrl = sliced[i];
      const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
      const filename = path.join(folderPath, `image_${i + 1}${ext}`);

      try {
        const res = await axios.get(imgUrl, { responseType: 'stream' });
        const writer = fs.createWriteStream(filename);
        res.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        console.log(`✅ Gambar ${i + 1} disimpan di: ${filename}`);
      } catch (err) {
        console.error(`❌ Gagal download gambar ${i + 1}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`❌ Error saat mencari gambar: ${err.message}`);
  } finally {
    await browser.close();
  }
}
// 4. Resize gambar ke 1280x720 tanpa merubah gambar asli
async function resizeImage(imagePath) {
  const resizedPath = imagePath.replace('.jpg', '_resized.jpg'); // Hasilkan nama file baru untuk gambar resized
  const cmd = `ffmpeg -i "${imagePath}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" "${resizedPath}"`;  
  // Mengatur ukuran video 1280x720 dengan mempertahankan rasio aspek asli dan padding untuk menyesuaikan
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ Gambar diresize: ${resizedPath}`);
    return resizedPath;
  } catch (err) {
    console.error(`❌ Gagal meresize gambar: ${err.message}`);
    return null;
  }
}

// 5. Buat video per segmen dari gambar dan MP3
async function buildScene(imagePath, mp3Path, index) {
  if (!imagePath) {
    console.error(`❌ Tidak ada gambar untuk segmen ${index}`);
    return null;
  }

  // Resize gambar terlebih dahulu jika perlu
  const resizedImagePath = await resizeImage(imagePath);

  if (!resizedImagePath) return null;

  const videoOutput = path.join(outputFolder, `scene_${index.toString().padStart(3, '0')}.mp4`);
  const cmd = `ffmpeg -loop 1 -framerate 2 -t 30 -i "${resizedImagePath}" -i "${mp3Path}" -c:v libx264 -c:a aac -strict experimental -shortest "${videoOutput}"`;
  console.log(`🎥 Membuat video untuk: ${mp3Path}`);
  execSync(cmd, { stdio: 'inherit' });
  return videoOutput;
}

// 6. Gabungkan semua video menjadi satu
async function combineVideo(videoFiles) {
  const listPath = path.join(outputFolder, 'merge_list.txt');
  const listContent = videoFiles.map(file => `file '${file}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  console.log('🔗 Menggabungkan semua video...');
  execSync(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy "${finalVideoPath}"`, { stdio: 'inherit' });
  console.log(`✅ Video final disimpan di: ${finalVideoPath}`);
}

async function main() {
  const mp3Files = fs.readdirSync(inputFolder).filter(file => file.endsWith('.mp3'));
  let videoFiles = [];

  // 7. Proses tiap segmen untuk membuat gambar dan video
  for (let i = 0; i < segmen.length; i++) {
    const segmenText = segmen[i].trim();
    const mp3File = mp3Files[i];
    const mp3Path = path.join(inputFolder, mp3File);

    if (!segmenText || !mp3File) continue;

    // Ambil kata pertama dari segmen untuk query pencarian gambar
    const searchQuery = segmenText.split(' ')[0];

    // Cari gambar dari Lexica
    await scrapeLexica(searchQuery, 1, i + 1);  // Ambil 1 gambar

    // Gabungkan gambar + MP3 menjadi video
    const imagePath = path.join(imagesFolder, `/`, 'image_1.jpg');
    const videoPath = await buildScene(imagePath, mp3Path, i + 1);
    if (videoPath) videoFiles.push(videoPath);
  }

  // 8. Gabungkan semua video
  if (videoFiles.length > 0) {
    await combineVideo(videoFiles);
  } else {
    console.error('❌ Tidak ada video untuk digabungkan.');
  }
}

main().catch((err) => console.error('❌ Error utama:', err.message));
