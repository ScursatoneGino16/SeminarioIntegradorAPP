-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "horas_totales_steam" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "amistad" (
    "solicitante_id" VARCHAR(20) NOT NULL,
    "receptor_id" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(10) NOT NULL,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_respuesta" TIMESTAMP(3),

    CONSTRAINT "amistad_pkey" PRIMARY KEY ("solicitante_id","receptor_id")
);

-- CreateTable
CREATE TABLE "notificacion" (
    "notificacion_id" SERIAL NOT NULL,
    "steam_id" VARCHAR(20) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "datos" JSONB NOT NULL DEFAULT '{}',
    "leida_en" TIMESTAMP(3),
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacion_pkey" PRIMARY KEY ("notificacion_id")
);

-- CreateIndex
CREATE INDEX "amistad_receptor_id_estado_idx" ON "amistad"("receptor_id", "estado");

-- CreateIndex
CREATE INDEX "notificacion_steam_id_leida_en_fecha_creacion_idx" ON "notificacion"("steam_id", "leida_en", "fecha_creacion" DESC);

-- AddForeignKey
ALTER TABLE "amistad" ADD CONSTRAINT "amistad_solicitante_id_fkey" FOREIGN KEY ("solicitante_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amistad" ADD CONSTRAINT "amistad_receptor_id_fkey" FOREIGN KEY ("receptor_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion" ADD CONSTRAINT "notificacion_steam_id_fkey" FOREIGN KEY ("steam_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones de dominio (RNF 8)
ALTER TABLE "amistad" ADD CONSTRAINT "amistad_estado_check" CHECK ("estado" IN ('pendiente', 'aceptada'));
ALTER TABLE "amistad" ADD CONSTRAINT "amistad_distintos_check" CHECK ("solicitante_id" <> "receptor_id");
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_horas_totales_check" CHECK ("horas_totales_steam" >= 0);
