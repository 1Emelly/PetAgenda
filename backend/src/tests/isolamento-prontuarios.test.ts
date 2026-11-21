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

describe("Isolamento de prontuários por veterinário", () => {
  let tokenAdministrador: string;
  let tokenVeterinario1: string;
  let tokenVeterinario2: string;

  let veterinario1Id: number;
  let veterinario2Id: number;

  let animal1Id: number;
  let animal2Id: number;

  let consulta1Id: number;
  let consulta2Id: number;

  let atendimento1Id: number;
  let atendimento2Id: number;

  let prontuario1Id: number;
  let prontuario2Id: number;

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

  async function cadastrarAnimal(
    nome: string
  ): Promise<number> {
    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const tutor = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        nome: "Tutor do Teste de Prontuário",
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
        nome,
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
        motivo: "Consulta para teste de prontuário"
      });

    expect(resposta.status).toBe(201);

    return resposta.body.consulta.id;
  }

  async function prepararConsulta(
    consultaId: number
  ): Promise<void> {
    for (const status of [
      "Confirmada",
      "Em atendimento"
    ]) {
      const resposta = await request(app)
        .patch(`/api/consultas/${consultaId}/status`)
        .set(
          "Authorization",
          `Bearer ${tokenAdministrador}`
        )
        .send({ status });

      expect(resposta.status).toBe(200);
    }
  }

  async function cadastrarAtendimento(
    consultaId: number
  ): Promise<number> {
    const resposta = await request(app)
      .post("/api/atendimentos")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        consultaId,
        diagnostico: "Diagnóstico de teste",
        procedimentos: "Exame clínico",
        observacoes: "Paciente estável",
        orientacoes: "Acompanhamento"
      });

    expect(resposta.status).toBe(201);

    return resposta.body.atendimento.id;
  }

  async function cadastrarProntuario(
    animalId: number,
    atendimentoId: number,
    descricao: string
  ): Promise<number> {
    const resposta = await request(app)
      .post("/api/prontuarios")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        animalId,
        atendimentoId,
        descricao
      });

    expect(resposta.status).toBe(201);

    return resposta.body.prontuario.id;
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
      "Veterinário de Prontuário 1"
    );

    veterinario2Id = await vincularVeterinario(
      tokenVeterinario2,
      "Veterinário de Prontuário 2"
    );

    animal1Id = await cadastrarAnimal("Mel");

    animal2Id = await cadastrarAnimal("Thor");

    consulta1Id = await cadastrarConsulta(
      animal1Id,
      veterinario1Id,
      "2026-12-22T10:00:00.000Z"
    );

    consulta2Id = await cadastrarConsulta(
      animal2Id,
      veterinario2Id,
      "2026-12-22T11:00:00.000Z"
    );

    await prepararConsulta(consulta1Id);
    await prepararConsulta(consulta2Id);

    atendimento1Id =
      await cadastrarAtendimento(consulta1Id);

    atendimento2Id =
      await cadastrarAtendimento(consulta2Id);

    prontuario1Id = await cadastrarProntuario(
      animal1Id,
      atendimento1Id,
      "Prontuário do veterinário 1"
    );

    prontuario2Id = await cadastrarProntuario(
      animal2Id,
      atendimento2Id,
      "Prontuário do veterinário 2"
    );
  });

  it(
    "deve permitir consultar o próprio prontuário",
    async () => {
      const resposta = await request(app)
        .get(`/api/prontuarios/${prontuario1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(prontuario1Id);
    }
  );

  it(
    "deve impedir consultar prontuário de outro veterinário",
    async () => {
      const resposta = await request(app)
        .get(`/api/prontuarios/${prontuario2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve listar somente os próprios prontuários",
    async () => {
      const resposta = await request(app)
        .get("/api/prontuarios")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (prontuario: { id: number }) =>
          prontuario.id
      );

      expect(ids).toContain(prontuario1Id);
      expect(ids).not.toContain(prontuario2Id);
    }
  );

  it(
    "deve permitir consultar prontuários do próprio animal",
    async () => {
      const resposta = await request(app)
        .get(`/api/prontuarios/animal/${animal1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (prontuario: { id: number }) =>
          prontuario.id
      );

      expect(ids).toContain(prontuario1Id);
    }
  );

  it(
    "deve impedir consultar prontuários de animal não vinculado",
    async () => {
      const resposta = await request(app)
        .get(`/api/prontuarios/animal/${animal2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve impedir consultar prontuário por atendimento alheio",
    async () => {
      const resposta = await request(app)
        .get(
          `/api/prontuarios/atendimento/${atendimento2Id}`
        )
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir consultar prontuário pelo próprio atendimento",
    async () => {
      const resposta = await request(app)
        .get(
          `/api/prontuarios/atendimento/${atendimento1Id}`
        )
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(prontuario1Id);
    }
  );

  it(
    "deve impedir atualizar prontuário de outro veterinário",
    async () => {
      const resposta = await request(app)
        .put(`/api/prontuarios/${prontuario2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          descricao: "Alteração não autorizada"
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir atualizar o próprio prontuário",
    async () => {
      const resposta = await request(app)
        .put(`/api/prontuarios/${prontuario1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          descricao: "Prontuário atualizado"
        });

      expect(resposta.status).toBe(200);

      expect(resposta.body.prontuario.descricao)
        .toBe("Prontuário atualizado");
    }
  );

  it(
    "deve impedir cadastrar prontuário em atendimento alheio",
    async () => {
      const resposta = await request(app)
        .post("/api/prontuarios")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          animalId: animal2Id,
          atendimentoId: atendimento2Id,
          descricao: "Cadastro não autorizado"
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir que administrador visualize todos os prontuários",
    async () => {
      const resposta = await request(app)
        .get("/api/prontuarios")
        .set(
          "Authorization",
          `Bearer ${tokenAdministrador}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (prontuario: { id: number }) =>
          prontuario.id
      );

      expect(ids).toContain(prontuario1Id);
      expect(ids).toContain(prontuario2Id);
    }
  );

  it(
    "deve impedir acesso de tutor aos prontuários",
    async () => {
      const tokenTutor =
        await criarTokenTeste("Tutor");

      const resposta = await request(app)
        .get("/api/prontuarios")
        .set(
          "Authorization",
          `Bearer ${tokenTutor}`
        );

      expect(resposta.status).toBe(403);
    }
  );
});