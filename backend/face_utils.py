from deepface import DeepFace
import pandas as pd
import numpy as np
import io
import cv2
from PIL import Image
import os
import glob

# Disable TF C++ logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
KNOWN_FACES_DIR = 'known_faces'
os.makedirs(KNOWN_FACES_DIR, exist_ok=True)

def _bytes_to_cv2(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes))
    if image.mode != "RGB":
        image = image.convert("RGB")
    image_array = np.array(image)
    return cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)

def register_and_profile_face(image_bytes: bytes, name: str):
    """
    Register a face by extracting, profiling, and saving it to the database.
    Returns the profiling info.
    """
    image_array = _bytes_to_cv2(image_bytes)
    
    # 1. Analyze (Profiling & Bounding Boxes)
    try:
        analysis = DeepFace.analyze(
            img_path=image_array, 
            actions=['age', 'gender', 'emotion', 'race'],
            detector_backend='opencv', 
            enforce_detection=True # Enforce detection for registration
        )
    except Exception as e:
        print(f"DeepFace analyze error: {e}")
        return {"error": "No face detected in the image for registration."}
        
    if not isinstance(analysis, list):
        analysis = [analysis]
        
    if len(analysis) == 0:
        return {"error": "No face detected."}
        
    # We take the most prominent face (first one)
    face_obj = analysis[0]
    region = face_obj.get('region', {})
    
    # Crop the face with some padding
    x, y, w, h = region.get('x', 0), region.get('y', 0), region.get('w', 0), region.get('h', 0)
    y1 = max(0, y - int(h*0.2))
    y2 = min(image_array.shape[0], y + h + int(h*0.2))
    x1 = max(0, x - int(w*0.2))
    x2 = min(image_array.shape[1], x + w + int(w*0.2))
    
    face_crop = image_array[y1:y2, x1:x2]
    
    if face_crop.size == 0:
        return {"error": "Invalid face region detected."}
        
    # Save the face
    # Remove representations_vgg_face.pkl if it exists so DeepFace reconstructs the DB
    pkl_path = os.path.join(KNOWN_FACES_DIR, "representations_vgg_face.pkl")
    if os.path.exists(pkl_path):
        os.remove(pkl_path)
        
    save_path = os.path.join(KNOWN_FACES_DIR, f"{name}.jpg")
    cv2.imwrite(save_path, face_crop)
    
    return {
        'name': name.title(),
        'x': x, 'y': y, 'w': w, 'h': h,
        'age': face_obj.get('age'),
        'dominant_gender': face_obj.get('dominant_gender'),
        'dominant_emotion': face_obj.get('dominant_emotion'),
        'dominant_race': face_obj.get('dominant_race')
    }

def recognize_face_for_attendance(image_bytes: bytes):
    """
    Fast recognition for attendance, skips profiling.
    """
    image_array = _bytes_to_cv2(image_bytes)
    
    has_known_faces = False
    if os.path.exists(KNOWN_FACES_DIR):
        for ext in ('*.jpg', '*.jpeg', '*.png'):
            if glob.glob(os.path.join(KNOWN_FACES_DIR, ext)):
                has_known_faces = True
                break
                
    if not has_known_faces:
        return []
        
    try:
        # Just find the face
        dfs = DeepFace.find(
            img_path=image_array,
            db_path=KNOWN_FACES_DIR,
            detector_backend='opencv',
            enforce_detection=False,
            silent=True
        )
        if not isinstance(dfs, list):
            dfs = [dfs]
    except Exception as e:
        print(f"DeepFace find error: {e}")
        return []
        
    recognized_faces = []
    
    for df in dfs:
        if not df.empty:
            # We found a match
            identity_path = df.iloc[0]['identity']
            basename = os.path.basename(identity_path)
            name, _ = os.path.splitext(basename)
            
            x = int(df.iloc[0].get('source_x', 0))
            y = int(df.iloc[0].get('source_y', 0))
            w = int(df.iloc[0].get('source_w', 0))
            h = int(df.iloc[0].get('source_h', 0))
            
            recognized_faces.append({
                'name': name.title(),
                'x': x,
                'y': y,
                'w': w,
                'h': h
            })
            
    return recognized_faces
