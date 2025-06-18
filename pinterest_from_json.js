const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

const jsonPath = 'bahan_onepiece_items.json';
const baseFolder = 'BAHAN_ONEPIECE';
const imagesPerItem = 10;
const delayPerItem = 1000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// Tambah array untuk log
let downloadLog = [];

async function scrapeToFolder(keyword, saveFolder, limit = 5, category = "") {
  const searchURL = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(keyword)}`;
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`🔍 Mencari: ${keyword}`);
    await page.goto(searchURL, { waitUntil: 'networkidle2', timeout: 0 });
    console.log(`📥 Mengambil gambar untuk: ${keyword}`);
    for (let i = 0; i < 30; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await delay(4000);
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
      let status = 'success';
      try {
        await downloadImage(url, outputPath);
        console.log(`✅ ${keyword} → img_${i + 1}`);
      } catch (err) {
        status = 'failed';
        console.error(`❌ Gagal download gambar ke-${i + 1} untuk ${keyword}: ${err.message}`);
      }
      downloadLog.push({
        category,
        item: keyword,
        filename: `img_${i + 1}${ext}`,
        url,
        status
      });
    }
  } catch (err) {
    console.error(`❌ Gagal untuk "${keyword}": ${err.message}`);
  } finally {
    await browser.close();
  }
}

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

        // ✅ Cek apakah folder sudah berisi gambar
        // if (fs.existsSync(folder) && fs.readdirSync(folder).some(f => f.startsWith('img_'))) {
        //   console.log(`⏩ Lewati (sudah ada): ${item}`);
        //   continue;
        // }
        
        await scrapeToFolder(item, folder, imagesPerItem, category);
        await delay(delayPerItem);
    }
  }

  // Simpan log ke file JSON
  fs.writeFileSync('log_download.json', JSON.stringify(downloadLog, null, 2));

  // Simpan log ke file TXT dengan nama log_hari_ini.txt (format: tanggal-YYYY-MM-DD)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const logTxtName = `log_${yyyy}-${mm}-${dd}.txt`;
  const logTxtContent = downloadLog.map(l => `${l.category}\t${l.item}\t${l.filename}\t${l.url}\t${l.status}`).join('\n');
  fs.writeFileSync(logTxtName, logTxtContent);

  console.log('🎉 Selesai download semua dari JSON. Log tersimpan di log_download.json dan', logTxtName);
})();
