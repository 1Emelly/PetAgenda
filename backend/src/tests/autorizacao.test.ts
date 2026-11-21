import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import jwt from "jsonwebtoken";

import { pool } from "../config/database.js";

import {
  autenticarToken
} from "../middlewares/autenticacao.middleware.js";

import {
  autorizarPerfis
} from "../middlewares/autorizacao.middleware.js";

const appTeste = express();

appTeste.use(express.json());

appTeste.get(
  "/administrador",
  autenticarToken,
  autorizarPerfis("Administrador"),
  (_req, res) => {
    return res.json({
      mensagem: "Acesso administrativo autorizado."
    });
  }
);

appTeste.get(
  "/veterinario",
  autenticarToken,
  autorizarPerfis("Administrador", "Veterinario"),
  (_req, res) => {
    return res.json({
      mensagem: "Acesso veterinário autorizado."
    });
  }
);

appTeste.get(
  "/tutor",
  autenticarToken,
  autorizarPerfis("Tutor"),
  (_req, res) => {
    return res.json({
      mensagem: "Acesso do tutor autorizado."
    });
  }
);

type Perfil =
  | "Administrador"
  | "Secretario"
  | "Veterinario"
  | "Tutor";

async function criarUsuarioTeste(perfil: Perfil) {
  const identificador =
    `${Date.now()}${Math.floor(Math.random() * 100000)}`;

  const resultado = await pool.query<{ id: number }>(
    `INSERT INTO usuarios (
      nome,
      email,
      senha_hash,
      perfil
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [
      `Usuário ${perfil}`,
      `teste.${perfil}.${identificador}@email.com`,
      "hash-apenas-para-teste-de-autorizacao",
      perfil
    ]
  );

  const chave = process.env.JWT_SECRET;

  if (!chave) {
    throw new Error("JWT_SECRET não configurado.");
  }

  const token = jwt.sign(
    {
      id: resultado.rows[0].id,
      perfil
    },
    chave,
    {
      expiresIn: "1h"
    }
  );

  return {
    id: resultado.rows[0].id,
    token
  };
}

describe("Testes de autorização por perfil", () => {

  it("deve permitir acesso administrativo ao administrador", async () => {
    const usuario = await criarUsuarioTeste("Administrador");

    const resposta = await request(appTeste)
      .get("/administrador")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(200);
  });

  it("não deve permitir acesso administrativo ao tutor", async () => {
    const usuario = await criarUsuarioTeste("Tutor");

    const resposta = await request(appTeste)
      .get("/administrador")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(403);
  });

  it("não deve permitir acesso administrativo ao secretário", async () => {
    const usuario = await criarUsuarioTeste("Secretario");

    const resposta = await request(appTeste)
      .get("/administrador")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(403);
  });

  it("deve permitir acesso veterinário ao veterinário", async () => {
    const usuario = await criarUsuarioTeste("Veterinario");

    const resposta = await request(appTeste)
      .get("/veterinario")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(200);
  });

  it("deve permitir acesso veterinário ao administrador", async () => {
    const usuario = await criarUsuarioTeste("Administrador");

    const resposta = await request(appTeste)
      .get("/veterinario")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(200);
  });

  it("não deve permitir acesso veterinário ao tutor", async () => {
    const usuario = await criarUsuarioTeste("Tutor");

    const resposta = await request(appTeste)
      .get("/veterinario")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(403);
  });

  it("deve permitir acesso do tutor ao perfil Tutor", async () => {
    const usuario = await criarUsuarioTeste("Tutor");

    const resposta = await request(appTeste)
      .get("/tutor")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(200);
  });

  it("não deve permitir acesso do tutor ao veterinário", async () => {
    const usuario = await criarUsuarioTeste("Veterinario");

    const resposta = await request(appTeste)
      .get("/tutor")
      .set("Authorization", `Bearer ${usuario.token}`);

    expect(resposta.status).toBe(403);
  });

  it("não deve permitir acesso sem autenticação", async () => {
    const resposta = await request(appTeste)
      .get("/administrador");

    expect(resposta.status).toBe(401);
  });

  it("não deve permitir acesso com token inválido", async () => {
    const resposta = await request(appTeste)
      .get("/administrador")
      .set("Authorization", "Bearer token-invalido");

    expect(resposta.status).toBe(401);
  });

});