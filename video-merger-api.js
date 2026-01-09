const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();
const upload = multer({ dest: 'temp_uploads/' });

const outputFolder = path.join(__dirname, 'downloads');
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');

// Function to sanitize filename
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*#]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 100);
}

// Function to check if ffmpeg is installed
function checkFfmpeg() {
    return new Promise((resolve) => {
        if (fs.existsSync(ffmpegPath)) {
            resolve(true);
            return;
        }
        exec('ffmpeg -version', (err) => {
            resolve(!err);
        });
    });
}

// API: Merge Videos with Text Overlay
// API: Merge Videos with List Overlay Style (TikTok/Reels Style)
router.post('/merge-videos-upload', upload.any(), async (req, res) => {
    const { outputName, showSource } = req.body;
    const titles = JSON.parse(req.body.titles || '[]');
    const sources = JSON.parse(req.body.sources || '[]');
    const videoFiles = req.files;

    if (!videoFiles || videoFiles.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Tidak ada file video yang diupload'
        });
    }

    // Check if ffmpeg is installed
    const ffmpegInstalled = await checkFfmpeg();
    
    if (!ffmpegInstalled) {
        return res.status(500).json({
            success: false,
            message: 'ffmpeg tidak terinstall.'
        });
    }

    try {
        const outputFile = `${sanitizeFilename(outputName)}.mp4`;
        const outputPath = path.join(outputFolder, 'Merged_Videos', outputFile);
        
        // Create output folder
        const mergedFolder = path.join(outputFolder, 'Merged_Videos');
        if (!fs.existsSync(mergedFolder)) {
            fs.mkdirSync(mergedFolder, { recursive: true });
        }

        // Create temp folder
        const tempFolder = path.join(__dirname, 'temp_uploads');
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder, { recursive: true });
        }

        // Get video dimensions first
        const firstVideoPath = videoFiles[0].path;
        const probeCmd = fs.existsSync(ffmpegPath) 
            ? `"${path.join(__dirname, 'ffmpeg', 'bin', 'ffprobe.exe')}" -v quiet -print_format json -show_format -show_streams "${firstVideoPath}"`
            : `ffprobe -v quiet -print_format json -show_format -show_streams "${firstVideoPath}"`;
        
        const { stdout: probeOutput } = await execAsync(probeCmd);
        const videoInfo = JSON.parse(probeOutput);
        const videoStream = videoInfo.streams.find(s => s.codec_type === 'video');
        const videoWidth = videoStream.width;
        const videoHeight = videoStream.height;

        // --- KONFIGURASI TAMPILAN LIST ---
        // Ukuran font responsif (sekitar 4% dari lebar video)
        const fontSize = Math.floor(videoWidth * 0.04); 
        // Jarak antar baris (1.5x ukuran font)
        const lineHeight = Math.floor(fontSize * 1.5);
        // Margin kiri
        const startX = Math.floor(videoWidth * 0.05); 
        
        // Hitung posisi Y awal agar list berada di tengah vertikal (Center Vertical)
        const totalListHeight = videoFiles.length * lineHeight;
        const startY = Math.floor((videoHeight - totalListHeight) / 2);

        // Escape function khusus untuk FFmpeg drawtext
        const escapeText = (text) => {
            return text
                .replace(/\\/g, '\\\\')
                .replace(/:/g, '\\:')
                .replace(/'/g, "'\\\\\\''") // Escape single quotes
                .replace(/[\r\n]/g, ' ');   // Remove newlines
        };

        let filterComplex = '';
        let inputs = '';
        
        // Add inputs
        videoFiles.forEach((video) => {
            inputs += `-i "${video.path}" `;
        });

        // Loop untuk setiap video input
        videoFiles.forEach((video, index) => {
            // Mulai chain filter untuk video ke-index
            let filterChain = `[${index}:v]`;
            
            // 1. GAMBAR ANGKA LIST (1., 2., 3., dst) PADA SETIAP VIDEO
            // Kita loop semua angka agar muncul statis di setiap klip
            for (let listIdx = 0; listIdx < videoFiles.length; listIdx++) {
                const currentY = startY + (listIdx * lineHeight);
                const numText = `${listIdx + 1}.`;
                
                // Tambahkan filter drawtext untuk angka
                // Menggunakan border/shadow agar teks putih terbaca di background apapun
                filterChain += `drawtext=text='${numText}':fontcolor=white:fontsize=${fontSize}:x=${startX}:y=${currentY}:shadowcolor=black:shadowx=2:shadowy=2:box=0,`;
            }

            // 2. GAMBAR JUDUL (HANYA UNTUK VIDEO YANG SEDANG AKTIF)
            // Judul muncul di sebelah angka yang sesuai dengan index video saat ini
            const titleY = startY + (index * lineHeight);
            const titleText = escapeText(titles[index] || `Video ${index + 1}`);
            
            // Posisi X judul agak digeser ke kanan dari angka (startX + ukuran perkiraan angka)
            const textOffsetX = startX + (fontSize * 1.5); 

            // Tambahkan judul aktif
            filterChain += `drawtext=text='${titleText}':fontcolor=white:fontsize=${fontSize}:x=${textOffsetX}:y=${titleY}:shadowcolor=black:shadowx=2:shadowy=2:box=1:boxcolor=black@0.5:boxborderw=5`;
            
            // 3. TAMBAHKAN NAMA SUMBER/CHANNEL (JIKA DICENTANG)
            if (showSource === 'true' && sources[index]) {
                const sourceText = escapeText(sources[index]);
                const sourceFontSize = Math.floor(fontSize * 0.6); // Lebih kecil dari judul
                const sourceX = videoWidth - (sourceText.length * sourceFontSize * 0.6) - 20; // Pojok kanan
                const sourceY = 30; // Pojok atas
                
                filterChain += `,drawtext=text='${sourceText}':fontcolor=white@0.7:fontsize=${sourceFontSize}:x=${sourceX}:y=${sourceY}:shadowcolor=black@0.5:shadowx=1:shadowy=1`;
            }
            
            // Akhiri chain untuk video ini dan beri label output sementara (v0, v1, dst)
            filterChain += `[v${index}]; `;
            
            filterComplex += filterChain;
        });

        // Concatenate all videos using the processed streams [v0], [v1]...
        const concatInputs = videoFiles.map((_, index) => `[v${index}][${index}:a]`).join('');
        filterComplex += `${concatInputs}concat=n=${videoFiles.length}:v=1:a=1[outv][outa]`;

        // Build ffmpeg command
        let ffmpegCmd;
        if (fs.existsSync(ffmpegPath)) {
            ffmpegCmd = `"${ffmpegPath}" ${inputs} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac -y "${outputPath}"`;
        } else {
            ffmpegCmd = `ffmpeg ${inputs} -filter_complex "${filterComplex}" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac -y "${outputPath}"`;
        }

        console.log('🎬 Merging videos list style:', outputFile);
        
        const { stdout } = await execAsync(ffmpegCmd);
        
        // Clean up temp files
        videoFiles.forEach(file => {
            try { fs.unlinkSync(file.path); } catch (err) {}
        });
        
        console.log('✅ Video merge complete');
        
        // Create info file (Optional, same as before)
        const infoFile = path.join(mergedFolder, `${sanitizeFilename(outputName)}_info.txt`);
        const infoContent = `Video List Style\r\nTotal: ${videoFiles.length} Klip`;
        try { fs.writeFileSync(infoFile, infoContent, 'utf8'); } catch (err) {}

        res.json({
            success: true,
            message: 'Video berhasil digabung dengan gaya list!',
            outputFile: outputFile,
            path: outputPath,
            resolution: `${videoWidth}x${videoHeight}`
        });

    } catch (error) {
        console.error('❌ Video merge error:', error.message);
        if (req.files) {
            req.files.forEach(file => { try { fs.unlinkSync(file.path); } catch (err) {} });
        }
        res.status(500).json({
            success: false,
            message: 'Gagal: ' + error.message
        });
    }
});

module.exports = router;