import bcrypt from "bcryptjs";

import { pool } from "../config/database.js";

import type { Usuario } from "../types/usuario.js";

interface UsuarioBanco {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  perfil: Usuario["perfil"];
  ativo: boolean;
  administrador_principal: boolean;
  primeira_ativacao_concluida?: boolean;
}

export interface UsuarioPublico {
  id: number;
  nome: string;
  email: string;
  perfil: Usuario["perfil"];
}

export interface UsuarioListado extends UsuarioPublico {
  ativo: boolean;
  administrador_principal: boolean;
  primeira_ativacao_concluida: boolean;
}

export interface UsuarioAutenticacao extends UsuarioPublico {
  senha: string;
  ativo: boolean;
}

function converterUsuarioPublico(
  registro: UsuarioBanco
): UsuarioPublico {
  return {
    id: registro.id,
    nome: registro.nome,
    email: registro.email,
    perfil: registro.perfil
  };
}

export async function cadastrarNovoUsuario(
  dados: Omit<Usuario, "id">
): Promise<UsuarioPublico> {
  const senhaHash = await bcrypt.hash(dados.senha, 10);

  const resultado = await pool.query<UsuarioBanco>(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, email, senha_hash, perfil, ativo, administrador_principal`,
    [
      dados.nome,
      dados.email.trim().toLowerCase(),
      senhaHash,
      dados.perfil
    ]
  );

  return converterUsuarioPublico(resultado.rows[0]);
}

export async function listarTodosUsuarios(): Promise<UsuarioListado[]> {
  const resultado = await pool.query<UsuarioBanco>(
    `SELECT
       u.id,
       u.nome,
       u.email,
       u.senha_hash,
       u.perfil,
       u.ativo,
       u.administrador_principal,
       EXISTS (
         SELECT 1
         FROM ativacoes_usuarios a
         WHERE a.usuario_id = u.id
           AND a.utilizado_em IS NOT NULL
       ) AS primeira_ativacao_concluida
     FROM usuarios u
     ORDER BY u.id`
  );

  return resultado.rows.map((registro) => ({
    ...converterUsuarioPublico(registro),
    ativo: registro.ativo,
    administrador_principal: registro.administrador_principal,
    primeira_ativacao_concluida:
      registro.primeira_ativacao_concluida === true
  }));
}

export async function buscarUsuarioPorEmail(
  email: string
): Promise<UsuarioAutenticacao | undefined> {
  const resultado = await pool.query<UsuarioBanco>(
    `SELECT
       id,
       nome,
       email,
       senha_hash,
       perfil,
       ativo,
       administrador_principal
     FROM usuarios
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email.trim()]
  );

  const usuario = resultado.rows[0];

  if (!usuario) {
    return undefined;
  }

  return {
    ...converterUsuarioPublico(usuario),
    senha: usuario.senha_hash,
    ativo: usuario.ativo
  };
}

export async function buscarUsuarioPorId(
  id: number
): Promise<UsuarioAutenticacao | undefined> {
  const resultado = await pool.query<UsuarioBanco>(
    `SELECT
       id,
       nome,
       email,
       senha_hash,
       perfil,
       ativo,
       administrador_principal
     FROM usuarios
     WHERE id = $1`,
    [id]
  );

  const usuario = resultado.rows[0];

  if (!usuario) {
    return undefined;
  }

  return {
    ...converterUsuarioPublico(usuario),
    senha: usuario.senha_hash,
    ativo: usuario.ativo
  };
}

export async function verificarSenha(
  senhaInformada: string,
  senhaHash: string
): Promise<boolean> {
  return bcrypt.compare(senhaInformada, senhaHash);
}