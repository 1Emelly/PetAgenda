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

describe("Isolamento de animais e tutores", () => {
  let tokenAdministrador: string;
  let tokenVeterinario1: string;
  let tokenVeterinario2: string;
  let tokenSecretario: string;

  let veterinario1Id: number;
  let veterinario2Id: number;

  let tutor1Id: number;
  let tutor2Id: number;

  let animal1Id: number;
  let animal2Id: number;

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
      throw new Error("Token inválido.");
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
        `CRMV-CAD-${identificador}`,
        "92999999999",
        `vet.cad.${identificador}@petagenda.com`,
        dados.id
      ]
    );

    return resultado.rows[0].id;
  }

  async function cadastrarTutorTeste(
    nome: string
  ): Promise<number> {
    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const resposta = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
      )
      .send({
        nome,
        telefone: "92999999999",
        email: `tutor.cad.${identificador}@petagenda.com`
      });

    expect(resposta.status).toBe(201);

    return resposta.body.tutor.id;
  }

  async function cadastrarAnimalTeste(
    nome: string,
    tutorId: number
  ): Promise<number> {
    const resposta = await request(app)
      .post("/api/animais")
      .set(
        "Authorization",
        `Bearer ${tokenAdministrador}`
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

  async function cadastrarConsultaTeste(
    animalId: number,
    veterinarioId: number,
    dataHora: string
  ): Promise<void> {
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
  }

  beforeAll(async () => {
    tokenAdministrador =
      await criarTokenTeste("Administrador");

    tokenVeterinario1 =
      await criarTokenTeste("Veterinario");

    tokenVeterinario2 =
      await criarTokenTeste("Veterinario");

    tokenSecretario =
      await criarTokenTeste("Secretario");

    veterinario1Id = await vincularVeterinario(
      tokenVeterinario1,
      "Veterinário Cadastro 1"
    );

    veterinario2Id = await vincularVeterinario(
      tokenVeterinario2,
      "Veterinário Cadastro 2"
    );

    tutor1Id = await cadastrarTutorTeste(
      "Tutor Cadastro 1"
    );

    tutor2Id = await cadastrarTutorTeste(
      "Tutor Cadastro 2"
    );

    animal1Id = await cadastrarAnimalTeste(
      "Animal Cadastro 1",
      tutor1Id
    );

    animal2Id = await cadastrarAnimalTeste(
      "Animal Cadastro 2",
      tutor2Id
    );

    await cadastrarConsultaTeste(
      animal1Id,
      veterinario1Id,
      "2026-12-23T10:00:00.000Z"
    );

    await cadastrarConsultaTeste(
      animal2Id,
      veterinario2Id,
      "2026-12-23T11:00:00.000Z"
    );
  });

  it(
    "deve listar somente animais vinculados ao veterinário",
    async () => {
      const resposta = await request(app)
        .get("/api/animais")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
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
    "deve permitir consultar animal vinculado",
    async () => {
      const resposta = await request(app)
        .get(`/api/animais/${animal1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(animal1Id);
    }
  );

  it(
    "deve impedir consultar animal de outro veterinário",
    async () => {
      const resposta = await request(app)
        .get(`/api/animais/${animal2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve impedir veterinário de cadastrar animais",
    async () => {
      const resposta = await request(app)
        .post("/api/animais")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        )
        .send({
          nome: "Animal não autorizado",
          especie: "Gato",
          raca: "SRD",
          idade: 2,
          tutorId: tutor1Id
        });

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir veterinário de atualizar animais",
    async () => {
      const resposta = await request(app)
        .put(`/api/animais/${animal1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
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
    "deve listar somente tutores vinculados ao veterinário",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores")
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (tutor: { id: number }) => tutor.id
      );

      expect(ids).toContain(tutor1Id);
      expect(ids).not.toContain(tutor2Id);
    }
  );

  it(
    "deve permitir consultar tutor vinculado",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/${tutor1Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(tutor1Id);
    }
  );

  it(
    "deve impedir consultar tutor não vinculado",
    async () => {
      const resposta = await request(app)
        .get(`/api/tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${tokenVeterinario1}`
        );

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve permitir que administrador liste todos os animais",
    async () => {
      const resposta = await request(app)
        .get("/api/animais")
        .set(
          "Authorization",
          `Bearer ${tokenAdministrador}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (animal: { id: number }) => animal.id
      );

      expect(ids).toContain(animal1Id);
      expect(ids).toContain(animal2Id);
    }
  );

  it(
    "deve permitir que secretário consulte todos os tutores",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores")
        .set(
          "Authorization",
          `Bearer ${tokenSecretario}`
        );

      expect(resposta.status).toBe(200);

      const ids = resposta.body.map(
        (tutor: { id: number }) => tutor.id
      );

      expect(ids).toContain(tutor1Id);
      expect(ids).toContain(tutor2Id);
    }
  );
});