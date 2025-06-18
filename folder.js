const fs = require('fs');
const path = require('path');

// Nama folder utama
const mainFolder = 'BAHAN_ONEPIECE';

// Path ke file JSON
const jsonPath = path.join(__dirname, 'bahan_onepiece_items.json');

// Fungsi helper untuk membersihkan nama folder
function sanitizeName(name) {
  return name.replace(/[^0-9a-zA-Z _-]/g, '').trim().replace(/\s+/g, '_');
}

// Load data dari JSON
let items;
try {
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  items = JSON.parse(rawData);
} catch (err) {
  console.error('❌ Gagal membaca atau parse JSON:', err.message);
  process.exit(1);
}

// Buat folder utama
if (!fs.existsSync(mainFolder)) {
  fs.mkdirSync(mainFolder);
}

// Loop kategori dan buat folder per item
for (const category in items) {
  const categoryPath = path.join(mainFolder, sanitizeName(category));

  if (!fs.existsSync(categoryPath)) {
    fs.mkdirSync(categoryPath);
  }

  const itemList = items[category] || [];
  for (const itemName of itemList) {
    const itemFolder = path.join(categoryPath, sanitizeName(itemName));

    if (!fs.existsSync(itemFolder)) {
      fs.mkdirSync(itemFolder);
    }

    const infoFile = path.join(itemFolder, 'info.txt');
    fs.writeFileSync(infoFile, '');
  }
}

console.log('✅ Struktur folder One Piece berhasil dibuat!');
