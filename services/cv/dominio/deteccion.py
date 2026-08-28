"""Detección de rectángulos candidatos, compartida entre la etapa
`rectangulos` (que sólo dibuja) y `candidatos.py` (que además recorta y
corre OCR sobre cada uno). Única fuente de verdad para no duplicar la
lógica de contornos en dos lugares.
"""

import cv2
import numpy as np

from .canales import a_gris


def _angulo_respecto_horizontal(rectangulo) -> float:
    """Ángulo firmado del lado más largo, normalizado entre -90° y 90°."""
    vertices = cv2.boxPoints(rectangulo)
    lados = np.roll(vertices, -1, axis=0) - vertices
    lado_largo = lados[int(np.argmax(np.linalg.norm(lados, axis=1)))]
    angulo = float(np.degrees(np.arctan2(lado_largo[1], lado_largo[0])))
    return (angulo + 90.0) % 180.0 - 90.0


def _interseccion_sobre_union(caja_a: tuple, caja_b: tuple) -> float:
    xa, ya, ancho_a, alto_a = caja_a
    xb, yb, ancho_b, alto_b = caja_b

    x_izq = max(xa, xb)
    y_arriba = max(ya, yb)
    x_der = min(xa + ancho_a, xb + ancho_b)
    y_abajo = min(ya + alto_a, yb + alto_b)

    interseccion = max(0, x_der - x_izq) * max(0, y_abajo - y_arriba)
    union = ancho_a * alto_a + ancho_b * alto_b - interseccion
    return interseccion / union if union > 0 else 0.0


def detectar_rectangulos(
    imagen: np.ndarray,
    area_minima: float,
    aspecto_minimo: float,
    ocupacion_minima: float,
    angulo_maximo: float,
    umbral_bajo: int,
    umbral_alto: int,
) -> list[dict]:
    """Devuelve los rectángulos que cumplen los filtros, ordenados por área
    descendente y sin duplicados casi idénticos (el contorno interior y
    exterior del mismo objeto suelen pasar ambos el filtro). Cada uno es
    `{"rectangulo": cv2.minAreaRect(...), "area": float}`."""
    gris = a_gris(imagen)
    # En modo libre es habitual colocar "Bordes (Canny)" antes de esta
    # etapa. Si la entrada ya contiene solamente 0 y 255, volver a aplicar
    # Canny borra muchos contornos y evita que los rectángulos se dibujen.
    es_mapa_de_bordes = bool(np.all((gris == 0) | (gris == 255)))
    bordes = gris if es_mapa_de_bordes else cv2.Canny(gris, umbral_bajo, umbral_alto)
    contornos, _ = cv2.findContours(bordes, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    candidatos = []
    for contorno in contornos:
        rectangulo = cv2.minAreaRect(contorno)
        (_centro_x, _centro_y), (ancho, alto), _angulo = rectangulo
        if ancho == 0 or alto == 0:
            continue

        area_rectangulo = ancho * alto
        aspecto = max(ancho, alto) / min(ancho, alto)
        ocupacion = cv2.contourArea(contorno) / area_rectangulo
        angulo_horizontal = _angulo_respecto_horizontal(rectangulo)
        if (
            area_rectangulo >= area_minima
            and aspecto >= aspecto_minimo
            and ocupacion >= ocupacion_minima
            and abs(angulo_horizontal) <= angulo_maximo
        ):
            candidatos.append({
                "rectangulo": rectangulo,
                "area": area_rectangulo,
                "angulo_horizontal": angulo_horizontal,
            })

    candidatos.sort(key=lambda c: c["area"], reverse=True)

    unicos: list[dict] = []
    cajas_aceptadas: list[tuple] = []
    for candidato in candidatos:
        caja = cv2.boundingRect(np.intp(cv2.boxPoints(candidato["rectangulo"])))
        if any(_interseccion_sobre_union(caja, existente) > 0.5 for existente in cajas_aceptadas):
            continue
        unicos.append(candidato)
        cajas_aceptadas.append(caja)

    return unicos
