import { useCallback, useEffect, useMemo, useState } from "react";
import { AppBar, Box, CircularProgress, Stack, Toolbar, Typography } from "@mui/material";

import { PanelCandidatos } from "@/features/candidatos/components/PanelCandidatos";
import type { Candidato } from "@/features/candidatos/candidatos.types";
import type { RespuestaCatalogo } from "@/features/catalogo/catalogo.types";
import { useObtenerCatalogoQuery } from "@/features/catalogo/catalogoApi";
import { SelectorImagenes } from "@/features/imagenes/components/SelectorImagenes";
import { PanelResultados } from "@/features/resultados/components/PanelResultados";
import { SelectorEjecuciones } from "@/features/resultados/components/SelectorEjecuciones";
import type { DetalleEjecucion, ResultadoOcrManual } from "@/features/resultados/resultados.types";
import { base64ABlob } from "@/shared/utils/base64";
import { LienzoImagen } from "../components/LienzoImagen";
import { PanelControles } from "../components/PanelControles";
import { crearHuellaProcesamiento } from "../huellaProcesamiento";
import type { Pipeline, ValorParametro } from "../pipeline.types";
import {
  useEstadoEjecucionActual,
  type RestauracionResultados,
} from "../useEstadoEjecucionActual";
import { usePipeline } from "../usePipeline";
import { useVistaPrevia, type VistaHistorica } from "../useVistaPrevia";

interface EjecucionCargada {
  id: string;
  huella: string;
  detalle: DetalleEjecucion;
  pipeline: Pipeline;
  restauracion: RestauracionResultados;
  vista: VistaHistorica;
}

function copiarPipeline(pipeline: Pipeline): Pipeline {
  return {
    modo: pipeline.modo,
    etapas: pipeline.etapas.map((etapa) => ({
      ...etapa,
      parametros: { ...etapa.parametros },
    })),
  };
}

function parametroCompatible(valor: ValorParametro, tipo: "number" | "enum" | "boolean"): boolean {
  if (tipo === "number") return typeof valor === "number" && Number.isFinite(valor);
  if (tipo === "boolean") return typeof valor === "boolean";
  return typeof valor === "string";
}

function prepararEjecucion(
  detalle: DetalleEjecucion,
  catalogo: RespuestaCatalogo,
): EjecucionCargada {
  if (detalle.pipelineVersion !== 1) {
    throw new Error(`La versión ${detalle.pipelineVersion} del pipeline no es compatible`);
  }
  if (detalle.pipeline.modo !== "fijo" && detalle.pipeline.modo !== "libre") {
    throw new Error("La ejecución guardada contiene un modo de pipeline desconocido");
  }

  for (const etapa of detalle.pipeline.etapas) {
    const definicion = catalogo.etapas.find((item) => item.tipo === etapa.tipo);
    if (!definicion) {
      throw new Error(`La etapa guardada «${etapa.tipo}» ya no existe en el catálogo actual`);
    }
    if (typeof etapa.activa !== "boolean" || !etapa.parametros || typeof etapa.parametros !== "object") {
      throw new Error(`La etapa guardada «${etapa.tipo}» tiene una estructura incompatible`);
    }

    for (const parametro of definicion.parametros) {
      const valor = etapa.parametros[parametro.nombre];
      if (valor === undefined || !parametroCompatible(valor, parametro.tipo)) {
        throw new Error(
          `El parámetro «${parametro.nombre}» de la etapa «${etapa.tipo}» no es compatible`,
        );
      }
      if (parametro.tipo === "enum" && parametro.opciones && !parametro.opciones.includes(valor as string)) {
        throw new Error(
          `El valor de «${parametro.nombre}» en la etapa «${etapa.tipo}» ya no está disponible`,
        );
      }
    }

    const parametrosConocidos = new Set(definicion.parametros.map((parametro) => parametro.nombre));
    const parametroDesconocido = Object.keys(etapa.parametros).find((nombre) => !parametrosConocidos.has(nombre));
    if (parametroDesconocido) {
      throw new Error(
        `El parámetro guardado «${parametroDesconocido}» de la etapa «${etapa.tipo}» ya no existe`,
      );
    }
  }

  const pipeline = copiarPipeline(detalle.pipeline);
  const huella = crearHuellaProcesamiento(detalle.imagen.id, pipeline);
  if (!huella) throw new Error("La ejecución guardada no está asociada a una imagen");

  const imagenProcesada = base64ABlob(detalle.imagenProcesadaPngBase64);
  if (imagenProcesada.size === 0) throw new Error("La imagen procesada guardada está vacía");

  const candidatos: Candidato[] = [...detalle.candidatos]
    .sort((primero, segundo) => primero.orden - segundo.orden)
    .map((candidato) => {
      const recorte = base64ABlob(candidato.imagenPngBase64);
      if (recorte.size === 0) throw new Error(`El recorte del candidato ${candidato.orden + 1} está vacío`);
      return {
        caja: { ...candidato.caja },
        area: candidato.area,
        texto: candidato.texto,
        confianza: candidato.confianza,
        coincidencia: candidato.coincidencia,
        patenteEsperada: detalle.patenteEsperada,
        imagenPngBase64: candidato.imagenPngBase64,
      };
    });

  const resultadoOcr: ResultadoOcrManual = {
    imagen: {
      id: detalle.imagen.id,
      nombreArchivo: detalle.imagen.nombreArchivo,
      patenteEsperada: detalle.patenteEsperada,
    },
    modo: pipeline.modo,
    etapas: copiarPipeline(pipeline).etapas,
    textoDetectado: detalle.resultadoOcr.textoDetectado ?? "",
    confianza: detalle.resultadoOcr.confianza,
    acierto: detalle.resultadoOcr.acierto,
    distanciaEdicion: detalle.resultadoOcr.distanciaEdicion,
    duracionMs: detalle.resultadoOcr.duracionMs,
  };

  return {
    id: detalle.id,
    huella,
    detalle,
    pipeline,
    restauracion: {
      id: detalle.id,
      huella,
      resultadoOcr,
      candidatos,
    },
    vista: {
      id: detalle.id,
      huella,
      blob: imagenProcesada,
    },
  };
}

export function EditorPage() {
  const [imagenId, setImagenId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("ocr.editor.imagen-seleccionada");
    } catch {
      return null;
    }
  });
  const [ejecucionCargada, setEjecucionCargada] = useState<EjecucionCargada | null>(null);
  const { data: catalogo, isLoading: cargandoCatalogo } = useObtenerCatalogoQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const pipeline = usePipeline(catalogo);
  const pipelineActual = useMemo(
    () => ({ modo: pipeline.modo, etapas: pipeline.etapas }),
    [pipeline.modo, pipeline.etapas],
  );
  const {
    huellaActual,
    contextoActual,
    resultadoOcr,
    candidatos,
    registrarOcr,
    registrarCandidatos,
    invalidarOcr,
    invalidarCandidatos,
    vaciarResultados,
  } = useEstadoEjecucionActual(imagenId, pipelineActual, ejecucionCargada?.restauracion ?? null);
  const { urlImagen, blobImagen, cargando, error } = useVistaPrevia(
    imagenId,
    pipelineActual,
    ejecucionCargada?.vista ?? null,
  );

  const cambiarImagen = useCallback((nuevoImagenId: string | null): void => {
    setEjecucionCargada(null);
    vaciarResultados();
    setImagenId(nuevoImagenId);
  }, [vaciarResultados]);

  const volverAEdicion = useCallback((): void => {
    setEjecucionCargada(null);
    vaciarResultados();
  }, [vaciarResultados]);

  const iniciarOcr = useCallback((): void => {
    if (ejecucionCargada) {
      setEjecucionCargada(null);
      vaciarResultados();
      return;
    }
    invalidarOcr();
  }, [ejecucionCargada, invalidarOcr, vaciarResultados]);

  const iniciarBusqueda = useCallback((): void => {
    if (ejecucionCargada) {
      setEjecucionCargada(null);
      vaciarResultados();
      return;
    }
    invalidarCandidatos();
  }, [ejecucionCargada, invalidarCandidatos, vaciarResultados]);

  const cargarEjecucion = useCallback((detalle: DetalleEjecucion): void => {
    if (!catalogo) throw new Error("El catálogo de algoritmos todavía no está disponible");

    // Se decodifica y valida el snapshot completo antes de tocar el editor.
    const preparada = prepararEjecucion(detalle, catalogo);
    vaciarResultados();
    setEjecucionCargada(preparada);
    setImagenId(detalle.imagen.id);
    pipeline.cargarPipeline(preparada.pipeline);
  }, [catalogo, pipeline, vaciarResultados]);

  useEffect(() => {
    if (!ejecucionCargada || ejecucionCargada.huella === huellaActual) return;
    setEjecucionCargada(null);
    vaciarResultados();
  }, [ejecucionCargada, huellaActual, vaciarResultados]);

  useEffect(() => {
    try {
      if (imagenId) localStorage.setItem("ocr.editor.imagen-seleccionada", imagenId);
      else localStorage.removeItem("ocr.editor.imagen-seleccionada");
    } catch {
      // La edición sigue funcionando aunque el navegador bloquee localStorage.
    }
  }, [imagenId]);

  if (cargandoCatalogo || !catalogo) {
    return (
      <Stack sx={{ height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack sx={{ height: "100vh" }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Editor OCR de patentes
          </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Stack spacing={2} sx={{ flex: 1, p: 2, minWidth: 0 }}>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} sx={{ maxWidth: 920 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <SelectorImagenes imagenId={imagenId} onChange={cambiarImagen} />
            </Box>
            <Box sx={{ flex: 1.55, minWidth: 0 }}>
              <SelectorEjecuciones
                key={contextoActual ?? "sin-contexto"}
                ejecucionId={ejecucionCargada?.id ?? null}
                onCargar={cargarEjecucion}
                onVolverEdicion={volverAEdicion}
              />
            </Box>
          </Stack>
          <Box sx={{ height: 480, flexShrink: 0 }}>
            <LienzoImagen urlImagen={urlImagen} cargando={cargando} error={error} />
          </Box>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1 }}>
            <PanelCandidatos
              imagenId={imagenId}
              pipeline={pipelineActual}
              contextoActual={contextoActual}
              candidatos={candidatos}
              onIniciarBusqueda={iniciarBusqueda}
              onCandidatosObtenidos={registrarCandidatos}
            />
          </Box>
        </Stack>

        <Box sx={{ width: 380, borderLeft: 1, borderColor: "divider", display: "flex", flexDirection: "column" }}>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
            <PanelControles
              catalogo={catalogo}
              pipeline={pipeline}
              imagenId={imagenId}
              onCambiarImagen={cambiarImagen}
            />
          </Box>
          <Box sx={{ borderTop: 1, borderColor: "divider" }}>
            <PanelResultados
              imagenId={imagenId}
              pipeline={pipelineActual}
              contextoActual={contextoActual}
              resultado={resultadoOcr}
              candidatos={candidatos}
              imagenProcesada={blobImagen}
              esEjecucionHistorica={ejecucionCargada !== null}
              onIniciarOcr={iniciarOcr}
              onOcrEjecutado={registrarOcr}
            />
          </Box>
        </Box>
      </Box>
    </Stack>
  );
}
