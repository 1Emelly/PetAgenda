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

describe("Concorrência na vinculação de tutores", () => {
  let administrador: string;

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

  async function criarTutor(): Promise<number> {
    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const resposta = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${administrador}`
      )
      .send({
        nome: "Tutor Teste Concorrência",
        telefone: "92999999999",
        email: `concorrencia.${identificador}@petagenda.com`
      });

    expect(resposta.status).toBe(201);

    return resposta.body.tutor.id;
  }

  beforeAll(async () => {
    administrador =
      await criarTokenTeste("Administrador");
  });

  it(
    "deve impedir que o mesmo usuário seja vinculado a dois tutores simultaneamente",
    async () => {
      const usuario = await criarTokenTeste("Tutor");
      const usuarioId = obterUsuarioId(usuario);

      const tutor1Id = await criarTutor();
      const tutor2Id = await criarTutor();

      const respostas = await Promise.all([
        request(app)
          .put(`/api/vinculacoes-tutores/${tutor1Id}`)
          .set(
            "Authorization",
            `Bearer ${administrador}`
          )
          .send({ usuarioId }),

        request(app)
          .put(`/api/vinculacoes-tutores/${tutor2Id}`)
          .set(
            "Authorization",
            `Bearer ${administrador}`
          )
          .send({ usuarioId })
      ]);

      const status = respostas
        .map((resposta) => resposta.status)
        .sort();

      expect(status).toEqual([200, 409]);

      const resultado = await pool.query<{
        quantidade: number;
      }>(
        `SELECT COUNT(*)::integer AS quantidade
         FROM tutores
         WHERE usuario_id = $1`,
        [usuarioId]
      );

      expect(resultado.rows[0].quantidade).toBe(1);
    }
  );

  it(
    "deve impedir que dois usuários sejam vinculados ao mesmo tutor simultaneamente",
    async () => {
      const usuario1 = await criarTokenTeste("Tutor");
      const usuario2 = await criarTokenTeste("Tutor");

      const usuario1Id = obterUsuarioId(usuario1);
      const usuario2Id = obterUsuarioId(usuario2);

      const tutorId = await criarTutor();

      const respostas = await Promise.all([
        request(app)
          .put(`/api/vinculacoes-tutores/${tutorId}`)
          .set(
            "Authorization",
            `Bearer ${administrador}`
          )
          .send({
            usuarioId: usuario1Id
          }),

        request(app)
          .put(`/api/vinculacoes-tutores/${tutorId}`)
          .set(
            "Authorization",
            `Bearer ${administrador}`
          )
          .send({
            usuarioId: usuario2Id
          })
      ]);

      const status = respostas
        .map((resposta) => resposta.status)
        .sort();

      expect(status).toEqual([200, 409]);

      const resultado = await pool.query<{
        usuario_id: number | null;
      }>(
        `SELECT usuario_id
         FROM tutores
         WHERE id = $1`,
        [tutorId]
      );

      expect([
        usuario1Id,
        usuario2Id
      ]).toContain(resultado.rows[0].usuario_id);
    }
  );

  it(
    "deve manter o vínculo válido após uma tentativa duplicada",
    async () => {
      const usuario = await criarTokenTeste("Tutor");
      const usuarioId = obterUsuarioId(usuario);

      const tutorId = await criarTutor();

      const primeiraResposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({ usuarioId });

      expect(primeiraResposta.status).toBe(200);

      const segundaResposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({ usuarioId });

      expect(segundaResposta.status).toBe(409);

      const consulta = await request(app)
        .get(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        );

      expect(consulta.status).toBe(200);
      expect(consulta.body.usuarioId).toBe(usuarioId);
    }
  );
});