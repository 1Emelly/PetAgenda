import {
  beforeAll,
  describe,
  it,
  expect
} from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../app.js";

import { pool } from "../config/database.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Isolamento de atendimentos por veterinário", () => {
  let tokenAdministrador: string;
  let tokenVeterinario1: string;
  let tokenVeterinario2: string;

  let veterinario1Id: number;
  let veterinario2Id: number;

  let consulta1Id: number;
  let consulta2Id: number;

  let atendimento1Id: number;
  let atendimento2Id: number;

  async function vincularVeterinario(
    token: string,
    nome: string
  ): Promise<number> {
    const dados = jwt.decode(token);

    if (
      !dados ||
      typeof dados === "string" ||
      typeof dados.id !== "number"
    ) {
      throw new Error("Token de teste inválido.");
    }

    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const resultado = await pool.query<{ id: number }>(
      `INSERT INTO veterinarios (
        nome,
        crmv,
        telefone,
        email,
        usuario_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [
        nome,
        `CRMV-TESTE-${identificador}`,
        "92999999999",
        `vet.${identificador}@petagenda.com`,
        dados.id
      ]
    );

    return resultado.rows[0].id;
  }

  async function cadastrarAnimal(): Promise<number> {
    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const tutor = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        nome: "Tutor de Teste de Atendimento",
        telefone: "92999999999",
        email: `tutor.${identificador}@petagenda.com`
      });

    expect(tutor.status).toBe(201);

    const animal = await request(app)
      .post("/api/animais")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        nome: "Mel",
        especie: "Cachorro",
        raca: "Golden Retriever",
        idade: 3,
        tutorId: tutor.body.tutor.id
      });

    expect(animal.status).toBe(201);

    return animal.body.animal.id;
  }

  async function cadastrarConsulta(
    animalId: number,
    veterinarioId: number,
    dataHora: string
  ): Promise<number> {
    const resposta = await request(app)
      .post("/api/consultas")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        animalId,
        veterinarioId,
        dataHora,
        motivo: "Consulta para teste de atendimento"
      });

    expect(resposta.status).toBe(201);

    return resposta.body.consulta.id;
  }

  async function alterarStatusConsulta(
    consultaId: number,
    status: string
  ): Promise<void> {
    const resposta = await request(app)
      .patch(`/api/consultas/${consultaId}/status`)
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({ status });

    expect(resposta.status).toBe(200);
  }

  async function cadastrarAtendimento(
    consultaId: number,
    diagnostico: string
  ): Promise<number> {
    const resposta = await request(app)
      .post("/api/atendimentos")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        consultaId,
        diagnostico,
        procedimentos: "Exame clínico",
        observacoes: "Paciente estável",
        orientacoes: "Acompanhamento veterinário"
      });

    expect(resposta.status).toBe(201);

    return resposta.body.atendimento.id;
  }

  beforeAll(async () => {
    tokenAdministrador =
      await criarTokenTeste("Administrador");

    tokenVeterinario1 =
      await criarTokenTeste("Veterinario");

    tokenVeterinario2 =
      await criarTokenTeste("Veterinario");

    veterinario1Id = await vincularVeterinario(
      tokenVeterinario1,
      "Veterinário de Atendimento 1"
    );

    veterinario2Id = await vincularVeterinario(
      tokenVeterinario2,
      "Veterinário de Atendimento 2"
    );

    const animalId = await cadastrarAnimal();

    consulta1Id = await cadastrarConsulta(
      animalId,
      veterinario1Id,
      "2026-12-21T10:00:00.000Z"
    );

    consulta2Id = await cadastrarConsulta(
      animalId,
      veterinario2Id,
      "2026-12-21T11:00:00.000Z"
    );

    for (const consultaId of [
      consulta1Id,
      consulta2Id
    ]) {
      await alterarStatusConsulta(
        consultaId,
        "Confirmada"
      );

      await alterarStatusConsulta(
        consultaId,
        "Em atendimento"
      );
    }

    atendimento1Id = await cadastrarAtendimento(
      consulta1Id,
      "Diagnóstico do veterinário 1"
    );

    atendimento2Id = await cadastrarAtendimento(
      consulta2Id,
      "Diagnóstico do veterinário 2"
    );
  });

  it(
    "deve permitir consultar o próprio atendimento",
    async () => {
      const resposta = await request(app)
        .get(`/api/atendimentos/${atendimento1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(atendimento1Id);
    }
  );

  it(
    "deve impedir consultar atendimento de outro veterinário",
    async () => {
      const resposta = await request(app)
        .get(`/api/atendimentos/${atendimento2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve listar somente os próprios atendimentos",
    async () => {
      const resposta = await request(app)
        .get("/api/atendimentos")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (atendimento: { id: number }) =>
          atendimento.id
      );

      expect(ids).toContain(atendimento1Id);
      expect(ids).not.toContain(atendimento2Id);
    }
  );

  it(
    "deve impedir consulta de atendimento por consulta alheia",
    async () => {
      const resposta = await request(app)
        .get(
          `/api/atendimentos/consulta/${consulta2Id}`
        )
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir consultar atendimento pela própria consulta",
    async () => {
      const resposta = await request(app)
        .get(
          `/api/atendimentos/consulta/${consulta1Id}`
        )
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(atendimento1Id);
    }
  );

  it(
    "deve impedir atualização de atendimento alheio",
    async () => {
      const resposta = await request(app)
        .put(`/api/atendimentos/${atendimento2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          diagnostico: "Alteração não autorizada"
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir atualizar o próprio atendimento",
    async () => {
      const resposta = await request(app)
        .put(`/api/atendimentos/${atendimento1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          diagnostico: "Diagnóstico atualizado"
        });

      expect(resposta.status).toBe(200);

      expect(resposta.body.atendimento.diagnostico)
        .toBe("Diagnóstico atualizado");
    }
  );

  it(
    "deve impedir cadastrar atendimento em consulta de outro veterinário",
    async () => {
      const resposta = await request(app)
        .post("/api/atendimentos")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          consultaId: consulta2Id,
          diagnostico: "Diagnóstico indevido"
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir que administrador visualize todos os atendimentos",
    async () => {
      const resposta = await request(app)
        .get("/api/atendimentos")
        .set(
          "Authorization",
          `Bearer ${tokenAdministrador}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (atendimento: { id: number }) =>
          atendimento.id
      );

      expect(ids).toContain(atendimento1Id);
      expect(ids).toContain(atendimento2Id);
    }
  );

  it(
    "deve impedir acesso de tutor aos atendimentos",
    async () => {
      const tokenTutor =
        await criarTokenTeste("Tutor");

      const resposta = await request(app)
        .get("/api/atendimentos")
        .set(
          "Authorization",
          `Bearer ${tokenTutor}`
        );

      expect(resposta.status).toBe(403);
    }
  );
});