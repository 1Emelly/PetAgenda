import {
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../app.js";

import { pool } from "../config/database.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Isolamento dos dados do tutor", () => {
  let administrador: string;
  let tutor1: string;
  let tutor2: string;

  let tutor1Id: number;
  let tutor2Id: number;

  let animal1Id: number;
  let animal2Id: number;

  let consulta1Id: number;
  let consulta2Id: number;

  function obterUsuarioId(token: string): number {
    const dados = jwt.decode(token);

    if (
      !dados ||
      typeof dados === "string" ||
      typeof dados.id !== "number"
    ) {
      throw new Error("Token de teste inválido.");
    }

    return dados.id;
  }

  async function cadastrarTutor(
    nome: string,
    token: string
  ): Promise<number> {
    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const resposta = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${administrador}`
      )
      .send({
        nome,
        telefone: "92999999999",
        email: `tutor.isolamento.${identificador}@petagenda.com`
      });

    expect(resposta.status).toBe(201);

    const tutorId = resposta.body.tutor.id;

    await pool.query(
      `UPDATE tutores
       SET usuario_id = $1
       WHERE id = $2`,
      [obterUsuarioId(token), tutorId]
    );

    return tutorId;
  }

  async function cadastrarAnimal(
    nome: string,
    tutorId: number
  ): Promise<number> {
    const resposta = await request(app)
      .post("/api/animais")
      .set(
        "Authorization",
        `Bearer ${administrador}`
      )
      .send({
        nome,
        especie: "Cachorro",
        raca: "Sem raça definida",
        idade: 3,
        tutorId
      });

    expect(resposta.status).toBe(201);

    return resposta.body.animal.id;
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
        `Bearer ${administrador}`
      )
      .send({
        animalId,
        veterinarioId,
        dataHora,
        motivo: "Consulta de teste do tutor"
      });

    expect(resposta.status).toBe(201);

    return resposta.body.consulta.id;
  }

  beforeAll(async () => {
    administrador =
      await criarTokenTeste("Administrador");

    tutor1 =
      await criarTokenTeste("Tutor");

    tutor2 =
      await criarTokenTeste("Tutor");

    tutor1Id = await cadastrarTutor(
      "Tutor Isolamento 1",
      tutor1
    );

    tutor2Id = await cadastrarTutor(
      "Tutor Isolamento 2",
      tutor2
    );

    animal1Id = await cadastrarAnimal(
      "Animal do Tutor 1",
      tutor1Id
    );

    animal2Id = await cadastrarAnimal(
      "Animal do Tutor 2",
      tutor2Id
    );

    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const veterinario = await pool.query<{
      id: number;
    }>(
      `INSERT INTO veterinarios (
        nome,
        crmv,
        telefone,
        email
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id`,
      [
        "Veterinário Teste Tutor",
        `CRMV-TUTOR-${identificador}`,
        "92999999999",
        `vet.tutor.${identificador}@petagenda.com`
      ]
    );

    const veterinarioId = veterinario.rows[0].id;

    consulta1Id = await cadastrarConsulta(
      animal1Id,
      veterinarioId,
      "2027-01-12T10:00:00.000Z"
    );

    consulta2Id = await cadastrarConsulta(
      animal2Id,
      veterinarioId,
      "2027-01-12T11:00:00.000Z"
    );
  });

  it(
    "deve permitir consultar o próprio cadastro",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(tutor1Id);
    }
  );

  it(
    "deve listar somente os próprios animais",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me/animais")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (animal: { id: number }) => animal.id
      );

      expect(ids).toContain(animal1Id);
      expect(ids).not.toContain(animal2Id);
    }
  );

  it(
    "deve permitir consultar o próprio animal",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/me/animais/${animal1Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(animal1Id);
    }
  );

  it(
    "deve impedir consultar animal de outro tutor",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/me/animais/${animal2Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve listar somente as próprias consultas",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me/consultas")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (consulta: { id: number }) => consulta.id
      );

      expect(ids).toContain(consulta1Id);
      expect(ids).not.toContain(consulta2Id);
    }
  );

  it(
    "deve permitir consultar a própria consulta",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/me/consultas/${consulta1Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(consulta1Id);
    }
  );

  it(
    "deve impedir consultar consulta de outro tutor",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/me/consultas/${consulta2Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve impedir tutor de listar todos os animais",
    async () => {
      const resposta = await request(app)
        .get("/api/animais")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir tutor de listar todas as consultas",
    async () => {
      const resposta = await request(app)
        .get("/api/consultas")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir tutor de atualizar animais",
    async () => {
      const resposta = await request(app)
        .put(`/api/animais/${animal1Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        )
        .send({
          nome: "Alteração indevida",
          especie: "Cachorro",
          raca: "SRD",
          idade: 4,
          tutorId: tutor1Id
        });

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir tutor de reagendar consultas",
    async () => {
      const resposta = await request(app)
        .put(`/api/consultas/${consulta1Id}/reagendar`)
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        )
        .send({
          dataHora: "2027-01-13T10:00:00.000Z"
        });

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir acesso sem autenticação",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me/animais");

      expect(resposta.status).toBe(401);
    }
  );

  it(
    "deve impedir administrador de usar rota exclusiva do tutor",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me")
        .set(
          "Authorization",
          `Bearer ${administrador}`
        );

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve retornar erro para ID de animal inválido",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me/animais/abc")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(400);
    }
  );

  it(
    "deve retornar erro para ID de consulta inválido",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me/consultas/abc")
        .set(
          "Authorization",
          `Bearer ${tutor1}`
        );

      expect(resposta.status).toBe(400);
    }
  );

  it(
    "deve permitir ao segundo tutor consultar seu próprio animal",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/me/animais/${animal2Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor2}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(animal2Id);
    }
  );
});