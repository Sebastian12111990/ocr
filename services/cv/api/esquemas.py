from pydantic import BaseModel, Field


class EtapaSolicitada(BaseModel):
    tipo: str
    activa: bool = True
    parametros: dict[str, float | int | bool | str] = Field(default_factory=dict)


class SolicitudPipeline(BaseModel):
    version: int = 1
    ruta: str
    etapas: list[EtapaSolicitada]


class ImagenInfo(BaseModel):
    nombre_archivo: str
    ruta_relativa: str
    ancho: int | None
    alto: int | None


class ResultadoOcr(BaseModel):
    texto: str
    confianza: float
