from pathlib import Path

import cv2
import matplotlib.pyplot as plt

ruta = Path(__file__).parent / "computer vision" / "imagenes" / "ladrillos.jpg"
img = cv2.imread(str(ruta))

if img is None:
    raise FileNotFoundError(f"No se pudo cargar la imagen: {ruta}")

img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

img_blur = cv2.blur(img, (5, 5))

cv2.putText(
    img_blur,
    text="Hola",
    org=(20, 350),
    fontFace=cv2.FONT_ITALIC   ,
    fontScale=7,
    color=(255, 0, 0),
    thickness=5,
 
)


plt.imshow(img)
plt.axis("off")
plt.show()

plt.imshow(img_blur)
plt.axis("off")
plt.show()