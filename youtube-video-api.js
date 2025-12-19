const express = require('express');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();
const outputFolder = path.join(__dirname, 'downloads');
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');

// Single download tracking
let isDownloading = false;

// Function to sanitize filename
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*#]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 100);
}

// Function to check if yt-dlp is installed
function checkYtDlp() {
    return new Promise((resolve) => {
        exec('yt-dlp --version', (err) => {
            resolve(!err);
        });
    });
}

// API: Download YouTube Video (Single Download)
router.post('/download-youtube-video', async (req, res) => {
    const { url, quality } = req.body;

    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        return res.status(400).json({
            success: false,
            message: 'URL YouTube tidak valid'
        });
    }

    // Check if already downloading
    if (isDownloading) {
        return res.status(409).json({
            success: false,
            message: 'Sedang ada download yang berjalan. Tunggu sampai selesai.'
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
        isDownloading = true;
        
        if (global.io) {
            global.io.emit('youtube-video-start', { url });
        }

        // Get video info first
        const infoCmd = `yt-dlp --print "%(title)s|||%(uploader)s|||%(duration)s" "${url}"`;
        const { stdout: infoOutput } = await execAsync(infoCmd);
        const [title, uploader, duration] = infoOutput.trim().split('|||');
        
        const sanitizedTitle = sanitizeFilename(title || 'YouTube_Video');
        const videoFolder = path.join(outputFolder, 'YouTube_Videos', sanitizedTitle);
        
        // Create folder for this video
        if (!fs.existsSync(videoFolder)) {
            fs.mkdirSync(videoFolder, { recursive: true });
        }

        // Determine quality format
        let formatOption = '';
        if (quality === 'best') {
            formatOption = '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
        } else {
            formatOption = `-f "bestvideo[height<=${quality}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${quality}][ext=mp4]/best"`;  
        }

        // Build download command
        let downloadCmd;
        const outputTemplate = path.join(videoFolder, `${sanitizedTitle}.%(ext)s`);
        
        if (fs.existsSync(ffmpegPath)) {
            downloadCmd = `yt-dlp ${formatOption} --merge-output-format mp4 --ffmpeg-location "${ffmpegPath}" --no-warnings "${url}" -o "${outputTemplate}"`;
        } else {
            downloadCmd = `yt-dlp ${formatOption} --merge-output-format mp4 --no-warnings "${url}" -o "${outputTemplate}"`;
        }

        console.log('🎥 Starting YouTube Video download:', title);
        
        // Send immediate response to start loading
        res.json({
            success: true,
            message: 'Download dimulai!',
            title: title,
            folder: `YouTube_Videos/${sanitizedTitle}`,
            quality: quality === 'best' ? 'Terbaik (Auto)' : quality + 'p'
        });
        
        // Simulate progress while downloading
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) progress = 95;
            
            if (global.io) {
                global.io.emit('youtube-video-progress', {
                    title,
                    progress: Math.round(progress)
                });
            }
        }, 1000);
        
        // Execute download
        const { stdout } = await execAsync(downloadCmd);
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        // Send 100% progress
        if (global.io) {
            global.io.emit('youtube-video-progress', {
                title,
                progress: 100
            });
        }
        
        // Create info file
        const infoFile = path.join(videoFolder, 'info.txt');
        const infoContent = `Judul: ${title || 'Tidak ada judul'}\r\nChannel: ${uploader || 'Tidak diketahui'}\r\nDurasi: ${duration || 'Tidak diketahui'} detik\r\nKualitas: ${quality === 'best' ? 'Terbaik (Auto)' : quality + 'p'}\r\nURL: ${url}\r\n\r\nDownloaded: ${new Date().toLocaleString('id-ID')}`;
        
        try {
            fs.writeFileSync(infoFile, infoContent, 'utf8');
            console.log('✅ Info file created');
        } catch (err) {
            console.error('❌ Error creating info file:', err.message);
        }
        
        console.log('✅ YouTube video download complete:', sanitizedTitle);
        
        isDownloading = false;
        
        if (global.io) {
            global.io.emit('youtube-video-complete', {
                title,
                folder: `YouTube_Videos/${sanitizedTitle}`,
                videoPath: `/video/${sanitizedTitle}`
            });
        }

    } catch (error) {
        console.error('❌ YouTube video download error:', error.message);
        isDownloading = false;
        
        if (global.io) {
            global.io.emit('youtube-video-error', {
                message: 'Download gagal: ' + error.message
            });
        }
    }
});

// API: Serve video files
router.get('/video/:videoName', (req, res) => {
    const { videoName } = req.params;
    const videoFolder = path.join(outputFolder, 'YouTube_Videos', videoName);
    
    if (!fs.existsSync(videoFolder)) {
        return res.status(404).json({ error: 'Video not found' });
    }
    
    // Find MP4 file in folder
    const files = fs.readdirSync(videoFolder);
    const videoFile = files.find(file => file.endsWith('.mp4'));
    
    if (!videoFile) {
        return res.status(404).json({ error: 'Video file not found' });
    }
    
    const videoPath = path.join(videoFolder, videoFile);
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

// API: Get download status
router.get('/download-status', (req, res) => {
    res.json({
        success: true,
        isDownloading: isDownloading
    });
});

module.exports = router;