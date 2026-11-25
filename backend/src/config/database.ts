import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const nomeBanco = process.env.DB_NAME;
const ambienteTeste = process.env.NODE_ENV === "test";
const databaseUrl = process.env.DATABASE_URL?.trim();

if (process.env.NODE_ENV === "test" && nomeBanco !== "petagenda_test") {
    throw new Error(
        "ERRO DE SEGURANÇA: os testes só podem utilizar o banco petagenda_test."
    );
}

if (ambienteTeste && databaseUrl) {
    throw new Error(
        "ERRO DE SEGURANÇA: DATABASE_URL não pode ser utilizada durante os testes automatizados."
    );
}

const configuracaoRemota = databaseUrl && !ambienteTeste
    ? new URL(databaseUrl)
    : null;

if (configuracaoRemota) {
    configuracaoRemota.searchParams.set("sslmode", "verify-full");
}

export const pool = new Pool(
    configuracaoRemota
        ? {
            connectionString: configuracaoRemota.toString(),
            ssl: {
                rejectUnauthorized: true,
            },
        }
        : {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            database: nomeBanco,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        }
);

pool.on("error", (erro: Error) => {
    console.error("Erro inesperado na conexão com PostgreSQL:", erro);
});

export async function testarConexao(): Promise<void> {
    const cliente = await pool.connect();

    try {
        const resultado = await cliente.query(
            "SELECT current_database() AS banco, current_user AS usuario"
        );

        console.log("PostgreSQL conectado com sucesso!");
        console.log("Banco:", resultado.rows[0].banco);
        console.log("Usuário:", resultado.rows[0].usuario);
    } finally {
        cliente.release();
    }
}
