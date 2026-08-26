"""OCR con Tesseract sobre la imagen ya procesada por el pipeline.

`--psm 7` trata la imagen como una sola línea de texto (correcto para una
patente ya recortada/binarizada) y la whitelist restringe el alfabeto a lo
que puede aparecer en una matrícula chilena.
"""

import numpy as np
import pytesseract

from config import TESSERACT_CMD

if TESSERACT_CMD:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

_CONFIGURACION = "--psm 7 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def reconocer_texto(imagen_procesada: np.ndarray) -> tuple[str, float]:
    texto_bruto = pytesseract.image_to_string(imagen_procesada, config=_CONFIGURACION)
    texto = "".join(caracter for caracter in texto_bruto if caracter.isalnum()).upper()

    datos = pytesseract.image_to_data(
        imagen_procesada, config=_CONFIGURACION, output_type=pytesseract.Output.DICT
    )
    confianzas = []
    for valor in datos.get("conf", []):
        try:
            numero = float(valor)
        except (TypeError, ValueError):
            continue
        if numero >= 0:
            confianzas.append(numero)

    confianza = sum(confianzas) / len(confianzas) if confianzas else 0.0
    return texto, confianza
