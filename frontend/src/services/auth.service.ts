import type {
  CredenciaisLogin,
  RespostaLogin,
  Usuario
} from "../types/auth";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export async function realizarLogin(
  credenciais: CredenciaisLogin
): Promise<RespostaLogin> {
  let resposta: Response;

  try {
    resposta = await fetch(
      `${API_URL}/api/usuarios/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credenciais)
      }
    );
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Verifique se o backend está funcionando."
    );
  }

  const dados: unknown = await resposta.json();

  if (!resposta.ok) {
    if (
      typeof dados === "object" &&
      dados !== null &&
      "mensagem" in dados &&
      typeof dados.mensagem === "string"
    ) {
      throw new Error(dados.mensagem);
    }

    throw new Error(
      "Não foi possível realizar o login."
    );
  }

  if (
    typeof dados !== "object" ||
    dados === null ||
    !("token" in dados) ||
    typeof dados.token !== "string" ||
    !("usuario" in dados) ||
    typeof dados.usuario !== "object" ||
    dados.usuario === null
  ) {
    throw new Error(
      "O servidor retornou uma resposta inválida."
    );
  }

  return dados as RespostaLogin;
}

export async function consultarUsuarioAutenticado(
  token: string
): Promise<Usuario> {
  let resposta: Response;

  try {
    resposta = await fetch(
      `${API_URL}/api/usuarios/me`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      }
    );
  } catch {
    throw new Error(
      "Não foi possível verificar a sessão. Verifique a conexão com o servidor."
    );
  }

  if (resposta.status === 401 || resposta.status === 403) {
    throw new Error("SESSAO_INVALIDA");
  }

  if (!resposta.ok) {
    throw new Error(
      "Não foi possível verificar a sessão."
    );
  }

  const dados: unknown = await resposta.json();

  // Aceita tanto { usuario: {...} } quanto
  // a representação direta do usuário.
  const usuario =
    typeof dados === "object" &&
    dados !== null &&
    "usuario" in dados
      ? dados.usuario
      : dados;

  if (
    typeof usuario !== "object" ||
    usuario === null ||
    !("id" in usuario) ||
    typeof usuario.id !== "number" ||
    !("nome" in usuario) ||
    typeof usuario.nome !== "string" ||
    !("email" in usuario) ||
    typeof usuario.email !== "string" ||
    !("perfil" in usuario) ||
    (
      usuario.perfil !== "Administrador" &&
      usuario.perfil !== "Secretario" &&
      usuario.perfil !== "Veterinario" &&
      usuario.perfil !== "Tutor"
    )
  ) {
    throw new Error(
      "O servidor retornou dados de usuário inválidos."
    );
  }

  return usuario as Usuario;
}