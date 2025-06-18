const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

async function scrapeLexica(keyword, total) {
const folderName = 'lexica_' + Date.now(); // atau buat manual: 'luffy_vivi_ship'
await fs.ensureDir(folderName);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const url = `https://lexica.art/?q=${encodeURIComponent(keyword)}`;

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Tunggu gambar muncul
  await page.waitForSelector('img');

  // Ambil semua URL gambar
  const imageUrls = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.map(img => img.src).filter(src => src.includes('https://image.lexica.art/'));
  });

  const sliced = imageUrls.slice(0, total);

  for (let i = 0; i < sliced.length; i++) {
    const imgUrl = sliced[i];
    const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
    const filename = `${folderName}_${i + 1}${ext}`;

    try {
      const res = await axios.get(imgUrl, { responseType: 'stream' });
      const filePath = path.join(folderName, filename);
      res.data.pipe(fs.createWriteStream(filePath));
      console.log(`✅ Gambar ${i + 1} disimpan.`);
    } catch (err) {
      console.error(`❌ Gagal download gambar ${i + 1}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`🎉 Selesai. ${sliced.length} gambar disimpan di folder "${folderName}"`);
}

// Jalankan dari CLI
const args = process.argv.slice(2);
const keyword = args[0] || 'anime pirate boy red vest';
const jumlah = parseInt(args[1]) || 10;

scrapeLexica(keyword, jumlah);
