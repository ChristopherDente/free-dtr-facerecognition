from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from face_utils import register_and_profile_face, recognize_face_for_attendance
import csv
from datetime import datetime
import os

app = FastAPI(title="Face Recognition API")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ATTENDANCE_FILE = 'attendance.csv'

def log_attendance(name: str):
    if name == "Unknown":
        return
        
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")
    
    file_exists = os.path.isfile(ATTENDANCE_FILE)
    with open(ATTENDANCE_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['Name', 'Date', 'Time'])
        writer.writerow([name, date_str, time_str])

@app.post("/api/register")
async def register_employee(image: UploadFile = File(...), name: str = Form(...)):
    """
    Register a new employee face and return their profile.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    
    try:
        contents = await image.read()
        profile_result = register_and_profile_face(contents, name.strip())
        
        if "error" in profile_result:
            return {"error": profile_result["error"]}
            
        return {
            "message": f"Successfully registered {name}!",
            "profile": profile_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recognize")
async def recognize_face(image: UploadFile = File(...)):
    """
    Fast recognition for attendance logging (no profiling).
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
    
    try:
        contents = await image.read()
        # Fast recognize
        recognized_faces = recognize_face_for_attendance(contents)
        
        # Log attendance for recognized faces
        for face in recognized_faces:
            log_attendance(face['name'])
            
        return {
            "message": f"Found {len(recognized_faces)} face(s).",
            "faces": recognized_faces
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/attendance")
async def get_attendance():
    logs = []
    if os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                logs.append(row)
    return {"logs": logs[::-1]}

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
