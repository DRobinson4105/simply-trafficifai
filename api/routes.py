from flask import Flask, Response, request, jsonify
from flask_cors import CORS
import json
import cv2
from queue import Queue
from ultralytics import YOLO
import numpy as np
from threading import Lock, Thread
import time
import torch
from waitress import serve

device = 0 if torch.cuda.is_available() else "cpu"

app = Flask(__name__)
CORS(app)

EPS=1e-2

with open('camera_metadata.json', 'r') as fp:
    camera_data = json.load(fp)

cameras = Queue()
used_cameras = set()
current = []

frame_count = 0

model = YOLO("yolo11l.pt")

camera_frames = [None, None, None]
camera_locks = [Lock(), Lock(), Lock()]

max_is_special = False

@app.route('/api/build-path', methods=['POST'])
def build_path():
    global max_is_special
    if max_is_special: return "", 200
    max_is_special = True
    route = request.get_json()

    for point in route:
        closest = min(camera_data.keys(), key=lambda i: cv2.norm((camera_data[i]["latitude"], camera_data[i]["longitude"]), (point["latitude"], point["longitude"])))

        if cv2.norm((camera_data[closest]["latitude"], camera_data[closest]["longitude"]), (point["latitude"], point["longitude"])) < EPS and closest not in used_cameras:
            used_cameras.add(closest)
            cameras.put(closest)

    for _ in range(3):
        name = cameras.get()

        current.append({
            "name": name,
            "id_map": {}, # id -> prev center
            "next_id": 0,
            "tracked": {}, # id -> ((-1 * direction)lane, last_frame)
            "lane_speeds": [0] * len(camera_data[name]["average_speed"]),
            "lane_counts": [0] * len(camera_data[name]["average_speed"]),
            "capture": cv2.VideoCapture(f'videos/{name}.ts')
        })

    return "", 200

def first_mask_with_point(masks, point):
    px, py = map(float, point)
    for idx, poly in enumerate(masks):
        cnt = np.asarray(poly, dtype=np.int32)
        r = cv2.pointPolygonTest(cnt, (px, py), False)
        inside = r >= 0
        if inside:
            return idx
    return None

@app.route('/api/update', methods=['PUT'])
def update():
    if len(current) == 0: return "", 200
    data = request.get_json()
    latitude, longitude = float(data["latitude"]), float(data["longitude"])
    # if new camera is found, rotate current cameras and update to new data
    if cv2.norm((camera_data[current[0]["name"]]["latitude"], camera_data[current[0]["name"]]["longitude"]), (latitude, longitude)) < EPS:
        current[0]["capture"].release()

        current[:2] = current[1:]

        name = cameras.get()
        current[2] = {
            "name": name,
            "id_map": {}, # id -> prev center
            "next_id": 0,
            "tracked": {}, # id -> ((-1 * direction)lane, last_frame)
            "lane_speeds": [0] * len(camera_data[name]["average_speed"]),
            "lane_counts": [0] * len(camera_data[name]["average_speed"]),
            "capture": cv2.VideoCapture(f'videos/{name}.ts')
        }

    return "", 200

def main_loop():
    global frame_count
    while True:
        if len(current) < 3: continue

        for i in range(3):
            ret, frame = current[i]["capture"].read()
            if not ret:
                return "Frame failed", 400
            
            with torch.inference_mode():
                results = model(
                    source=frame,
                    classes=[2],
                    verbose=False,
                    device=device
                )

            boxes = results[0].boxes
            
            pairs = list(current[i]["id_map"].items())
            ids, points = [x[0] for x in pairs], [x[1] for x in pairs]
            new_id_map = {}
            
            n = len(boxes.cls)

            for j in range(n):
                cur = (boxes.xywh[j][0].item(), (boxes.xywh[j][1] + boxes.xywh[j][3] / 2).item())

                if len(points) == 0:
                    cur_id = current[i]["next_id"]
                    current[i]["next_id"] += 1
                else:
                    closest_idx = min(range(len(points)), key=lambda a: cv2.norm(points[a], cur))
                    
                    if cv2.norm(points[closest_idx], cur) < 15:
                        cur_id = ids[closest_idx]
                    else:
                        cur_id = current[i]["next_id"]
                        current[i]["next_id"] += 1

                new_id_map[cur_id] = cur
                
                lane = first_mask_with_point(camera_data[current[i]["name"]]["mask1"], cur)
                dir = 1

                if lane is None:
                    lane = first_mask_with_point(camera_data[current[i]["name"]]["mask2"], cur)
                    dir = -1

                if lane is None: continue

                if cur_id in current[i]["tracked"].keys():
                    if current[i]["tracked"][cur_id][0] == -1 * dir * (lane + 1):
                        current[i]["lane_speeds"][lane] += frame_count - current[i]["tracked"][cur_id][1]
                        current[i]["lane_counts"][lane] += 1
                        current[i]["tracked"].pop(cur_id)
                else:
                    current[i]["tracked"][cur_id] = (dir * (lane + 1), frame_count)

            annotated = results[0].plot()

            contours = [np.array(m, dtype=np.int32).reshape((-1, 1, 2)) for m in camera_data[current[i]["name"]]["mask1"]]
            cv2.polylines(annotated, contours, isClosed=True, color=(0, 255, 0), thickness=2, lineType=cv2.LINE_AA)

            contours = [np.array(m, dtype=np.int32).reshape((-1, 1, 2)) for m in camera_data[current[i]["name"]]["mask2"]]
            cv2.polylines(annotated, contours, isClosed=True, color=(0, 255, 0), thickness=2, lineType=cv2.LINE_AA)

            ok, buf = cv2.imencode('.jpg', annotated)
            
            if not ok: 
                return "Frame failed", 400
            
            jpg = buf.tobytes()

            with camera_locks[i]:
                camera_frames[i] = jpg

            current[i]["id_map"] = new_id_map
        
        frame_count += 1

def stream(idx):
    while True:
        with camera_locks[idx]:
            jpg = camera_frames[idx]
        if jpg is not None:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpg + b'\r\n')
            
        time.sleep(1/30)

@app.route('/api/camera1', methods=['GET'])
def camera1():
    return Response(stream(0), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/camera2', methods=['GET'])
def camera2():
    return Response(stream(1), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/camera3', methods=['GET'])
def camera3():
    return Response(stream(2), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/get-optimal-lanes', methods=['GET'])
def get_optimal_lanes():
    if len(current) == 0:
        return [], 200
    
    speeds = [y / x if y > 0 else 0 for x, y in zip(current[0]["lane_speeds"], current[0]["lane_counts"])]
    highest = max(speeds)
    return [x == highest for x in speeds], 200

@app.route('/api/get-alert', methods=['GET'])
def get_alert():
    if len(current) < 3:
        return "", 200
    
    speeds = [[y / x if y > 0 else 0 for x, y in zip(a["lane_speeds"], a["lane_counts"])] for a in current]

    return traffic_analyzer(speeds[0], speeds[1], speeds[2]), 200

def _format_lane_list(idxs):
    if not idxs:
        return ""
    labels = [f"Lane {i+1}" for i in idxs]
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} & {labels[1]}"
    return f"{', '.join(labels[:-1])} and {labels[-1]}"

def _compose_status(clear_idxs, obstructed_idxs):
    parts = []
    if clear_idxs:
        subject = _format_lane_list(clear_idxs)
        verb = "is" if len(clear_idxs) == 1 else "are"
        parts.append(f"{subject} {verb} clear")
    if obstructed_idxs:
        subject = _format_lane_list(obstructed_idxs)
        verb = "is" if len(obstructed_idxs) == 1 else "are"
        parts.append(f"{subject} {verb} obstructed")
    return (("; ".join(parts) + ".") if parts
            else "")

def lane_status_string(speeds, obstructed_threshold=0.35, clear_percentile=75):
    speeds = [float(s) for s in speeds]
    if not speeds:
        return ""

    obstructed_idxs = [i for i, s in enumerate(speeds) if s < obstructed_threshold]

    non_obstructed = [(i, s) for i, s in enumerate(speeds) if i not in obstructed_idxs]
    clear_idxs = []
    if non_obstructed:
        _, non_obs_speeds = zip(*non_obstructed)
        thresh = np.percentile(non_obs_speeds, clear_percentile)
        clear_idxs = [i for i, s in non_obstructed if s >= thresh]

    return _compose_status(clear_idxs, obstructed_idxs)

def traffic_analyzer(a_speeds, b_speeds, c_speeds, eps=1e-6):
    def avg(vals):
        vals = [float(v) for v in vals if v is not None]
        return (sum(vals) / len(vals)) if vals else None

    def gt(x, y):
        return (x is not None) and (y is not None) and (x > y + eps)

    a, b, c = avg(a_speeds), avg(b_speeds), avg(c_speeds)

    if (gt(b, c) and gt(b, a)):
        return "Slight traffic ahead."
    if (gt(a, b)):
        return "Traffic building up ahead."
    if (gt(b, a)):
        return "Traffic reducing ahead."
    return ""

if __name__ == '__main__':
    t = Thread(target=main_loop, daemon=True)
    t.start()
    serve(app, host='0.0.0.0', port=5001, threads=16)