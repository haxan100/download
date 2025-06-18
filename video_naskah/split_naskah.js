const fs = require('fs');
const path = require('path');

const naskahPath = 'input/judul1/naskah.txt';
const outputDir = 'input/judul1/segmen/';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const naskah = fs.readFileSync(naskahPath, 'utf-8');
const segmen = naskah.split('\n'); // Pisah per paragraf (atau bisa split per kalimat)

segmen.forEach((paragraf, index) => {
  const segmenPath = path.join(outputDir, `${String(index + 1).padStart(3, '0')}.txt`);
  fs.writeFileSync(segmenPath, paragraf.trim(), 'utf-8');
});

console.log(`✅ ${segmen.length} segmen berhasil dibuat!`);
