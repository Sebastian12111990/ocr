from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.rutas import router
from config import PUERTO

app = FastAPI(title="Servicio de visión — editor OCR de patentes")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # servicio interno; sólo lo llama apps/api, nunca el navegador
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=PUERTO, reload=True)
