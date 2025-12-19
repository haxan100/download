const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { promisify } = require('util');
const execAsync = promisify(exec);

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3001;
const outputFolder = path.join(__dirname, 'downloads');
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure downloads folder exists
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
}

// Function to sanitize filename
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*#]/g, '_')  // Remove illegal chars including #
        .replace(/\s+/g, '_')              // Replace spaces with underscore
        .replace(/_+/g, '_')               // Replace multiple underscores with single
        .replace(/^_|_$/g, '')             // Remove leading/trailing underscores
        .substring(0, 100);                // Limit length to 100 chars
}

// Function to check if yt-dlp is installed
function checkYtDlp() {
    return new Promise((resolve) => {
        exec('yt-dlp --version', (err) => {
            resolve(!err);
        });
    });
}

// Function to check if ffmpeg is installed
function checkFfmpeg() {
    return new Promise((resolve) => {
        // Check portable ffmpeg first
        if (fs.existsSync(ffmpegPath)) {
            resolve(true);
            return;
        }
        // Check system ffmpeg
        exec('ffmpeg -version', (err) => {
            resolve(!err);
        });
    });
}

// Make io globally available for other modules
global.io = io;

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
});

// Import YouTube video routes
const youtubeVideoRoutes = require('./youtube-video-api');
app.use('/api', youtubeVideoRoutes);

// API: Download TikTok Video (No Watermark)
app.post('/api/download-tiktok', async (req, res) => {
    const { url } = req.body;

    if (!url || (!url.includes('tiktok.com') && !url.includes('vm.tiktok.com'))) {
        return res.status(400).json({
            success: false,
            message: 'URL TikTok tidak valid'
        });
    }

    // Check if yt-dlp is installed
    const ytDlpInstalled = await checkYtDlp();
    
    if (!ytDlpInstalled) {
        return res.status(500).json({
            success: false,
            message: 'yt-dlp tidak terinstall. Install dengan: pip install yt-dlp'
        });
    }

    try {
        io.emit('tiktok-download-start', { url });

        // Get video info first
        const infoCmd = `yt-dlp --print "%(title)s|||%(uploader)s|||%(duration)s" "${url}"`;
        const { stdout: infoOutput } = await execAsync(infoCmd);
        const [title, uploader, duration] = infoOutput.trim().split('|||');
        
        const sanitizedTitle = sanitizeFilename(title || 'TikTok_Video');
        const videoFolder = path.join(outputFolder, 'TikTok_Videos', sanitizedTitle);
        
        // Create folder for this video
        if (!fs.existsSync(videoFolder)) {
            fs.mkdirSync(videoFolder, { recursive: true });
        }

        // Download TikTok video without watermark
        const downloadCmd = `yt-dlp --no-warnings "${url}" -o "${videoFolder}/${sanitizedTitle}.%(ext)s"`;
        
        console.log('📱 Downloading TikTok:', title);
        const { stdout } = await execAsync(downloadCmd);
        
        // Create info file
        const infoFile = path.join(videoFolder, 'info.txt');
        const infoContent = `Judul: ${title || 'Tidak ada judul'}\r\nCreator: ${uploader || 'Tidak diketahui'}\r\nDurasi: ${duration || 'Tidak diketahui'} detik\r\nURL: ${url}\r\n\r\nDownloaded: ${new Date().toLocaleString('id-ID')}`;
        
        try {
            fs.writeFileSync(infoFile, infoContent, 'utf8');
            console.log('✅ Info file created:', 'info.txt');
        } catch (err) {
            console.error('❌ Error creating info file:', err.message);
        }
        
        console.log('✅ TikTok download complete:', sanitizedTitle);
        
        io.emit('tiktok-download-complete', { 
            folder: `TikTok_Videos/${sanitizedTitle}`,
            title: title
        });

        res.json({
            success: true,
            message: 'Download TikTok berhasil!',
            folder: `TikTok_Videos/${sanitizedTitle}`,
            title: title
        });

    } catch (error) {
        console.error('❌ TikTok download error:', error.message);
        io.emit('tiktok-download-error', { 
            message: error.message.includes('yt-dlp') ? 
                'yt-dlp tidak terinstall. Install dengan: pip install yt-dlp' : 
                'Gagal mendownload video TikTok'
        });
        res.status(500).json({
            success: false,
            message: 'Gagal mendownload video TikTok'
        });
    }
});

// API: Download by Link (YouTube to MP3)
app.post('/api/download-link', async (req, res) => {
    const { url } = req.body;

    if (!url || !url.startsWith('http')) {
        return res.status(400).json({
            success: false,
            message: 'URL YouTube tidak valid'
        });
    }

    // Check if yt-dlp and ffmpeg are installed
    const ytDlpInstalled = await checkYtDlp();
    const ffmpegInstalled = await checkFfmpeg();
    
    if (!ytDlpInstalled) {
        return res.status(500).json({
            success: false,
            message: 'yt-dlp tidak terinstall. Install dengan: pip install yt-dlp'
        });
    }
    
    if (!ffmpegInstalled) {
        return res.status(500).json({
            success: false,
            message: 'ffmpeg tidak terinstall. Download dari: https://ffmpeg.org/download.html'
        });
    }

    try {
        io.emit('download-start', { url });

        // Get video info first
        const infoCmd = `yt-dlp --print "%(title)s|||%(description)s|||%(uploader)s|||%(duration)s" "${url}"`;
        const { stdout: infoOutput } = await execAsync(infoCmd);
        const [title, description, uploader, duration] = infoOutput.trim().split('|||');
        
        const sanitizedTitle = sanitizeFilename(title);
        const videoFolder = path.join(outputFolder, sanitizedTitle);
        
        // Create folder for this video
        if (!fs.existsSync(videoFolder)) {
            fs.mkdirSync(videoFolder, { recursive: true });
        }

        // Download MP3 and thumbnail with better error handling
        let downloadCmd;
        if (fs.existsSync(ffmpegPath)) {
            downloadCmd = `yt-dlp -x --audio-format mp3 --write-thumbnail --convert-thumbnails jpg --ffmpeg-location "${ffmpegPath}" --no-warnings "${url}" -o "${videoFolder}/${sanitizedTitle}.%(ext)s"`;
        } else {
            downloadCmd = `yt-dlp -x --audio-format mp3 --write-thumbnail --convert-thumbnails jpg --no-warnings "${url}" -o "${videoFolder}/${sanitizedTitle}.%(ext)s"`;
        }
        
        console.log('📥 Downloading:', title);
        const { stdout } = await execAsync(downloadCmd);
        
        // Create description file
        const descFile = path.join(videoFolder, 'description.txt');
        const descContent = `Judul: ${title || 'Tidak ada judul'}
Channel: ${uploader || 'Tidak diketahui'}
Durasi: ${duration || 'Tidak diketahui'} detik
URL: ${url}

Deskripsi:
${description || 'Tidak ada deskripsi'}`;
        
        try {
            fs.writeFileSync(descFile, descContent, 'utf8');
            console.log('✅ Description file created:', 'description.txt');
        } catch (err) {
            console.error('❌ Error creating description file:', err.message);
        }
        
        console.log('✅ Download complete:', sanitizedTitle);
        
        io.emit('download-complete', { 
            folder: sanitizedTitle,
            title: title
        });

        res.json({
            success: true,
            message: 'Download berhasil!',
            folder: sanitizedTitle,
            title: title
        });

    } catch (error) {
        console.error('❌ Download error:', error.message);
        io.emit('download-error', { 
            message: error.message.includes('yt-dlp') ? 
                'yt-dlp tidak terinstall. Install dengan: pip install yt-dlp' : 
                'Gagal mendownload video'
        });
        res.status(500).json({
            success: false,
            message: 'Gagal mendownload'
        });
    }
});

// API: Scan Videos in Folder
app.post('/api/scan-videos', async (req, res) => {
    const { folderPath } = req.body;

    if (!folderPath || !fs.existsSync(folderPath)) {
        return res.status(400).json({
            success: false,
            message: 'Folder tidak ditemukan'
        });
    }

    try {
        const files = fs.readdirSync(folderPath);
        const videoFiles = files
            .filter(file => /\.(mp4|avi|mov|mkv|wmv|flv|webm)$/i.test(file))
            .map(file => ({
                name: file,
                path: path.join(folderPath, file)
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        if (videoFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tidak ada file video ditemukan di folder'
            });
        }

        res.json({
            success: true,
            videos: videoFiles,
            count: videoFiles.length
        });

    } catch (error) {
        console.error('❌ Scan folder error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal membaca folder'
        });
    }
});

// Import video merger routes
const videoMergerRoutes = require('./video-merger-api');
app.use('/api', videoMergerRoutes);

// Start server
server.listen(PORT, async () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Downloads folder: ${outputFolder}`);
    
    const ytDlpInstalled = await checkYtDlp();
    const ffmpegInstalled = await checkFfmpeg();
    
    if (!ytDlpInstalled) {
        console.log('⚠️  yt-dlp tidak terinstall. Install dengan: pip install yt-dlp');
    } else {
        console.log('✅ yt-dlp terdeteksi');
    }
    
    if (!ffmpegInstalled) {
        console.log('⚠️  ffmpeg tidak terinstall. Download dari: https://ffmpeg.org/download.html');
    } else {
        console.log('✅ ffmpeg terdeteksi');
    }
});
