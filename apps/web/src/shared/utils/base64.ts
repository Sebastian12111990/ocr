const TAMANO_BLOQUE = 3 * 8192;
const TAMANO_BLOQUE_BASE64 = 4 * 8192;

/** Convierte un Blob a Base64 puro, sin el prefijo data: requerido solo para visualizarlo. */
export async function blobABase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let base64 = "";

  // Cada bloque, salvo el último, es múltiplo de tres para poder concatenar
  // Base64 sin introducir relleno intermedio.
  for (let inicio = 0; inicio < bytes.length; inicio += TAMANO_BLOQUE) {
    const bloque = bytes.subarray(inicio, Math.min(inicio + TAMANO_BLOQUE, bytes.length));
    base64 += btoa(String.fromCharCode(...bloque));
  }
  return base64;
}

/** Reconstruye un Blob desde Base64 puro sin crear un arreglo monolítico. */
export function base64ABlob(base64: string, tipo = "image/png"): Blob {
  if (!base64) throw new Error("La ejecución guardada no contiene una imagen procesada");
  const partes: ArrayBuffer[] = [];

  for (let inicio = 0; inicio < base64.length; inicio += TAMANO_BLOQUE_BASE64) {
    const binario = atob(base64.slice(inicio, inicio + TAMANO_BLOQUE_BASE64));
    const bytes = Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0));
    partes.push(bytes.buffer);
  }
  return new Blob(partes, { type: tipo });
}
