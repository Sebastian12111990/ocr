import "reflect-metadata";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { crearApp } from "../src/app.js";
import { crearContenedor } from "../src/contenedor/contenedor.js";
import { Ejecucion } from "../src/features/ejecuciones/ejecucion.entidad.js";
import { Imagen } from "../src/features/imagenes/imagen.entidad.js";
import { fuenteDatos } from "../src/infraestructura/fuente-datos.js";
import type { Pipeline } from "../src/shared/contrato/pipeline.js";

const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const PNG_CRC_INVALIDO = (() => {
  const bytes = Buffer.from(PNG_1X1, "base64");
  bytes[45] = bytes[45]! ^ 0xff;
  return bytes.toString("base64");
})();
const PATENTE_PRUEBA = "ABCDE";

interface ImagenApi {
  id: string;
  nombreArchivo: string;
  patenteEsperada: string | null;
}

interface GuardadoApi {
  id: string;
  creadoEn: string;
  mejorCoincidencia: number;
  candidatosGuardados: number;
}

interface ResumenApi extends GuardadoApi {
  modo: "fijo" | "libre";
  pipelineVersion: number;
}

interface DetalleApi {
  id: string;
  pipelineVersion: number;
  pipeline: Pipeline;
  mejorCoincidencia: number;
  imagenProcesadaPngBase64: string;
  candidatos: Array<{
    orden: number;
    texto: string | null;
    coincidencia: number;
    imagenPngBase64: string;
  }>;
}

interface RespuestaHttp<T> {
  estado: number;
  cuerpo: T;
  texto: string;
}

async function solicitar<T>(baseUrl: string, ruta: string, init?: RequestInit): Promise<RespuestaHttp<T>> {
  const respuesta = await fetch(`${baseUrl}${ruta}`, init);
  const texto = await respuesta.text();
  let cuerpo: unknown = texto;
  if (respuesta.headers.get("content-type")?.includes("application/json") && texto) {
    cuerpo = JSON.parse(texto);
  }
  return { estado: respuesta.status, cuerpo: cuerpo as T, texto };
}

function candidato(texto: string | null, coincidencia: number | null, imagenPngBase64 = PNG_1X1) {
  return {
    caja: { x: 12, y: 18, ancho: 90, alto: 32, angulo: 4.5 },
    area: 2880,
    texto,
    confianza: 91.25,
    coincidencia,
    imagenPngBase64,
  };
}

function cuerpoGuardado(imagenId: string, pipeline: Pipeline, patenteEsperada: string) {
  return {
    imagenId,
    pipeline,
    resultadoOcr: {
      textoDetectado: patenteEsperada,
      confianza: 93.5,
      duracionMs: 321,
    },
    imagenProcesadaPngBase64: PNG_1X1,
    candidatos: [
      candidato(patenteEsperada, 0),
      candidato(null, 100),
      candidato(patenteEsperada.slice(0, -1), null),
    ],
  };
}

async function principal(): Promise<void> {
  const idsTemporales: string[] = [];
  let imagenTemporalId: string | null = null;
  let servidor: Server | null = null;

  try {
    await fuenteDatos.initialize();
    const repositorioImagen = fuenteDatos.getRepository(Imagen);
    const imagenTemporal = await repositorioImagen.save(repositorioImagen.create({
      nombreArchivo: `verificacion-${randomUUID()}.png`,
      rutaRelativa: "verificacion/temporal.png",
      ancho: 1,
      alto: 1,
      patenteEsperada: PATENTE_PRUEBA,
    }));
    imagenTemporalId = imagenTemporal.id;

    const app = crearApp(crearContenedor(fuenteDatos), fuenteDatos);
    servidor = app.listen(0, "127.0.0.1");
    await once(servidor, "listening");
    const direccion = servidor.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${direccion.port}`;

    const respuestaImagenes = await solicitar<ImagenApi[]>(baseUrl, "/api/imagenes");
    assert.equal(respuestaImagenes.estado, 200, respuestaImagenes.texto);
    const imagen = respuestaImagenes.cuerpo.find((item) => item.id === imagenTemporalId);
    assert.equal(imagen?.patenteEsperada, PATENTE_PRUEBA);

    const filtroInvalido = await solicitar<unknown>(baseUrl, "/api/ejecuciones?imagenId=no-es-uuid");
    assert.equal(filtroInvalido.estado, 400, "Un UUID inválido debe rechazarse antes de consultar PostgreSQL");

    const pipelineLibre: Pipeline = {
      modo: "libre",
      etapas: [
        { tipo: "gamma", activa: true, parametros: { gamma: 0.8 } },
        { tipo: "gamma", activa: false, parametros: { gamma: 1.7 } },
        {
          tipo: "rectangulos",
          activa: true,
          parametros: {
            dibujar_rectangulos: true,
            grosor_linea: 1,
            area_minima: 1200,
            aspecto_minimo: 1.5,
            angulo_maximo: 25,
            ocupacion_minima: 0.5,
            umbral_bajo: 50,
            umbral_alto: 150,
          },
        },
      ],
    };
    const payloadLibre = cuerpoGuardado(imagenTemporalId, pipelineLibre, PATENTE_PRUEBA);

    const primerGuardado = await solicitar<GuardadoApi>(baseUrl, "/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadLibre),
    });
    assert.equal(primerGuardado.estado, 201, primerGuardado.texto);
    idsTemporales.push(primerGuardado.cuerpo.id);
    assert.equal(primerGuardado.cuerpo.candidatosGuardados, 3);
    assert.equal(primerGuardado.cuerpo.mejorCoincidencia, 100);

    const detalleLibre = await solicitar<DetalleApi>(
      baseUrl,
      `/api/ejecuciones/${primerGuardado.cuerpo.id}`,
    );
    assert.equal(detalleLibre.estado, 200, detalleLibre.texto);
    assert.equal(detalleLibre.cuerpo.pipelineVersion, 1);
    assert.deepEqual(detalleLibre.cuerpo.pipeline, pipelineLibre);
    assert.deepEqual(detalleLibre.cuerpo.candidatos.map(({ orden }) => orden), [0, 1, 2]);
    assert.equal(detalleLibre.cuerpo.candidatos[1]?.texto, null);
    assert.equal(detalleLibre.cuerpo.candidatos[1]?.coincidencia, 0);
    assert.ok(detalleLibre.cuerpo.candidatos.every(({ imagenPngBase64 }) => imagenPngBase64 === PNG_1X1));
    assert.equal(detalleLibre.cuerpo.imagenProcesadaPngBase64, PNG_1X1);

    const segundoGuardado = await solicitar<GuardadoApi>(baseUrl, "/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadLibre),
    });
    assert.equal(segundoGuardado.estado, 201, segundoGuardado.texto);
    idsTemporales.push(segundoGuardado.cuerpo.id);
    assert.notEqual(segundoGuardado.cuerpo.id, primerGuardado.cuerpo.id);

    const pipelineFijo: Pipeline = {
      modo: "fijo",
      etapas: [
        { tipo: "escala_gris", activa: false, parametros: {} },
        {
          tipo: "rectangulos",
          activa: true,
          parametros: {
            dibujar_rectangulos: true,
            grosor_linea: 2,
            area_minima: 1000,
            aspecto_minimo: 1.5,
            angulo_maximo: 25,
            ocupacion_minima: 0.5,
            umbral_bajo: 50,
            umbral_alto: 150,
          },
        },
      ],
    };
    const payloadFijo = cuerpoGuardado(imagenTemporalId, pipelineFijo, PATENTE_PRUEBA);
    payloadFijo.candidatos = [candidato("AXXXX", 0)];
    const guardadoFijo = await solicitar<GuardadoApi>(baseUrl, "/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payloadFijo),
    });
    assert.equal(guardadoFijo.estado, 201, guardadoFijo.texto);
    idsTemporales.push(guardadoFijo.cuerpo.id);
    assert.equal(guardadoFijo.cuerpo.mejorCoincidencia, 20, "El umbral exacto de 20% debe guardarse");

    const detalleFijo = await solicitar<DetalleApi>(baseUrl, `/api/ejecuciones/${guardadoFijo.cuerpo.id}`);
    assert.equal(detalleFijo.estado, 200, detalleFijo.texto);
    assert.deepEqual(detalleFijo.cuerpo.pipeline, pipelineFijo);

    const listado = await solicitar<ResumenApi[]>(baseUrl, "/api/ejecuciones");
    assert.equal(listado.estado, 200, listado.texto);
    for (const id of idsTemporales) assert.ok(listado.cuerpo.some((item) => item.id === id));
    assert.ok(listado.cuerpo.every((item) => item.pipelineVersion === 1));
    assert.ok(listado.cuerpo.every((item) => item.candidatosGuardados >= 1));
    for (let indice = 1; indice < listado.cuerpo.length; indice += 1) {
      assert.ok(
        new Date(listado.cuerpo[indice - 1]!.creadoEn).getTime()
          >= new Date(listado.cuerpo[indice]!.creadoEn).getTime(),
        "El listado debe estar ordenado desde la ejecución más reciente",
      );
    }

    const cantidadAntesDeGuardadoSinCoincidencias = listado.cuerpo.length;
    const sinCoincidencias = {
      ...payloadLibre,
      candidatos: [candidato("!!!!!!!!", 100)],
    };
    const guardadoSinCoincidencias = await solicitar<GuardadoApi>(baseUrl, "/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(sinCoincidencias),
    });
    assert.equal(guardadoSinCoincidencias.estado, 201, guardadoSinCoincidencias.texto);
    idsTemporales.push(guardadoSinCoincidencias.cuerpo.id);
    assert.equal(guardadoSinCoincidencias.cuerpo.mejorCoincidencia, 0);
    assert.equal(guardadoSinCoincidencias.cuerpo.candidatosGuardados, 1);

    const cantidadAntesDeFallos = cantidadAntesDeGuardadoSinCoincidencias + 1;

    const falloTransaccional = {
      ...payloadLibre,
      candidatos: [
        candidato(PATENTE_PRUEBA, 100),
        candidato(PATENTE_PRUEBA, 100, PNG_CRC_INVALIDO),
      ],
    };
    const rechazoPng = await solicitar<unknown>(baseUrl, "/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(falloTransaccional),
    });
    assert.equal(rechazoPng.estado, 400, rechazoPng.texto);

    const textoExcesivo = {
      ...payloadLibre,
      candidatos: [candidato("A".repeat(257), 100)],
    };
    const rechazoTexto = await solicitar<unknown>(baseUrl, "/api/ejecuciones", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(textoExcesivo),
    });
    assert.equal(rechazoTexto.estado, 400, rechazoTexto.texto);

    const listadoTrasFallos = await solicitar<ResumenApi[]>(baseUrl, "/api/ejecuciones");
    assert.equal(listadoTrasFallos.cuerpo.length, cantidadAntesDeFallos, "Un fallo no debe dejar filas parciales");

    for (const metodo of ["PUT", "PATCH", "DELETE"]) {
      const respuesta = await solicitar<unknown>(baseUrl, `/api/ejecuciones/${primerGuardado.cuerpo.id}`, {
        method: metodo,
        headers: { "content-type": "application/json" },
        body: metodo === "DELETE" ? undefined : "{}",
      });
      assert.equal(respuesta.estado, 404, `${metodo} no debe permitir modificar una ejecución histórica`);
    }

    console.log("✓ migración disponible y API iniciada sobre PostgreSQL real");
    console.log("✓ identificadores inválidos se rechazan con 400");
    console.log("✓ cada guardado crea una ejecución nueva e inmutable");
    console.log("✓ persisten todos los candidatos en su orden original");
    console.log("✓ texto nulo y coincidencia de 0% se conservan para experimentación");
    console.log("✓ un PNG con CRC corrupto revierte la transacción completa");
    console.log("✓ los textos excesivos se rechazan antes de calcular Levenshtein");
    console.log("✓ modo libre conserva orden, repeticiones, estado y parámetros");
    console.log("✓ modo fijo conserva estado y parámetros");
    console.log("✓ listado y detalle restauran estadísticas y PNG exactos");
  } finally {
    if (fuenteDatos.isInitialized && imagenTemporalId) {
      await fuenteDatos.getRepository(Imagen).delete(imagenTemporalId);
      const restantes = idsTemporales.length === 0
        ? 0
        : await fuenteDatos.getRepository(Ejecucion).createQueryBuilder("ejecucion")
          .where("ejecucion.id IN (:...ids)", { ids: idsTemporales })
          .getCount();
      assert.equal(restantes, 0, "Eliminar la imagen temporal debe limpiar sus ejecuciones en cascada");
      console.log(`✓ limpieza: imagen temporal y ${idsTemporales.length} ejecuciones eliminadas`);
    }
    if (servidor?.listening) {
      await new Promise<void>((resolver, rechazar) => {
        servidor!.close((error) => (error ? rechazar(error) : resolver()));
      });
    }
    if (fuenteDatos.isInitialized) await fuenteDatos.destroy();
  }
}

principal().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
