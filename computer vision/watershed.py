import sys
from pathlib import Path

import cv2
import numpy as np

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_gris, mostrar_resultados, cargar_rgb

monedas = cargar_rgb("imagenes/monedas.png")

m_blur = cv2.medianBlur(monedas,15)
m_blur_gris =  cv2.cvtColor(m_blur, cv2.COLOR_BGR2GRAY)

ret, tresh1 = cv2.threshold(m_blur_gris, 100, 255, cv2.THRESH_BINARY)

contornos, jerarquia = cv2.findContours(tresh1, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
 
for i in range(len(contornos)) :
    if jerarquia[0][i][3] == -1 :
        cv2.drawContours(monedas, contornos, i , 255, 2)

# comienzo watershed

m_blur = cv2.medianBlur(monedas,15)
m_blur_gris =  cv2.cvtColor(m_blur, cv2.COLOR_BGR2GRAY)
ret, tresh1 = cv2.threshold(m_blur_gris, 100, 255, cv2.THRESH_BINARY)
kernel = np.ones((3,3), np.uint8)
opening = cv2.morphologyEx(tresh1, cv2.MORPH_OPEN, kernel, iterations= 2)
resultados = [
    ("Monedas Normal :", monedas),
    ("Monedas Blur   :", m_blur ),
    ("Monedas Gris   :", m_blur_gris),
    ("Monedas Tresh  :", tresh1),
    ("Monedas Final  :", monedas),
    ("Monedas Final  :", opening),
]

mostrar_resultados(resultados)
