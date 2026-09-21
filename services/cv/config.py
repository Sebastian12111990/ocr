import os
from pathlib import Path

from dotenv import load_dotenv

DIRECTORIO_SERVICIO = Path(__file__).resolve().parent
DIRECTORIO_REPO = DIRECTORIO_SERVICIO.parent.parent
load_dotenv(DIRECTORIO_SERVICIO / ".env")

DIRECTORIO_IMAGENES = Path(
    os.getenv("DIRECTORIO_IMAGENES")
    or DIRECTORIO_REPO / "computer vision" / "patentes"
).resolve()

TESSERACT_CMD = os.getenv("TESSERACT_CMD")  # ruta al binario en Windows si no está en PATH

PUERTO = int(os.getenv("PUERTO", "8000"))
