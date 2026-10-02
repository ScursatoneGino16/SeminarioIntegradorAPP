-- CreateTable
CREATE TABLE "usuario" (
    "steam_id" VARCHAR(20) NOT NULL,
    "nombre_usuario" VARCHAR(100) NOT NULL,
    "avatar_url" TEXT,
    "biblioteca_publica" BOOLEAN NOT NULL DEFAULT false,
    "es_admin" BOOLEAN NOT NULL DEFAULT false,
    "fecha_alta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acceso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("steam_id")
);

-- CreateTable
CREATE TABLE "videojuego" (
    "app_id" INTEGER NOT NULL,
    "nombre_videojuego" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL DEFAULT '',
    "imagen_url" TEXT,

    CONSTRAINT "videojuego_pkey" PRIMARY KEY ("app_id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "categoria_id" SERIAL NOT NULL,
    "nombre_categoria" VARCHAR(100) NOT NULL,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("categoria_id")
);

-- CreateTable
CREATE TABLE "etiqueta" (
    "etiqueta_id" SERIAL NOT NULL,
    "nombre_etiqueta" VARCHAR(100) NOT NULL,

    CONSTRAINT "etiqueta_pkey" PRIMARY KEY ("etiqueta_id")
);

-- CreateTable
CREATE TABLE "videojuego_x_categoria" (
    "app_id" INTEGER NOT NULL,
    "categoria_id" INTEGER NOT NULL,

    CONSTRAINT "videojuego_x_categoria_pkey" PRIMARY KEY ("app_id","categoria_id")
);

-- CreateTable
CREATE TABLE "videojuego_x_etiqueta" (
    "app_id" INTEGER NOT NULL,
    "etiqueta_id" INTEGER NOT NULL,

    CONSTRAINT "videojuego_x_etiqueta_pkey" PRIMARY KEY ("app_id","etiqueta_id")
);

-- CreateTable
CREATE TABLE "usuario_x_videojuego" (
    "steam_id" VARCHAR(20) NOT NULL,
    "app_id" INTEGER NOT NULL,
    "horas_jugadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_x_videojuego_pkey" PRIMARY KEY ("app_id","steam_id")
);

-- CreateTable
CREATE TABLE "resena" (
    "resena_id" SERIAL NOT NULL,
    "steam_id" VARCHAR(20) NOT NULL,
    "app_id" INTEGER NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" VARCHAR(1200) NOT NULL,
    "horas_al_comentar" DOUBLE PRECISION NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP(3),
    "cant_like" INTEGER NOT NULL DEFAULT 0,
    "cant_dislike" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "resena_pkey" PRIMARY KEY ("resena_id")
);

-- CreateTable
CREATE TABLE "valoracion_x_resena" (
    "steam_id" VARCHAR(20) NOT NULL,
    "resena_id" INTEGER NOT NULL,
    "es_like" BOOLEAN NOT NULL,

    CONSTRAINT "valoracion_x_resena_pkey" PRIMARY KEY ("steam_id","resena_id")
);

-- CreateTable
CREATE TABLE "reaccion_x_resena" (
    "steam_id" VARCHAR(20) NOT NULL,
    "resena_id" INTEGER NOT NULL,
    "emoji" VARCHAR(16) NOT NULL,

    CONSTRAINT "reaccion_x_resena_pkey" PRIMARY KEY ("steam_id","resena_id","emoji")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "videojuego_nombre_videojuego_idx" ON "videojuego"("nombre_videojuego");

-- CreateIndex
CREATE UNIQUE INDEX "categoria_nombre_categoria_key" ON "categoria"("nombre_categoria");

-- CreateIndex
CREATE UNIQUE INDEX "etiqueta_nombre_etiqueta_key" ON "etiqueta"("nombre_etiqueta");

-- CreateIndex
CREATE INDEX "resena_app_id_cant_like_idx" ON "resena"("app_id", "cant_like" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "resena_steam_id_app_id_key" ON "resena"("steam_id", "app_id");

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "session"("expire");

-- AddForeignKey
ALTER TABLE "videojuego_x_categoria" ADD CONSTRAINT "videojuego_x_categoria_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "videojuego"("app_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videojuego_x_categoria" ADD CONSTRAINT "videojuego_x_categoria_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("categoria_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videojuego_x_etiqueta" ADD CONSTRAINT "videojuego_x_etiqueta_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "videojuego"("app_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videojuego_x_etiqueta" ADD CONSTRAINT "videojuego_x_etiqueta_etiqueta_id_fkey" FOREIGN KEY ("etiqueta_id") REFERENCES "etiqueta"("etiqueta_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_x_videojuego" ADD CONSTRAINT "usuario_x_videojuego_steam_id_fkey" FOREIGN KEY ("steam_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_x_videojuego" ADD CONSTRAINT "usuario_x_videojuego_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "videojuego"("app_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "resena_steam_id_fkey" FOREIGN KEY ("steam_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resena" ADD CONSTRAINT "resena_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "videojuego"("app_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoracion_x_resena" ADD CONSTRAINT "valoracion_x_resena_steam_id_fkey" FOREIGN KEY ("steam_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valoracion_x_resena" ADD CONSTRAINT "valoracion_x_resena_resena_id_fkey" FOREIGN KEY ("resena_id") REFERENCES "resena"("resena_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaccion_x_resena" ADD CONSTRAINT "reaccion_x_resena_steam_id_fkey" FOREIGN KEY ("steam_id") REFERENCES "usuario"("steam_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reaccion_x_resena" ADD CONSTRAINT "reaccion_x_resena_resena_id_fkey" FOREIGN KEY ("resena_id") REFERENCES "resena"("resena_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Restricciones de dominio (RNF 8 / RNF 11)
ALTER TABLE "resena" ADD CONSTRAINT "resena_calificacion_check" CHECK ("calificacion" BETWEEN 1 AND 5);
ALTER TABLE "resena" ADD CONSTRAINT "resena_horas_check" CHECK ("horas_al_comentar" >= 0);
ALTER TABLE "resena" ADD CONSTRAINT "resena_contadores_check" CHECK ("cant_like" >= 0 AND "cant_dislike" >= 0);
ALTER TABLE "usuario_x_videojuego" ADD CONSTRAINT "uxv_horas_check" CHECK ("horas_jugadas" >= 0);
