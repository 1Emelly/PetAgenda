const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

interface RespostaSolicitacaoEmail {
  mensagem: string;
  confirmacaoNecessaria: boolean;
}

interface RespostaConfirmacaoEmail {
  mensagem: string;
  email: string;
}

function obterToken(): string {
  const token = sessionStorage.getItem(
    "petagenda_token"
  );

  if (!token) {
    throw new Error(
      "Sua sessão não está disponível. Entre novamente."
    );
  }

  return token;
}

async function enviarRequisicao<T>(
  caminho: string,
  dados: Record<string, string>
): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(
      `${API_URL}${caminho}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${obterToken()}`
        },
        body: JSON.stringify(dados)
      }
    );
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor."
    );
  }

  let resultado: unknown;

  try {
    resultado = await resposta.json();
  } catch {
    throw new Error(
      "O servidor retornou uma resposta inválida."
    );
  }

  if (!resposta.ok) {
    if (
      typeof resultado === "object" &&
      resultado !== null &&
      "mensagem" in resultado &&
      typeof resultado.mensagem === "string"
    ) {
      throw new Error(resultado.mensagem);
    }

    throw new Error(
      "Não foi possível concluir a solicitação."
    );
  }

  return resultado as T;
}

export async function solicitarAlteracaoEmail(
  novoEmail: string,
  senhaAtual: string
): Promise<RespostaSolicitacaoEmail> {
  return enviarRequisicao<RespostaSolicitacaoEmail>(
    "/api/usuarios/alteracao-email/solicitar",
    {
      novoEmail,
      senhaAtual
    }
  );
}

export async function confirmarAlteracaoEmail(
  codigo: string
): Promise<RespostaConfirmacaoEmail> {
  return enviarRequisicao<RespostaConfirmacaoEmail>(
    "/api/usuarios/alteracao-email/confirmar",
    {
      codigo
    }
  );
}