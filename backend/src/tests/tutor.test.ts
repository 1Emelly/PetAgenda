import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Testes da API de tutores", () => {

  let token: string;

  beforeAll(async () => {
    token = await criarTokenTeste("Administrador");
  });

  it("deve cadastrar um tutor corretamente", async () => {
    const resposta = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Carlos Souza",
        telefone: "92999999999",
        email: "carlos@email.com"
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.tutor.nome).toBe("Carlos Souza");
  });

  it("deve listar os tutores cadastrados", async () => {
    const resposta = await request(app)
      .get("/api/tutores")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });

  it("deve consultar um tutor pelo ID", async () => {
    const cadastro = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Maria Souza",
        telefone: "92988888888",
        email: "maria@email.com"
      });

    const id = cadastro.body.tutor.id;

    const resposta = await request(app)
      .get(`/api/tutores/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe("Maria Souza");
  });

  it("deve editar os dados de um tutor", async () => {
    const cadastro = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "João Silva",
        telefone: "92977777777",
        email: "joao@email.com"
      });

    const id = cadastro.body.tutor.id;

    const resposta = await request(app)
      .put(`/api/tutores/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "João Silva Atualizado",
        telefone: "92966666666",
        email: "joao.atualizado@email.com"
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.tutor.nome).toBe("João Silva Atualizado");
    expect(resposta.body.tutor.telefone).toBe("92966666666");
  });

  it("não deve editar um tutor inexistente", async () => {
    const resposta = await request(app)
      .put("/api/tutores/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Tutor Teste",
        telefone: "92999999999",
        email: "teste@email.com"
      });

    expect(resposta.status).toBe(404);
  });

  it("deve excluir um tutor cadastrado", async () => {
    const cadastro = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Pedro Santos",
        telefone: "92955555555",
        email: "pedro@email.com"
      });

    const id = cadastro.body.tutor.id;

    const resposta = await request(app)
      .delete(`/api/tutores/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.mensagem).toBe("Tutor excluído com sucesso!");
  });

  it("não deve excluir um tutor inexistente", async () => {
    const resposta = await request(app)
      .delete("/api/tutores/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

});