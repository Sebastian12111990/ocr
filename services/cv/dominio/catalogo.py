"""Catálogo de etapas de procesamiento: única fuente de verdad.

El frontend renderiza sus controles a partir de este metadato — agregar un
filtro nuevo sólo requiere tocar este archivo. Cada `Etapa` describe también
cuántos canales de color acepta y produce, para que el pipeline resuelva las
conversiones automáticas entre etapas incompatibles (ver `pipeline.py`).
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Parametro:
    nombre: str
    etiqueta: str
    tipo: str  # "number" | "enum" | "boolean"
    minimo: float | None = None
    maximo: float | None = None
    paso: float | None = None
    defecto: object = None
    solo_impares: bool = False
    opciones: list[str] | None = None

    def to_dict(self) -> dict:
        datos = {
            "nombre": self.nombre,
            "etiqueta": self.etiqueta,
            "tipo": self.tipo,
            "defecto": self.defecto,
        }
        if self.minimo is not None:
            datos["minimo"] = self.minimo
        if self.maximo is not None:
            datos["maximo"] = self.maximo
        if self.paso is not None:
            datos["paso"] = self.paso
        if self.solo_impares:
            datos["solo_impares"] = True
        if self.opciones is not None:
            datos["opciones"] = self.opciones
        return datos


@dataclass(frozen=True)
class Etapa:
    tipo: str
    etiqueta: str
    categoria: str
    entrada: str  # "gris" | "color" | "cualquiera"
    salida: str  # "gris" | "color"
    orden_fijo: int | None  # posición en el modo fijo; None = sólo disponible en modo libre
    parametros: list[Parametro] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "tipo": self.tipo,
            "etiqueta": self.etiqueta,
            "categoria": self.categoria,
            "entrada": self.entrada,
            "salida": self.salida,
            "orden_fijo": self.orden_fijo,
            "parametros": [p.to_dict() for p in self.parametros],
        }


CATALOGO: list[Etapa] = [
    # --- Pipeline canónico de deteccion_objetos/corner_detection.py ---
    Etapa(
        tipo="escala_gris",
        etiqueta="Escala de grises",
        categoria="color",
        entrada="cualquiera",
        salida="color",
        orden_fijo=1,
        parametros=[],
    ),
    Etapa(
        tipo="morfologia",
        etiqueta="Operación morfológica",
        categoria="morfologia",
        entrada="cualquiera",
        salida="color",
        orden_fijo=2,
        parametros=[
            Parametro(
                nombre="operacion",
                etiqueta="Operación",
                tipo="enum",
                defecto="Ninguno",
                opciones=["Ninguno", "Opening", "Closing", "Gradient"],
            ),
            Parametro(
                nombre="kernel",
                etiqueta="Kernel morfológico",
                tipo="number",
                minimo=1,
                maximo=11,
                paso=2,
                defecto=3,
                solo_impares=True,
            ),
        ],
    ),
    Etapa(
        tipo="canny",
        etiqueta="Bordes (Canny)",
        categoria="bordes",
        entrada="gris",
        salida="color",
        orden_fijo=3,
        parametros=[
            Parametro(nombre="umbral_bajo", etiqueta="Umbral bajo", tipo="number",
                       minimo=0, maximo=255, paso=1, defecto=50),
            Parametro(nombre="umbral_alto", etiqueta="Umbral alto", tipo="number",
                       minimo=0, maximo=255, paso=1, defecto=150),
        ],
    ),
    Etapa(
        tipo="harris",
        etiqueta="Esquinas (Harris)",
        categoria="esquinas",
        entrada="color",
        salida="color",
        orden_fijo=4,
        parametros=[
            Parametro(nombre="block_size", etiqueta="blockSize", tipo="number",
                       minimo=2, maximo=20, paso=1, defecto=2),
            Parametro(nombre="ksize", etiqueta="ksize", tipo="number",
                       minimo=1, maximo=15, paso=2, defecto=3, solo_impares=True),
            Parametro(nombre="k", etiqueta="k (sensibilidad)", tipo="number",
                       minimo=0.01, maximo=0.10, paso=0.005, defecto=0.04),
            Parametro(nombre="umbral", etiqueta="Umbral", tipo="number",
                       minimo=0.01, maximo=0.50, paso=0.01, defecto=0.10),
            Parametro(nombre="dilatacion", etiqueta="Dilatación", tipo="number",
                       minimo=0, maximo=3, paso=1, defecto=1),
        ],
    ),
    Etapa(
        tipo="cuadricula",
        etiqueta="Cuadrícula de ajedrez",
        categoria="esquinas",
        entrada="gris",
        salida="color",
        orden_fijo=5,
        parametros=[],
    ),
    Etapa(
        tipo="rectangulos",
        etiqueta="Rectángulos (contornos)",
        categoria="contornos",
        entrada="cualquiera",
        salida="color",
        orden_fijo=6,
        parametros=[
            Parametro(nombre="area_minima", etiqueta="Área mínima", tipo="number",
                       minimo=100, maximo=20000, paso=100, defecto=1000),
            Parametro(nombre="aspecto_minimo", etiqueta="Aspecto mínimo", tipo="number",
                       minimo=1.0, maximo=8.0, paso=0.1, defecto=1.5),
            Parametro(nombre="ocupacion_minima", etiqueta="Ocupación mínima", tipo="number",
                       minimo=0.0, maximo=1.0, paso=0.05, defecto=0.5),
            Parametro(nombre="umbral_bajo", etiqueta="Canny: umbral bajo", tipo="number",
                       minimo=0, maximo=255, paso=1, defecto=50),
            Parametro(nombre="umbral_alto", etiqueta="Canny: umbral alto", tipo="number",
                       minimo=0, maximo=255, paso=1, defecto=150),
        ],
    ),
    # --- Etapas adicionales, sólo disponibles en modo libre ---
    Etapa(
        tipo="threshold",
        etiqueta="Umbral (threshold)",
        categoria="umbral",
        entrada="gris",
        salida="gris",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="umbral", etiqueta="Umbral", tipo="number",
                       minimo=0, maximo=255, paso=1, defecto=127),
            Parametro(nombre="valor_maximo", etiqueta="Valor máximo", tipo="number",
                       minimo=0, maximo=255, paso=1, defecto=255),
            Parametro(nombre="tipo", etiqueta="Tipo", tipo="enum", defecto="BINARY",
                       opciones=["BINARY", "BINARY_INV", "TRUNC", "TOZERO", "OTSU"]),
        ],
    ),
    Etapa(
        tipo="umbral_adaptativo",
        etiqueta="Umbral adaptativo",
        categoria="umbral",
        entrada="gris",
        salida="gris",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="metodo", etiqueta="Método", tipo="enum", defecto="MEAN_C",
                       opciones=["MEAN_C", "GAUSSIAN_C"]),
            Parametro(nombre="tamano_bloque", etiqueta="Tamaño de bloque", tipo="number",
                       minimo=3, maximo=51, paso=2, defecto=11, solo_impares=True),
            Parametro(nombre="c", etiqueta="Constante C", tipo="number",
                       minimo=-50, maximo=50, paso=1, defecto=10),
        ],
    ),
    Etapa(
        tipo="desenfoque",
        etiqueta="Desenfoque (blur)",
        categoria="suavizado",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="ksize", etiqueta="Tamaño de kernel", tipo="number",
                       minimo=1, maximo=51, paso=2, defecto=5, solo_impares=True),
        ],
    ),
    Etapa(
        tipo="desenfoque_gaussiano",
        etiqueta="Desenfoque gaussiano",
        categoria="suavizado",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="ksize", etiqueta="Tamaño de kernel", tipo="number",
                       minimo=1, maximo=51, paso=2, defecto=5, solo_impares=True),
        ],
    ),
    Etapa(
        tipo="desenfoque_mediana",
        etiqueta="Desenfoque de mediana",
        categoria="suavizado",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="ksize", etiqueta="Tamaño de kernel", tipo="number",
                       minimo=1, maximo=51, paso=2, defecto=5, solo_impares=True),
        ],
    ),
    Etapa(
        tipo="gamma",
        etiqueta="Corrección gamma",
        categoria="color",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="gamma", etiqueta="Gamma", tipo="number",
                       minimo=0.1, maximo=5.0, paso=0.1, defecto=1.0),
        ],
    ),
    Etapa(
        tipo="sobel",
        etiqueta="Gradiente (Sobel)",
        categoria="bordes",
        entrada="gris",
        salida="gris",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="ksize", etiqueta="Tamaño de kernel", tipo="enum", defecto="5",
                       opciones=["1", "3", "5", "7"]),
        ],
    ),
    Etapa(
        tipo="erosion",
        etiqueta="Erosión",
        categoria="morfologia",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="kernel", etiqueta="Kernel", tipo="number",
                       minimo=1, maximo=31, paso=2, defecto=5, solo_impares=True),
            Parametro(nombre="iteraciones", etiqueta="Iteraciones", tipo="number",
                       minimo=1, maximo=10, paso=1, defecto=1),
        ],
    ),
    Etapa(
        tipo="dilatacion",
        etiqueta="Dilatación",
        categoria="morfologia",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="kernel", etiqueta="Kernel", tipo="number",
                       minimo=1, maximo=31, paso=2, defecto=5, solo_impares=True),
            Parametro(nombre="iteraciones", etiqueta="Iteraciones", tipo="number",
                       minimo=1, maximo=10, paso=1, defecto=1),
        ],
    ),
    Etapa(
        tipo="redimensionar",
        etiqueta="Redimensionar",
        categoria="transformacion",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="factor", etiqueta="Factor de escala", tipo="number",
                       minimo=0.1, maximo=4.0, paso=0.1, defecto=1.0),
        ],
    ),
    Etapa(
        tipo="shi_tomasi",
        etiqueta="Esquinas (Shi-Tomasi)",
        categoria="esquinas",
        entrada="cualquiera",
        salida="color",
        orden_fijo=None,
        parametros=[
            Parametro(nombre="max_esquinas", etiqueta="Máximo de esquinas", tipo="number",
                       minimo=1, maximo=200, paso=1, defecto=81),
            Parametro(nombre="calidad", etiqueta="Calidad mínima", tipo="number",
                       minimo=0.001, maximo=0.1, paso=0.001, defecto=0.01),
            Parametro(nombre="distancia_minima", etiqueta="Distancia mínima", tipo="number",
                       minimo=1, maximo=50, paso=1, defecto=10),
        ],
    ),
]

_POR_TIPO = {etapa.tipo: etapa for etapa in CATALOGO}


def obtener_etapa(tipo: str) -> Etapa:
    try:
        return _POR_TIPO[tipo]
    except KeyError:
        raise ValueError(f"Tipo de etapa desconocido: {tipo}")


def catalogo_a_dict() -> list[dict]:
    return [etapa.to_dict() for etapa in CATALOGO]


def pipeline_por_defecto() -> list[dict]:
    """El pipeline en modo fijo, en su orden canónico, con los valores por defecto."""
    etapas_fijas = sorted(
        (e for e in CATALOGO if e.orden_fijo is not None),
        key=lambda e: e.orden_fijo,
    )
    return [
        {
            "tipo": etapa.tipo,
            "activa": etapa.tipo == "harris",  # única etapa ON por defecto en el script original
            "parametros": {p.nombre: p.defecto for p in etapa.parametros},
        }
        for etapa in etapas_fijas
    ]
