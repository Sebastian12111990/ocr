export class ErrorAplicacion extends Error {
  constructor(
    message: string,
    public readonly codigoEstado: number,
    public readonly detalle?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ErrorNoEncontrado extends ErrorAplicacion {
  constructor(mensaje: string) {
    super(mensaje, 404);
  }
}

export class ErrorValidacion extends ErrorAplicacion {
  constructor(mensaje: string, detalle?: unknown) {
    super(mensaje, 400, detalle);
  }
}

export class ErrorServicioExterno extends ErrorAplicacion {
  constructor(mensaje: string, codigoEstado = 502, detalle?: unknown) {
    super(mensaje, codigoEstado, detalle);
  }
}
