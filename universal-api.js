const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();
const outputFolder = path.join(__dirname, 'downloads');
const ffmpegPath = path.join(__dirname, 'ffmpeg', 'bin', 'ffmpeg.exe');

// Single download tracking
let isDownloading = false;
let currentDownloadProcess = null;

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

// API: Universal Download (YouTube or TikTok)
router.post('/universal-download', async (req, res) => {
    const { url, platform, showSource, randomEdit } = req.body;

    if (!url) {
        return res.status(400).json({
            success: false,
            message: 'URL tidak valid'
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
        
        // Get video info first
        const infoCmd = `yt-dlp --print "%(title)s|||%(uploader)s|||%(duration)s" "${url}"`;
        const { stdout: infoOutput } = await execAsync(infoCmd);
        const [title, uploader, duration] = infoOutput.trim().split('|||');
        
        const sanitizedTitle = sanitizeFilename(title || 'Universal_Video');
        
        // Determine folder (single Universal_Downloads folder)
        const videoFolder = path.join(outputFolder, 'Universal_Downloads', sanitizedTitle);
        const folderPrefix = 'Universal_Downloads';
        
        // Create folder for this video
        if (!fs.existsSync(videoFolder)) {
            fs.mkdirSync(videoFolder, { recursive: true });
        }

        // Build download command based on platform
        let downloadCmd;
        const outputTemplate = path.join(videoFolder, `${sanitizedTitle}.%(ext)s`);
        
        if (platform === 'youtube') {
            // YouTube download (MP4 format)
            const formatOption = '-f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
            if (fs.existsSync(ffmpegPath)) {
                downloadCmd = `yt-dlp ${formatOption} --merge-output-format mp4 --ffmpeg-location "${ffmpegPath}" --no-warnings "${url}" -o "${outputTemplate}"`;
            } else {
                downloadCmd = `yt-dlp ${formatOption} --merge-output-format mp4 --no-warnings "${url}" -o "${outputTemplate}"`;
            }
        } else if (platform === 'tiktok') {
            // TikTok download (no watermark)
            downloadCmd = `yt-dlp --no-warnings "${url}" -o "${outputTemplate}"`;
        }

        console.log(`🌍 Starting ${platform.toUpperCase()} download:`, title);
        
        // Send immediate response to start loading
        res.json({
            success: true,
            message: 'Download dimulai!',
            title: title,
            platform: platform.toUpperCase(),
            folder: `${folderPrefix}/${sanitizedTitle}`
        });
        
        // Simulate progress while downloading
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 95) progress = 95;
            
            if (global.io) {
                global.io.emit('universal-progress', {
                    title,
                    progress: Math.round(progress),
                    platform: platform.toUpperCase()
                });
            }
        }, 1000);
        
        // Execute download with process tracking
        currentDownloadProcess = exec(downloadCmd, { maxBuffer: 1024 * 1024 * 10 });
        
        await new Promise((resolve, reject) => {
            currentDownloadProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Download failed with code ${code}`));
            });
            currentDownloadProcess.on('error', reject);
        });
        
        // Add watermark if showSource is enabled
        if (showSource && uploader) {
            await addSourceWatermark(videoFolder, sanitizedTitle, uploader);
        }
        
        // Apply random edit if enabled
        if (randomEdit) {
            await applyRandomEdit(videoFolder, sanitizedTitle);
        }
        
        // Clear progress interval
        clearInterval(progressInterval);
        
        // Send 100% progress
        if (global.io) {
            global.io.emit('universal-progress', {
                title,
                progress: 100,
                platform: platform.toUpperCase()
            });
        }
        
        // Create info file
        const infoFile = path.join(videoFolder, 'info.txt');
        const infoContent = `Judul: ${title || 'Tidak ada judul'}\r\nChannel/Creator: ${uploader || 'Tidak diketahui'}\r\nDurasi: ${duration || 'Tidak diketahui'} detik\r\nPlatform: ${platform.toUpperCase()}\r\nURL: ${url}\r\n\r\nDownloaded: ${new Date().toLocaleString('id-ID')}`;
        
        try {
            fs.writeFileSync(infoFile, infoContent, 'utf8');
            console.log('✅ Info file created');
        } catch (err) {
            console.error('❌ Error creating info file:', err.message);
        }
        
        console.log(`✅ ${platform.toUpperCase()} download complete:`, sanitizedTitle);
        
        isDownloading = false;
        
        // Find video file for player
        let videoPath = null;
        try {
            const files = fs.readdirSync(videoFolder);
            const videoFile = files.find(file => file.endsWith('.mp4'));
            if (videoFile) {
                videoPath = `/api/universal-video/${encodeURIComponent(sanitizedTitle)}`;
            }
        } catch (err) {
            console.log('Could not find video file for player');
        }
        
        if (global.io) {
            global.io.emit('universal-complete', {
                title,
                platform: platform.toUpperCase(),
                folder: `${folderPrefix}/${sanitizedTitle}`,
                videoPath: videoPath
            });
        }

    } catch (error) {
        console.error(`❌ ${platform.toUpperCase()} download error:`, error.message);
        isDownloading = false;
        currentDownloadProcess = null;
        
        if (global.io) {
            global.io.emit('universal-error', {
                message: `Gagal download ${platform}: ` + error.message
            });
        }
    }
});

// API: Cancel Download
router.post('/cancel-download', (req, res) => {
    if (currentDownloadProcess) {
        currentDownloadProcess.kill('SIGTERM');
        currentDownloadProcess = null;
        isDownloading = false;
        
        if (global.io) {
            global.io.emit('download-cancelled', {
                message: 'Download dibatalkan'
            });
        }
        
        res.json({ success: true, message: 'Download dibatalkan' });
    } else {
        res.json({ success: false, message: 'Tidak ada download yang berjalan' });
    }
});

// API: Serve universal video files
router.get('/universal-video/:videoName', (req, res) => {
    const { videoName } = req.params;
    const decodedVideoName = decodeURIComponent(videoName);
    
    const videoFolder = path.join(outputFolder, 'Universal_Downloads', decodedVideoName);
    
    try {
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
    } catch (error) {
        res.status(404).json({ error: 'Video not found' });
    }
});

module.exports = router;

// Function to add source watermark
async function addSourceWatermark(videoFolder, videoName, channelName) {
    try {
        const files = fs.readdirSync(videoFolder);
        const videoFile = files.find(file => file.endsWith('.mp4'));
        
        if (!videoFile) return;
        
        const inputPath = path.join(videoFolder, videoFile);
        const outputPath = path.join(videoFolder, `${videoName}_watermarked.mp4`);
        
        // Clean channel name (remove @ symbol if exists)
        const cleanChannelName = channelName.replace('@', '');
        const watermarkText = `Sumber: ${cleanChannelName}`;
        
        // Escape watermark text for FFmpeg
        const escapedWatermarkText = watermarkText
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/'/g, "'\\\\\\\\\\'");
        
        // FFmpeg command to add watermark (bottom-left, more centered and higher)
        let watermarkCmd;
        if (fs.existsSync(ffmpegPath)) {
            watermarkCmd = `"${ffmpegPath}" -i "${inputPath}" -vf "drawtext=text='${escapedWatermarkText}':fontcolor=white@0.9:fontsize=26:x=w*0.15:y=h-th-120:shadowcolor=black@0.7:shadowx=2:shadowy=2" -c:a copy "${outputPath}"`;
        } else {
            watermarkCmd = `ffmpeg -i "${inputPath}" -vf "drawtext=text='${escapedWatermarkText}':fontcolor=white@0.9:fontsize=26:x=w*0.15:y=h-th-120:shadowcolor=black@0.7:shadowx=2:shadowy=2" -c:a copy "${outputPath}"`;
        }
        
        await execAsync(watermarkCmd);
        
        // Replace original file with watermarked version
        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath, inputPath);
        
        console.log('✅ Watermark added:', watermarkText);
    } catch (error) {
        console.error('❌ Watermark error:', error.message);
    }
}

// Function to apply random edit (cut every 5 seconds and randomize)
async function applyRandomEdit(videoFolder, videoName) {
    try {
        const files = fs.readdirSync(videoFolder);
        const videoFile = files.find(file => file.endsWith('.mp4'));
        
        if (!videoFile) return;
        
        const inputPath = path.join(videoFolder, videoFile);
        const tempFolder = path.join(videoFolder, 'temp_segments');
        const outputPath = path.join(videoFolder, `${videoName}_random.mp4`);
        
        // Create temp folder
        if (!fs.existsSync(tempFolder)) {
            fs.mkdirSync(tempFolder, { recursive: true });
        }
        
        // Get video duration
        let durationCmd;
        if (fs.existsSync(ffmpegPath)) {
            durationCmd = `"${path.join(__dirname, 'ffmpeg', 'bin', 'ffprobe.exe')}" -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`;
        } else {
            durationCmd = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`;
        }
        
        const { stdout: durationOutput } = await execAsync(durationCmd);
        const totalDuration = parseFloat(durationOutput.trim());
        const segmentDuration = 5; // 5 seconds per segment
        const totalSegments = Math.floor(totalDuration / segmentDuration);
        
        if (totalSegments < 2) {
            console.log('Video too short for random edit');
            return;
        }
        
        // Cut video into 5-second segments with re-encoding
        const segmentPromises = [];
        for (let i = 0; i < totalSegments; i++) {
            const startTime = i * segmentDuration;
            const segmentPath = path.join(tempFolder, `segment_${i.toString().padStart(3, '0')}.mp4`);
            
            let segmentCmd;
            if (fs.existsSync(ffmpegPath)) {
                segmentCmd = `"${ffmpegPath}" -i "${inputPath}" -ss ${startTime} -t ${segmentDuration} -c:v libx264 -c:a aac -avoid_negative_ts make_zero "${segmentPath}"`;
            } else {
                segmentCmd = `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${segmentDuration} -c:v libx264 -c:a aac -avoid_negative_ts make_zero "${segmentPath}"`;
            }
            
            segmentPromises.push(execAsync(segmentCmd));
        }
        
        await Promise.all(segmentPromises);
        
        // Create randomized order
        const segmentOrder = Array.from({length: totalSegments}, (_, i) => i);
        for (let i = segmentOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [segmentOrder[i], segmentOrder[j]] = [segmentOrder[j], segmentOrder[i]];
        }
        
        // Create concat file with randomized order (use relative paths)
        const concatFile = path.join(tempFolder, 'concat_list.txt');
        const concatContent = segmentOrder.map(i => 
            `file 'segment_${i.toString().padStart(3, '0')}.mp4'`
        ).join('\n');
        
        fs.writeFileSync(concatFile, concatContent, 'utf8');
        
        // Concatenate randomized segments
        let concatCmd;
        if (fs.existsSync(ffmpegPath)) {
            concatCmd = `"${ffmpegPath}" -f concat -safe 0 -i "${concatFile}" -c:v libx264 -c:a aac "${outputPath}"`;
        } else {
            concatCmd = `ffmpeg -f concat -safe 0 -i "${concatFile}" -c:v libx264 -c:a aac "${outputPath}"`;
        }
        
        // Change working directory for concat
        const { stdout } = await execAsync(concatCmd, { cwd: tempFolder });
        
        // Replace original file with randomized version
        fs.unlinkSync(inputPath);
        fs.renameSync(outputPath, inputPath);
        
        // Clean up temp folder
        fs.rmSync(tempFolder, { recursive: true, force: true });
        
        console.log('✅ Random edit applied:', `${totalSegments} segments randomized`);
    } catch (error) {
        console.error('❌ Random edit error:', error.message);
    }
}