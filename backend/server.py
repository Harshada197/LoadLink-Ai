from flask import Flask, jsonify, Response, request
from flask_cors import CORS
import cv2
import numpy as np
from ultralytics import YOLO
import utlis

def decode_barcode(frame):
    found = []
    try:
        # QR Code
        qrDetector = cv2.QRCodeDetector()
        data, bbox, _ = qrDetector.detectAndDecode(frame)
        if data:
            found.append({ "data": data, "type": "QRCODE" })
            
        # Standard Barcode
        barcodeDetector = cv2.barcode.BarcodeDetector()
        retval, decoded_info, decoded_type, points = barcodeDetector.detectAndDecode(frame)
        if retval and decoded_info:
            for text, btype in zip(decoded_info, decoded_type):
                if text:
                    found.append({ "data": text, "type": str(btype) })
    except Exception as e:
        print("Barcode Error:", e)
        
    return found

app = Flask(__name__)
CORS(app)

# Load YOLO model
model = YOLO("yolov8n.pt")

cap = None

container_capacity = 20

# ───────────── CORE ML FRAME PROCESSOR ─────────────
def process_frame(frame):
    results = model(frame)

    # 1. Barcode decoding
    detected_barcodes = decode_barcode(frame)
        
    # 2. Real-world cm dimensions (A4 calibration)
    scale = 3
    wP = 210 * scale
    hP = 297 * scale
    
    a4_measurements = []
    imgContours, conts = utlis.getContours(frame, minArea=50000, filter=4, draw=False)
    if len(conts) != 0:
        biggest = conts[0][2]
        imgWarp = utlis.warpImg(frame, biggest, wP, hP)
        imgContours2, conts2 = utlis.getContours(imgWarp, minArea=2000, filter=4, cThr=[50,50], draw=False)
        for obj in conts2:
            nPoints = utlis.reorder(obj[2])
            nW = round((utlis.findDis(nPoints[0][0]//scale, nPoints[1][0]//scale)/10), 1)
            nH = round((utlis.findDis(nPoints[0][0]//scale, nPoints[2][0]//scale)/10), 1)
            a4_measurements.append({
                "width_cm": nW,
                "height_cm": nH
            })

    boxes = results[0].boxes
    names = model.names

    total_volume = 0
    detected = []

    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0]

        width = int(x2 - x1)
        height = int(y2 - y1)

        cls_id = int(box.cls[0])
        raw_object_name = names[cls_id]

        confidence = float(box.conf[0])

        if confidence < 0.5:
            continue

        if raw_object_name == "person":
            continue

        aspect_ratio = width / height if height != 0 else 0
        if aspect_ratio < 0.5 or aspect_ratio > 2.5:
            continue

        area = width * height

        if area < 5000:
            size = "Small"
            volume = 1
        elif area < 20000:
            size = "Medium"
            volume = 2
        else:
            size = "Large"
            volume = 3

        total_volume += volume
        object_name = "box" if raw_object_name in ["suitcase", "refrigerator"] else raw_object_name

        detected.append({
            "rawLabel": raw_object_name,
            "object": object_name,
            "size": size,
            "width": width,
            "height": height,
            "x": int((x1 + x2) / 2),
            "y": int((y1 + y2) / 2)
        })

    efficiency = (total_volume / container_capacity) * 100

    return {
        "volume": total_volume,
        "efficiency": round(efficiency, 2),
        "objects": detected,
        "barcodes": detected_barcodes,
        "a4_measurements": a4_measurements
    }

# ───────────── DATA API (YOLO DETECTION) ─────────────
@app.route('/data')
def get_data():
    global cap
    if cap is None or not cap.isOpened():
        return jsonify({ "error": "Camera offline", "volume": 0, "efficiency": 0, "objects": [], "barcodes": [], "a4_measurements": [] })

    ret, frame = cap.read()
    if not ret:
        return jsonify({ "error": "Camera read failed", "volume": 0, "efficiency": 0, "objects": [], "barcodes": [], "a4_measurements": [] })
        
    payload = process_frame(frame)
    return jsonify(payload)

# ───────────── UPLOAD STATIC IMAGE API ─────────────
@app.route('/upload', methods=['POST'])
def upload_data():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
        
    # Read the image blob securely into an OpenCV multidimensional array
    img_array = np.frombuffer(file.read(), np.uint8)
    frame = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    
    if frame is None:
        return jsonify({"error": "Corrupt image processing constraint"}), 400
        
    payload = process_frame(frame)
    return jsonify(payload)


# ───────────── VIDEO STREAM (CAMERA FEED) ─────────────
def generate_frames():
    global cap
    while cap is not None and cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        _, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/video')
def video():
    global cap
    if cap is None or not cap.isOpened():
        return Response("Camera offline", status=400)
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

# ───────────── CAMERA HARDWARE CONTROL ─────────────
@app.route('/camera/start', methods=['POST'])
def start_camera():
    global cap
    if cap is None or not cap.isOpened():
        cap = cv2.VideoCapture(0)
    return jsonify({"status": "started"})

@app.route('/camera/stop', methods=['POST'])
def stop_camera():
    global cap
    if cap is not None:
        cap.release()
        cap = None
    return jsonify({"status": "stopped"})


# ───────────── RUN SERVER ─────────────
if __name__ == '__main__':
    app.run(debug=True)