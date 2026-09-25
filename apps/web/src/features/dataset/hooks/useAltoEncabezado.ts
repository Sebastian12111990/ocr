import { useEffect, useRef, useState } from "react";

/** Observa el alto real de un elemento (p.ej. un encabezado sticky) para que otros elementos
 * puedan compensarlo (offset de un segundo sticky, rootMargin de un IntersectionObserver). */
export function useAltoEncabezado<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [alto, setAlto] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;

    const actualizarAlto = () => setAlto(elemento.offsetHeight);
    actualizarAlto();

    const observador = new ResizeObserver(actualizarAlto);
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return { ref, alto };
}
