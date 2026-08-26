"""Ejecuta un pipeline (array ordenado de etapas) sobre una imagen.

Antes de invocar cada etapa, convierte la imagen al número de canales que esa
etapa declara necesitar en el catálogo (`entrada`), y normaliza el resultado
al número de canales declarado (`salida`). Así el pipeline nunca falla por
incompatibilidad de canales entre etapas encadenadas en cualquier orden
(modo libre) — ver la sección "problema de canales" del diseño.
"""

import numpy as np

from .canales import a_color, a_gris
from .catalogo import obtener_etapa
from .etapas import DESPACHADOR


def ejecutar_pipeline(imagen_inicial: np.ndarray, lista_etapas: list[dict]) -> np.ndarray:
    imagen_actual = imagen_inicial
    for etapa_solicitada in lista_etapas:
        if not etapa_solicitada.get("activa", True):
            continue

        tipo = etapa_solicitada["tipo"]
        definicion = obtener_etapa(tipo)
        funcion = DESPACHADOR[tipo]
        parametros = etapa_solicitada.get("parametros", {})

        if definicion.entrada == "gris":
            entrada = a_gris(imagen_actual)
        elif definicion.entrada == "color":
            entrada = a_color(imagen_actual)
        else:
            entrada = imagen_actual

        resultado = funcion(entrada, parametros)

        if definicion.salida == "color":
            imagen_actual = a_color(resultado)
        else:
            imagen_actual = a_gris(resultado)

    return imagen_actual
