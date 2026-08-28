"""Candidatos a placa: recorta cada rectángulo detectado sobre la imagen ya
procesada por el pipeline y corre OCR sobre el recorte por separado — en vez
de un solo texto para la imagen completa, varias lecturas acotadas a cada
región que parece una patente.
"""

import base64

import cv2
import numpy as np
import pytesseract

from .canales import a_color
from .catalogo import obtener_etapa
from .deteccion import detectar_rectangulos
from .ocr import reconocer_texto

# Reutiliza los valores por defecto de la etapa "rectangulos" del catálogo:
# una sola fuente de verdad para esos cinco números.
_DEFECTOS_DETECCION = {p.nombre: p.defecto for p in obtener_etapa("rectangulos").parametros}


def _recortar(imagen: np.ndarray, rectangulo) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    vertices = np.intp(cv2.boxPoints(rectangulo))
    x, y, ancho, alto = cv2.boundingRect(vertices)
    alto_imagen, ancho_imagen = imagen.shape[:2]

    x = max(x, 0)
    y = max(y, 0)
    ancho = min(ancho, ancho_imagen - x)
    alto = min(alto, alto_imagen - y)

    return imagen[y : y + alto, x : x + ancho], (x, y, ancho, alto)


def obtener_candidatos(imagen: np.ndarray, parametros_deteccion: dict, limite: int = 5) -> list[dict]:
    parametros = {**_DEFECTOS_DETECCION, **parametros_deteccion}
    detectados = detectar_rectangulos(
        imagen,
        area_minima=float(parametros["area_minima"]),
        aspecto_minimo=float(parametros["aspecto_minimo"]),
        ocupacion_minima=float(parametros["ocupacion_minima"]),
        angulo_maximo=float(parametros["angulo_maximo"]),
        umbral_bajo=int(parametros["umbral_bajo"]),
        umbral_alto=int(parametros["umbral_alto"]),
    )[:limite]

    resultados = []
    for candidato in detectados:
        recorte, (x, y, ancho, alto) = _recortar(imagen, candidato["rectangulo"])
        if recorte.size == 0:
            continue

        recorte_color = a_color(recorte)
        try:
            texto, confianza = reconocer_texto(recorte_color)
        except pytesseract.TesseractNotFoundError:
            texto, confianza = None, None

        ok, buffer = cv2.imencode(".png", recorte_color)
        imagen_base64 = base64.b64encode(buffer.tobytes()).decode("ascii") if ok else None

        angulo = candidato["angulo_horizontal"]
        resultados.append({
            "caja": {"x": x, "y": y, "ancho": ancho, "alto": alto, "angulo": angulo},
            "area": candidato["area"],
            "texto": texto,
            "confianza": confianza,
            "imagen_png_base64": imagen_base64,
        })

    return resultados
