import cv2
import numpy as np

# Load the red dot image
image_path_dots = "red-dot.png"
image_dots = cv2.imread(image_path_dots)

# Convert to HSV to isolate red dots
hsv_dots = cv2.cvtColor(image_dots, cv2.COLOR_BGR2HSV)

# Red color ranges in HSV
lower_red1 = np.array([0, 100, 100])
upper_red1 = np.array([10, 255, 255])
lower_red2 = np.array([160, 100, 100])
upper_red2 = np.array([180, 255, 255])

# Create masks for red
mask1 = cv2.inRange(hsv_dots, lower_red1, upper_red1)
mask2 = cv2.inRange(hsv_dots, lower_red2, upper_red2)
mask = cv2.bitwise_or(mask1, mask2)

# Find contours
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Get centers of red dots
centers_dots = []
for cnt in contours:
    M = cv2.moments(cnt)
    if M["m00"] != 0:
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        centers_dots.append([cx, cy])

# Sort by y then x for a consistent order
# reverse the order
centers_sorted_dots = sorted(centers_dots, key=lambda c: (c[1]))
centers_sorted_dots

print(centers_sorted_dots)
