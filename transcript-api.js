const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

const router = express.Router();
const outputFolder = path.join(__dirname, 'downloads');

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

// API: Get existing transcript (demo)
router.get('/demo-transcript', (req, res) => {
    try {
        const demoFolder = path.join(outputFolder, 'YouTube_Transcripts', 'Ideal_kah_Install_Steam_OS_Di_Laptop');
        const txtFile = path.join(demoFolder, 'Ideal_kah_Install_Steam_OS_Di_Laptop_transcript.txt');
        
        if (fs.existsSync(txtFile)) {
            const transcript = fs.readFileSync(txtFile, 'utf8');
            res.json({
                success: true,
                title: 'Ideal kah Install Steam OS Di Laptop?',
                filename: 'Ideal_kah_Install_Steam_OS_Di_Laptop_transcript.txt',
                language: 'en',
                folder: 'YouTube_Transcripts/Ideal_kah_Install_Steam_OS_Di_Laptop',
                transcript: transcript.substring(0, 500) + (transcript.length > 500 ? '...' : ''),
                fullTranscript: transcript
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Demo transcript tidak ditemukan'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error loading demo transcript'
        });
    }
});

// API: Download YouTube Transcript
router.post('/download-transcript', async (req, res) => {
    const { url, lang } = req.body;

    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
        return res.status(400).json({
            success: false,
            message: 'URL YouTube tidak valid'
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
        // Get video info first
        const infoCmd = `yt-dlp --print "%(title)s|||%(uploader)s|||%(duration)s" "${url}"`;
        const { stdout: infoOutput } = await execAsync(infoCmd);
        const [title, uploader, duration] = infoOutput.trim().split('|||');
        
        const sanitizedTitle = sanitizeFilename(title || 'YouTube_Transcript');
        const transcriptFolder = path.join(outputFolder, 'YouTube_Transcripts', sanitizedTitle);
        
        // Create folder for transcript
        if (!fs.existsSync(transcriptFolder)) {
            fs.mkdirSync(transcriptFolder, { recursive: true });
        }

        console.log('📝 Downloading transcript:', title);
        
        // Try multiple subtitle methods with rate limiting workarounds
        const methods = [
            // Method 1: With player client workaround
            `yt-dlp --write-auto-subs --skip-download --sub-format "vtt" --extractor-args "youtube:player_client=default" --sleep-requests 3 "${url}" -o "${transcriptFolder}/${sanitizedTitle}.%(ext)s"`,
            // Method 2: Simple auto-subs only
            `yt-dlp --write-auto-subs --skip-download --sub-format "vtt" --sleep-requests 5 "${url}" -o "${transcriptFolder}/${sanitizedTitle}.%(ext)s"`,
            // Method 3: Manual subs only
            `yt-dlp --write-subs --skip-download --sub-format "vtt" --sleep-requests 3 "${url}" -o "${transcriptFolder}/${sanitizedTitle}.%(ext)s"`
        ];
        
        let downloadSuccess = false;
        let lastError = null;
        
        for (const method of methods) {
            try {
                console.log('Trying subtitle method...');
                await execAsync(method);
                
                // Check if files were actually created
                const checkFiles = fs.readdirSync(transcriptFolder);
                const vttFiles = checkFiles.filter(file => file.endsWith('.vtt'));
                
                if (vttFiles.length > 0) {
                    console.log('Subtitle download success');
                    downloadSuccess = true;
                    break;
                }
            } catch (error) {
                lastError = error;
                console.log('Method failed:', error.message);
                
                // Still check if files exist (sometimes yt-dlp throws error but files are created)
                try {
                    const checkFiles = fs.readdirSync(transcriptFolder);
                    const vttFiles = checkFiles.filter(file => file.endsWith('.vtt'));
                    if (vttFiles.length > 0) {
                        console.log('Files found despite error');
                        downloadSuccess = true;
                        break;
                    }
                } catch (checkError) {
                    // Folder doesn't exist yet, continue
                }
            }
        }
        
        // If no files were created, throw error
        if (!downloadSuccess) {
            throw lastError || new Error('Gagal mendownload subtitle');
        }

        // Find downloaded subtitle files
        let files, subtitleFiles;
        try {
            files = fs.readdirSync(transcriptFolder);
            subtitleFiles = files.filter(file => file.endsWith('.vtt'));
        } catch (err) {
            subtitleFiles = [];
        }
        
        if (subtitleFiles.length === 0) {
            throw new Error('Video ini tidak memiliki subtitle/transcript yang tersedia');
        }

        // Read and convert VTT to plain text
        const subtitleFile = subtitleFiles[0];
        const subtitlePath = path.join(transcriptFolder, subtitleFile);
        const vttContent = fs.readFileSync(subtitlePath, 'utf8');
        
        // Convert VTT to plain text
        const plainText = convertVttToText(vttContent);
        
        // Save as TXT file
        const txtFilename = `${sanitizedTitle}_transcript.txt`;
        const txtPath = path.join(transcriptFolder, txtFilename);
        fs.writeFileSync(txtPath, plainText, 'utf8');
        
        // Create info file
        const infoFile = path.join(transcriptFolder, 'info.txt');
        const detectedLang = subtitleFile.match(/\.([a-z]{2})\.vtt$/) ? subtitleFile.match(/\.([a-z]{2})\.vtt$/)[1] : 'unknown';
        const infoContent = `Judul: ${title || 'Tidak ada judul'}\r\nChannel: ${uploader || 'Tidak diketahui'}\r\nDurasi: ${duration || 'Tidak diketahui'} detik\r\nBahasa: ${detectedLang}\r\nURL: ${url}\r\n\r\nFiles:\r\n- ${txtFilename} (Plain text)\r\n- ${subtitleFile} (VTT format)\r\n\r\nDownloaded: ${new Date().toLocaleString('id-ID')}`;
        
        fs.writeFileSync(infoFile, infoContent, 'utf8');
        
        console.log('✅ Transcript download complete:', sanitizedTitle);
        
        res.json({
            success: true,
            message: 'Transcript berhasil didownload!',
            title: title,
            filename: txtFilename,
            language: detectedLang,
            folder: `YouTube_Transcripts/${sanitizedTitle}`,
            transcript: plainText.substring(0, 500) + (plainText.length > 500 ? '...' : '') // Preview
        });

    } catch (error) {
        console.error('❌ Transcript download error:', error.message);
        
        let errorMessage = 'Gagal mendownload transcript';
        
        if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
            errorMessage = 'YouTube sedang membatasi akses. Tunggu 5-10 menit lalu coba lagi. Atau coba video lain dulu.';
        } else if (error.message.includes('No subtitles') || error.message.includes('Unable to download video subtitles')) {
            errorMessage = 'Video ini tidak memiliki subtitle/transcript. YouTube biasanya hanya menyediakan auto-subtitle untuk video berbahasa Inggris. Coba video bahasa Inggris.';
        } else if (error.message.includes('Private video')) {
            errorMessage = 'Video ini private atau tidak bisa diakses';
        } else if (error.message.includes('Video unavailable')) {
            errorMessage = 'Video tidak tersedia atau telah dihapus';
        }
        
        res.status(500).json({
            success: false,
            message: errorMessage
        });
    }
});

// Function to convert VTT subtitle to plain text
function convertVttToText(vttContent) {
    const lines = vttContent.split('\n');
    let plainText = '';
    let isTextLine = false;
    
    for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip VTT headers and empty lines
        if (trimmedLine === '' || trimmedLine.startsWith('WEBVTT') || trimmedLine.startsWith('NOTE')) {
            continue;
        }
        
        // Skip timestamp lines (format: 00:00:00.000 --> 00:00:00.000)
        if (trimmedLine.includes('-->')) {
            isTextLine = true;
            continue;
        }
        
        // Skip cue identifiers (usually numbers)
        if (/^\d+$/.test(trimmedLine)) {
            continue;
        }
        
        // This is subtitle text
        if (isTextLine && trimmedLine !== '') {
            // Remove VTT formatting tags
            const cleanText = trimmedLine
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&');
            
            if (cleanText.trim() !== '') {
                plainText += cleanText + ' ';
            }
        }
        
        // Reset for next subtitle block
        if (trimmedLine === '') {
            isTextLine = false;
        }
    }
    
    // Clean up the text
    return plainText
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\s*\.\s*/g, '. ') // Fix punctuation spacing
        .replace(/\s*,\s*/g, ', ')
        .replace(/\s*\?\s*/g, '? ')
        .replace(/\s*!\s*/g, '! ')
        .trim();
}

module.exports = router;