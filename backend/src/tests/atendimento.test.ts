import { beforeAll, describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

import {
  criarTokenTeste
} from "./helpers/autenticacao.js";

describe("Testes da API de atendimentos", () => {

  let token: string;

  beforeAll(async () => {
    token = await criarTokenTeste("Administrador");
  });

  async function prepararDados() {
    const identificador = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const tutorResposta = await request(app)
      .post("/api/tutores")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nome: "Tutor do Atendimento",
        telefone: "92999999999",
        email: `tutor.atendimento.${identificador}@email.com`
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
        nome: "Veterinário do Atendimento",
        crmv: `CRMV-AM ${identificador}`,
        telefone: "92988888888",
        email: `vet.atendimento.${identificador}@email.com`
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
        dataHora: "2026-12-20T14:00:00.000Z",
        motivo: "Avaliação clínica"
      });

    expect(consultaResposta.status).toBe(201);

    const consultaId = consultaResposta.body.consulta.id;

    return { consultaId, animalId, veterinarioId };
  }

  async function colocarConsultaEmAtendimento(
    consultaId: number
  ) {
    const confirmacao = await request(app)
      .patch(`/api/consultas/${consultaId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "Confirmada"
      });

    expect(confirmacao.status).toBe(200);

    const inicio = await request(app)
      .patch(`/api/consultas/${consultaId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "Em atendimento"
      });

    expect(inicio.status).toBe(200);
  }

  async function cadastrarAtendimentoValido() {
    const { consultaId } = await prepararDados();

    await colocarConsultaEmAtendimento(consultaId);

    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId,
        diagnostico: "Animal em boas condições de saúde",
        procedimentos: "Exame físico completo",
        observacoes: "Sem alterações relevantes",
        orientacoes: "Manter acompanhamento periódico"
      });

    expect(resposta.status).toBe(201);

    return {
      consultaId,
      atendimentoId: resposta.body.atendimento.id
    };
  }

  it("deve cadastrar um atendimento corretamente", async () => {
    const { consultaId } = await prepararDados();

    await colocarConsultaEmAtendimento(consultaId);

    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId,
        diagnostico: "Animal saudável",
        procedimentos: "Exame clínico",
        observacoes: "Sem alterações",
        orientacoes: "Retornar em seis meses"
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.atendimento.consultaId)
      .toBe(consultaId);
    expect(resposta.body.atendimento.diagnostico)
      .toBe("Animal saudável");
  });

  it("deve listar os atendimentos cadastrados", async () => {
    await cadastrarAtendimentoValido();

    const resposta = await request(app)
      .get("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
    expect(resposta.body.length).toBeGreaterThan(0);
  });

  it("deve consultar um atendimento pelo ID", async () => {
    const { atendimentoId } =
      await cadastrarAtendimentoValido();

    const resposta = await request(app)
      .get(`/api/atendimentos/${atendimentoId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(atendimentoId);
  });

  it("deve buscar atendimento pela consulta", async () => {
    const { consultaId, atendimentoId } =
      await cadastrarAtendimentoValido();

    const resposta = await request(app)
      .get(`/api/atendimentos/consulta/${consultaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(atendimentoId);
    expect(resposta.body.consultaId).toBe(consultaId);
  });

  it("não deve cadastrar atendimento com dados inválidos", async () => {
    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId: -1,
        diagnostico: ""
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe("Dados do atendimento inválidos.");
  });

  it("não deve cadastrar atendimento para consulta inexistente", async () => {
    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId: 999999,
        diagnostico: "Diagnóstico de teste"
      });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Consulta não encontrada.");
  });

  it("não deve cadastrar atendimento em consulta apenas agendada", async () => {
    const { consultaId } = await prepararDados();

    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId,
        diagnostico: "Diagnóstico de teste"
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toContain("só pode ser registrado");
  });

  it("não deve permitir dois atendimentos para a mesma consulta", async () => {
    const { consultaId } = await cadastrarAtendimentoValido();

    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId,
        diagnostico: "Segundo diagnóstico"
      });

    expect(resposta.status).toBe(409);
    expect(resposta.body.mensagem)
      .toBe(
        "Esta consulta já possui um atendimento registrado."
      );
  });

  it("deve atualizar um atendimento cadastrado", async () => {
    const { atendimentoId } =
      await cadastrarAtendimentoValido();

    const resposta = await request(app)
      .put(`/api/atendimentos/${atendimentoId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        diagnostico: "Diagnóstico atualizado",
        observacoes: "Novas observações clínicas"
      });

    expect(resposta.status).toBe(200);
    expect(resposta.body.atendimento.diagnostico)
      .toBe("Diagnóstico atualizado");
    expect(resposta.body.atendimento.observacoes)
      .toBe("Novas observações clínicas");
  });

  it("não deve consultar atendimento inexistente", async () => {
    const resposta = await request(app)
      .get("/api/atendimentos/999999")
      .set("Authorization", `Bearer ${token}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Atendimento não encontrado.");
  });

  it("não deve atualizar atendimento inexistente", async () => {
    const resposta = await request(app)
      .put("/api/atendimentos/999999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        diagnostico: "Diagnóstico de teste"
      });

    expect(resposta.status).toBe(404);
    expect(resposta.body.mensagem)
      .toBe("Atendimento não encontrado.");
  });

  it("não deve atualizar atendimento sem informar campos", async () => {
    const { atendimentoId } =
      await cadastrarAtendimentoValido();

    const resposta = await request(app)
      .put(`/api/atendimentos/${atendimentoId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.mensagem)
      .toBe("Dados do atendimento inválidos.");
  });

  it("deve permitir atendimento em consulta concluída", async () => {
    const { consultaId } = await prepararDados();

    await colocarConsultaEmAtendimento(consultaId);

    const conclusao = await request(app)
      .patch(`/api/consultas/${consultaId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "Concluída"
      });

    expect(conclusao.status).toBe(200);

    const resposta = await request(app)
      .post("/api/atendimentos")
      .set("Authorization", `Bearer ${token}`)
      .send({
        consultaId,
        diagnostico: "Atendimento finalizado",
        procedimentos: "Avaliação clínica"
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body.atendimento.consultaId)
      .toBe(consultaId);
  });

});