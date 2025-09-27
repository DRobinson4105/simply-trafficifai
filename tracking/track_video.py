from ultralytics import YOLO
import cv2
import numpy as np

exit_lane_masks = [
    [(3, 306), (92, 306), (118, 281), (45, 281)],
    [(93, 306), (176, 306), (192, 281), (119, 281)],
    [(177, 306), (261, 306), (268, 281), (193, 281)], 
    [(380, 306), (462, 306), (444, 281), (374, 281)], 
    [(463, 306), (538, 306), (510, 281), (445, 281)], 
    [(539, 306), (622, 306), (581, 281), (511, 281)],
]

enter_lane_masks = [
    [(211, 178), (242, 178), (252, 168), (223, 168)],
    [(243, 178), (267, 178), (276, 168), (253, 168)],
    [(268, 178), (298, 178), (302, 168), (277, 168)],
    [(339, 178), (367, 178), (360, 168), (337, 168)],
    [(368, 178), (393, 178), (384, 168), (361, 168)],
    [(394, 178), (422, 178), (410, 168), (385, 168)],
]

model = YOLO("yolo11x.pt")
results = model.track("vid_m.mp4")

id_map = {} # id -> prev center
next_id = 0

tracked = {} # id -> ((-1 * direction)lane, last_frame)
lane_speeds = [0] * 6
lane_counts = [0] * 6

def first_mask_with_point(masks, point):
    px, py = map(float, point)
    for idx, poly in enumerate(masks):
        cnt = np.asarray(poly, dtype=np.int32)
        r = cv2.pointPolygonTest(cnt, (px, py), False)
        inside = r >= 0
        if inside:
            return idx
    return None

for idx, result in enumerate(results):
    boxes = result.boxes

    pairs = list(id_map.items())
    ids, points = [x[0] for x in pairs], [x[1] for x in pairs]
    print(id_map)
    new_id_map = {}

    n = len(boxes.cls)

    for i in range(n):
        cls = int(boxes.cls[i].item())
        if cls == 2:
            cur = (boxes.xywh[i][0].item(), (boxes.xywh[i][1] + boxes.xywh[i][3] / 2).item())

            if len(points) == 0:
                cur_id = next_id
                next_id += 1
            else:
                closest_idx = min(range(len(points)), key=lambda i: cv2.norm(points[i], cur))
                
                if cv2.norm(points[closest_idx], cur) < 10:
                    cur_id = ids[closest_idx]
                else:
                    cur_id = next_id
                    next_id += 1

            new_id_map[cur_id] = cur
            
            lane = first_mask_with_point(exit_lane_masks, cur)
            dir = 1

            if lane is None:
                lane = first_mask_with_point(enter_lane_masks, cur)
                dir = -1

            if lane is None: continue

            if cur_id in tracked.keys():
                if tracked[cur_id][0] == -1 * dir * (lane + 1):
                    lane_speeds[lane] += idx - tracked[cur_id][1]
                    lane_counts[lane] += 1
                    tracked.pop(cur_id)
                    # print(f'{cur_id} crossed lane {lane} at frame {idx}')
                    print(f'end: {cur_id} {dir} {lane} {idx} {cur}')
            else:
                print(f'start: {cur_id} {dir} {lane} {idx} {cur}')
                tracked[cur_id] = (dir * (lane + 1), idx)

    id_map = new_id_map

print([x / y if y > 0 else 0 for x, y in zip(lane_speeds, lane_counts)])

cap = cv2.VideoCapture("vid.mp4")

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = None
frame_count = 0
while cap.isOpened():
    ret, frame = cap.read()

    if not ret or frame_count >= 200: break
    
    results = model(frame)

    annotated = results[0].plot()

    contours = [np.array(m, dtype=np.int32).reshape((-1, 1, 2)) for m in enter_lane_masks]
    cv2.polylines(annotated, contours, isClosed=True, color=(0, 255, 0), thickness=2, lineType=cv2.LINE_AA)

    contours = [np.array(m, dtype=np.int32).reshape((-1, 1, 2)) for m in exit_lane_masks]
    cv2.polylines(annotated, contours, isClosed=True, color=(0, 255, 0), thickness=2, lineType=cv2.LINE_AA)

    if out is None:
        h, w = annotated.shape[:2]

        out = cv2.VideoWriter("out.mp4", fourcc, 30, (w, h))

    out.write(annotated)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

    frame_count += 1

cap.release()
out.release()