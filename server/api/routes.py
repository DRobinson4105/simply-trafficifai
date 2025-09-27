from flask import Flask, jsonify, Response
import time
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



def webcam(path="vid.mp4", loop=True, jpeg_quality=80):
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {path}")

    # FPS can be 0 or NaN for some files—fallback to 30
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    if fps <= 0:
        fps = 30.0
    frame_duration = 1.0 / fps
    next_frame_time = time.perf_counter()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                if loop:
                    # rewind to frame 0 and continue
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    break

            ok, buffer = cv2.imencode(
                ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), int(jpeg_quality)]
            )
            if not ok:
                continue

            # Send one frame
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
            )

            # Pace to the source FPS (skip ahead if we fell behind)
            next_frame_time += frame_duration
            sleep_for = next_frame_time - time.perf_counter()
            if sleep_for > 0:
                time.sleep(sleep_for)
            else:
                # we're behind; catch up without sleeping
                while next_frame_time < time.perf_counter():
                    next_frame_time += frame_duration
    finally:
        cap.release()


@app.route('/camera1', methods=['GET'])
def webcam_display():
    return Response(webcam(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/camera2', methods=['GET'])
def webcam_display2():
    return Response(webcam(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/camera3', methods=['GET'])
def webcam_display3():
    return Response(webcam(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)