const fileInput = document.getElementById('fileInput');
const actionButtons = document.getElementById('actionButtons');
const previewContainer = document.getElementById('previewContainer');
const imagePreview = document.getElementById('imagePreview');
const faceCanvas = document.getElementById('faceCanvas');
const loadingState = document.getElementById('loadingState');
const loadingText = document.getElementById('loadingText');
const results = document.getElementById('results');
const resultText = document.getElementById('resultText');
const profilesContainer = document.getElementById('profilesContainer');
const resetBtn = document.getElementById('resetBtn');
const attendanceTableBody = document.getElementById('attendanceTableBody');
const registerForm = document.getElementById('registerForm');
const employeeNameInput = document.getElementById('employeeName');
const dtrTableSection = document.getElementById('dtrTableSection');
const idleState = document.getElementById('idleState');

// Navigation and Titles
const navAttendance = document.getElementById('navAttendance');
const navRegister = document.getElementById('navRegister');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');

// Webcam Elements
// Webcam Elements
const startCamBtn = document.getElementById('startCamBtn');
const webcamContainer = document.getElementById('webcamContainer');
const webcamVideo = document.getElementById('webcamVideo');
let mediaStream = null;
let autoScanLoopActive = false;
let autoScanTimeout = null;
let countdownValue = 3;

const API_URL_RECOGNIZE = 'http://localhost:8888/api/recognize';
const API_URL_REGISTER = 'http://localhost:8888/api/register';
const ATTENDANCE_URL = 'http://localhost:8888/api/attendance';

let currentMode = 'attendance';

// Navigation Logic
function switchMode(mode) {
    currentMode = mode;
    
    // Update nav styling
    if (mode === 'attendance') {
        navAttendance.classList.add('active');
        navRegister.classList.remove('active');
        
        pageTitle.innerText = 'Attendance Dashboard';
        pageSubtitle.innerText = 'Real-time face recognition and attendance logging.';
        
        registerForm.classList.add('d-none');
        dtrTableSection.classList.remove('d-none');
    } else {
        navRegister.classList.add('active');
        navAttendance.classList.remove('active');
        
        pageTitle.innerText = 'Register Profile';
        pageSubtitle.innerText = 'Enroll new employees into the facial recognition database.';
        
        registerForm.classList.remove('d-none');
        dtrTableSection.classList.add('d-none');
    }
    
    // Close offcanvas if open (mobile view)
    const sidebarOffcanvas = document.getElementById('sidebarOffcanvas');
    if (sidebarOffcanvas && sidebarOffcanvas.classList.contains('show')) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(sidebarOffcanvas);
        if (bsOffcanvas) bsOffcanvas.hide();
    }
    
    resetUI();
}

navAttendance.addEventListener('click', (e) => { e.preventDefault(); switchMode('attendance'); });
navRegister.addEventListener('click', (e) => { e.preventDefault(); switchMode('register'); });

// Fetch attendance on load
document.addEventListener('DOMContentLoaded', fetchAttendance);

async function fetchAttendance() {
    try {
        const response = await fetch(ATTENDANCE_URL);
        if (!response.ok) return;
        const data = await response.json();
        
        attendanceTableBody.innerHTML = '';
        if (data.logs.length === 0) {
            attendanceTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-slate-500 py-5">No records found today.</td></tr>';
            return;
        }
        
        data.logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-semibold text-white">${log.Name}</td>
                <td class="text-slate-400">${log.Date}</td>
                <td class="text-end"><span class="badge bg-slate-800 text-slate-300 border border-slate-700">${log.Time}</span></td>
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
async function startWebcam() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = mediaStream;
        idleState.classList.add('d-none');
        previewContainer.classList.add('d-none');
        webcamContainer.classList.remove('d-none');
        
        // Update Start Cam button to Stop Cam
        startCamBtn.innerHTML = '<i class="bi bi-stop-fill me-1"></i> Stop Camera';
        startCamBtn.classList.replace('btn-outline-emerald', 'btn-outline-danger');
        
        startAutoScan();
    } catch (err) {
        alert('Error accessing webcam: ' + err.message);
    }
}

function stopWebcam() {
    stopAutoScan();
    
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    webcamVideo.srcObject = null;
    webcamContainer.classList.add('d-none');
    if (previewContainer.classList.contains('d-none')) {
        idleState.classList.remove('d-none');
    }
    
    // Reset Start Cam button
    startCamBtn.innerHTML = '<i class="bi bi-play-fill me-1"></i> Start Camera';
    startCamBtn.classList.replace('btn-outline-danger', 'btn-outline-emerald');
    
    // Clear overlay
    const overlayCanvas = document.getElementById('webcamOverlay');
    if (overlayCanvas) {
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
}

startCamBtn.addEventListener('click', () => {
    if (mediaStream) {
        stopWebcam();
    } else {
        startWebcam();
    }
});

function startAutoScan() {
    if (autoScanLoopActive) return;
    autoScanLoopActive = true;
    countdownValue = 3;
    runAutoScanLoop();
}

function stopAutoScan() {
    autoScanLoopActive = false;
    if (autoScanTimeout) {
        clearTimeout(autoScanTimeout);
        autoScanTimeout = null;
    }
    const countdownEl = document.getElementById('scanCountdown');
    if (countdownEl) countdownEl.classList.add('d-none');
}

async function runAutoScanLoop() {
    if (!autoScanLoopActive || !mediaStream) return;
    
    const countdownEl = document.getElementById('scanCountdown');
    
    // Pause countdown if register mode is active but no name is entered
    if (currentMode === 'register' && !employeeNameInput.value.trim()) {
        if (countdownEl) countdownEl.classList.add('d-none');
        autoScanTimeout = setTimeout(runAutoScanLoop, 1000);
        return;
    }
    
    if (countdownEl) {
        countdownEl.classList.remove('d-none');
        countdownEl.innerText = countdownValue > 0 ? countdownValue : 'Scan!';
        countdownEl.style.fontSize = countdownValue > 0 ? '5rem' : '2.5rem';
    }
    
    if (countdownValue > 0) {
        countdownValue--;
        autoScanTimeout = setTimeout(runAutoScanLoop, 1000);
    } else {
        await performAutoScan();
        countdownValue = 3;
        autoScanTimeout = setTimeout(runAutoScanLoop, 1000);
    }
}

async function performAutoScan() {
    if (webcamVideo.videoWidth === 0 || webcamVideo.videoHeight === 0) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = webcamVideo.videoWidth;
    tempCanvas.height = webcamVideo.videoHeight;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, tempCanvas.width, tempCanvas.height);
    
    return new Promise(resolve => {
        tempCanvas.toBlob(async (blob) => {
            const file = new File([blob], "webcam_capture.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append('image', file);
            
            const targetUrl = currentMode === 'register' ? API_URL_REGISTER : API_URL_RECOGNIZE;
            if (currentMode === 'register') {
                formData.append('name', employeeNameInput.value.trim());
            }

            try {
                const response = await fetch(targetUrl, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok && !data.error) {
                    if (currentMode === 'register' && data.profile) {
                        drawLiveFaces([data.profile]);
                        renderProfiles([data.profile]);
                        resultText.innerText = data.message || 'Saved';
                        resultText.className = "badge bg-emerald-subtle text-emerald border border-emerald-alpha";
                        results.classList.remove('d-none');
                        employeeNameInput.value = ''; // clear input so it doesn't loop
                    } else if (currentMode === 'attendance' && data.faces) {
                        drawLiveFaces(data.faces);
                        
                        if (data.faces.length > 0) {
                            renderSimpleCards(data.faces);
                            resultText.innerText = data.message || 'Scanned';
                            resultText.className = "badge bg-emerald-subtle text-emerald border border-emerald-alpha";
                            results.classList.remove('d-none');
                            fetchAttendance(); // refresh table
                        } else {
                            results.classList.add('d-none');
                        }
                    }
                }
            } catch (err) {
                console.error("Auto scan error:", err);
            }
            resolve();
        }, 'image/jpeg');
    });
}

function drawLiveFaces(faces) {
    const overlayCanvas = document.getElementById('webcamOverlay');
    if (!overlayCanvas) return;
    
    overlayCanvas.width = webcamVideo.videoWidth;
    overlayCanvas.height = webcamVideo.videoHeight;
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    faces.forEach((face, index) => {
        const x = face.x;
        const y = face.y;
        const width = face.w;
        const height = face.h;
        
        const isKnown = face.name && face.name !== 'Unknown';
        const color = isKnown ? '#10b981' : '#38bdf8';
        const bgColor = isKnown ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)';

        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.fillStyle = bgColor;

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fill();
        ctx.stroke();
        
        const labelText = isKnown ? face.name : `#${index + 1}`;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 25, ctx.measureText(labelText).width + 20, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Outfit';
        ctx.fillText(labelText, x + 6, y - 8);
    });
}


resetBtn.addEventListener('click', () => {
    resetUI();
    startWebcam(); // Immediately restart camera after retry
});

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
    }

    if (currentMode === 'register' && !employeeNameInput.value.trim()) {
        alert('Please enter an Employee Name before uploading.');
        employeeNameInput.focus();
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.onload = () => {
            setupCanvas();
            uploadAndDetect(file);
        };
    };
    reader.readAsDataURL(file);

    stopWebcam();
    idleState.classList.add('d-none');
    webcamContainer.classList.add('d-none');
    previewContainer.classList.remove('d-none');
    loadingState.classList.remove('d-none');
    results.classList.add('d-none');
    profilesContainer.innerHTML = '';
}

function setupCanvas() {
    faceCanvas.width = imagePreview.width;
    faceCanvas.height = imagePreview.height;
}

async function uploadAndDetect(file) {
    const formData = new FormData();
    formData.append('image', file);

    if (currentMode === 'register') {
        formData.append('name', employeeNameInput.value.trim());
        loadingText.innerText = 'Profiling and saving face...';
    } else {
        loadingText.innerText = 'Recognizing identity...';
    }

    try {
        const targetUrl = currentMode === 'register' ? API_URL_REGISTER : API_URL_RECOGNIZE;
        const response = await fetch(targetUrl, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        loadingState.classList.add('d-none');
        results.classList.remove('d-none');

        if (!response.ok || data.error) {
            throw new Error(data.error || `Server error: ${response.statusText}`);
        }

        if (currentMode === 'register') {
            drawFaces([data.profile]);
            renderProfiles([data.profile]);
            resultText.innerText = data.message;
            resultText.className = "badge bg-emerald-subtle text-emerald border border-emerald-alpha";
        } else {
            drawFaces(data.faces);
            renderSimpleCards(data.faces);
            fetchAttendance(); // refresh table
            
            if (data.faces.length > 0) {
                resultText.innerText = data.message;
                resultText.className = "badge bg-emerald-subtle text-emerald border border-emerald-alpha";
            } else {
                resultText.innerText = 'Unrecognized';
                resultText.className = "badge bg-warning text-dark";
            }
        }

    } catch (error) {
        console.error('Error:', error);
        loadingState.classList.add('d-none');
        results.classList.remove('d-none');
        resultText.innerText = 'Error';
        resultText.className = "badge bg-danger text-white";
        
        profilesContainer.innerHTML = `
            <div class="alert alert-danger mb-0 border-0 bg-danger text-white bg-opacity-10">
                <i class="bi bi-exclamation-triangle me-2"></i> ${error.message || 'An error occurred.'}
            </div>
        `;
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
        const color = isKnown ? '#10b981' : '#38bdf8'; // emerald for known, sky blue for unknown
        const bgColor = isKnown ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)';

        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.fillStyle = bgColor;

        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.fill();
        ctx.stroke();
        
        const labelText = isKnown ? face.name : `#${index + 1}`;
        ctx.fillStyle = color;
        ctx.fillRect(x, y - 25, ctx.measureText(labelText).width + 20, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Outfit';
        ctx.fillText(labelText, x + 6, y - 8);
    });
}

function renderProfiles(faces) {
    profilesContainer.innerHTML = '';
    faces.forEach((face, index) => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        
        let emotionEmoji = '😐';
        if (face.dominant_emotion === 'happy') emotionEmoji = '😄';
        else if (face.dominant_emotion === 'sad') emotionEmoji = '😢';
        else if (face.dominant_emotion === 'angry') emotionEmoji = '😠';
        else if (face.dominant_emotion === 'surprise') emotionEmoji = '😲';
        else if (face.dominant_emotion === 'fear') emotionEmoji = '😨';
        else if (face.dominant_emotion === 'disgust') emotionEmoji = '🤢';

        card.innerHTML = `
            <div class="profile-card-header success text-truncate">
                Profile Saved: ${face.name}
            </div>
            <div class="profile-card-body text-start">
                <p class="mb-1"><strong>Age:</strong> ~${face.age}</p>
                <p class="mb-1"><strong>Gender:</strong> <span class="text-capitalize">${face.dominant_gender}</span></p>
                <p class="mb-1"><strong>Emotion:</strong> <span class="text-capitalize">${face.dominant_emotion}</span> ${emotionEmoji}</p>
                <p class="mb-0"><strong>Race:</strong> <span class="text-capitalize">${face.dominant_race}</span></p>
            </div>
        `;
        profilesContainer.appendChild(card);
    });
}

function renderSimpleCards(faces) {
    profilesContainer.innerHTML = '';
    faces.forEach((face, index) => {
        const card = document.createElement('div');
        card.className = 'profile-card';
        
        const isKnown = face.name && face.name !== 'Unknown';
        const headerClass = isKnown ? 'success' : 'primary';
        const nameLabel = isKnown ? face.name : `Unknown Face #${index + 1}`;

        card.innerHTML = `
            <div class="profile-card-header ${headerClass} text-truncate">
                ${nameLabel}
            </div>
            <div class="profile-card-body text-center">
                ${isKnown ? '<p class="text-emerald fw-bold mb-0"><i class="bi bi-check-circle me-1"></i> Attendance Logged</p>' : '<p class="text-slate-500 mb-0">Unrecognized</p>'}
            </div>
        `;
        profilesContainer.appendChild(card);
    });
}

function resetUI() {
    stopWebcam();
    previewContainer.classList.add('d-none');
    results.classList.add('d-none');
    idleState.classList.remove('d-none');
    fileInput.value = '';
    
    const ctx = faceCanvas.getContext('2d');
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
}

window.addEventListener('resize', () => {
    if (!previewContainer.classList.contains('d-none')) {
        setupCanvas();
    }
});

// Clock Functionality
function updateClock() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    document.getElementById('clockTime').innerText = now.toLocaleTimeString('en-US', timeOptions);
    document.getElementById('clockDate').innerText = now.toLocaleDateString('en-US', dateOptions);
}

setInterval(updateClock, 1000);
updateClock();
