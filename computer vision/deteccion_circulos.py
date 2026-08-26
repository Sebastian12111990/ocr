import sys
from pathlib import Path

import cv2
import numpy as np

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_gris, mostrar_resultados, cargar_imagen

puntos = cargar_imagen("imagenes/puntos.jpg")

found, esquinas = cv2.findCirclesGrid(puntos, (10, 10), cv2.CALIB_CB_SYMMETRIC_GRID)

cuadricula_puntos = puntos.copy()
if found:
    cv2.drawChessboardCorners(cuadricula_puntos, (10, 10), esquinas, found)

resultados = [
    ("Tablero plano - Original"      , puntos),
    ("Tablero Plano - THRESH_BINARY" , cuadricula_puntos     ),
 
 
]

mostrar_resultados(resultados)
