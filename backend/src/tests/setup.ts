import { beforeAll, afterAll } from "vitest";
import { pool } from "../config/database.js";

beforeAll(async () => {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.DB_NAME !== "petagenda_test"
  ) {
    throw new Error(
      "SEGURANÇA: os testes devem utilizar exclusivamente petagenda_test."
    );
  }

  const resultado = await pool.query<{
    banco: string;
  }>("SELECT current_database() AS banco");

  if (resultado.rows[0]?.banco !== "petagenda_test") {
    throw new Error(
      "SEGURANÇA: conexão com banco diferente de petagenda_test."
    );
  }

  await pool.query(`
    TRUNCATE TABLE
      prontuarios,
      atendimentos,
      consultas,
      animais,
      veterinarios,
      tutores
    CONTINUE IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await pool.end();
});