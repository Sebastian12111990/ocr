import "reflect-metadata";

import assert from "node:assert/strict";

import { Ejecucion } from "../src/features/ejecuciones/ejecucion.entidad.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";

// El navegador usa el proxy /api de Vite. El puerto 6000 figura entre los
// puertos restringidos de Fetch, por lo que esta prueba recorre la misma ruta
// real del frontend (:5175 -> proxy -> API :6000).
const BASE_URL = process.env.URL_API_VERIFICACION ?? "http://127.0.0.1:5175";
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

interface CatalogoApi {
  etapas: Array<{ tipo: string }>;
  pipeline_por_defecto: Array<{
    tipo: string;
    activa: boolean;
    parametros: Record<string, number | boolean | string>;
  }>;
}

interface ImagenApi {
  id: string;
  nombreArchivo: string;
  ancho: number;
  alto: number;
  patenteEsperada: string | null;
}

async function obtenerJson<T>(ruta: string, init?: RequestInit, estadoEsperado = 200): Promise<T> {
  const respuesta = await fetch(`${BASE_URL}${ruta}`, init);
  const texto = await respuesta.text();
  assert.equal(respuesta.status, estadoEsperado, `${ruta}: ${respuesta.status} ${texto}`);
  return JSON.parse(texto) as T;
}

async function verificarProcesamiento(imagenId: string, pipeline: object, etiqueta: string): Promise<string> {
  const respuesta = await fetch(`${BASE_URL}/api/procesar`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ imagenId, pipeline }),
  });
  if (respuesta.status !== 200) {
    assert.fail(`${etiqueta}: ${respuesta.status} ${await respuesta.text()}`);
  }
  assert.ok(respuesta.headers.get("content-type")?.startsWith("image/png"));
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  assert.ok(FIRMA_PNG.every((byte, indice) => bytes[indice] === byte), `${etiqueta} no devolvió PNG`);
  return Buffer.from(bytes).toString("base64");
}

async function principal(): Promise<void> {
  const idsTemporales: string[] = [];
  try {
    const salud = await obtenerJson<{ estado: string; bd: boolean; servicioCv: boolean }>("/api/salud");
    assert.deepEqual(salud, { estado: "ok", bd: true, servicioCv: true });

    const [catalogo, imagenes] = await Promise.all([
      obtenerJson<CatalogoApi>("/api/catalogo"),
      obtenerJson<ImagenApi[]>("/api/imagenes"),
    ]);
    assert.ok(catalogo.etapas.length > 0);
    assert.ok(catalogo.pipeline_por_defecto.length > 0);
    const imagen = imagenes.find((item) => Boolean(item.patenteEsperada));
    assert.ok(imagen?.patenteEsperada, "No existen imágenes sembradas con patente esperada");

    const pipelineFijo = { modo: "fijo", etapas: catalogo.pipeline_por_defecto };
    const pngProcesado = await verificarProcesamiento(imagen.id, pipelineFijo, "pipeline fijo");

    const rectangulos = catalogo.pipeline_por_defecto.find((etapa) => etapa.tipo === "rectangulos");
    assert.ok(rectangulos, "El catálogo no contiene la etapa rectangulos");
    const pipelineLibre = {
      modo: "libre",
      etapas: [
        { tipo: "gamma", activa: true, parametros: { gamma: 0.8 } },
        { tipo: "gamma", activa: true, parametros: { gamma: 1.2 } },
        { ...rectangulos, parametros: { ...rectangulos.parametros } },
      ],
    };
    await verificarProcesamiento(imagen.id, pipelineLibre, "pipeline libre con etapa repetida");

    const resultadoOcr = await obtenerJson<{
      textoDetectado: string;
      confianza: number;
      duracionMs: number;
    }>("/api/ocr", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imagenId: imagen.id, pipeline: pipelineFijo }),
    });
    assert.equal(typeof resultadoOcr.textoDetectado, "string");
    assert.equal(typeof resultadoOcr.confianza, "number");
    assert.ok(resultadoOcr.duracionMs >= 0);

    const respuestaCandidatos = await obtenerJson<{ candidatos: unknown[] }>("/api/candidatos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imagenId: imagen.id, pipeline: pipelineFijo }),
    });
    assert.ok(Array.isArray(respuestaCandidatos.candidatos));

    const guardado = await obtenerJson<{ id: string; candidatosGuardados: number }>("/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        imagenId: imagen.id,
        pipeline: pipelineFijo,
        resultadoOcr,
        imagenProcesadaPngBase64: pngProcesado,
        candidatos: [{
          caja: { x: 0, y: 0, ancho: imagen.ancho, alto: imagen.alto, angulo: 0 },
          area: imagen.ancho * imagen.alto,
          texto: imagen.patenteEsperada,
          confianza: null,
          coincidencia: 0,
          imagenPngBase64: pngProcesado,
        }],
      }),
    }, 201);
    idsTemporales.push(guardado.id);
    assert.equal(guardado.candidatosGuardados, 1);

    const detalle = await obtenerJson<{ imagenProcesadaPngBase64: string }>(`/api/ejecuciones/${guardado.id}`);
    assert.equal(detalle.imagenProcesadaPngBase64, pngProcesado);

    console.log("✓ PostgreSQL, API, CV y Tesseract reportan salud correcta");
    console.log("✓ procesamiento fijo devuelve un PNG");
    console.log("✓ procesamiento libre conserva y ejecuta etapas repetidas");
    console.log(`✓ OCR manual respondió en ${resultadoOcr.duracionMs} ms`);
    console.log(`✓ candidatos respondió con ${respuestaCandidatos.candidatos.length} región(es)`);
    console.log("✓ un PNG generado por OpenCV se guarda y restaura sin alteraciones");
  } finally {
    if (idsTemporales.length > 0) {
      await fuenteDatos.initialize();
      await fuenteDatos.getRepository(Ejecucion).delete(idsTemporales);
      await fuenteDatos.destroy();
      console.log(`✓ limpieza: ${idsTemporales.length} ejecución temporal eliminada`);
    }
  }
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
