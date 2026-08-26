import cv2
import matplotlib.pyplot as plt

from funciones_imagen import cargar_rgb


mostrar_ladrillo = cargar_rgb("imagenes/ladrillos.jpg")
mostrar_perro = cargar_rgb("imagenes/perro.jpg")
mostrar_crucigrama = cargar_rgb("imagenes/crucigrama.jpg")

hist_perro = cv2.calcHist([mostrar_ladrillo], [2], None, [256], [0, 256])

plt.plot(hist_perro)
plt.show()

colores = ("b", "g", "r")

for i, col in enumerate(colores):
    hist = cv2.calcHist([mostrar_ladrillo], [i], None, [256], [0, 256])
    plt.plot(hist, color=col)
    plt.xlim([0, 256])

plt.show()


