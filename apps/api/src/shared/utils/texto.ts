/**
 * El nombre de archivo de cada patente ES su ground-truth (`KPTX73.JPG` ->
 * "KPTX73"), lo que permite medir el acierto del OCR sin etiquetado manual.
 */
export function derivarPatenteEsperada(nombreArchivo: string): string | null {
  const sinExtension = nombreArchivo.replace(/\.[^.]+$/, "");
  const sinSufijoCopia = sinExtension.replace(/\s+copy(\s*\d*)?$/i, "");
  const limpio = sinSufijoCopia.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return limpio.length > 0 ? limpio : null;
}

export function normalizarTexto(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, () => new Array<number>(columnas).fill(0));

  for (let i = 0; i < filas; i += 1) matriz[i]![0] = i;
  for (let j = 0; j < columnas; j += 1) matriz[0]![j] = j;

  for (let i = 1; i < filas; i += 1) {
    for (let j = 1; j < columnas; j += 1) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i]![j] = Math.min(
        matriz[i - 1]![j]! + 1,
        matriz[i]![j - 1]! + 1,
        matriz[i - 1]![j - 1]! + costo,
      );
    }
  }

  return matriz[filas - 1]![columnas - 1]!;
}

/**
 * Calcula la similitud normalizada y evita residuos de coma flotante en
 * umbrales exactos (por ejemplo, 20% no debe convertirse en 19.999999...).
 */
export function calcularCoincidencia(texto: string, esperado: string): number {
  const longitud = Math.max(texto.length, esperado.length);
  if (longitud === 0) return 0;

  const porcentaje = Math.max(0, (1 - distanciaLevenshtein(texto, esperado) / longitud) * 100);
  return Math.round(porcentaje * 100) / 100;
}
