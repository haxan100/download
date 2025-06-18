const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const itemsData = require('./bahan_onepiece_items.json');

async function downloadImage(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function scrapeDeviantArt(keyword, limit = 5) {
  // Ganti folder tujuan ke BAHAN_ONEPIECE
  const safeKeyword = keyword.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '');
  const folder = path.join('BAHAN_ONEPIECE', safeKeyword);
  fs.ensureDirSync(folder);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  const searchUrl = `https://www.deviantart.com/search?q=${encodeURIComponent(keyword)}`;

  try {
    console.log(`🔍 Mencari gambar DeviantArt: ${keyword}`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 0 });

    // Scroll beberapa kali untuk load gambar
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const imageUrls = await page.evaluate(() => {
      // Ambil gambar utama dari hasil pencarian DeviantArt
      const anchors = Array.from(document.querySelectorAll('a[href*="/art/"]'));
      const urls = anchors.map(a => {
        // Cari <img> di dalam <a> yang mengarah ke karya
        const img = a.querySelector('img');
        if (img && img.src) {
          // Filter: ambil gambar dengan lebar minimal 400px (agar bukan thumbnail kecil)
          if (img.naturalWidth >= 400 || (img.width && img.width >= 400)) {
            return img.src;
          }
        }
        return null;
      }).filter(Boolean);
      return urls;
    });

    const uniqueUrls = [...new Set(imageUrls)].slice(0, limit);

    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
      const savePath = path.join(folder, `img_${i + 1}${ext}`);
      await downloadImage(url, savePath);
      console.log(`✅ img_${i + 1} disimpan.`);
    }

  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

async function scrapeAllItems() {
  // Gabungkan semua item dari semua kategori menjadi satu array
  const allItems = Object.values(itemsData).flat();
  for (const item of allItems) {
    try {
      await scrapeDeviantArt(item, 35);
    } catch (err) {
      console.error(`❌ Gagal untuk item: ${item} - ${err.message}`);
    }
  }
}

// Jalankan: node deviantart_scraper.js "Monkey D. Luffy" 5
// atau: node deviantart_scraper.js all
const [,, keyword, jumlah] = process.argv;
if (!keyword) {
  console.log('❗ Format: node deviantart_scraper.js "keyword" [jumlah] | node deviantart_scraper.js all');
  process.exit(1);
}

if (keyword.toLowerCase() === 'all') {
  scrapeAllItems();
} else {
  scrapeDeviantArt(keyword, parseInt(jumlah) || 15);
}
