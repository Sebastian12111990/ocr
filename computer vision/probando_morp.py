import cv2
import numpy as np

from funciones_imagen import cargar_imagen, display_img


img = cargar_imagen("patentes/GGYY10.jpg", cv2.IMREAD_GRAYSCALE)
 
kernel = np.ones((5, 5), np.uint8)


# Gradiente, sirve para detectar formas
gradient = cv2.morphologyEx(img, cv2.MORPH_GRADIENT, kernel)
display_img(gradient, figsize=(12, 10))



"""
# Erosion : no sirve de mucho 
erosion1 = cv2.erode(img, kernel, 1)
display_img(erosion1)

# White Noise : Opening : no sirve de mucho 
white_noise = np.random.randint(low=0, high=2, size=img.shape, dtype=np.uint8)
white_noise = white_noise * 255
img_noise = cv2.add(img, white_noise)
opening = cv2.morphologyEx(img_noise, cv2.MORPH_OPEN, kernel)
display_img(opening)

# Black Noise : Closing 
black_noise = np.random.randint(low=0, high=2, size=img.shape, dtype=np.uint8)
black_noise_img = img.copy()
black_noise_img[black_noise == 1] = 0
closing = cv2.morphologyEx(black_noise_img, cv2.MORPH_CLOSE, kernel)
display_img(closing)



"""
