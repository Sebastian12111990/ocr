import cv2
import numpy as np
import matplotlib.pyplot as plt

 
img = cv2.imread("imagenes/ladrillos.jpg")
img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

gamma = 1
gamma_img = np.power(img.astype(np.float32) / 255, gamma)
img_texto = np.uint8(np.clip(gamma_img * 255, 0, 255))

cv2.putText(
    img_texto,
    text="Hola",
    org=(20, 350),
    fontFace=cv2.FONT_ITALIC   ,
    fontScale=7,
    color=(255, 0, 0),
    thickness=5,
 
)

plt.imshow(img_texto)
plt.axis("off")
plt.show()