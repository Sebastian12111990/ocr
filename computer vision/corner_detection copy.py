import sys
from pathlib import Path

import cv2
import numpy as np

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_rgb, mostrar_resultados


def detectar_esquinas_harris(imagen):
    """Devuelve la imagen gris y una copia con las esquinas marcadas."""
    imagen_gris = cv2.cvtColor(imagen, cv2.COLOR_RGB2GRAY)
    imagen_float = np.float32(imagen_gris)

    esquinas = cv2.cornerHarris(
        src=imagen_float,
        blockSize=2,
        ksize=3,
        k=0.04,
    )
    esquinas = cv2.dilate(esquinas, None)

    imagen_detectada = imagen.copy()
    imagen_detectada[esquinas > 0.1 * esquinas.max()] = [255, 0, 0]
    return imagen_gris, imagen_detectada


def detectar_esquinas_shi_tomasi(imagen, max_esquinas=5):
    """Marca las mejores esquinas detectadas con Shi–Tomasi."""
    imagen_gris = cv2.cvtColor(imagen, cv2.COLOR_RGB2GRAY)
    esquinas = cv2.goodFeaturesToTrack(
        imagen_gris,
        maxCorners=81,
        qualityLevel=0.01,
        minDistance=10,
    )

    imagen_detectada = imagen.copy()
    if esquinas is not None:
        esquinas = np.intp(esquinas)
        for esquina in esquinas:
            x, y = esquina.ravel()
            cv2.circle(imagen_detectada, (x, y), 5, (255, 0, 0), -1)

    return imagen_detectada


aj_plano = cargar_rgb("patentes/PRVZ53.JPG")
aj_plano_gris, aj_plano_detectado = detectar_esquinas_harris(aj_plano)
aj_plano_shi_tomasi = detectar_esquinas_shi_tomasi(aj_plano)


resultados = [
    ("Tablero plano - Original", aj_plano),
    ("Tablero plano - Escala de grises", aj_plano_gris, "gray"),
    ("Tablero plano - Esquinas Harris", aj_plano_detectado),
    ("Tablero plano - Esquinas Shi-Tomasi", aj_plano_shi_tomasi),
]

mostrar_resultados(resultados)
