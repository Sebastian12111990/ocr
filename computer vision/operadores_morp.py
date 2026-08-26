import cv2
import numpy as np

from funciones_imagen import display_img


def load_img():
    blank_img = np.zeros((600, 600), dtype=np.uint8)
    font = cv2.FONT_HERSHEY_SIMPLEX

    cv2.putText(
        blank_img,
        text="ABCDE",
        org=(50, 300),
        fontFace=font,
        fontScale=5,
        color=255,
        thickness=10,
    )

    return blank_img


kernel = np.ones((5, 5), np.uint8)

"""
# Erosion
img = load_img()
display_img(img)
erosion1 = cv2.erode(img, kernel, 1)
display_img(erosion1)

# White Noise : Opening
img = load_img()
white_noise = np.random.randint(low=0, high=2, size=(600, 600), dtype=np.uint8)
display_img(white_noise)
white_noise = white_noise * 255
img_noise = cv2.add(img, white_noise)
display_img(img_noise)
opening = cv2.morphologyEx(img_noise, cv2.MORPH_OPEN, kernel)
display_img(opening)
"""

# Black Noise : Closing 
img = load_img()
black_noise = np.random.randint(low=0, high=2, size=img.shape, dtype=np.uint8)
black_noise_img = img.copy()
black_noise_img[black_noise == 1] = 0
closing = cv2.morphologyEx(black_noise_img, cv2.MORPH_CLOSE, kernel)
display_img(closing, figsize=(12, 10))

# Gradiente, sirve para detectar formas
img = load_img()
gradient = cv2.morphologyEx(img, cv2.MORPH_GRADIENT, kernel)
display_img(gradient, figsize=(12, 10))
