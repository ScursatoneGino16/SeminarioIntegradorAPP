-- Se elimina la funcionalidad de reacciones con emoji (fuera del alcance acordado).

-- DropForeignKey
ALTER TABLE "reaccion_x_resena" DROP CONSTRAINT "reaccion_x_resena_resena_id_fkey";

-- DropForeignKey
ALTER TABLE "reaccion_x_resena" DROP CONSTRAINT "reaccion_x_resena_steam_id_fkey";

-- DropTable
DROP TABLE "reaccion_x_resena";

