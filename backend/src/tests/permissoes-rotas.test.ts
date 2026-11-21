import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../app.js";

import { pool } from "../config/database.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Permissões das rotas do PetAgenda", () => {

  let administrador: string;
  let secretario: string;
  let veterinario: string;
  let tutor: string;

  beforeAll(async () => {
    administrador = await criarTokenTeste("Administrador");
    secretario = await criarTokenTeste("Secretario");
    veterinario = await criarTokenTeste("Veterinario");
    tutor = await criarTokenTeste("Tutor");

    // Vincula o usuário Veterinario ao seu cadastro profissional.
    const dadosToken = jwt.decode(veterinario);

    if (
      !dadosToken ||
      typeof dadosToken === "string" ||
      typeof dadosToken.id !== "number"
    ) {
      throw new Error("Token do veterinário inválido.");
    }

    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000000)}`;

    await pool.query(
      `INSERT INTO veterinarios (
        nome,
        crmv,
        telefone,
        email,
        usuario_id
      )
      VALUES ($1, $2, $3, $4, $5)`,
      [
        "Veterinário de Teste de Permissões",
        `CRMV-PERM-${identificador}`,
        "92999999999",
        `veterinario.permissoes.${identificador}@petagenda.com`,
        dadosToken.id
      ]
    );
  });

  describe("Acesso sem autenticação", () => {

    const rotas = [
      "/api/animais",
      "/api/tutores",
      "/api/veterinarios",
      "/api/consultas",
      "/api/atendimentos",
      "/api/prontuarios"
    ];

    for (const rota of rotas) {
      it(`deve bloquear acesso sem token em ${rota}`, async () => {
        const resposta = await request(app).get(rota);

        expect(resposta.status).toBe(401);
      });
    }

  });

  describe("Administrador", () => {

    it("deve permitir listar tutores", async () => {
      const resposta = await request(app)
        .get("/api/tutores")
        .set("Authorization", `Bearer ${administrador}`);

      expect(resposta.status).toBe(200);
    });

    it("deve permitir listar veterinários", async () => {
      const resposta = await request(app)
        .get("/api/veterinarios")
        .set("Authorization", `Bearer ${administrador}`);

      expect(resposta.status).toBe(200);
    });

    it("deve permitir listar atendimentos", async () => {
      const resposta = await request(app)
        .get("/api/atendimentos")
        .set("Authorization", `Bearer ${administrador}`);

      expect(resposta.status).toBe(200);
    });

    it("deve permitir listar prontuários", async () => {
      const resposta = await request(app)
        .get("/api/prontuarios")
        .set("Authorization", `Bearer ${administrador}`);

      expect(resposta.status).toBe(200);
    });

  });

  describe("Secretário", () => {

    it("deve permitir listar tutores", async () => {
      const resposta = await request(app)
        .get("/api/tutores")
        .set("Authorization", `Bearer ${secretario}`);

      expect(resposta.status).toBe(200);
    });

    it("deve permitir listar consultas", async () => {
      const resposta = await request(app)
        .get("/api/consultas")
        .set("Authorization", `Bearer ${secretario}`);

      expect(resposta.status).toBe(200);
    });

    it("não deve permitir listar atendimentos", async () => {
      const resposta = await request(app)
        .get("/api/atendimentos")
        .set("Authorization", `Bearer ${secretario}`);

      expect(resposta.status).toBe(403);
    });

    it("não deve permitir listar prontuários", async () => {
      const resposta = await request(app)
        .get("/api/prontuarios")
        .set("Authorization", `Bearer ${secretario}`);

      expect(resposta.status).toBe(403);
    });

    it("não deve permitir cadastrar veterinários", async () => {
      const resposta = await request(app)
        .post("/api/veterinarios")
        .set("Authorization", `Bearer ${secretario}`)
        .send({
          nome: "Veterinário de Teste",
          crmv: "CRMV-TESTE 123",
          telefone: "92999999999",
          email: "teste.permissao@email.com"
        });

      expect(resposta.status).toBe(403);
    });

  });

  describe("Veterinário", () => {

    it("deve permitir listar animais", async () => {
      const resposta = await request(app)
        .get("/api/animais")
        .set("Authorization", `Bearer ${veterinario}`);

      expect(resposta.status).toBe(200);
    });

    it("deve permitir listar atendimentos", async () => {
      const resposta = await request(app)
        .get("/api/atendimentos")
        .set("Authorization", `Bearer ${veterinario}`);

      expect(resposta.status).toBe(200);
    });

    it("deve permitir listar prontuários", async () => {
      const resposta = await request(app)
        .get("/api/prontuarios")
        .set("Authorization", `Bearer ${veterinario}`);

      expect(resposta.status).toBe(200);
    });

    it("não deve permitir cadastrar veterinários", async () => {
      const resposta = await request(app)
        .post("/api/veterinarios")
        .set("Authorization", `Bearer ${veterinario}`)
        .send({
          nome: "Veterinário de Teste",
          crmv: "CRMV-TESTE 456",
          telefone: "92999999999",
          email: "teste.veterinario@email.com"
        });

      expect(resposta.status).toBe(403);
    });

    it("não deve permitir reagendar consultas", async () => {
      const resposta = await request(app)
        .put("/api/consultas/999999/reagendar")
        .set("Authorization", `Bearer ${veterinario}`)
        .send({
          dataHora: "2026-12-30T14:00:00.000Z"
        });

      expect(resposta.status).toBe(403);
    });

  });

  describe("Tutor", () => {

    it("não deve permitir listar todos os tutores", async () => {
      const resposta = await request(app)
        .get("/api/tutores")
        .set("Authorization", `Bearer ${tutor}`);

      expect(resposta.status).toBe(403);
    });

    it("não deve permitir listar todos os animais", async () => {
      const resposta = await request(app)
        .get("/api/animais")
        .set("Authorization", `Bearer ${tutor}`);

      expect(resposta.status).toBe(403);
    });

    it("não deve permitir listar consultas", async () => {
      const resposta = await request(app)
        .get("/api/consultas")
        .set("Authorization", `Bearer ${tutor}`);

      expect(resposta.status).toBe(403);
    });

    it("não deve permitir acessar prontuários", async () => {
      const resposta = await request(app)
        .get("/api/prontuarios")
        .set("Authorization", `Bearer ${tutor}`);

      expect(resposta.status).toBe(403);
    });

    it("deve permitir acessar o próprio perfil", async () => {
      const resposta = await request(app)
        .get("/api/usuarios/me")
        .set("Authorization", `Bearer ${tutor}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.perfil).toBe("Tutor");
    });

  });

});