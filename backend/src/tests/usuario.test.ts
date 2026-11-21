import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

import app from "../app.js";
import { pool } from "../config/database.js";

describe("Testes de autenticação e usuários", () => {

  function gerarEmail() {
    return `usuario.${Date.now()}.${Math.floor(
      Math.random() * 100000
    )}@email.com`;
  }

  async function cadastrarTutor() {
    const email = gerarEmail();
    const senha = "TestePetAgenda2026!";

    const resposta = await request(app)
      .post("/api/usuarios/cadastro")
      .send({
        nome: "Tutor de Teste",
        email,
        senha,
        perfil: "Tutor"
      });

    expect(resposta.status).toBe(201);

    return {
      email,
      senha,
      usuarioId: resposta.body.usuario.id
    };
  }

  async function realizarLoginValido() {
    const usuario = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/usuarios/login")
      .send({
        email: usuario.email,
        senha: usuario.senha
      });

    expect(resposta.status).toBe(200);

    return {
      ...usuario,
      token: resposta.body.token
    };
  }

  it("deve cadastrar um tutor corretamente", async () => {
    const usuario = await cadastrarTutor();

    expect(usuario.usuarioId).toBeGreaterThan(0);
  });

  it("não deve permitir cadastro público de administrador", async () => {
    const resposta = await request(app)
      .post("/api/usuarios/cadastro")
      .send({
        nome: "Administrador de Teste",
        email: gerarEmail(),
        senha: "SenhaSegura123!",
        perfil: "Administrador"
      });

    expect(resposta.status).toBe(403);
  });

  it("não deve permitir cadastro público de veterinário", async () => {
    const resposta = await request(app)
      .post("/api/usuarios/cadastro")
      .send({
        nome: "Veterinário de Teste",
        email: gerarEmail(),
        senha: "SenhaSegura123!",
        perfil: "Veterinario"
      });

    expect(resposta.status).toBe(403);
  });

  it("não deve permitir cadastro público de secretário", async () => {
    const resposta = await request(app)
      .post("/api/usuarios/cadastro")
      .send({
        nome: "Secretário de Teste",
        email: gerarEmail(),
        senha: "SenhaSegura123!",
        perfil: "Secretario"
      });

    expect(resposta.status).toBe(403);
  });

  it("não deve cadastrar dois usuários com o mesmo email", async () => {
    const usuario = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/usuarios/cadastro")
      .send({
        nome: "Outro Tutor",
        email: usuario.email,
        senha: "OutraSenha123!",
        perfil: "Tutor"
      });

    expect(resposta.status).toBe(409);
  });

  it("não deve cadastrar usuário com senha curta", async () => {
    const resposta = await request(app)
      .post("/api/usuarios/cadastro")
      .send({
        nome: "Tutor de Teste",
        email: gerarEmail(),
        senha: "123",
        perfil: "Tutor"
      });

    expect(resposta.status).toBe(400);
  });

  it("deve realizar login com credenciais válidas", async () => {
    const usuario = await realizarLoginValido();

    expect(typeof usuario.token).toBe("string");
    expect(usuario.token.length).toBeGreaterThan(0);
  });

  it("não deve realizar login com senha incorreta", async () => {
    const usuario = await cadastrarTutor();

    const resposta = await request(app)
      .post("/api/usuarios/login")
      .send({
        email: usuario.email,
        senha: "SenhaIncorreta123!"
      });

    expect(resposta.status).toBe(401);
  });

  it("não deve realizar login com email inexistente", async () => {
    const resposta = await request(app)
      .post("/api/usuarios/login")
      .send({
        email: gerarEmail(),
        senha: "SenhaSegura123!"
      });

    expect(resposta.status).toBe(401);
  });

  it("deve acessar a rota protegida com token válido", async () => {
    const usuario = await realizarLoginValido();

    const resposta = await request(app)
      .get("/api/usuarios/me")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body.id).toBe(usuario.usuarioId);
    expect(resposta.body.email).toBe(usuario.email);
    expect(resposta.body.perfil).toBe("Tutor");
    expect(resposta.body.senha).toBeUndefined();
  });

  it("não deve acessar rota protegida sem token", async () => {
    const resposta = await request(app)
      .get("/api/usuarios/me");

    expect(resposta.status).toBe(401);
  });

  it("não deve acessar rota protegida com token inválido", async () => {
    const resposta = await request(app)
      .get("/api/usuarios/me")
      .set("Authorization", "Bearer token-invalido");

    expect(resposta.status).toBe(401);
  });

  it("não deve aceitar token expirado", async () => {
    const usuario = await cadastrarTutor();

    const chave = process.env.JWT_SECRET;

    if (!chave) {
      throw new Error("JWT_SECRET não configurado.");
    }

    const tokenExpirado = jwt.sign(
      {
        id: usuario.usuarioId,
        perfil: "Tutor"
      },
      chave,
      {
        expiresIn: -1
      }
    );

    const resposta = await request(app)
      .get("/api/usuarios/me")
      .set("Authorization", `Bearer ${tokenExpirado}`);

    expect(resposta.status).toBe(401);
  });

  it("não deve permitir acesso de usuário inativo", async () => {
    const usuario = await realizarLoginValido();

    await pool.query(
      "UPDATE usuarios SET ativo = false WHERE id = $1",
      [usuario.usuarioId]
    );

    const resposta = await request(app)
      .get("/api/usuarios/me")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(401);
  });

  it("deve armazenar a senha como hash no PostgreSQL", async () => {
    const usuario = await cadastrarTutor();

    const resultado = await pool.query<{
      senha_hash: string;
    }>(
      "SELECT senha_hash FROM usuarios WHERE id = $1",
      [usuario.usuarioId]
    );

    const senhaHash = resultado.rows[0]?.senha_hash;

    expect(senhaHash).toBeDefined();
    expect(senhaHash).not.toBe(usuario.senha);
    expect(senhaHash.startsWith("$2")).toBe(true);
  });

});