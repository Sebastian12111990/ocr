import sys
from pathlib import Path

import cv2
import matplotlib.pyplot as plt

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_rgb


entero_perro = cargar_rgb("patentes/PRVZ53.JPG")
cara_perro = cargar_rgb("patentes/patente2.jpg")

metodos = {
    "cv2.TM_CCOEFF": cv2.TM_CCOEFF,
    "cv2.TM_CCOEFF_NORMED": cv2.TM_CCOEFF_NORMED,
    "cv2.TM_CCORR": cv2.TM_CCORR,
    "cv2.TM_CCORR_NORMED": cv2.TM_CCORR_NORMED,
    "cv2.TM_SQDIFF": cv2.TM_SQDIFF,
    "cv2.TM_SQDIFF_NORMED": cv2.TM_SQDIFF_NORMED,
}

for nombre, metodo in metodos.items():

    # Copia de la imagen entera
    copia = entero_perro.copy()

    # Template Matching
    res = cv2.matchTemplate(copia, cara_perro, metodo)

    # Extraemos mínimos, máximos y sus posiciones
    min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)

    # Escogemos los métodos que funcionan con el mínimo
    if metodo in [cv2.TM_SQDIFF, cv2.TM_SQDIFF_NORMED]:
        esquina_izquierda = min_loc  # (x, y)
    else:
        esquina_izquierda = max_loc

    # Extraemos el tamaño de la cara
    alto, ancho, canales = cara_perro.shape

    # Asignamos la esquina derecha e inferior de nuestro rectángulo
    esquina_derecha = (
        esquina_izquierda[0] + ancho,
        esquina_izquierda[1] + alto,
    )

    # Dibujamos el rectángulo
    cv2.rectangle(copia, esquina_izquierda, esquina_derecha, (255, 0, 0), 10)

    # Creamos un subplot de 1 fila por 2 columnas
    # y posicionamos el resultado en la primera columna
    plt.subplot(121)
    plt.imshow(res, cmap="gray")
    plt.title("Resultado")

    # Posicionamos la detección en la segunda columna
    plt.subplot(122)
    plt.imshow(copia)
    plt.title("Detección")

    # Mostramos el nombre del método y la figura
    plt.suptitle(nombre)
    plt.show()
