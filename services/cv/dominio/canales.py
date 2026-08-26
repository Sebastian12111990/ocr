"""Conversión implícita de canales entre etapas del pipeline.

Cada etapa declara en el catálogo cuántos canales necesita de entrada y
cuántos produce de salida; el pipeline usa estas dos funciones para que la
imagen nunca llegue con la forma equivocada a una etapa, sin que el usuario
tenga que preocuparse por eso en modo libre.
"""

import cv2
import numpy as np


def a_color(imagen: np.ndarray) -> np.ndarray:
    if imagen.ndim == 2:
        return cv2.cvtColor(imagen, cv2.COLOR_GRAY2BGR)
    return imagen


def a_gris(imagen: np.ndarray) -> np.ndarray:
    if imagen.ndim == 2:
        return imagen
    return cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
