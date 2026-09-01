from pydantic import BaseModel, Field


class EtapaSolicitada(BaseModel):
    tipo: str
    activa: bool = True
    parametros: dict[str, float | int | bool | str] = Field(default_factory=dict)


class SolicitudPipeline(BaseModel):
    version: int = 1
    ruta: str
    etapas: list[EtapaSolicitada]


class SolicitudCandidatos(SolicitudPipeline):
    limite: int = 20
    parametros_deteccion: dict[str, float | int | bool | str] = Field(default_factory=dict)


class CajaCandidato(BaseModel):
    x: int
    y: int
    ancho: int
    alto: int
    angulo: float


class Candidato(BaseModel):
    caja: CajaCandidato
    area: float
    texto: str | None
    confianza: float | None
    imagen_png_base64: str | None


class RespuestaCandidatos(BaseModel):
    candidatos: list[Candidato]


class ImagenInfo(BaseModel):
    nombre_archivo: str
    ruta_relativa: str
    ancho: int | None
    alto: int | None


class ResultadoOcr(BaseModel):
    texto: str
    confianza: float
