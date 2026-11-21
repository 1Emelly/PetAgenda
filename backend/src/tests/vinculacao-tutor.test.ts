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

describe("Vinculação segura entre usuários e tutores", () => {
  let administrador: string;
  let secretario: string;
  let tutor: string;
  let tutor2: string;
  let veterinario: string;

  let tutorId: number;
  let tutor2Id: number;

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

  beforeAll(async () => {
    administrador =
      await criarTokenTeste("Administrador");

    secretario =
      await criarTokenTeste("Secretario");

    tutor =
      await criarTokenTeste("Tutor");

    tutor2 =
      await criarTokenTeste("Tutor");

    veterinario =
      await criarTokenTeste("Veterinario");

    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const cadastro1 = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${administrador}`
      )
      .send({
        nome: "Tutor para Vinculação 1",
        telefone: "92999999999",
        email: `vinculo1.${identificador}@petagenda.com`
      });

    expect(cadastro1.status).toBe(201);

    tutorId = cadastro1.body.tutor.id;

    const cadastro2 = await request(app)
      .post("/api/tutores")
      .set(
        "Authorization",
        `Bearer ${administrador}`
      )
      .send({
        nome: "Tutor para Vinculação 2",
        telefone: "92999999999",
        email: `vinculo2.${identificador}@petagenda.com`
      });

    expect(cadastro2.status).toBe(201);

    tutor2Id = cadastro2.body.tutor.id;
  });

  it(
    "deve permitir ao administrador vincular usuário Tutor",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: obterUsuarioId(tutor)
        });

      expect(resposta.status).toBe(200);
      expect(resposta.body.vinculo.tutorId).toBe(tutorId);
      expect(resposta.body.vinculo.usuarioId).toBe(
        obterUsuarioId(tutor)
      );
    }
  );

  it(
    "deve permitir consultar o vínculo",
    async () => {
      const resposta = await request(app)
        .get(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.usuarioId).toBe(
        obterUsuarioId(tutor)
      );
    }
  );

  it(
    "deve impedir vincular outro usuário ao mesmo tutor",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: obterUsuarioId(tutor2)
        });

      expect(resposta.status).toBe(409);
    }
  );

  it(
    "deve impedir vincular o mesmo usuário a outro tutor",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: obterUsuarioId(tutor)
        });

      expect(resposta.status).toBe(409);
    }
  );

  it(
    "deve impedir vincular usuário Veterinario",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: obterUsuarioId(veterinario)
        });

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir tutor de criar vínculos",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor}`
        )
        .send({
          usuarioId: obterUsuarioId(tutor2)
        });

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir tutor de consultar vínculos administrativos",
    async () => {
      const resposta = await request(app)
        .get(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${tutor}`
        );

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve impedir vinculação sem autenticação",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutor2Id}`)
        .send({
          usuarioId: obterUsuarioId(tutor2)
        });

      expect(resposta.status).toBe(401);
    }
  );

  it(
    "deve rejeitar usuário inexistente",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: 2147483647
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve rejeitar tutor inexistente",
    async () => {
      const resposta = await request(app)
        .put("/api/vinculacoes-tutores/2147483647")
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: obterUsuarioId(tutor2)
        });

      expect(resposta.status).toBe(404);
    }
  );

  it(
    "deve rejeitar IDs inválidos",
    async () => {
      const resposta = await request(app)
        .put("/api/vinculacoes-tutores/abc")
        .set(
          "Authorization",
          `Bearer ${administrador}`
        )
        .send({
          usuarioId: "invalido"
        });

      expect(resposta.status).toBe(400);
    }
  );

  it(
    "deve permitir ao secretário criar vínculo",
    async () => {
      const resposta = await request(app)
        .put(`/api/vinculacoes-tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${secretario}`
        )
        .send({
          usuarioId: obterUsuarioId(tutor2)
        });

      expect(resposta.status).toBe(200);
    }
  );

  it(
    "deve permitir ao tutor vinculado consultar seu cadastro",
    async () => {
      const resposta = await request(app)
        .get("/api/tutores/me")
        .set(
          "Authorization",
          `Bearer ${tutor2}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.id).toBe(tutor2Id);
    }
  );

  it(
    "deve impedir tutor de remover vínculo",
    async () => {
      const resposta = await request(app)
        .delete(`/api/vinculacoes-tutores/${tutor2Id}`)
        .set(
          "Authorization",
          `Bearer ${tutor2}`
        );

      expect(resposta.status).toBe(403);
    }
  );

  it(
    "deve permitir ao administrador remover vínculo",
    async () => {
      const resposta = await request(app)
        .delete(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        );

      expect(resposta.status).toBe(200);

      const consulta = await pool.query<{
        usuario_id: number | null;
      }>(
        `SELECT usuario_id
         FROM tutores
         WHERE id = $1`,
        [tutorId]
      );

      expect(consulta.rows[0].usuario_id).toBeNull();
    }
  );

  it(
    "deve impedir remover vínculo inexistente",
    async () => {
      const resposta = await request(app)
        .delete(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        );

      expect(resposta.status).toBe(409);
    }
  );

  it(
    "deve permitir consultar tutor sem vínculo",
    async () => {
      const resposta = await request(app)
        .get(`/api/vinculacoes-tutores/${tutorId}`)
        .set(
          "Authorization",
          `Bearer ${secretario}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.usuarioId).toBeNull();
    }
  );
});