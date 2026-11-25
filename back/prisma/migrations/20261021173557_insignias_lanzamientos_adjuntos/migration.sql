-- AlterTable
ALTER TABLE "videojuego" ADD COLUMN     "fecha_lanzamiento" DATE,
ADD COLUMN     "fecha_lanzamiento_texto" VARCHAR(60),
ADD COLUMN     "proximamente" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "adjunto_resena" (
    "adjunto_id" SERIAL NOT NULL,
    "resena_id" INTEGER NOT NULL,
    "tipo" VARCHAR(10) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "adjunto_resena_pkey" PRIMARY KEY ("adjunto_id")
);

-- CreateTable
CREATE TABLE "suscripcion_lanzamiento" (
    "suscripcion_id" SERIAL NOT NULL,
    "app_id" INTEGER NOT NULL,
    "steam_id" VARCHAR(20) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "token" UUID NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avisado_en" TIMESTAMP(3),

    CONSTRAINT "suscripcion_lanzamiento_pkey" PRIMARY KEY ("suscripcion_id")
);

-- CreateIndex
CREATE INDEX "adjunto_resena_resena_id_idx" ON "adjunto_resena"("resena_id");

-- CreateIndex
CREATE UNIQUE INDEX "suscripcion_lanzamiento_token_key" ON "suscripcion_lanzamiento"("token");

-- CreateIndex
CREATE INDEX "suscripcion_lanzamiento_avisado_en_idx" ON "suscripcion_lanzamiento"("avisado_en");

-- CreateIndex
CREATE UNIQUE INDEX "suscripcion_lanzamiento_app_id_email_key" ON "suscripcion_lanzamiento"("app_id", "email");

-- CreateIndex
CREATE INDEX "videojuego_proximamente_fecha_lanzamiento_idx" ON "videojuego"("proximamente", "fecha_lanzamiento");

-- AddForeignKey
ALTER TABLE "adjunto_resena" ADD CONSTRAINT "adjunto_resena_resena_id_fkey" FOREIGN KEY ("resena_id") REFERENCES "resena"("resena_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcion_lanzamiento" ADD CONSTRAINT "suscripcion_lanzamiento_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "videojuego"("app_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcion_lanzamiento" ADD CONSTRAINT "suscripcion_lanzamiento_steam_id_fkey" FOREIGN KEY ("steam_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adjuntos: solo GIF de Giphy o imagen subida (RNF 8)
ALTER TABLE "adjunto_resena" ADD CONSTRAINT "adjunto_resena_tipo_check" CHECK ("tipo" IN ('gif', 'imagen'));
