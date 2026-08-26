from pathlib import Path

import cv2
import matplotlib.pyplot as plt
from matplotlib.widgets import Button


DIRECTORIO_BASE = Path(__file__).parent


def cargar_imagen(ruta, modo=cv2.IMREAD_COLOR):
    """Carga una imagen y produce un error claro si no se puede leer."""
    ruta = Path(ruta)
    if not ruta.is_absolute():
        ruta = DIRECTORIO_BASE / ruta

    imagen = cv2.imread(str(ruta), modo)
    if imagen is None:
        raise FileNotFoundError(f"No se pudo cargar la imagen: {ruta}")
    return imagen


def cargar_rgb(ruta):
    """Carga una imagen de color y la convierte de BGR a RGB."""
    imagen = cargar_imagen(ruta)
    return cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)


def cargar_gris(ruta):
    """Carga una imagen directamente en escala de grises."""
    return cargar_imagen(ruta, cv2.IMREAD_GRAYSCALE)


def display_img(imagen, figsize=(10, 10), cmap="gray"):
    """Muestra una imagen sin ejes usando Matplotlib."""
    fig = plt.figure(figsize=figsize)
    ax = fig.add_subplot(111)
    ax.imshow(imagen, cmap=cmap)
    ax.axis("off")
    plt.show()


class VisorResultados:
    """Visor reutilizable para recorrer imágenes en una sola ventana."""

    def __init__(self, resultados, figsize=(10, 8)):
        if not resultados:
            raise ValueError("El visor necesita al menos un resultado.")

        self.resultados = resultados
        self.indice = 0

        self.figura, self.eje = plt.subplots(figsize=figsize)
        self.figura.subplots_adjust(bottom=0.16)

        eje_anterior = self.figura.add_axes((0.32, 0.04, 0.15, 0.06))
        eje_siguiente = self.figura.add_axes((0.53, 0.04, 0.15, 0.06))
        self.boton_anterior = Button(eje_anterior, "Anterior")
        self.boton_siguiente = Button(eje_siguiente, "Siguiente")

        self.boton_anterior.on_clicked(self.anterior)
        self.boton_siguiente.on_clicked(self.siguiente)
        self.figura.canvas.mpl_connect("key_press_event", self.usar_teclado)

        self.actualizar()

    def actualizar(self):
        titulo, imagen = self.resultados[self.indice][:2]
        if len(self.resultados[self.indice]) > 2:
            cmap = self.resultados[self.indice][2]
        else:
            cmap = "gray" if imagen.ndim == 2 else None

        self.eje.clear()
        self.eje.imshow(imagen, cmap=cmap)
        self.eje.set_title(f"{titulo} ({self.indice + 1}/{len(self.resultados)})")
        self.eje.axis("off")
        self.figura.canvas.draw_idle()

    def siguiente(self, _evento=None):
        self.indice = (self.indice + 1) % len(self.resultados)
        self.actualizar()

    def anterior(self, _evento=None):
        self.indice = (self.indice - 1) % len(self.resultados)
        self.actualizar()

    def usar_teclado(self, evento):
        if evento.key in ("right", "d"):
            self.siguiente()
        elif evento.key in ("left", "a"):
            self.anterior()

    def mostrar(self):
        plt.show()


def mostrar_resultados(resultados, figsize=(10, 8)):
    """Abre un visor navegable y devuelve su instancia."""
    visor = VisorResultados(resultados, figsize)
    visor.mostrar()
    return visor
