import { useEffect, useState, type FormEvent } from "react";

type PerfilEquipe =
  | "Administrador"
  | "Secretario"
  | "Veterinario";

type UsuarioEquipe = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilEquipe;
  ativo: boolean;
  administrador_principal: boolean;
};

type RespostaCadastro = {
  mensagem: string;
  usuario: UsuarioEquipe;
};

type RespostaAtivacao = {
  mensagem: string;
  token: string;
  expiraEmMinutos: number;
};

type Props = {
  aoCadastrar?: () => Promise<void>;
};

type DadosToken = {
  id?: number;
  perfil?: string;
  exp?: number;
};

const apiUrl = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export default function GerenciamentoEquipe({
  aoCadastrar
}: Props) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const [perfil, setPerfil] =
    useState<PerfilEquipe>("Secretario");

  const [usuarioId, setUsuarioId] = useState("");

  const [usuarios, setUsuarios] = useState<UsuarioEquipe[]>([]);

  const [carregandoUsuarios, setCarregandoUsuarios] =
    useState(true);

  const [processando, setProcessando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [codigoAtivacao, setCodigoAtivacao] =
    useState("");

  const [usuarioAtualId, setUsuarioAtualId] =
    useState<number | null>(null);

  function obterToken() {
    const token = sessionStorage.getItem(
      "petagenda_token"
    );

    if (!token) {
      throw new Error(
        "Sessão não encontrada. Entre novamente."
      );
    }

    return token;
  }

  function obterUsuarioAtualId(): number | null {
    try {
      const token = obterToken();
      const partes = token.split(".");

      if (partes.length !== 3) {
        return null;
      }

      const payloadBase64 = partes[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const payload = JSON.parse(
        atob(payloadBase64)
      ) as DadosToken;

      if (
        typeof payload.id !== "number" ||
        !Number.isSafeInteger(payload.id) ||
        payload.id <= 0
      ) {
        return null;
      }

      return payload.id;
    } catch {
      return null;
    }
  }

  async function requisicao<T>(
    caminho: string,
    opcoes: RequestInit = {}
  ): Promise<T> {
    const token = obterToken();

    const resposta = await fetch(
      `${apiUrl}${caminho}`,
      {
        ...opcoes,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opcoes.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...opcoes.headers
        },
        cache: "no-store"
      }
    );

    const resultado: unknown = await resposta.json();

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
        "Não foi possível concluir a operação."
      );
    }

    return resultado as T;
  }

  async function carregarUsuarios() {
    setCarregandoUsuarios(true);

    try {
      const lista = await requisicao<UsuarioEquipe[]>(
        "/api/usuarios"
      );

      setUsuarios(lista);
      setUsuarioAtualId(obterUsuarioAtualId());
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Erro ao carregar funcionários."
      );
    } finally {
      setCarregandoUsuarios(false);
    }
  }

  useEffect(() => {
    void carregarUsuarios();
  }, []);

  const usuarioAtual = usuarios.find(
    (usuario) => usuario.id === usuarioAtualId
  );

  const administradorPrincipalAtual =
    usuarioAtual?.perfil === "Administrador" &&
    usuarioAtual.ativo === true &&
    usuarioAtual.administrador_principal === true;

  const administradorComumAtual =
    usuarioAtual?.perfil === "Administrador" &&
    usuarioAtual.ativo === true &&
    usuarioAtual.administrador_principal === false;

  const podeCadastrarFuncionarios =
    administradorPrincipalAtual ||
    administradorComumAtual;

  const podeCadastrarAdministradores =
    administradorPrincipalAtual;

  const podeGerarCodigoAtivacao =
    administradorPrincipalAtual;

  const funcionariosInativos = usuarios.filter(
    (usuario) =>
      !usuario.ativo &&
      (
        usuario.perfil === "Administrador" ||
        usuario.perfil === "Secretario" ||
        usuario.perfil === "Veterinario"
      )
  );

  async function cadastrarFuncionario(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (processando || !podeCadastrarFuncionarios) {
      return;
    }

    if (
      perfil === "Administrador" &&
      !podeCadastrarAdministradores
    ) {
      setErro(
        "Somente o Administrador Principal pode cadastrar administradores."
      );
      return;
    }

    setProcessando(true);
    setErro("");
    setSucesso("");
    setCodigoAtivacao("");

    try {
      const resultado =
        await requisicao<RespostaCadastro>(
          "/api/usuarios/equipe",
          {
            method: "POST",
            body: JSON.stringify({
              nome: nome.trim(),
              email: email.trim().toLowerCase(),
              perfil
            })
          }
        );

      setUsuarioId(String(resultado.usuario.id));

      setNome("");
      setEmail("");
      setPerfil("Secretario");

      setSucesso(
        "Conta criada com sucesso. " +
        "Ela permanecerá inativa até a conclusão da ativação."
      );

      await carregarUsuarios();

      if (aoCadastrar) {
        await aoCadastrar();
      }
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Erro ao cadastrar funcionário."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function gerarCodigoAtivacao() {
    if (!podeGerarCodigoAtivacao) {
      setErro(
        "Somente o Administrador Principal pode gerar códigos de ativação."
      );
      return;
    }

    const id = Number(usuarioId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      setErro("Selecione um funcionário válido.");
      return;
    }

    const funcionario = funcionariosInativos.find(
      (usuario) => usuario.id === id
    );

    if (!funcionario) {
      setErro(
        "Selecione uma conta inativa da equipe."
      );
      return;
    }

    const confirmado = window.confirm(
      `Deseja gerar um código de ativação para ${funcionario.nome}?\n\n` +
      "Um código anterior dessa conta será invalidado."
    );

    if (!confirmado) {
      return;
    }

    setProcessando(true);
    setErro("");
    setSucesso("");
    setCodigoAtivacao("");

    try {
      const resultado =
        await requisicao<RespostaAtivacao>(
          "/api/usuarios/ativacao-equipe/gerar",
          {
            method: "POST",
            body: JSON.stringify({
              usuarioId: id
            })
          }
        );

      setCodigoAtivacao(resultado.token);

      setSucesso(
        "Código gerado com sucesso. " +
        `Validade: ${resultado.expiraEmMinutos} minutos.`
      );
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Erro ao gerar código de ativação."
      );
    } finally {
      setProcessando(false);
    }
  }

  return (
    <section className="faculdade-section">
      <h2>Gerenciamento de Funcionários</h2>

      <p>
        Cadastre contas da equipe e gerencie
        a ativação dos funcionários.
        O Administrador Principal possui
        permissões exclusivas para cadastrar
        administradores e gerar códigos de ativação.
      </p>

      {erro && (
        <p
          role="alert"
          style={{ color: "#b91c1c" }}
        >
          {erro}
        </p>
      )}

      {sucesso && (
        <p
          role="status"
          style={{ color: "#15803d" }}
        >
          {sucesso}
        </p>
      )}

      {carregandoUsuarios && (
        <p>Verificando permissões administrativas...</p>
      )}

      {!carregandoUsuarios &&
        !podeCadastrarFuncionarios && (
          <p>
            Não foi possível confirmar suas
            permissões administrativas.
          </p>
        )}

      {podeCadastrarFuncionarios && (
        <form
          onSubmit={cadastrarFuncionario}
          style={{
            display: "grid",
            gap: "16px",
            marginTop: "20px"
          }}
        >
          <h3>Cadastrar funcionário</h3>

          <label>
            Nome completo

            <input
              type="text"
              value={nome}
              onChange={(evento) =>
                setNome(evento.target.value)
              }
              minLength={3}
              required
              disabled={processando}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                boxSizing: "border-box"
              }}
            />
          </label>

          <label>
            E-mail

            <input
              type="email"
              value={email}
              onChange={(evento) =>
                setEmail(evento.target.value)
              }
              required
              disabled={processando}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px",
                boxSizing: "border-box"
              }}
            />
          </label>

          <label>
            Perfil

            <select
              value={perfil}
              onChange={(evento) =>
                setPerfil(
                  evento.target.value as PerfilEquipe
                )
              }
              disabled={processando}
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px"
              }}
            >
              <option value="Secretario">
                Recepcionista
              </option>

              <option value="Veterinario">
                Veterinário
              </option>

              {podeCadastrarAdministradores && (
                <option value="Administrador">
                  Administrador
                </option>
              )}
            </select>
          </label>

          <div className="faculdade-acoes">
            <button
              type="submit"
              disabled={processando}
            >
              {processando
                ? "Processando..."
                : "Cadastrar funcionário"}
            </button>
          </div>
        </form>
      )}

      {podeGerarCodigoAtivacao && (
        <div
          style={{
            marginTop: "32px",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "24px"
          }}
        >
          <h3>Gerar código de ativação</h3>

          <p>
            Selecione um funcionário que esteja
            aguardando ativação.
          </p>

          <label>
            Funcionário

            <select
              value={usuarioId}
              onChange={(evento) =>
                setUsuarioId(evento.target.value)
              }
              disabled={
                processando ||
                carregandoUsuarios
              }
              style={{
                display: "block",
                width: "100%",
                padding: "12px",
                marginTop: "8px"
              }}
            >
              <option value="">
                Selecione uma conta inativa
              </option>

              {funcionariosInativos.map((usuario) => (
                <option
                  key={usuario.id}
                  value={usuario.id}
                >
                  {usuario.nome} — {usuario.email}
                </option>
              ))}
            </select>
          </label>

          {carregandoUsuarios && (
            <p>Carregando funcionários...</p>
          )}

          {!carregandoUsuarios &&
            funcionariosInativos.length === 0 && (
              <p>
                Nenhum funcionário aguardando ativação.
              </p>
            )}

          <div
            className="faculdade-acoes"
            style={{ marginTop: "16px" }}
          >
            <button
              type="button"
              onClick={() => void gerarCodigoAtivacao()}
              disabled={
                processando ||
                carregandoUsuarios ||
                !usuarioId
              }
            >
              Gerar código
            </button>
          </div>

          {codigoAtivacao && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                border: "1px solid #d1d5db",
                borderRadius: "8px"
              }}
            >
              <strong>Código temporário</strong>

              <p
                style={{
                  overflowWrap: "anywhere",
                  fontFamily: "monospace"
                }}
              >
                {codigoAtivacao}
              </p>

              <p>
                Página de ativação: /ativar-conta
              </p>

              <p>
                Este código será exibido somente
                enquanto esta seção estiver aberta.
                Não o inclua em capturas de tela
                ou registros públicos.
              </p>

              <button
                type="button"
                onClick={() =>
                  setCodigoAtivacao("")
                }
              >
                Ocultar código
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}