const fileInput = document.getElementById('fileInput');
const actionButtons = document.getElementById('actionButtons');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const faceCanvas = document.getElementById('faceCanvas');
const loadingState = document.getElementById('loadingState');
const results = document.getElementById('results');
const resultText = document.getElementById('resultText');
const profilesContainer = document.getElementById('profilesContainer');
const resetBtn = document.getElementById('resetBtn');
const attendanceTableBody = document.getElementById('attendanceTableBody');

// Webcam Elements
const startCamBtn = document.getElementById('startCamBtn');
const stopCamBtn = document.getElementById('stopCamBtn');
const captureBtn = document.getElementById('captureBtn');
const webcamContainer = document.getElementById('webcamContainer');
const webcamVideo = document.getElementById('webcamVideo');
let mediaStream = null;

const API_URL = 'http://localhost:8000/api/recognize';
const ATTENDANCE_URL = 'http://localhost:8000/api/attendance';

// Fetch attendance on load
document.addEventListener('DOMContentLoaded', fetchAttendance);

async function fetchAttendance() {
    try {
        const response = await fetch(ATTENDANCE_URL);
        if (!response.ok) return;
        const data = await response.json();
        
        attendanceTableBody.innerHTML = '';
        if (data.logs.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No records yet.</td></tr>';
            return;
        }
        
        data.logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-semibold">${log.Name}</td>
                <td>${log.Date}</td>
                <td><span class="badge bg-secondary">${log.Time}</span></td>
            `;
            attendanceTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error fetching attendance:", error);
    }
}

// File Upload Handlers
fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
    }
});

// Webcam Handlers
startCamBtn.addEventListener('click', async () => {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = mediaStream;
        actionButtons.classList.add('d-none');
        webcamContainer.classList.remove('d-none');
    } catch (err) {
        alert('Error accessing webcam: ' + err.message);
    }
});

stopCamBtn.addEventListener('click', stopWebcam);

captureBtn.addEventListener('click', () => {
    // Draw current video frame to a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = webcamVideo.videoWidth;
    tempCanvas.height = webcamVideo.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, tempCanvas.width, tempCanvas.height);
    
    // Convert to file
    tempCanvas.toBlob((blob) => {
        const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });
        stopWebcam();
        handleFile(file);
    }, 'image/jpeg');
});

resetBtn.addEventListener('click', resetUI);

function stopWebcam() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    webcamVideo.srcObject = null;
    webcamContainer.classList.add('d-none');
    actionButtons.classList.remove('d-none');
}

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    // Display image preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        
        // Wait for image to load to get dimensions for canvas
        imagePreview.onload = () => {
            setupCanvas();
            uploadAndDetect(file);
        };
    };
    reader.readAsDataURL(file);

    // Update UI state
    actionButtons.classList.add('d-none');
    webcamContainer.classList.add('d-none');
    previewContainer.classList.remove('d-none');
    loadingState.classList.remove('d-none');
    results.classList.add('d-none');
    resetBtn.classList.add('d-none');
    profilesContainer.innerHTML = '';
}

function setupCanvas() {
    faceCanvas.width = imagePreview.width;
    faceCanvas.height = imagePreview.height;
}

async function uploadAndDetect(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const data = await response.json();
        drawFaces(data.faces);
        renderProfiles(data.faces);
        
        // Refresh DTR Log
        fetchAttendance();
        
        loadingState.classList.add('d-none');
        results.classList.remove('d-none');
        resetBtn.classList.remove('d-none');

        if (data.faces.length > 0) {
            results.className = 'alert alert-success d-none shadow-sm rounded-3 text-start';
            results.classList.remove('d-none');
            resultText.innerText = `Success! ${data.message}`;
        } else {
            results.className = 'alert alert-warning d-none shadow-sm rounded-3 text-center';
            results.classList.remove('d-none');
            resultText.innerText = 'No faces detected in this image.';
        }

    } catch (error) {
        console.error('Error:', error);
        loadingState.classList.add('d-none');
        results.className = 'alert alert-danger d-none shadow-sm rounded-3 text-center';
        results.classList.remove('d-none');
        resultText.innerText = 'An error occurred while processing the image.';
        resetBtn.classList.remove('d-none');
    }
}

function drawFaces(faces) {
    const ctx = faceCanvas.getContext('2d');
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);

    const scaleX = imagePreview.width / imagePreview.naturalWidth;
    const scaleY = imagePreview.height / imagePreview.naturalHeight;

    faces.forEach((face, index) => {
        const x = face.x * scaleX;
        const y = face.y * scaleY;
        const width = face.w * scaleX;
        const height = face.h * scaleY;
        
        const isKnown = face.name && face.name !== 'Unknown';
        const color = isKnown ? '#198754' : '#0d6efd'; // green for known, blue for unknown
        const bgColor = isKnown ? 'rgba(25, 135, 84, 0.2)' : 'rgba(13, 110, 253, 0.2)';

        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.fillStyle = bgColor;

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fill();
        ctx.stroke();
        
        // Draw number/name label for profiling reference
        const labelText = isKnown ? face.name : `#${index + 1}`;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 25, ctx.measureText(labelText).width + 20, 25);
        ctx.fillStyle = 'white';
        ctx.font = '16px Inter';
        ctx.fillText(labelText, x + 5, y - 7);
    });
}

function renderProfiles(faces) {
    faces.forEach((face, index) => {
        const card = document.createElement('div');
        card.className = 'card border-0 shadow-sm rounded-3';
        card.style.minWidth = '200px';
        
        let emotionEmoji = '😐';
        if (face.dominant_emotion === 'happy') emotionEmoji = '😄';
        else if (face.dominant_emotion === 'sad') emotionEmoji = '😢';
        else if (face.dominant_emotion === 'angry') emotionEmoji = '😠';
        else if (face.dominant_emotion === 'surprise') emotionEmoji = '😲';
        else if (face.dominant_emotion === 'fear') emotionEmoji = '😨';
        else if (face.dominant_emotion === 'disgust') emotionEmoji = '🤢';
        
        const isKnown = face.name && face.name !== 'Unknown';
        const headerClass = isKnown ? 'bg-success' : 'bg-primary';
        const nameLabel = isKnown ? face.name : `Unknown Face #${index + 1}`;

        card.innerHTML = `
            <div class="card-header ${headerClass} text-white fw-bold text-center text-truncate">
                ${nameLabel}
            </div>
            <div class="card-body bg-white text-dark small text-start">
                <p class="mb-1"><strong>Age:</strong> ~${face.age}</p>
                <p class="mb-1"><strong>Gender:</strong> <span class="text-capitalize">${face.dominant_gender}</span></p>
                <p class="mb-1"><strong>Emotion:</strong> <span class="text-capitalize">${face.dominant_emotion}</span> ${emotionEmoji}</p>
                <p class="mb-0"><strong>Race:</strong> <span class="text-capitalize">${face.dominant_race}</span></p>
            </div>
        `;
        profilesContainer.appendChild(card);
    });
}

function resetUI() {
    stopWebcam();
    actionButtons.classList.remove('d-none');
    previewContainer.classList.add('d-none');
    results.classList.add('d-none');
    resetBtn.classList.add('d-none');
    fileInput.value = '';
    
    // Clear canvas
    const ctx = faceCanvas.getContext('2d');
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
}

// Window resize handler to reposition boxes if image scales
window.addEventListener('resize', () => {
    if (!previewContainer.classList.contains('d-none')) {
        setupCanvas();
    }
});
