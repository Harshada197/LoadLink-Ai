from flask import Flask, jsonify, Response
from flask_cors import CORS
import cv2
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load YOLO model
model = YOLO("yolov8n.pt")

# Use correct camera index (0 or 1)
cap = cv2.VideoCapture(0)

container_capacity = 20

# ───────────── DATA API (YOLO DETECTION) ─────────────
@app.route('/data')
def get_data():
    ret, frame = cap.read()
    if not ret:
        return jsonify({"error": "Camera not working"})

    results = model(frame)

    boxes = results[0].boxes
    names = model.names

    total_volume = 0
    detected = []

    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0]

        width = int(x2 - x1)
        height = int(y2 - y1)

        cls_id = int(box.cls[0])
        object_name = names[cls_id]

        confidence = float(box.conf[0])

        if confidence < 0.5:
            continue

        if object_name == "person":
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

        detected.append({
            "object": object_name,
            "size": size,
            "width": width,
            "height": height
        })

    efficiency = (total_volume / container_capacity) * 100

    return jsonify({
        "volume": total_volume,
        "efficiency": round(efficiency, 2),
        "objects": detected
    })


# ───────────── VIDEO STREAM (CAMERA FEED) ─────────────
def generate_frames():
    while True:
        success, frame = cap.read()
        if not success:
            break

        _, buffer = cv2.imencode('.jpg', frame)
        frame = buffer.tobytes()

        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')


@app.route('/video')
def video():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


# ───────────── RUN SERVER ─────────────
if __name__ == '__main__':
    app.run(debug=True)