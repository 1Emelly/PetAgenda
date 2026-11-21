import {
  beforeAll,
  describe,
  expect,
  it
} from "vitest";

import request from "supertest";

import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Privacidade dos dados dos veterinários", () => {
  let administrador: string;
  let secretario: string;
  let veterinario: string;

  let veterinarioId: number;

  beforeAll(async () => {
    administrador =
      await criarTokenTeste("Administrador");

    secretario =
      await criarTokenTeste("Secretario");

    veterinario =
      await criarTokenTeste("Veterinario");

    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    const resposta = await request(app)
      .post("/api/veterinarios")
      .set(
        "Authorization",
        `Bearer ${administrador}`
      )
      .send({
        nome: "Veterinário de Privacidade",
        crmv: `CRMV-PRIV-${identificador}`,
        telefone: "92999999999",
        email: `privacidade.${identificador}@petagenda.com`
      });

    expect(resposta.status).toBe(201);

    veterinarioId = resposta.body.veterinario.id;
  });

  it(
    "deve ocultar telefone e e-mail na listagem do veterinário",
    async () => {
      const resposta = await request(app)
        .get("/api/veterinarios")
        .set(
          "Authorization",
          `Bearer ${veterinario}`
        );

      expect(resposta.status).toBe(200);

      const registro = resposta.body.find(
        (item: { id: number }) =>
          item.id === veterinarioId
      );

      expect(registro).toBeDefined();
      expect(registro.nome).toBeDefined();
      expect(registro.crmv).toBeDefined();
      expect(registro.telefone).toBeUndefined();
      expect(registro.email).toBeUndefined();
    }
  );

  it(
    "deve ocultar telefone e e-mail na consulta individual",
    async () => {
      const resposta = await request(app)
        .get(`/api/veterinarios/${veterinarioId}`)
        .set(
          "Authorization",
          `Bearer ${veterinario}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.telefone).toBeUndefined();
      expect(resposta.body.email).toBeUndefined();
    }
  );

  it(
    "deve permitir ao administrador visualizar os dados completos",
    async () => {
      const resposta = await request(app)
        .get(`/api/veterinarios/${veterinarioId}`)
        .set(
          "Authorization",
          `Bearer ${administrador}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.telefone).toBeDefined();
      expect(resposta.body.email).toBeDefined();
    }
  );

  it(
    "deve permitir ao secretário visualizar os dados completos",
    async () => {
      const resposta = await request(app)
        .get(`/api/veterinarios/${veterinarioId}`)
        .set(
          "Authorization",
          `Bearer ${secretario}`
        );

      expect(resposta.status).toBe(200);
      expect(resposta.body.telefone).toBeDefined();
      expect(resposta.body.email).toBeDefined();
    }
  );

  it(
    "deve impedir que veterinário altere o cadastro de outro profissional",
    async () => {
      const resposta = await request(app)
        .put(`/api/veterinarios/${veterinarioId}`)
        .set(
          "Authorization",
          `Bearer ${veterinario}`
        )
        .send({
          nome: "Alteração indevida",
          crmv: "CRMV-ALTERADO",
          telefone: "92999999999",
          email: "alterado@petagenda.com"
        });

      expect(resposta.status).toBe(403);
    }
  );
});