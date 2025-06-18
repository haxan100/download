// const puppeteer = require('puppeteer');
// const fs = require('fs-extra');
// const axios = require('axios');
// const path = require('path');

// // Fungsi untuk unduh gambar
// async function downloadImage(url, outputPath) {
//   const writer = fs.createWriteStream(outputPath);
//   const response = await axios({
//     url,
//     method: 'GET',
//     responseType: 'stream',
//     headers: {
//       'Referer': 'https://www.pinterest.com'
//     }
//   });
//   response.data.pipe(writer);
//   return new Promise((resolve, reject) => {
//     writer.on('finish', resolve);
//     writer.on('error', reject);
//   });
// }

// async function scrapePinterest(keyword, limit = 10) {
//   const searchURL = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`;
//   const outputFolder = `downloads/${keyword.replace(/\s+/g, '_')}`;
//   fs.ensureDirSync(outputFolder);

//   const browser = await puppeteer.launch({ headless: true });
//   const page = await browser.newPage();

//   try {
//     console.log(`🔍 Mencari gambar: ${keyword}`);
//     await page.goto(searchURL, { waitUntil: 'networkidle2', timeout: 0 });

//     // Scroll untuk load gambar
//     let previousHeight;
//     for (let i = 0; i < 5; i++) {
//       previousHeight = await page.evaluate('document.body.scrollHeight');
//       await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
//       await new Promise(resolve => setTimeout(resolve, 2000));
//     }

//     // Ambil gambar
//     const imageUrls = await page.evaluate(() => {
//       const imgs = Array.from(document.querySelectorAll('img[srcset]'));
//       return imgs.map(img => img.src).filter(src => src.startsWith('https'));
//     });

//     const uniqueUrls = [...new Set(imageUrls)].slice(0, limit);
//     console.log(`📥 Mengunduh ${uniqueUrls.length} gambar...`);

//     // Download
//     for (let i = 0; i < uniqueUrls.length; i++) {
//       const url = uniqueUrls[i];
//       const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
//       const outputPath = path.join(outputFolder, `img_${i + 1}${ext}`);
//       await downloadImage(url, outputPath);
//       console.log(`✅ [${i + 1}] ${outputPath}`);
//     }

//   } catch (err) {
//     console.error('❌ Error:', err.message);
//   } finally {
//     await browser.close();
//     console.log('📁 Selesai.');
//   }
// }

// // Jalankan via terminal: node pinterest_scraper.js "Monkey D Luffy" 10
// const [,, keyword, jumlah] = process.argv;
// if (!keyword) {
//   console.log('❗ Usage: node pinterest_scraper.js "keyword" [jumlah]');
//   process.exit(1);
// }
// scrapePinterest(keyword, parseInt(jumlah) || 10);

const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

// ======= PENGATURAN =======
const jsonPath = 'bahan_onepiece_items.json';
const baseFolder = 'BAHAN_ONEPIECE';
const imagesPerItem = 5;
const delayPerItem = 1000; // ms
// ==========================

// Fungsi delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi unduh gambar
async function downloadImage(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'Referer': 'https://www.pinterest.com'
    }
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

// Scrape & simpan gambar
async function scrapeToFolder(keyword, saveFolder, limit = 5) {
  const searchURL = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`🔍 Mencari: ${keyword}`);
    await page.goto(searchURL, { waitUntil: 'networkidle2', timeout: 0 });

    // Scroll agar gambar lebih banyak muncul
    for (let i = 0; i < 5; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await delay(2000);
    }

    const imageUrls = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img[srcset]'));
      return imgs.map(img => img.src).filter(src => src.startsWith('https'));
    });

    const uniqueUrls = [...new Set(imageUrls)].slice(0, limit);
    fs.ensureDirSync(saveFolder);

    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
      const outputPath = path.join(saveFolder, `img_${i + 1}${ext}`);
      await downloadImage(url, outputPath);
      console.log(`✅ ${keyword} → img_${i + 1}`);
    }
  } catch (err) {
    console.error(`❌ Gagal untuk "${keyword}": ${err.message}`);
  } finally {
    await browser.close();
  }
}

// Main
(async () => {
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File JSON tidak ditemukan.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  for (const category in data) {
    const itemList = data[category];
    for (const item of itemList) {
      const folder = path.join(baseFolder, category.replace(/\s+/g, '_'), item.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_'));
      await scrapeToFolder(item, folder, imagesPerItem);
      await delay(delayPerItem);
    }
  }

  console.log('🎉 Selesai download semua dari JSON.');
})();
