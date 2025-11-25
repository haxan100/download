// Socket.IO connection
const socket = io();

// DOM Elements
const downloadForm = document.getElementById('downloadForm');
const downloadBtn = document.getElementById('downloadBtn');
const youtubeUrl = document.getElementById('youtubeUrl');
const loadingState = document.getElementById('loadingState');
const successState = document.getElementById('successState');
const successMessage = document.getElementById('successMessage');
const toast = document.getElementById('toast');

// Socket.IO event listeners
socket.on('connect', () => {
    console.log('✅ Connected to server');
});

socket.on('download-start', (data) => {
    console.log('🎧 Download started:', data.url);
});

socket.on('download-complete', (data) => {
    console.log('✅ Download complete:', data.filename);
    showSuccess(`File berhasil didownload: ${data.filename}`);
});

socket.on('download-error', (data) => {
    console.error('❌ Download error:', data.message);
    showError(data.message);
    resetForm();
});

// Form submission
downloadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = youtubeUrl.value.trim();

    if (!url || !url.startsWith('http')) {
        showToast('Masukkan URL YouTube yang valid', 'error');
        return;
    }

    // Show loading state
    downloadForm.classList.add('hidden');
    loadingState.classList.remove('hidden');
    downloadBtn.disabled = true;

    try {
        const response = await fetch('/api/download-link', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Gagal mendownload');
        }

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
        resetForm();
    }
});

// Show success state
function showSuccess(message) {
    loadingState.classList.add('hidden');
    successState.classList.remove('hidden');
    successMessage.textContent = message;
    showToast('Download berhasil! File tersimpan di folder music/', 'success');
}

// Show error state
function showError(message) {
    showToast(message, 'error');
}

// Show toast notification
function showToast(message, type = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 5000);
}

// Reset form
function resetForm() {
    downloadForm.classList.remove('hidden');
    loadingState.classList.add('hidden');
    successState.classList.add('hidden');
    downloadBtn.disabled = false;
    youtubeUrl.value = '';
}

// Auto-focus on input
if (youtubeUrl) {
    youtubeUrl.focus();
}
