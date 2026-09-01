"""Candidatos a placa: recorta cada rectángulo detectado sobre la imagen ya
procesada por el pipeline y corre OCR sobre el recorte por separado — en vez
de un solo texto para la imagen completa, varias lecturas acotadas a cada
región que parece una patente.
"""

import base64

import cv2
import numpy as np
import pytesseract

from .canales import a_color, a_gris
from .catalogo import obtener_etapa
from .deteccion import detectar_rectangulos
from .ocr import reconocer_texto

# Reutiliza los valores por defecto de la etapa "rectangulos" del catálogo:
# una sola fuente de verdad para esos cinco números.
_DEFECTOS_DETECCION = {p.nombre: p.defecto for p in obtener_etapa("rectangulos").parametros}


def _caja_del_rectangulo(imagen: np.ndarray, rectangulo) -> tuple[int, int, int, int]:
    vertices = np.intp(cv2.boxPoints(rectangulo))
    x, y, ancho, alto = cv2.boundingRect(vertices)
    alto_imagen, ancho_imagen = imagen.shape[:2]

    x = max(x, 0)
    y = max(y, 0)
    ancho = min(ancho, ancho_imagen - x)
    alto = min(alto, alto_imagen - y)

    return x, y, ancho, alto


def _ordenar_vertices(vertices: np.ndarray) -> np.ndarray:
    """Ordena cuatro puntos como arriba-izq., arriba-der., abajo-der. y abajo-izq."""
    puntos = np.asarray(vertices, dtype=np.float32).reshape(4, 2)
    ordenados = np.empty((4, 2), dtype=np.float32)
    sumas = puntos.sum(axis=1)
    diferencias = np.diff(puntos, axis=1).reshape(-1)
    ordenados[0] = puntos[np.argmin(sumas)]
    ordenados[1] = puntos[np.argmin(diferencias)]
    ordenados[2] = puntos[np.argmax(sumas)]
    ordenados[3] = puntos[np.argmax(diferencias)]
    return ordenados


def _rectificar(imagen: np.ndarray, vertices: np.ndarray) -> np.ndarray:
    origen = _ordenar_vertices(vertices)
    arriba_izq, arriba_der, abajo_der, abajo_izq = origen
    ancho = max(
        int(round(np.linalg.norm(arriba_der - arriba_izq))),
        int(round(np.linalg.norm(abajo_der - abajo_izq))),
    )
    alto = max(
        int(round(np.linalg.norm(abajo_izq - arriba_izq))),
        int(round(np.linalg.norm(abajo_der - arriba_der))),
    )
    if ancho < 2 or alto < 2:
        return np.empty((0, 0), dtype=imagen.dtype)

    destino = np.array(
        [[0, 0], [ancho - 1, 0], [ancho - 1, alto - 1], [0, alto - 1]],
        dtype=np.float32,
    )
    transformacion = cv2.getPerspectiveTransform(origen, destino)
    es_binaria = bool(np.all((imagen == 0) | (imagen == 255)))
    return cv2.warpPerspective(
        imagen,
        transformacion,
        (ancho, alto),
        flags=cv2.INTER_NEAREST if es_binaria else cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def _recortar(
    imagen: np.ndarray,
    candidato: dict,
    rectificar: bool,
) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    x, y, ancho, alto = _caja_del_rectangulo(imagen, candidato["rectangulo"])
    if rectificar:
        recorte = _rectificar(imagen, candidato["cuadrilatero"])
    else:
        recorte = imagen[y : y + alto, x : x + ancho]

    return recorte, (x, y, ancho, alto)


def _puntuar_lectura(lectura: tuple[str, float]) -> tuple[bool, float, int]:
    texto, confianza = lectura
    # Las patentes chilenas del conjunto tienen seis caracteres. La confianza
    # de Tesseract suele ser 0 para recortes binarios, así que el formato debe
    # desempatar antes que ese número.
    return len(texto) == 6, confianza, -abs(len(texto) - 6)


def _preparar_para_ocr(imagen: np.ndarray) -> np.ndarray:
    """Quita el marco de la placa y agrega aire para que PSM 7 aísle el texto."""
    gris = a_gris(imagen)
    alto, ancho = gris.shape[:2]
    margen_x = int(round(ancho * 0.03)) if ancho >= 40 else 0
    margen_y = int(round(alto * 0.05)) if alto >= 30 else 0
    if ancho - 2 * margen_x >= 2 and alto - 2 * margen_y >= 2:
        gris = gris[margen_y : alto - margen_y, margen_x : ancho - margen_x]

    es_binaria = bool(np.all((gris == 0) | (gris == 255)))
    if not es_binaria:
        _umbral, gris = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    alto, ancho = gris.shape[:2]
    centro = gris[alto // 4 : max(alto // 4 + 1, 3 * alto // 4),
                  ancho // 4 : max(ancho // 4 + 1, 3 * ancho // 4)]
    if centro.size > 0 and float(centro.mean()) < 127:
        gris = cv2.bitwise_not(gris)

    factor = max(1.0, 120.0 / max(1, gris.shape[0]))
    if factor > 1.0:
        gris = cv2.resize(
            gris,
            None,
            fx=factor,
            fy=factor,
            interpolation=cv2.INTER_NEAREST if es_binaria else cv2.INTER_CUBIC,
        )

    margen = max(10, int(round(gris.shape[0] * 0.12)))
    return cv2.copyMakeBorder(
        gris,
        margen,
        margen,
        margen,
        margen,
        cv2.BORDER_CONSTANT,
        value=255,
    )


def obtener_candidatos(imagen: np.ndarray, parametros_deteccion: dict, limite: int = 20) -> list[dict]:
    parametros = {**_DEFECTOS_DETECCION, **parametros_deteccion}
    detectados = detectar_rectangulos(
        imagen,
        area_minima=float(parametros["area_minima"]),
        aspecto_minimo=float(parametros["aspecto_minimo"]),
        ocupacion_minima=float(parametros["ocupacion_minima"]),
        angulo_maximo=float(parametros["angulo_maximo"]),
        umbral_bajo=int(parametros["umbral_bajo"]),
        umbral_alto=int(parametros["umbral_alto"]),
        modo_recuperacion=str(parametros["modo_recuperacion"]),
        metodo_aproximacion=str(parametros["metodo_aproximacion"]),
    )[:limite]

    resultados = []
    rectificar = bool(parametros["rectificar_candidatos"])
    for candidato in detectados:
        recorte, (x, y, ancho, alto) = _recortar(imagen, candidato, rectificar)
        if recorte.size == 0:
            continue

        recorte_color = a_color(recorte)
        try:
            lecturas = [reconocer_texto(recorte_color)]
            if rectificar:
                lecturas.append(reconocer_texto(_preparar_para_ocr(recorte_color)))
                recorte_original = imagen[y : y + alto, x : x + ancho]
                if recorte_original.size > 0:
                    # La perspectiva puede ayudar o perjudicar según la calidad
                    # de las esquinas. Conservamos la lectura más plausible.
                    recorte_original_color = a_color(recorte_original)
                    lecturas.insert(0, reconocer_texto(_preparar_para_ocr(recorte_original_color)))
                    lecturas.insert(0, reconocer_texto(recorte_original_color))
            texto, confianza = max(lecturas, key=_puntuar_lectura)
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
