import { z } from "zod";

const esquemaEntorno = z.object({
  PUERTO: z.coerce.number().default(6000),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string(),
  POSTGRES_PASSWORD: z.string(),
  POSTGRES_DB: z.string(),
  URL_SERVICIO_CV: z.string().url().default("http://localhost:8000"),
});

export const entorno = esquemaEntorno.parse(process.env);
