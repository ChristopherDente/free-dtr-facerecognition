# Smart Daily Time Record (DTR) System

A modern, web-based Face Recognition and Attendance Logging application built with FastAPI, OpenCV, and DeepFace.

## System Capabilities

The application has two distinct modes built directly into the UI:

### 1. Register Employee (Profiling)
When capturing a new employee's photo, the AI detects their face, performs deep profiling (Age, Gender, Emotion, and Race), crops the face perfectly, and securely registers them into the database (`backend/known_faces`). 

### 2. Daily Time Record (Fast Attendance)
This mode optimizes for speed. When clocking in, it skips the heavy profiling algorithms and instantly compares the captured face against the database using deep neural networks. Successful recognitions are immediately logged into the Attendance Table (`backend/attendance.csv`).

## AI Models Under the Hood
This system leverages state-of-the-art Deep Learning models:
- **Face Detection (Finding the Face):** Powered by **MTCNN** (Multi-task Cascaded Convolutional Networks) for highly accurate and robust detection.
- **Face Recognition (Identity Matching):** Powered by **VGG-Face** to generate complex 2622-dimensional facial embeddings and perform cosine similarity matching against the database.

---

## Setup Guide (macOS)

### 1. Set up the Python Backend

1. **Open a terminal in the `backend` folder** of this project.
   ```bash
   cd path/to/free-dtr-facerecognition/backend
   ```

2. **Create a Virtual Environment**
   It's highly recommended to use Python 3.11 to ensure compatibility with TensorFlow and DeepFace on Apple Silicon.
   ```bash
   python3.11 -m venv venv
   ```

3. **Activate the Virtual Environment**
   ```bash
   source venv/bin/activate
   ```

4. **Install the Requirements**
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the Backend Server**
   Run the server on port 8888 to avoid common conflicts with other local projects.
   ```bash
   python -m uvicorn app:app --host 0.0.0.0 --port 8888 --reload
   ```

### 2. Run the Frontend

For webcam compatibility and to avoid browser security blocks, run the frontend on a local server rather than just double-clicking the HTML file.

1. **Open a NEW terminal in the `frontend` folder**.
2. **Start a simple HTTP server**:
   ```bash
   python3 -m http.server 3000
   ```
3. Open your web browser and navigate to: **http://localhost:3000**

### 3. Usage
1. Make sure both servers are running.
2. Start by switching to **Register Employee** mode, typing your name, and saving your profile.
3. Switch back to **Daily Time Record** mode and capture your face to log your attendance!
