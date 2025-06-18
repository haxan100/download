const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

async function fetchImages(keyword, jumlah) {
  const encoded = encodeURIComponent(keyword);
  const url = `https://lexica.art/api/v1/search?q=${encoded}`;

  try {
    const response = await axios.get(url);
    const images = response.data.images;

    if (!images || images.length === 0) {
      console.log('❌ Tidak ditemukan gambar.');
      return;
    }

    const total = Math.min(jumlah, images.length);
    const folderName = keyword.toLowerCase().replace(/ /g, '_');
    await fs.ensureDir(folderName);

    for (let i = 0; i < total; i++) {
      const imgUrl = images[i].srcSmall || images[i].src;
      const ext = path.extname(new URL(imgUrl).pathname).split('?')[0] || '.jpg';
      const filename = `${folderName}_${i + 1}${ext}`;
      const imgRes = await axios.get(imgUrl, { responseType: 'stream' });

      imgRes.data.pipe(fs.createWriteStream(path.join(folderName, filename)));
      console.log(`✅ Gambar ${i + 1} disimpan.`);
    }

    console.log(`🎉 Selesai. Total ${total} gambar disimpan di folder "${folderName}"`);
  } catch (err) {
    console.error('❌ Error saat ambil gambar:', err.message);
  }
}

// CONTOH PEMAKAIAN:
// node download-images.js "monkey d luffy" 20

const args = process.argv.slice(2);
const keyword = args[0] || 'anime pirate boy';
const jumlah = parseInt(args[1]) || 10;

fetchImages(keyword, jumlah);
