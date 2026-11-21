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

describe("Isolamento de consultas por veterinário", () => {
  let tokenAdministrador: string;
  let tokenVeterinario1: string;
  let tokenVeterinario2: string;

  let veterinario1Id: number;
  let veterinario2Id: number;

  let consulta1Id: number;
  let consulta2Id: number;

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
        `veterinario.${identificador}@petagenda.com`,
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
        nome: "Tutor do Teste de Isolamento",
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
        motivo: "Consulta para teste de isolamento"
      });

    expect(resposta.status).toBe(201);

    return resposta.body.consulta.id;
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
      "Veterinário de Teste 1"
    );

    veterinario2Id = await vincularVeterinario(
      tokenVeterinario2,
      "Veterinário de Teste 2"
    );

    const animalId = await cadastrarAnimal();

    consulta1Id = await cadastrarConsulta(
      animalId,
      veterinario1Id,
      "2026-12-20T10:00:00.000Z"
    );

    consulta2Id = await cadastrarConsulta(
      animalId,
      veterinario2Id,
      "2026-12-20T11:00:00.000Z"
    );
  });

  it(
    "deve permitir que veterinário consulte sua própria consulta",
    async () => {
      const resposta = await request(app)
        .get(`/api/consultas/${consulta1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(consulta1Id);
    }
  );

  it(
    "deve impedir que veterinário consulte registro de outro",
    async () => {
      const resposta = await request(app)
        .get(`/api/consultas/${consulta2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve listar somente consultas do veterinário autenticado",
    async () => {
      const resposta = await request(app)
        .get("/api/consultas")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(Array.isArray(resposta.body)).toBe(true);

      const ids = resposta.body.map(
        (consulta: { id: number }) => consulta.id
      );

      expect(ids).toContain(consulta1Id);
      expect(ids).not.toContain(consulta2Id);
    }
  );

  it(
    "deve permitir que segundo veterinário veja sua consulta",
    async () => {
      const resposta = await request(app)
        .get(`/api/consultas/${consulta2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario2}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(consulta2Id);
    }
  );

  it(
    "deve impedir alteração de status de consulta de outro veterinário",
    async () => {
      const resposta = await request(app)
        .patch(`/api/consultas/${consulta2Id}/status`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          status: "Confirmada"
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir alteração de status da própria consulta",
    async () => {
      const resposta = await request(app)
        .patch(`/api/consultas/${consulta1Id}/status`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          status: "Confirmada"
        });

      expect(resposta.status).toBe(200);
      expect(resposta.body.consulta.status)
        .toBe("Confirmada");
    }
  );

  it(
    "deve permitir que administrador visualize todas as consultas",
    async () => {
      const resposta = await request(app)
        .get("/api/consultas")
        .set(
          "Authorization",
          `Bearer ${tokenAdministrador}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (consulta: { id: number }) => consulta.id
      );

      expect(ids).toContain(consulta1Id);
      expect(ids).toContain(consulta2Id);
    }
  );

  it(
    "deve impedir acesso de tutor à listagem",
    async () => {
      const tokenTutor =
        await criarTokenTeste("Tutor");

      const resposta = await request(app)
        .get("/api/consultas")
        .set(
          "Authorization",
          `Bearer ${tokenTutor}`
        );

      expect(resposta.status).toBe(403);
    }
  );
});