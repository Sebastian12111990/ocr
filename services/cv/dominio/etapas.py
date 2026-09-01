"""Una función pura por tipo de etapa: `(imagen, parametros) -> imagen`.

Portadas desde los scripts de `computer vision/` (sobre todo
`deteccion_objetos/corner_detection.py`), sin matplotlib y sin código a nivel
de módulo. El pipeline (`pipeline.py`) ya entrega la imagen con el número de
canales que cada etapa declara necesitar en el catálogo, así que estas
funciones no necesitan validar eso por su cuenta.
"""

import cv2
import numpy as np

from .canales import a_color, a_gris
from .deteccion import detectar_rectangulos

MARCA_ROJA = (0, 0, 255)  # BGR
MARCA_VERDE = (0, 255, 0)  # BGR


def _impar(n: int) -> int:
    return n if n % 2 == 1 else n + 1


def escala_gris(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    return a_gris(imagen)


_OPERACIONES_MORFOLOGICAS = {
    "Opening": cv2.MORPH_OPEN,
    "Closing": cv2.MORPH_CLOSE,
    "Gradient": cv2.MORPH_GRADIENT,
}


def morfologia(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    operacion = parametros.get("operacion", "Ninguno")
    if operacion not in _OPERACIONES_MORFOLOGICAS:
        return imagen
    kernel_size = _impar(int(parametros.get("kernel", 3)))
    kernel = np.ones((kernel_size, kernel_size), dtype=np.uint8)
    return cv2.morphologyEx(imagen, _OPERACIONES_MORFOLOGICAS[operacion], kernel)


def canny(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    bajo = int(parametros.get("umbral_bajo", 50))
    alto = int(parametros.get("umbral_alto", 150))
    return cv2.Canny(imagen, bajo, alto)


def harris(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    block_size = int(parametros.get("block_size", 2))
    ksize = _impar(int(parametros.get("ksize", 3)))
    k = float(parametros.get("k", 0.04))
    umbral = float(parametros.get("umbral", 0.10))
    dilatacion_iter = int(parametros.get("dilatacion", 1))

    gris = a_gris(imagen)
    esquinas = cv2.cornerHarris(np.float32(gris), blockSize=block_size, ksize=ksize, k=k)
    if dilatacion_iter > 0:
        esquinas = cv2.dilate(esquinas, None, iterations=dilatacion_iter)

    resultado = imagen.copy()
    resultado[esquinas > umbral * esquinas.max()] = MARCA_ROJA
    return resultado


def cuadricula(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    gris = a_gris(imagen)
    encontrada, esquinas = cv2.findChessboardCorners(gris, (7, 7))
    canvas = a_color(gris)
    if encontrada:
        cv2.drawChessboardCorners(canvas, (7, 7), esquinas, encontrada)
    return canvas


def rectangulos(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    if not bool(parametros.get("dibujar_rectangulos", True)):
        return imagen

    candidatos = detectar_rectangulos(
        imagen,
        area_minima=float(parametros.get("area_minima", 1000)),
        aspecto_minimo=float(parametros.get("aspecto_minimo", 1.5)),
        ocupacion_minima=float(parametros.get("ocupacion_minima", 0.5)),
        angulo_maximo=float(parametros.get("angulo_maximo", 25)),
        umbral_bajo=int(parametros.get("umbral_bajo", 50)),
        umbral_alto=int(parametros.get("umbral_alto", 150)),
        modo_recuperacion=str(parametros.get("modo_recuperacion", "RETR_LIST")),
        metodo_aproximacion=str(parametros.get("metodo_aproximacion", "CHAIN_APPROX_SIMPLE")),
    )[:20]
    canvas = a_color(imagen)
    grosor_linea = max(1, min(10, int(parametros.get("grosor_linea", 1))))
    for candidato in candidatos:
        vertices = np.intp(cv2.boxPoints(candidato["rectangulo"]))
        cv2.drawContours(canvas, [vertices], 0, MARCA_VERDE, grosor_linea)
    return canvas


_TIPOS_THRESHOLD = {
    "BINARY": cv2.THRESH_BINARY,
    "BINARY_INV": cv2.THRESH_BINARY_INV,
    "TRUNC": cv2.THRESH_TRUNC,
    "TOZERO": cv2.THRESH_TOZERO,
    "OTSU": cv2.THRESH_BINARY + cv2.THRESH_OTSU,
}


def threshold(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    tipo = parametros.get("tipo", "BINARY")
    flag = _TIPOS_THRESHOLD.get(tipo, cv2.THRESH_BINARY)
    umbral = float(parametros.get("umbral", 127))
    valor_maximo = float(parametros.get("valor_maximo", 255))
    _, resultado = cv2.threshold(imagen, umbral, valor_maximo, flag)
    return resultado


def umbral_adaptativo(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    metodo = (
        cv2.ADAPTIVE_THRESH_MEAN_C
        if parametros.get("metodo", "MEAN_C") == "MEAN_C"
        else cv2.ADAPTIVE_THRESH_GAUSSIAN_C
    )
    tamano_bloque = _impar(int(parametros.get("tamano_bloque", 11)))
    c = float(parametros.get("c", 10))
    return cv2.adaptiveThreshold(imagen, 255, metodo, cv2.THRESH_BINARY, tamano_bloque, c)


def desenfoque(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    k = _impar(int(parametros.get("ksize", 5)))
    return cv2.blur(imagen, (k, k))


def desenfoque_gaussiano(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    k = _impar(int(parametros.get("ksize", 5)))
    return cv2.GaussianBlur(imagen, (k, k), 0)


def desenfoque_mediana(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    k = _impar(int(parametros.get("ksize", 5)))
    return cv2.medianBlur(imagen, k)


def gamma(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    valor_gamma = float(parametros.get("gamma", 1.0))
    normalizada = imagen.astype(np.float32) / 255.0
    corregida = np.power(normalizada, valor_gamma)
    return np.uint8(np.clip(corregida * 255.0, 0, 255))


def sobel(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    k = int(parametros.get("ksize", 5))
    if k not in (1, 3, 5, 7):
        k = 5
    gx = cv2.Sobel(imagen, cv2.CV_64F, 1, 0, ksize=k)
    gy = cv2.Sobel(imagen, cv2.CV_64F, 0, 1, ksize=k)
    return cv2.addWeighted(cv2.convertScaleAbs(gx), 0.5, cv2.convertScaleAbs(gy), 0.5, 0)


def erosion(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    k = _impar(int(parametros.get("kernel", 5)))
    iteraciones = int(parametros.get("iteraciones", 1))
    kernel = np.ones((k, k), dtype=np.uint8)
    return cv2.erode(imagen, kernel, iterations=iteraciones)


def dilatacion(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    k = _impar(int(parametros.get("kernel", 5)))
    iteraciones = int(parametros.get("iteraciones", 1))
    kernel = np.ones((k, k), dtype=np.uint8)
    return cv2.dilate(imagen, kernel, iterations=iteraciones)


def redimensionar(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    factor = max(float(parametros.get("factor", 1.0)), 0.01)
    return cv2.resize(imagen, (0, 0), fx=factor, fy=factor)


def shi_tomasi(imagen: np.ndarray, parametros: dict) -> np.ndarray:
    max_esquinas = int(parametros.get("max_esquinas", 81))
    calidad = float(parametros.get("calidad", 0.01))
    distancia_minima = float(parametros.get("distancia_minima", 10))

    gris = a_gris(imagen)
    esquinas = cv2.goodFeaturesToTrack(
        gris, maxCorners=max_esquinas, qualityLevel=calidad, minDistance=distancia_minima,
    )
    canvas = a_color(imagen)
    if esquinas is not None:
        for esquina in np.intp(esquinas):
            x, y = esquina.ravel()
            cv2.circle(canvas, (int(x), int(y)), 5, MARCA_ROJA, -1)
    return canvas


DESPACHADOR = {
    "escala_gris": escala_gris,
    "morfologia": morfologia,
    "canny": canny,
    "harris": harris,
    "cuadricula": cuadricula,
    "rectangulos": rectangulos,
    "threshold": threshold,
    "umbral_adaptativo": umbral_adaptativo,
    "desenfoque": desenfoque,
    "desenfoque_gaussiano": desenfoque_gaussiano,
    "desenfoque_mediana": desenfoque_mediana,
    "gamma": gamma,
    "sobel": sobel,
    "erosion": erosion,
    "dilatacion": dilatacion,
    "redimensionar": redimensionar,
    "shi_tomasi": shi_tomasi,
}
