# Face Recognition App Setup Guide (macOS)

This guide will walk you through setting up both the Python backend and the HTML/JS frontend on your Mac. 

We are using `deepface` for face recognition with an OpenCV backend, which makes installation very straightforward!

## Step 2: Set up the Python Backend

1. **Open a terminal in the `backend` folder** of this project.
   ```bash
   cd path/to/free-dtr-facerecognition/backend
   ```

2. **Create a Virtual Environment (Highly Recommended)**
   This keeps your project dependencies isolated from your system Python.
   ```bash
   python3 -m venv venv
   ```

3. **Activate the Virtual Environment**
   ```bash
   source venv/bin/activate
   ```
   *(You should now see `(venv)` at the beginning of your terminal prompt)*

4. **Install the Requirements**
   This step will download `deepface`, `tensorflow`, and `opencv`. It may take a minute depending on your internet connection.
   ```bash
   pip install -r requirements.txt
   ```

5. **Start the Backend Server**
   ```bash
   python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
   If successful, you will see a message saying `Application startup complete` and that Uvicorn is running on `http://0.0.0.0:8000`.

## Step 3: Run the Frontend

1. Keep the terminal running your backend server open.
2. Navigate to the `frontend` folder in your file explorer (Finder).
3. **Double-click `index.html`** to open it in your default web browser (Chrome, Safari, etc.).
   *Alternatively, if you use VSCode, you can right-click the file and select "Open with Live Server" if you have that extension installed.*

## Step 4: Test it out!

1. With the browser open, click the "Select Image" button or drag and drop a picture containing faces into the upload area.
2. The frontend will instantly send the image to your Python backend running on your CPU.
3. The backend will calculate the coordinates, and the frontend will draw blue bounding boxes around the faces!

## Troubleshooting
- **`ModuleNotFoundError: No module named 'fastapi'`**: Ensure you activated your virtual environment (`source venv/bin/activate`) before running the server.
- **TensorFlow Warnings**: You might see some C++ warnings from TensorFlow in your terminal when starting the server. This is perfectly normal and won't affect the app!
