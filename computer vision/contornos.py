import sys
from pathlib import Path

import cv2
import numpy as np

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_gris, mostrar_resultados

img = cargar_gris("imagenes/formas.png")

contornos, jerarquia = cv2.findContours(img, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE )

contornos_externos = np.zeros(img.shape)

contornos_externos.shape

for i in range(len(contornos)) :
    if jerarquia[0][i][3] == -1 :
        cv2.drawContours(contornos_externos, contornos, i , 255, -1)

contornos_internos = np.zeros(img.shape) 

contornos_internos.shape

for i in range(len(contornos)) :
    if jerarquia[0][i][3] != -1 :
        cv2.drawContours(contornos_internos, contornos, i , 255, -1)


resultados = [
    ("formas normal :"      , img),
    ("Contornos ext : " , contornos_externos),
    ("contornos_internos : " , contornos_internos)
 
 
]

mostrar_resultados(resultados)
