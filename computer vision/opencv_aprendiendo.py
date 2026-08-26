import numpy as np
import matplotlib.pyplot as plt

import cv2

img = cv2.imread('./imagenes/perro.jpg')

type(img)

img.shape
img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
plt.imshow(img_rgb)
plt.show()

img_gris = cv2.imread('./imagenes/perro.jpg', cv2.IMREAD_GRAYSCALE)
plt.imshow(img_gris)
plt.show()

#resize 
img_resized = cv2.resize(img_rgb, (0, 0), img_rgb , 0.1 , 0.1)
plt.imshow(img_resized)
plt.show()
