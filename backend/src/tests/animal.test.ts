import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Testes da API de animais", () => {

  let token: string;

  beforeAll(async () => {
    token = await criarTokenTeste("Administrador");
  });

  async function cadastrarTutor() {
    const resposta = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Tutor Teste",
        telefone: "92999999999",
        email: `tutor${Date.now()}${Math.random()}@email.com`
      });

    return resposta.body.tutor.id;
  }

  async function cadastrarAnimal(tutorId: number) {
    const resposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Mel",
        especie: "Cachorro",
        raca: "Golden Retriever",
        idade: 3,
        tutorId
      });

    return resposta.body.animal.id;
  }

  it("deve cadastrar um animal com tutor existente", async () => {
    const tutorId = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Mel",
        especie: "Cachorro",
        raca: "Golden Retriever",
        idade: 3,
        tutorId
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.animal.nome).toBe("Mel");
    expect(resposta.body.animal.tutorId).toBe(tutorId);
  });

  it("deve mostrar o nome do tutor na listagem de animais", async () => {
    const tutorId = await cadastrarTutor();

    await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Luna",
        especie: "Gato",
        raca: "Persa",
        idade: 2,
        tutorId
      });

    const resposta = await request(app)
      .get("/api/animais")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);

    const luna = resposta.body.find(
      (animal: { nome: string }) => animal.nome === "Luna"
    );

    expect(luna).toBeDefined();
    expect(luna.tutor.nome).toBe("Tutor Teste");
  });

  it("não deve cadastrar animal com tutor inexistente", async () => {
    const resposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Rex",
        especie: "Cachorro",
        raca: "Labrador",
        idade: 2,
        tutorId: 999999
      });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem).toContain("Tutor não encontrado");
  });

  it("não deve cadastrar animal com idade negativa", async () => {
    const tutorId = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Rex",
        especie: "Cachorro",
        raca: "Labrador",
        idade: -2,
        tutorId
      });

    expect(resposta.status).toBe(400);
  });

  it("não deve cadastrar animal com idade decimal", async () => {
    const tutorId = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Luna",
        especie: "Gato",
        raca: "Persa",
        idade: 2.5,
        tutorId
      });

    expect(resposta.status).toBe(400);
  });

  it("não deve cadastrar animal com nome vazio", async () => {
    const tutorId = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "   ",
        especie: "Cachorro",
        raca: "Poodle",
        idade: 3,
        tutorId
      });

    expect(resposta.status).toBe(400);
  });

  it("deve consultar um animal pelo ID", async () => {
    const tutorId = await cadastrarTutor();
    const animalId = await cadastrarAnimal(tutorId);

    const resposta = await request(app)
      .get(`/api/animais/${animalId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe("Mel");
  });

  it("não deve consultar um animal inexistente", async () => {
    const resposta = await request(app)
      .get("/api/animais/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

  it("deve editar um animal cadastrado", async () => {
    const tutorId = await cadastrarTutor();
    const animalId = await cadastrarAnimal(tutorId);

    const resposta = await request(app)
      .put(`/api/animais/${animalId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Mel Atualizada",
        especie: "Cachorro",
        raca: "Labrador",
        idade: 4,
        tutorId
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.animal.nome).toBe("Mel Atualizada");
    expect(resposta.body.animal.idade).toBe(4);
  });

  it("não deve editar um animal inexistente", async () => {
    const tutorId = await cadastrarTutor();

    const resposta = await request(app)
      .put("/api/animais/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Rex",
        especie: "Cachorro",
        raca: "Labrador",
        idade: 3,
        tutorId
      });

    expect(resposta.status).toBe(404);
  });

  it("deve excluir um animal cadastrado", async () => {
    const tutorId = await cadastrarTutor();
    const animalId = await cadastrarAnimal(tutorId);

    const resposta = await request(app)
      .delete(`/api/animais/${animalId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.mensagem).toBe("Animal excluído com sucesso!");
  });

  it("não deve excluir um animal inexistente", async () => {
    const resposta = await request(app)
      .delete("/api/animais/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
  });

});