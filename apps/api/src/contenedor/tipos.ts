export const TIPOS = {
  FuenteDatos: Symbol.for("FuenteDatos"),
  RepositorioImagen: Symbol.for("RepositorioImagen"),
  RepositorioPreset: Symbol.for("RepositorioPreset"),
  RepositorioEjecucion: Symbol.for("RepositorioEjecucion"),

  ClienteCv: Symbol.for("ClienteCv"),

  ServicioCatalogo: Symbol.for("ServicioCatalogo"),
  ServicioImagenes: Symbol.for("ServicioImagenes"),
  ServicioProcesamiento: Symbol.for("ServicioProcesamiento"),
  ServicioOcr: Symbol.for("ServicioOcr"),
  ServicioPresets: Symbol.for("ServicioPresets"),
  ServicioEjecuciones: Symbol.for("ServicioEjecuciones"),
  ServicioCandidatos: Symbol.for("ServicioCandidatos"),

  ControladorCatalogo: Symbol.for("ControladorCatalogo"),
  ControladorImagenes: Symbol.for("ControladorImagenes"),
  ControladorProcesamiento: Symbol.for("ControladorProcesamiento"),
  ControladorOcr: Symbol.for("ControladorOcr"),
  ControladorPresets: Symbol.for("ControladorPresets"),
  ControladorEjecuciones: Symbol.for("ControladorEjecuciones"),
  ControladorCandidatos: Symbol.for("ControladorCandidatos"),
} as const;
