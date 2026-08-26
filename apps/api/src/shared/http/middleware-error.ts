import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import { ErrorAplicacion } from "./error-aplicacion.js";

export function middlewareError(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ErrorAplicacion) {
    res.status(error.codigoEstado).json({ error: error.message, detalle: error.detalle });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({ error: "Solicitud inválida", detalle: error.issues });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Error interno" });
}
