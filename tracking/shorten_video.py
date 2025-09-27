import cv2

cap = cv2.VideoCapture("vid.mp4")

fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = None
frame_count = 0
while cap.isOpened():
    ret, frame = cap.read()

    if not ret or frame_count >= 1000: break

    if out is None:
        h, w = frame.shape[:2]

        out = cv2.VideoWriter("vid_m.mp4", fourcc, 30, (w, h))

    out.write(frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

    frame_count += 1

cap.release()
out.release()