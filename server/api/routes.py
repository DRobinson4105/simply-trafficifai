from flask import Flask, jsonify, Response
from flask_cors import CORS
import json
import cv2
from queue import Queue

app = Flask(__name__)
CORS(app)

with open('camera_metadata.json', 'r') as fp:
    camera_data = json.load(fp)

cameras = Queue()
used_cameras = set()

current_cameras = []

def build_path(route, eps=1e-2):
    for point in route:
        closest = min(camera_data.keys(), key=lambda i: cv2.norm((camera_data[i].latitude, camera_data[i].longitude), (point.latitude, point.longitude)))

        if cv2.norm((camera_data[closest].latitude, camera_data[closest].longitude), (point.latitude, point.longitude)) < eps and closest not in used_cameras:
            used_cameras.add(closest)
            cameras.put(closest)

def webcam():
    camera = cv2.VideoCapture("vid_s.mp4")

    while True:
        success, frame = camera.read()
        if success:
            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            camera.release()

@app.route('/camera1', methods=['GET'])
def webcam_display():
    return Response(webcam(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/camera2', methods=['GET'])
def webcam_display():
    return Response(webcam(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/camera3', methods=['GET'])
def webcam_display():
    return Response(webcam(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)