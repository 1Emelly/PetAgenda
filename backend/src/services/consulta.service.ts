import { pool } from "../config/database.js";
import type { StatusConsulta } from "./consulta.schema.js";

export interface Consulta {
  id: number;
  animalId: number;
  veterinarioId: number;
  dataHora: string;
  motivo: string;
  status: StatusConsulta;
}

interface ConsultaBanco {
  id: number;
  animal_id: number;
  veterinario_id: number;
  data_hora: Date;
  motivo: string;
  status: StatusConsulta;
}

const camposConsulta = `
  id,
  animal_id,
  veterinario_id,
  data_hora,
  motivo,
  status
`;

function converterConsulta(registro: ConsultaBanco): Consulta {
  return {
    id: registro.id,
    animalId: registro.animal_id,
    veterinarioId: registro.veterinario_id,
    dataHora: registro.data_hora.toISOString(),
    motivo: registro.motivo,
    status: registro.status
  };
}

export async function listarTodasConsultas(): Promise<Consulta[]> {
  const resultado = await pool.query<ConsultaBanco>(
    `SELECT ${camposConsulta}
     FROM consultas
     ORDER BY id`
  );

  return resultado.rows.map(converterConsulta);
}

export async function cadastrarNovaConsulta(
  dados: Omit<Consulta, "id" | "status">
): Promise<Consulta | null> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    // Serializa operações de agendamento do mesmo veterinário.
    await cliente.query(
      "SELECT pg_advisory_xact_lock($1, $2)",
      [18472, dados.veterinarioId]
    );

    const conflito = await cliente.query(
      `SELECT id
       FROM consultas
       WHERE veterinario_id = $1
         AND data_hora = $2::timestamptz
         AND status NOT IN ('Cancelada', 'Concluída', 'Concluida')
       LIMIT 1`,
      [dados.veterinarioId, dados.dataHora]
    );

    if (conflito.rows.length > 0) {
      await cliente.query("ROLLBACK");
      return null;
    }

    const resultado = await cliente.query<ConsultaBanco>(
      `INSERT INTO consultas
       (animal_id, veterinario_id, data_hora, motivo, status)
       VALUES ($1, $2, $3::timestamptz, $4, 'Agendada')
       RETURNING ${camposConsulta}`,
      [
        dados.animalId,
        dados.veterinarioId,
        dados.dataHora,
        dados.motivo
      ]
    );

    await cliente.query("COMMIT");

    return converterConsulta(resultado.rows[0]);
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function buscarConsultaPorId(
  id: number
): Promise<Consulta | undefined> {
  const resultado = await pool.query<ConsultaBanco>(
    `SELECT ${camposConsulta}
     FROM consultas
     WHERE id = $1`,
    [id]
  );

  const registro = resultado.rows[0];

  return registro ? converterConsulta(registro) : undefined;
}

export async function verificarConflitoHorario(
  veterinarioId: number,
  dataHora: string,
  consultaIgnoradaId?: number
): Promise<boolean> {
  const resultado = await pool.query(
    `SELECT id
     FROM consultas
     WHERE veterinario_id = $1
       AND data_hora = $2::timestamptz
       AND status NOT IN ('Cancelada', 'Concluída', 'Concluida')
       AND ($3::integer IS NULL OR id <> $3)
     LIMIT 1`,
    [
      veterinarioId,
      dataHora,
      consultaIgnoradaId ?? null
    ]
  );

  return resultado.rows.length > 0;
}

export async function atualizarDataConsulta(
  id: number,
  dataHora: string
): Promise<Consulta | null | undefined> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const consultaAtual = await cliente.query<ConsultaBanco>(
      `SELECT ${camposConsulta}
       FROM consultas
       WHERE id = $1`,
      [id]
    );

    if (consultaAtual.rows.length === 0) {
      await cliente.query("ROLLBACK");
      return undefined;
    }

    const veterinarioId = consultaAtual.rows[0].veterinario_id;

    await cliente.query(
      "SELECT pg_advisory_xact_lock($1, $2)",
      [18472, veterinarioId]
    );

    const resultado = await cliente.query<ConsultaBanco>(
      `SELECT ${camposConsulta}
       FROM consultas
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    const registro = resultado.rows[0];

    if (!registro) {
      await cliente.query("ROLLBACK");
      return undefined;
    }

    if (
      registro.status === "Concluída" ||
      registro.status === "Cancelada"
    ) {
      await cliente.query("ROLLBACK");
      return null;
    }

    const conflito = await cliente.query(
      `SELECT id
       FROM consultas
       WHERE veterinario_id = $1
         AND data_hora = $2::timestamptz
         AND id <> $3
         AND status NOT IN ('Cancelada', 'Concluída', 'Concluida')
       LIMIT 1`,
      [registro.veterinario_id, dataHora, id]
    );

    if (conflito.rows.length > 0) {
      await cliente.query("ROLLBACK");

      const erro = new Error(
        "Este veterinário já possui uma consulta nesse horário."
      ) as Error & { code: string };

      erro.code = "CONFLITO_HORARIO";

      throw erro;
    }

    const atualizacao = await cliente.query<ConsultaBanco>(
      `UPDATE consultas
       SET data_hora = $1::timestamptz,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING ${camposConsulta}`,
      [dataHora, id]
    );

    await cliente.query("COMMIT");

    return converterConsulta(atualizacao.rows[0]);
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}

export async function atualizarStatusConsulta(
  id: number,
  novoStatus: StatusConsulta
): Promise<Consulta | null | undefined> {
  const cliente = await pool.connect();

  try {
    await cliente.query("BEGIN");

    const resultado = await cliente.query<ConsultaBanco>(
      `SELECT ${camposConsulta}
       FROM consultas
       WHERE id = $1
       FOR UPDATE`,
      [id]
    );

    const registro = resultado.rows[0];

    if (!registro) {
      await cliente.query("ROLLBACK");
      return undefined;
    }

    const transicoesPermitidas: Record<
      StatusConsulta,
      StatusConsulta[]
    > = {
      "Agendada": ["Confirmada", "Cancelada"],
      "Confirmada": ["Em atendimento", "Cancelada"],
      "Em atendimento": ["Concluída"],
      "Concluída": [],
      "Cancelada": []
    };

    const statusAtual =
      registro.status === ("Concluida" as StatusConsulta)
        ? "Concluída"
        : registro.status;

    const permitidos = transicoesPermitidas[statusAtual];

    if (!permitidos.includes(novoStatus)) {
      await cliente.query("ROLLBACK");
      return null;
    }

    const atualizacao = await cliente.query<ConsultaBanco>(
      `UPDATE consultas
       SET status = $1,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING ${camposConsulta}`,
      [novoStatus, id]
    );

    await cliente.query("COMMIT");

    return converterConsulta(atualizacao.rows[0]);
  } catch (erro) {
    await cliente.query("ROLLBACK");
    throw erro;
  } finally {
    cliente.release();
  }
}