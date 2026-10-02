-- Popularidad en Steam para ordenar el catálogo y fecha de actualización del perfil de Steam.
-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "perfil_actualizado_en" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "videojuego" ADD COLUMN     "votos_steam" INTEGER NOT NULL DEFAULT 0;

