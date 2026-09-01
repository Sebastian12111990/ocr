"""Endpoints HTTP del servicio de visión.

Los handlers que tocan OpenCV se declaran con `def`, no `async def`: FastAPI
los corre en un threadpool aparte, y como OpenCV libera el GIL en la mayoría
de sus operaciones eso da paralelismo real. Un `async def` con cv2 adentro
bloquearía el event loop y serializaría todas las peticiones — crítico aquí
porque el debounce del frontend genera varias por segundo.
"""

import cv2
import pytesseract
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from dominio.candidatos import obtener_candidatos
from dominio.catalogo import catalogo_a_dict, pipeline_por_defecto
from dominio.ocr import reconocer_texto
from dominio.pipeline import ejecutar_pipeline
from infraestructura.repositorio_imagenes import cargar_imagen, listar_imagenes

from .esquemas import ImagenInfo, RespuestaCandidatos, ResultadoOcr, SolicitudCandidatos, SolicitudPipeline

router = APIRouter()


@router.get("/salud")
def salud():
    return {"estado": "ok"}


@router.get("/catalogo")
def catalogo():
    return {"etapas": catalogo_a_dict(), "pipeline_por_defecto": pipeline_por_defecto()}


@router.get("/imagenes", response_model=list[ImagenInfo])
def imagenes():
    return listar_imagenes()


def _cargar_solicitud(solicitud: SolicitudPipeline):
    try:
        imagen = cargar_imagen(solicitud.ruta)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=404, detail=str(error))

    etapas = [etapa.model_dump() for etapa in solicitud.etapas]
    return imagen, etapas


def _procesar(solicitud: SolicitudPipeline):
    imagen, etapas = _cargar_solicitud(solicitud)
    try:
        return ejecutar_pipeline(imagen, etapas)
    except Exception as error:  # se traduce a 400: parámetros inválidos del cliente
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/procesar")
def procesar(solicitud: SolicitudPipeline):
    resultado = _procesar(solicitud)
    ok, buffer = cv2.imencode(".png", resultado)
    if not ok:
        raise HTTPException(status_code=500, detail="No se pudo codificar la imagen")
    return Response(content=buffer.tobytes(), media_type="image/png")


@router.post("/ocr", response_model=ResultadoOcr)
def ocr(solicitud: SolicitudPipeline):
    resultado = _procesar(solicitud)
    try:
        texto, confianza = reconocer_texto(resultado)
    except pytesseract.TesseractNotFoundError:
        raise HTTPException(
            status_code=503,
            detail=(
                "Tesseract no está instalado o no está en el PATH. "
                "Instálalo (winget install UB-Mannheim.TesseractOCR) o configura "
                "TESSERACT_CMD en services/cv/.env"
            ),
        )
    return ResultadoOcr(texto=texto, confianza=confianza)


@router.post("/candidatos", response_model=RespuestaCandidatos)
def candidatos(solicitud: SolicitudCandidatos):
    imagen, etapas = _cargar_solicitud(solicitud)

    # Los recortes deben salir exactamente de la misma imagen y parámetros
    # que usa la última etapa activa "rectangulos" para pintar en verde. Se
    # ejecuta solo el prefijo anterior, evitando detectar otra vez sobre las
    # propias marcas verdes.
    indices_rectangulos = [
        indice for indice, etapa in enumerate(etapas)
        if etapa["tipo"] == "rectangulos" and etapa.get("activa", True)
    ]
    try:
        if indices_rectangulos:
            indice_rectangulos = indices_rectangulos[-1]
            imagen_deteccion = ejecutar_pipeline(imagen, etapas[:indice_rectangulos])
            parametros_etapa = etapas[indice_rectangulos].get("parametros", {})
            parametros = {**parametros_etapa, **solicitud.parametros_deteccion}
        else:
            imagen_deteccion = ejecutar_pipeline(imagen, etapas)
            parametros = solicitud.parametros_deteccion

        lista = obtener_candidatos(imagen_deteccion, parametros, limite=solicitud.limite)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))
    return RespuestaCandidatos(candidatos=lista)
