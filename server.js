const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = 3000;
const outputFolder = path.join(__dirname, 'music');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ensure music folder exists
if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder);
}

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('✅ Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
    });
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

    try {
        // Emit start event
        io.emit('download-start', { url });

        // Download MP3 and thumbnail with matching filenames
        const cmd = `yt-dlp -x --audio-format mp3 --write-thumbnail --convert-thumbnails jpg "${url}" -o "${outputFolder}/%(title)s.%(ext)s"`;

        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                console.error('❌ Download error:', err.message);
                io.emit('download-error', {
                    message: 'Gagal mendownload. Pastikan URL valid dan yt-dlp terinstall.'
                });
                return res.status(500).json({
                    success: false,
                    message: 'Gagal mendownload'
                });
            }

            // Extract filename from stdout - look for the final destination after conversion
            // yt-dlp output format: [ExtractAudio] Destination: /path/to/file.mp3
            // or: [download] Destination: /path/to/file.webm (before conversion)
            let filename = 'file.mp3';
            let thumbnailName = null;

            // Try to find the final MP3 file
            const extractMatch = stdout.match(/\[ExtractAudio\] Destination: (.+\.mp3)/);
            if (extractMatch) {
                filename = path.basename(extractMatch[1]);
            } else {
                // Fallback: try to find download destination and assume .mp3 extension
                const downloadMatch = stdout.match(/\[download\] Destination: (.+)\.(webm|m4a|opus)/);
                if (downloadMatch) {
                    const baseName = path.basename(downloadMatch[1]);
                    filename = baseName + '.mp3';
                }
            }

            // Extract thumbnail filename
            const thumbMatch = stdout.match(/\[ThumbnailsConvertor\] Destination: (.+\.jpg)/);
            if (thumbMatch) {
                thumbnailName = path.basename(thumbMatch[1]);
            }

            console.log('✅ Download complete:', filename);
            if (thumbnailName) {
                console.log('✅ Thumbnail saved:', thumbnailName);
            }

            io.emit('download-complete', { filename, thumbnail: thumbnailName });

            res.json({
                success: true,
                message: 'Download berhasil!',
                filename,
                thumbnail: thumbnailName
            });
        });

    } catch (error) {
        console.error('❌ Server error:', error);
        io.emit('download-error', { message: 'Terjadi kesalahan server' });
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server'
        });
    }
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Music folder: ${outputFolder}`);
});
