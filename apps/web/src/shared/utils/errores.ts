export function extraerMensajeError(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const datos = (error as { data?: { error?: string } }).data;
    if (datos?.error) return datos.error;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Ocurrió un error inesperado.";
}
