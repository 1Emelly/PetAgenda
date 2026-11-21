import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Testes da API de prontuários", () => {

  let token: string;

  beforeAll(async () => {
    token = await criarTokenTeste("Administrador");
  });

  async function prepararDados() {
    const identificador =
      `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const tutorResposta = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Tutor do Prontuário",
        telefone: "92999999999",
        email: `tutor.prontuario.${identificador}@email.com`
      });

    expect(tutorResposta.status).toBe(201);

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

    expect(animalResposta.status).toBe(201);

    const animalId = animalResposta.body.animal.id;

    const veterinarioResposta = await request(app)
      .post("/api/veterinarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Veterinário do Prontuário",
        crmv: `CRMV-AM ${identificador}`,
        telefone: "92988888888",
        email: `vet.prontuario.${identificador}@email.com`
      });

    expect(veterinarioResposta.status).toBe(201);

    const veterinarioId =
      veterinarioResposta.body.veterinario.id;

    const consultaResposta = await request(app)
      .post("/api/consultas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId,
        veterinarioId,
        dataHora: "2026-12-22T14:00:00.000Z",
        motivo: "Avaliação clínica"
      });

    expect(consultaResposta.status).toBe(201);

    const consultaId = consultaResposta.body.consulta.id;

    for (const status of [
      "Confirmada",
      "Em atendimento"
    ]) {
      const resposta = await request(app)
        .patch(`/api/consultas/${consultaId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status });

      expect(resposta.status).toBe(200);
    }

    const atendimentoResposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId,
        diagnostico: "Animal saudável",
        procedimentos: "Exame clínico",
        observacoes: "Sem alterações",
        orientacoes: "Acompanhamento periódico"
      });

    expect(atendimentoResposta.status).toBe(201);

    const atendimentoId =
      atendimentoResposta.body.atendimento.id;

    return {
      animalId,
      atendimentoId
    };
  }

  async function cadastrarProntuarioValido() {
    const { animalId, atendimentoId } =
      await prepararDados();

    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId,
        atendimentoId,
        descricao: "Animal examinado e em boas condições."
      });

    expect(resposta.status).toBe(201);

    return {
      animalId,
      atendimentoId,
      prontuarioId: resposta.body.prontuario.id
    };
  }

  it("deve cadastrar um prontuário corretamente", async () => {
    const { animalId, atendimentoId } =
      await prepararDados();

    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId,
        atendimentoId,
        descricao: "Avaliação clínica realizada."
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.prontuario.animalId)
      .toBe(animalId);
    expect(resposta.body.prontuario.atendimentoId)
      .toBe(atendimentoId);
  });

  it("deve listar os prontuários cadastrados", async () => {
    await cadastrarProntuarioValido();

    const resposta = await request(app)
      .get("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
    expect(resposta.body.length).toBeGreaterThan(0);
  });

  it("deve consultar um prontuário pelo ID", async () => {
    const { prontuarioId } =
      await cadastrarProntuarioValido();

    const resposta = await request(app)
      .get(`/api/prontuarios/${prontuarioId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(prontuarioId);
  });

  it("deve listar o histórico clínico de um animal", async () => {
    const { animalId, prontuarioId } =
      await cadastrarProntuarioValido();

    const resposta = await request(app)
      .get(`/api/prontuarios/animal/${animalId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);

    expect(
      resposta.body.some(
        (prontuario: { id: number }) =>
          prontuario.id === prontuarioId
      )
    ).toBe(true);
  });

  it("deve buscar prontuário pelo atendimento", async () => {
    const { atendimentoId, prontuarioId } =
      await cadastrarProntuarioValido();

    const resposta = await request(app)
      .get(
        `/api/prontuarios/atendimento/${atendimentoId}`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(prontuarioId);
  });

  it("não deve cadastrar prontuário com dados inválidos", async () => {
    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId: -1,
        atendimentoId: 0,
        descricao: ""
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe("Dados do prontuário inválidos.");
  });

  it("não deve cadastrar prontuário para animal inexistente", async () => {
    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId: 999999,
        atendimentoId: 999999,
        descricao: "Registro clínico de teste."
      });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Animal não encontrado.");
  });

  it("não deve cadastrar prontuário para atendimento inexistente", async () => {
    const { animalId } = await prepararDados();

    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId,
        atendimentoId: 999999,
        descricao: "Registro clínico de teste."
      });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Atendimento não encontrado.");
  });

  it("não deve permitir prontuário vinculado ao animal errado", async () => {
    const primeiro = await prepararDados();
    const segundo = await prepararDados();

    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId: segundo.animalId,
        atendimentoId: primeiro.atendimentoId,
        descricao: "Registro clínico de teste."
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe(
        "O atendimento informado não pertence ao animal selecionado."
      );
  });

  it("não deve permitir dois prontuários para o mesmo atendimento", async () => {
    const { animalId, atendimentoId } =
      await cadastrarProntuarioValido();

    const resposta = await request(app)
      .post("/api/prontuarios")
      .set("Authorization", `Bearer ${token}`)
      .send({
        animalId,
        atendimentoId,
        descricao: "Segundo registro clínico."
      });

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem)
      .toBe(
        "Este atendimento já possui um prontuário registrado."
      );
  });

  it("deve atualizar a descrição de um prontuário", async () => {
    const { prontuarioId } =
      await cadastrarProntuarioValido();

    const resposta = await request(app)
      .put(`/api/prontuarios/${prontuarioId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        descricao: "Descrição clínica atualizada."
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.prontuario.descricao)
      .toBe("Descrição clínica atualizada.");
  });

  it("não deve consultar prontuário inexistente", async () => {
    const resposta = await request(app)
      .get("/api/prontuarios/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Prontuário não encontrado.");
  });

  it("não deve atualizar prontuário inexistente", async () => {
    const resposta = await request(app)
      .put("/api/prontuarios/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        descricao: "Descrição clínica de teste."
      });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Prontuário não encontrado.");
  });

  it("não deve atualizar prontuário com descrição vazia", async () => {
    const { prontuarioId } =
      await cadastrarProntuarioValido();

    const resposta = await request(app)
      .put(`/api/prontuarios/${prontuarioId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        descricao: ""
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe("Dados do prontuário inválidos.");
  });

});