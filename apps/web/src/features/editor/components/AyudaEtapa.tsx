import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Stack, Tooltip, Typography } from "@mui/material";

interface ContenidoAyuda {
  descripcion: string;
  utilidad: string;
  casoUso: string;
  ejemplo: string;
}

const AYUDAS: Record<string, ContenidoAyuda> = {
  escala_gris: {
    descripcion: "Convierte la imagen a un único canal de intensidad.",
    utilidad: "Reduce información de color y simplifica las etapas posteriores.",
    casoUso: "Preparar una fotografía para umbralización, bordes u OCR.",
    ejemplo: "Transformar una patente en color a tonos de gris antes de aplicar Canny.",
  },
  morfologia: {
    descripcion: "Aplica apertura, cierre, gradiente, top-hat o black-hat con un kernel.",
    utilidad: "Limpia ruido, une regiones o resalta estructuras según la operación elegida.",
    casoUso: "Corregir caracteres fragmentados o puntos aislados después de umbralizar.",
    ejemplo: "Usar cierre con kernel 3 para unir trazos cortados de una letra.",
  },
  canny: {
    descripcion: "Detecta cambios bruscos de intensidad y produce un mapa de bordes.",
    utilidad: "Delimita objetos y prepara la búsqueda de contornos.",
    casoUso: "Encontrar los límites rectangulares de una patente.",
    ejemplo: "Aplicar umbrales 50 y 150 antes de Rectángulos (contornos).",
  },
  harris: {
    descripcion: "Detecta esquinas mediante variaciones de intensidad en dos direcciones.",
    utilidad: "Identifica puntos geométricos fuertes y repetibles.",
    casoUso: "Analizar marcos, placas inclinadas o estructuras con vértices definidos.",
    ejemplo: "Resaltar las cuatro esquinas visibles del borde de una patente.",
  },
  cuadricula: {
    descripcion: "Busca el patrón regular de esquinas de una cuadrícula de ajedrez.",
    utilidad: "Permite comprobar o preparar una calibración de cámara.",
    casoUso: "Calibrar perspectiva y distorsión usando una imagen patrón.",
    ejemplo: "Detectar una cuadrícula interna de 7×7 esquinas.",
  },
  rectangulos: {
    descripcion: "Busca contornos, los convierte en rectángulos rotados y filtra candidatos.",
    utilidad: "Localiza regiones con forma compatible con una placa patente.",
    casoUso: "Generar los recortes que luego serán evaluados por Tesseract.",
    ejemplo: "Conservar regiones anchas, de área suficiente y con poca inclinación.",
  },
  threshold: {
    descripcion: "Separa píxeles en dos grupos usando un umbral global.",
    utilidad: "Convierte la imagen en binaria para aislar texto y fondo.",
    casoUso: "Imágenes con iluminación relativamente uniforme.",
    ejemplo: "Convertir intensidades mayores a 127 en blanco y el resto en negro.",
  },
  umbral_adaptativo: {
    descripcion: "Calcula un umbral distinto para cada zona de la imagen.",
    utilidad: "Compensa sombras, reflejos y cambios locales de iluminación.",
    casoUso: "Patentes con una mitad iluminada y otra en sombra.",
    ejemplo: "Usar un bloque impar de 11 píxeles y ajustar la constante C.",
  },
  desenfoque: {
    descripcion: "Promedia los píxeles vecinos dentro de un kernel rectangular.",
    utilidad: "Suaviza ruido rápido, aunque también difumina bordes.",
    casoUso: "Reducir textura fina antes de una umbralización sencilla.",
    ejemplo: "Aplicar un kernel 3×3 sobre una imagen granulada.",
  },
  desenfoque_gaussiano: {
    descripcion: "Suaviza usando pesos gaussianos, dando más importancia al centro.",
    utilidad: "Reduce ruido con una pérdida de bordes más gradual que el promedio simple.",
    casoUso: "Preparar una imagen ruidosa antes de Canny.",
    ejemplo: "Aplicar kernel 5×5 antes de detectar bordes.",
  },
  desenfoque_mediana: {
    descripcion: "Reemplaza cada píxel por la mediana de sus vecinos.",
    utilidad: "Elimina especialmente bien el ruido de sal y pimienta.",
    casoUso: "Fotografías con puntos blancos o negros aislados.",
    ejemplo: "Aplicar medianBlur con kernel 5 sin difuminar tanto los bordes.",
  },
  gamma: {
    descripcion: "Modifica de forma no lineal el brillo de los tonos medios.",
    utilidad: "Aclara zonas oscuras o recupera contraste en zonas demasiado claras.",
    casoUso: "Patentes subexpuestas o con iluminación desigual.",
    ejemplo: "Usar gamma 0,8 para aclarar una placa oscura.",
  },
  sobel: {
    descripcion: "Calcula el gradiente de intensidad en los ejes horizontal y vertical.",
    utilidad: "Resalta bordes y permite observar su fuerza y dirección.",
    casoUso: "Destacar trazos de caracteres o bordes del marco.",
    ejemplo: "Usar kernel 3 o 5 para remarcar cambios de intensidad.",
  },
  erosion: {
    descripcion: "Reduce las regiones claras según el kernel y las iteraciones.",
    utilidad: "Elimina puntos claros pequeños y separa objetos unidos.",
    casoUso: "Adelgazar caracteres demasiado gruesos después del umbral.",
    ejemplo: "Erosionar una vez con kernel 3×3.",
  },
  dilatacion: {
    descripcion: "Expande las regiones claras según el kernel y las iteraciones.",
    utilidad: "Engrosa trazos y conecta fragmentos cercanos.",
    casoUso: "Reconstruir caracteres cortados o bordes discontinuos.",
    ejemplo: "Dilatar una vez con kernel 3×3 antes de buscar contornos.",
  },
  redimensionar: {
    descripcion: "Cambia el ancho y alto de la imagen usando un factor de escala.",
    utilidad: "Aumenta detalles pequeños o reduce el costo de procesamiento.",
    casoUso: "Ampliar una patente pequeña antes de ejecutar OCR.",
    ejemplo: "Usar factor 2 para duplicar sus dimensiones.",
  },
  shi_tomasi: {
    descripcion: "Selecciona las esquinas más fuertes mediante el criterio Shi–Tomasi.",
    utilidad: "Obtiene puntos de interés estables y limita su cantidad y separación.",
    casoUso: "Localizar vértices para seguimiento, alineación o análisis geométrico.",
    ejemplo: "Buscar hasta 50 esquinas separadas al menos 10 píxeles.",
  },
};

/** Señal observable que ayuda a decidir si conviene incorporar la etapa.
 * Se mantiene separada del caso de uso, que describe una tarea concreta. */
const CUANDO_USAR: Record<string, string> = {
  escala_gris: "Cuando el color no aporta información y las siguientes etapas trabajan con intensidad.",
  morfologia: "Cuando la imagen binaria presenta puntos aislados, huecos o trazos que no se conectan.",
  canny: "Cuando los objetos tienen límites contrastados y necesitas convertirlos en contornos analizables.",
  harris: "Cuando necesitas muchas esquinas fuertes y aceptas que puedan aparecer agrupadas.",
  cuadricula: "Cuando la imagen contiene una cuadrícula de calibración conocida y completamente visible.",
  rectangulos: "Cuando ya existen bordes definidos y buscas regiones con geometría similar a una patente.",
  threshold: "Cuando la iluminación es uniforme y texto y fondo se separan con un único nivel de intensidad.",
  umbral_adaptativo: "Cuando un umbral global pierde caracteres por sombras, reflejos o iluminación irregular.",
  desenfoque: "Cuando hay ruido fino moderado y priorizas rapidez por sobre conservar bordes muy precisos.",
  desenfoque_gaussiano: "Cuando hay ruido suave antes de calcular gradientes o ejecutar Canny.",
  desenfoque_mediana: "Cuando observas píxeles blancos y negros aislados, conocidos como ruido sal y pimienta.",
  gamma: "Cuando los detalles existen pero están ocultos en tonos demasiado oscuros o demasiado claros.",
  sobel: "Cuando necesitas conocer la fuerza de los bordes o destacar una orientación determinada.",
  erosion: "Cuando las regiones blancas están demasiado gruesas, unidas o contienen puntos pequeños.",
  dilatacion: "Cuando los trazos blancos están delgados, cortados o separados por huecos pequeños.",
  redimensionar: "Cuando la región relevante es demasiado pequeña para OCR o demasiado grande para procesarla eficientemente.",
  shi_tomasi: "Cuando necesitas pocas esquinas de alta calidad y bien separadas entre sí.",
};

interface Props {
  tipo: string;
  titulo: string;
}

export function AyudaEtapa({ tipo, titulo }: Props) {
  const ayuda = AYUDAS[tipo] ?? {
    descripcion: "Etapa configurable del pipeline de procesamiento.",
    utilidad: "Permite transformar o analizar la imagen dentro del flujo OCR.",
    casoUso: "Ajustar el procesamiento según las características de la fotografía.",
    ejemplo: "Activa la etapa y compara la vista previa antes de guardar.",
  };

  return (
    <Tooltip
      arrow
      placement="left"
      enterDelay={150}
      title={(
        <Stack spacing={0.75} sx={{ py: 0.5 }}>
          <Typography variant="subtitle2">{titulo}</Typography>
          <Typography variant="caption"><strong>Descripción:</strong> {ayuda.descripcion}</Typography>
          <Typography variant="caption"><strong>Para qué sirve:</strong> {ayuda.utilidad}</Typography>
          <Typography variant="caption">
            <strong>Cuándo usarlo:</strong> {CUANDO_USAR[tipo] ?? "Cuando la vista previa indique que esta transformación mejora la región de interés."}
          </Typography>
          <Typography variant="caption"><strong>Caso de uso:</strong> {ayuda.casoUso}</Typography>
          <Typography variant="caption"><strong>Ejemplo:</strong> {ayuda.ejemplo}</Typography>
        </Stack>
      )}
      slotProps={{ tooltip: { sx: { maxWidth: 390 } } }}
    >
      <Box
        component="span"
        role="img"
        aria-label={`Información sobre ${titulo}`}
        onMouseDown={(evento) => evento.stopPropagation()}
        onClick={(evento) => evento.stopPropagation()}
        sx={{
          display: "inline-flex",
          flexShrink: 0,
          color: "text.secondary",
          cursor: "help",
          "&:hover": { color: "primary.light" },
        }}
      >
        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
      </Box>
    </Tooltip>
  );
}
