import sys
from pathlib import Path

import cv2
import numpy as np

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_gris, mostrar_resultados

aj_plano = cargar_gris("imagenes/tablero.jpg")

ret, th1 = cv2.threshold(aj_plano, 160, 255, cv2.THRESH_BINARY)
found, esquinas = cv2.findChessboardCorners(th1, (7, 7))

cuadricula = th1.copy()
if found:
    cv2.drawChessboardCorners(cuadricula, (7, 7), esquinas, found)

resultados = [
    ("Tablero plano - Original"      , aj_plano),
    ("Tablero Plano - THRESH_BINARY" , th1     ),
    ("Tablero Plano - Cuadricula"    , cuadricula)
 
]

mostrar_resultados(resultados)
