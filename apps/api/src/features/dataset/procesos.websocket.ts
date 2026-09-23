import type { Server as ServidorHttp } from "node:http";

import { WebSocketServer } from "ws";

import { ServicioProcesamientoDataset } from "./procesamiento-dataset.service.js";

export const RUTA_WS_PROCESOS = "/api/dataset/procesos/stream";

export function crearServidorProcesos(servidorHttp: ServidorHttp, servicio: ServicioProcesamientoDataset): void {
  const wss = new WebSocketServer({ server: servidorHttp, path: RUTA_WS_PROCESOS });

  wss.on("connection", (socket) => {
    socket.send(JSON.stringify(servicio.obtenerEstado()));

    const cancelarSuscripcion = servicio.onCambio((estado) => {
      if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(estado));
    });

    socket.on("close", cancelarSuscripcion);
  });
}
