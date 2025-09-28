import cv2

def show_coordinates(event, x, y, flags, param):
    if event == cv2.EVENT_MOUSEMOVE:
        print(x, y)

cap = cv2.VideoCapture("i4_mm_75_4.ts")
frame = None

ret, frame = cap.read()

if not ret:
    print("what")

cap.release()

def show_coordinates(event, x, y, flags, param):
    if event == cv2.EVENT_MOUSEMOVE:
        # Print to console
        print(f"X: {x}, Y: {y}")
        # Or draw coordinates directly on the frame
        temp = frame.copy()
        cv2.putText(temp, f"({x}, {y})", (x+10, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0,255,0), 1)
        cv2.imshow("Frame", temp)

cv2.imshow("Frame", frame)
cv2.setMouseCallback("Frame", show_coordinates)

cv2.waitKey(0)
cv2.destroyAllWindows()