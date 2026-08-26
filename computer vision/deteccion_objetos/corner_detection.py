import sys
from pathlib import Path

import cv2
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.widgets import Button, RadioButtons, Slider

# Permite importar el módulo compartido al ejecutar este archivo directamente.
directorio_principal = Path(__file__).resolve().parent.parent
if str(directorio_principal) not in sys.path:
    sys.path.insert(0, str(directorio_principal))

from funciones_imagen import cargar_rgb


def detectar_esquinas_harris(
    imagen, block_size=2, ksize=3, k=0.04, umbral=0.1, dilatacion=1,
    operacion_morfologica="Ninguno", kernel_morfologico=3,
    harris_activo=True, bordes_activos=False, canny_bajo=50, canny_alto=150,
    cuadricula_activa=False, escala_gris=False, rectangulos_activos=False,
    area_minima=1000, aspecto_minimo=1.5,
):
    """Aplica cada filtro en orden, usando como entrada el resultado anterior."""
    imagen_procesada = imagen.copy()
    if escala_gris:
        gris_inicial = cv2.cvtColor(imagen_procesada, cv2.COLOR_RGB2GRAY)
        imagen_procesada = cv2.cvtColor(gris_inicial, cv2.COLOR_GRAY2RGB)

    operaciones = {
        "Opening": cv2.MORPH_OPEN,
        "Closing": cv2.MORPH_CLOSE,
        "Gradient": cv2.MORPH_GRADIENT,
    }
    if operacion_morfologica in operaciones:
        kernel = np.ones(
            (kernel_morfologico, kernel_morfologico), dtype=np.uint8
        )
        imagen_procesada = cv2.morphologyEx(
            imagen_procesada, operaciones[operacion_morfologica], kernel
        )

    imagen_gris = cv2.cvtColor(imagen_procesada, cv2.COLOR_RGB2GRAY)
    if bordes_activos:
        imagen_gris = cv2.Canny(imagen_gris, canny_bajo, canny_alto)
        imagen_procesada = cv2.cvtColor(imagen_gris, cv2.COLOR_GRAY2RGB)

    if harris_activo:
        esquinas = cv2.cornerHarris(
            src=np.float32(imagen_gris),
            blockSize=block_size,
            ksize=ksize,
            k=k,
        )
        if dilatacion > 0:
            esquinas = cv2.dilate(esquinas, None, iterations=dilatacion)
        imagen_procesada[esquinas > umbral * esquinas.max()] = [255, 0, 0]

    if cuadricula_activa:
        encontrada, esquinas_cuadricula = cv2.findChessboardCorners(
            imagen_gris, (7, 7)
        )
        if encontrada:
            cv2.drawChessboardCorners(
                imagen_procesada, (7, 7), esquinas_cuadricula, encontrada
            )

    if rectangulos_activos:
        imagen_para_contornos = (
            imagen_gris
            if bordes_activos
            else cv2.Canny(imagen_gris, canny_bajo, canny_alto)
        )
        contornos, _ = cv2.findContours(
            imagen_para_contornos, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE
        )
        for contorno in contornos:
            rectangulo = cv2.minAreaRect(contorno)
            (centro_x, centro_y), (ancho, alto), angulo = rectangulo
            if ancho == 0 or alto == 0:
                continue

            area_rectangulo = ancho * alto
            aspecto = max(ancho, alto) / min(ancho, alto)
            ocupacion = cv2.contourArea(contorno) / area_rectangulo
            if (
                area_rectangulo >= area_minima
                and aspecto >= aspecto_minimo
                and ocupacion >= 0.5
            ):
                vertices = np.intp(cv2.boxPoints(rectangulo))
                cv2.drawContours(imagen_procesada, [vertices], 0, [0, 255, 0], 2)
                cv2.putText(
                    imagen_procesada,
                    f"{angulo:.1f} grados",
                    (int(centro_x), int(centro_y)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.45,
                    [0, 255, 0],
                    1,
                    cv2.LINE_AA,
                )
    return imagen_gris, imagen_procesada


def visualizar_harris(imagen):
    """Permite ajustar Harris en tiempo real mediante deslizadores."""
    figura = plt.figure(figsize=(14, 8), facecolor="#f4f6f8")
    eje = figura.add_axes((0.03, 0.07, 0.68, 0.86))
    eje.set_facecolor("#20252b")
    figura.text(
        0.85, 0.96, "CONTROLES DE DETECCION",
        ha="center", va="center", fontsize=13, fontweight="bold",
        color="#263238",
    )

    _, imagen_inicial = detectar_esquinas_harris(imagen)
    vista = eje.imshow(imagen_inicial)
    eje.set_title("Detector de esquinas Harris")
    eje.axis("off")
    estado = {
        "escala_gris": False,
        "harris_activo": True,
        "bordes_activos": False,
        "cuadricula_activa": False,
        "rectangulos_activos": False,
    }

    controles = {
        "block_size": Slider(
            figura.add_axes((0.78, 0.78, 0.17, 0.022)),
            "blockSize", 2, 20, valinit=2, valstep=1,
        ),
        "ksize": Slider(
            figura.add_axes((0.78, 0.72, 0.17, 0.022)),
            "ksize", 1, 15, valinit=3, valstep=2,
        ),
        "k": Slider(
            figura.add_axes((0.78, 0.66, 0.17, 0.022)),
            "k", 0.01, 0.10, valinit=0.04, valstep=0.005,
        ),
        "umbral": Slider(
            figura.add_axes((0.78, 0.60, 0.17, 0.022)),
            "Umbral", 0.01, 0.50, valinit=0.10, valstep=0.01,
        ),
        "dilatacion": Slider(
            figura.add_axes((0.78, 0.54, 0.17, 0.022)),
            "Dilatacion", 0, 3, valinit=1, valstep=1,
        ),
        "kernel_morfologico": Slider(
            figura.add_axes((0.78, 0.48, 0.17, 0.022)),
            "Kernel morf.", 1, 11, valinit=3, valstep=2,
        ),
        "canny_bajo": Slider(
            figura.add_axes((0.78, 0.42, 0.17, 0.022)),
            "Canny bajo", 0, 255, valinit=50, valstep=1,
        ),
        "canny_alto": Slider(
            figura.add_axes((0.78, 0.36, 0.17, 0.022)),
            "Canny alto", 0, 255, valinit=150, valstep=1,
        ),
        "area_minima": Slider(
            figura.add_axes((0.78, 0.30, 0.17, 0.022)),
            "Area min.", 100, 20000, valinit=1000, valstep=100,
        ),
        "aspecto_minimo": Slider(
            figura.add_axes((0.78, 0.24, 0.17, 0.022)),
            "Aspecto min.", 1.0, 8.0, valinit=1.5, valstep=0.1,
        ),
    }

    selector_morfologico = RadioButtons(
        figura.add_axes((0.76, 0.025, 0.19, 0.17), facecolor="#eef1f3"),
        ("Ninguno", "Opening", "Closing", "Gradient"),
        active=0,
    )
    selector_morfologico.ax.set_title("Operador morfologico", fontsize=10)

    boton_gris = Button(
        figura.add_axes((0.69, 0.85, 0.055, 0.055)),
        "Gris: OFF",
        color="#dfe4e8",
        hovercolor="#c8d6df",
    )
    boton_harris = Button(
        figura.add_axes((0.75, 0.85, 0.055, 0.055)),
        "Harris: ON",
        color="#b8e6c1", hovercolor="#9bd8a8",
    )
    boton_bordes = Button(
        figura.add_axes((0.81, 0.85, 0.055, 0.055)),
        "Bordes: OFF",
        color="#dfe4e8", hovercolor="#c8d6df",
    )
    boton_cuadricula = Button(
        figura.add_axes((0.87, 0.85, 0.06, 0.055)),
        "Cuadricula: OFF",
        color="#dfe4e8", hovercolor="#c8d6df",
    )
    boton_rectangulos = Button(
        figura.add_axes((0.94, 0.85, 0.055, 0.055)),
        "Rect: OFF",
        color="#dfe4e8", hovercolor="#c8d6df",
    )
    for boton in (
        boton_gris, boton_harris, boton_bordes,
        boton_cuadricula, boton_rectangulos,
    ):
        boton.label.set_fontsize(8)

    def actualizar(_valor=None):
        imagen_gris, resultado = detectar_esquinas_harris(
            imagen,
            block_size=int(controles["block_size"].val),
            ksize=int(controles["ksize"].val),
            k=controles["k"].val,
            umbral=controles["umbral"].val,
            dilatacion=int(controles["dilatacion"].val),
            operacion_morfologica=selector_morfologico.value_selected,
            kernel_morfologico=int(controles["kernel_morfologico"].val),
            harris_activo=estado["harris_activo"],
            bordes_activos=estado["bordes_activos"],
            canny_bajo=int(controles["canny_bajo"].val),
            canny_alto=int(controles["canny_alto"].val),
            cuadricula_activa=estado["cuadricula_activa"],
            escala_gris=estado["escala_gris"],
            rectangulos_activos=estado["rectangulos_activos"],
            area_minima=controles["area_minima"].val,
            aspecto_minimo=controles["aspecto_minimo"].val,
        )
        vista.set_data(resultado)
        figura.canvas.draw_idle()

    def alternar_escala_gris(_evento):
        estado["escala_gris"] = not estado["escala_gris"]
        texto = "ON" if estado["escala_gris"] else "OFF"
        boton_gris.label.set_text(f"Gris: {texto}")
        boton_gris.ax.set_facecolor("lightgreen" if estado["escala_gris"] else "0.85")
        actualizar()

    def alternar_harris(_evento):
        estado["harris_activo"] = not estado["harris_activo"]
        texto = "ON" if estado["harris_activo"] else "OFF"
        boton_harris.label.set_text(f"Harris: {texto}")
        boton_harris.ax.set_facecolor("lightgreen" if estado["harris_activo"] else "0.85")
        actualizar()

    def alternar_bordes(_evento):
        estado["bordes_activos"] = not estado["bordes_activos"]
        texto = "ON" if estado["bordes_activos"] else "OFF"
        boton_bordes.label.set_text(f"Bordes: {texto}")
        boton_bordes.ax.set_facecolor("lightcyan" if estado["bordes_activos"] else "0.85")
        actualizar()

    def alternar_cuadricula(_evento):
        estado["cuadricula_activa"] = not estado["cuadricula_activa"]
        texto = "ON" if estado["cuadricula_activa"] else "OFF"
        boton_cuadricula.label.set_text(f"Cuadricula: {texto}")
        boton_cuadricula.ax.set_facecolor(
            "khaki" if estado["cuadricula_activa"] else "0.85"
        )
        actualizar()

    def alternar_rectangulos(_evento):
        estado["rectangulos_activos"] = not estado["rectangulos_activos"]
        texto = "ON" if estado["rectangulos_activos"] else "OFF"
        boton_rectangulos.label.set_text(f"Rect: {texto}")
        boton_rectangulos.ax.set_facecolor(
            "palegreen" if estado["rectangulos_activos"] else "0.85"
        )
        actualizar()

    for control in controles.values():
        control.on_changed(actualizar)
    selector_morfologico.on_clicked(actualizar)
    boton_gris.on_clicked(alternar_escala_gris)
    boton_harris.on_clicked(alternar_harris)
    boton_bordes.on_clicked(alternar_bordes)
    boton_cuadricula.on_clicked(alternar_cuadricula)
    boton_rectangulos.on_clicked(alternar_rectangulos)

    plt.show()


def detectar_esquinas_shi_tomasi(imagen, max_esquinas=5):
    """Marca las mejores esquinas detectadas con Shi–Tomasi."""
    imagen_gris = cv2.cvtColor(imagen, cv2.COLOR_RGB2GRAY)
    esquinas = cv2.goodFeaturesToTrack(
        imagen_gris,
        maxCorners=81,
        qualityLevel=0.01,
        minDistance=10,
    )

    imagen_detectada = imagen.copy()
    if esquinas is not None:
        esquinas = np.intp(esquinas)
        for esquina in esquinas:
            x, y = esquina.ravel()
            cv2.circle(imagen_detectada, (x, y), 5, (255, 0, 0), -1)

    return imagen_detectada


patente = cargar_rgb("patentes/PRVZ53.JPG")
visualizar_harris(patente)
