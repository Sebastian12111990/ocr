"""Lista y carga imágenes desde `DIRECTORIO_IMAGENES` (por defecto,
`computer vision/patentes`), sin modificar esa carpeta.

Basado en el patrón de `cargar_imagen()` de `computer vision/funciones_imagen.py`,
con dos añadidos: caché LRU de la imagen ya decodificada (para no releer el
JPEG en cada movimiento de slider) y validación de que la ruta pedida no
escape del directorio permitido.
"""

from functools import lru_cache
from pathlib import Path

import cv2

from config import DIRECTORIO_IMAGENES

EXTENSIONES_VALIDAS = {".jpg", ".jpeg", ".png", ".bmp"}


def listar_imagenes() -> list[dict]:
    resultado = []
    for archivo in sorted(DIRECTORIO_IMAGENES.iterdir()):
        if not archivo.is_file() or archivo.suffix.lower() not in EXTENSIONES_VALIDAS:
            continue
        imagen = cv2.imread(str(archivo))
        alto, ancho = (imagen.shape[0], imagen.shape[1]) if imagen is not None else (None, None)
        resultado.append({
            "nombre_archivo": archivo.name,
            "ruta_relativa": archivo.name,
            "ancho": ancho,
            "alto": alto,
        })
    return resultado


def _resolver_ruta(ruta_relativa: str) -> Path:
    candidata = (DIRECTORIO_IMAGENES / ruta_relativa).resolve()
    try:
        candidata.relative_to(DIRECTORIO_IMAGENES)
    except ValueError:
        raise ValueError(f"Ruta fuera del directorio permitido: {ruta_relativa}")
    if not candidata.is_file():
        raise FileNotFoundError(f"No existe la imagen: {ruta_relativa}")
    return candidata


@lru_cache(maxsize=32)
def _cargar_cacheada(ruta_absoluta: str):
    imagen = cv2.imread(ruta_absoluta)
    if imagen is None:
        raise FileNotFoundError(f"No se pudo leer: {ruta_absoluta}")
    return imagen


def cargar_imagen(ruta_relativa: str):
    """Devuelve siempre una copia: el pipeline muta la imagen en el sitio,
    y la entrada cacheada no debe corromperse entre pedidos."""
    ruta = _resolver_ruta(ruta_relativa)
    return _cargar_cacheada(str(ruta)).copy()
