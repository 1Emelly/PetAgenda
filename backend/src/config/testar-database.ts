import { pool, testarConexao } from "./database.js";

async function executar(): Promise<void> {
    try {
        await testarConexao();
    } catch (erro) {
        console.error("Falha ao conectar com PostgreSQL:", erro);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

executar();