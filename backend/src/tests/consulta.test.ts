import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Testes da API de consultas", () => {

  let token: string;

  beforeAll(async () => {
    token = await criarTokenTeste("Administrador");
  });

  async function prepararDados() {
    const tutorResposta = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Tutor da Consulta",
        telefone: "92999999999",
        email: `tutor${Date.now()}${Math.random()}@email.com`
      });

    const tutorId = tutorResposta.body.tutor.id;

    const animalResposta = await request(app)
      .post("/api/animais")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Mel",
        especie: "Cachorro",
        raca: "Golden Retriever",
        idade: 3,
        tutorId
      });

    const animalId = animalResposta.body.animal.id;

    const veterinarioResposta = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Ana Souza",
        crmv: `CRMV-AM ${Date.now()}`,
        telefone: "92988888888",
        email: `vet${Date.now()}${Math.random()}@email.com`
      });

    const veterinarioId =
      veterinarioResposta.body.veterinario.id;

    return {
      animalId,
      veterinarioId
    };
  }

  async function agendarConsulta(
    animalId: number,
    veterinarioId: number,
    dataHora = "2026-12-15T14:00:00.000Z"
  ) {
    return request(app)
      .post("/api/consultas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId,
        veterinarioId,
        dataHora,
        motivo: "Consulta de rotina"
      });
  }

  it("deve agendar uma consulta corretamente", async () => {
    const { animalId, veterinarioId } =
      await prepararDados();

    const resposta = await agendarConsulta(
      animalId,
      veterinarioId
    );

    expect(resposta.status).toBe(201);
    expect(resposta.body.consulta.status).toBe("Agendada");
    expect(resposta.body.consulta.animalId).toBe(animalId);
    expect(resposta.body.consulta.veterinarioId)
      .toBe(veterinarioId);
  });

  it("não deve agendar consulta para animal inexistente", async () => {
    const { veterinarioId } = await prepararDados();

    const resposta = await agendarConsulta(
      999999,
      veterinarioId
    );

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Animal não encontrado.");
  });

  it("não deve agendar consulta para veterinário inexistente", async () => {
    const { animalId } = await prepararDados();

    const resposta = await agendarConsulta(
      animalId,
      999999
    );

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Veterinário não encontrado.");
  });

  it("não deve permitir duas consultas do mesmo veterinário no mesmo horário", async () => {
    const { animalId, veterinarioId } =
      await prepararDados();

    const primeiraConsulta = await agendarConsulta(
      animalId,
      veterinarioId
    );

    const segundaConsulta = await agendarConsulta(
      animalId,
      veterinarioId
    );

    expect(primeiraConsulta.status).toBe(201);
    expect(segundaConsulta.status).toBe(409);
    expect(segundaConsulta.body.mensagem)
      .toContain("já possui uma consulta nesse horário");
  });

  it("deve consultar uma consulta pelo ID", async () => {
    const { animalId, veterinarioId } =
      await prepararDados();

    const cadastro = await agendarConsulta(
      animalId,
      veterinarioId
    );

    const id = cadastro.body.consulta.id;

    const resposta = await request(app)
      .get(`/api/consultas/${id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(id);
  });

  it("deve reagendar uma consulta", async () => {
    const { animalId, veterinarioId } =
      await prepararDados();

    const cadastro = await agendarConsulta(
      animalId,
      veterinarioId
    );

    const id = cadastro.body.consulta.id;

    const novaData = "2026-12-16T15:00:00.000Z";

    const resposta = await request(app)
      .put(`/api/consultas/${id}/reagendar`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        dataHora: novaData
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.consulta.dataHora).toBe(novaData);
  });

  it("deve impedir uma mudança de status não permitida", async () => {
    const { animalId, veterinarioId } =
      await prepararDados();

    const cadastro = await agendarConsulta(
      animalId,
      veterinarioId
    );

    const id = cadastro.body.consulta.id;

    const resposta = await request(app)
      .patch(`/api/consultas/${id}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "Concluída"
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe("Essa mudança de status não é permitida.");
  });

  it("deve permitir o fluxo correto de status até a conclusão", async () => {
    const { animalId, veterinarioId } =
      await prepararDados();

    const cadastro = await agendarConsulta(
      animalId,
      veterinarioId
    );

    const id = cadastro.body.consulta.id;

    const statusPermitidos = [
      "Confirmada",
      "Em atendimento",
      "Concluída"
    ];

    for (const status of statusPermitidos) {
      const resposta = await request(app)
        .patch(`/api/consultas/${id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status });

      expect(resposta.status).toBe(200);
      expect(resposta.body.consulta.status).toBe(status);
    }
  });

});