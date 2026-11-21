import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Testes da API de veterinários", () => {

  let token: string;

  beforeAll(async () => {
    token = await criarTokenTeste("Administrador");
  });

  it("deve cadastrar um veterinário corretamente", async () => {
    const resposta = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Ana Souza",
        crmv: "CRMV-AM 12345",
        telefone: "92999999999",
        email: "ana@email.com"
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.veterinario.nome).toBe("Ana Souza");
    expect(resposta.body.veterinario.crmv).toBe("CRMV-AM 12345");
  });

  it("deve listar os veterinários cadastrados", async () => {
    const resposta = await request(app)
      .get("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

  it("não deve cadastrar veterinário com dados inválidos", async () => {
    const resposta = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "",
        crmv: "",
        telefone: "123",
        email: "email-invalido"
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe("Dados do veterinário inválidos.");
  });

  it("deve consultar um veterinário pelo ID", async () => {
    const cadastro = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Carlos Lima",
        crmv: "CRMV-AM 54321",
        telefone: "92988888888",
        email: "carlos@email.com"
      });

    const id = cadastro.body.veterinario.id;

    const resposta = await request(app)
      .get(`/api/veterinarios/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe("Carlos Lima");
  });

  it("não deve consultar veterinário inexistente", async () => {
    const resposta = await request(app)
      .get("/api/veterinarios/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  it("deve editar um veterinário cadastrado", async () => {
    const cadastro = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Ana Souza",
        crmv: "CRMV-AM 67890",
        telefone: "92999999999",
        email: "ana@email.com"
      });

    const id = cadastro.body.veterinario.id;

    const resposta = await request(app)
      .put(`/api/veterinarios/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Ana Souza Atualizada",
        crmv: "CRMV-AM 67890",
        telefone: "92977777777",
        email: "ana.atualizada@email.com"
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.veterinario.nome)
      .toBe("Ana Souza Atualizada");
  });

  it("não deve editar veterinário inexistente", async () => {
    const resposta = await request(app)
      .put("/api/veterinarios/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Veterinário Teste",
        crmv: "CRMV-AM 99999",
        telefone: "92999999999",
        email: "teste@email.com"
      });

    expect(resposta.status).toBe(404);
  });

  it("deve excluir um veterinário cadastrado", async () => {
    const cadastro = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Pedro Santos",
        crmv: "CRMV-AM 98765",
        telefone: "92955555555",
        email: "pedro@email.com"
      });

    const id = cadastro.body.veterinario.id;

    const resposta = await request(app)
      .delete(`/api/veterinarios/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.mensagem)
      .toBe("Veterinário excluído com sucesso!");
  });

  it("não deve excluir veterinário inexistente", async () => {
    const resposta = await request(app)
      .delete("/api/veterinarios/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

});