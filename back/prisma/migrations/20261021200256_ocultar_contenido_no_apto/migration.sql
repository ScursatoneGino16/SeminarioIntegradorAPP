-- AlterTable
ALTER TABLE "categoria" ADD COLUMN     "oculta" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "etiqueta" ADD COLUMN     "oculta" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "videojuego" ADD COLUMN     "contenido_adulto" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "videojuego_contenido_adulto_idx" ON "videojuego"("contenido_adulto");

-- Categorías (géneros de Steam traducidos) y etiquetas no aptas para mostrar
UPDATE "categoria" SET "oculta" = true
WHERE "nombre_categoria" IN ('Violento', 'Gore', 'Desnudos', 'Contenido sexual');
UPDATE "etiqueta" SET "oculta" = true
WHERE "nombre_etiqueta" IN ('Violent', 'Gore', 'Blood', 'Sexual Content', 'Nudity', 'Mature', 'Hentai', 'NSFW');
