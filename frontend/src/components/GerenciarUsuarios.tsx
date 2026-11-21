import { useCallback, useEffect, useState } from "react";

import GerenciamentoEquipe from "./GerenciamentoEquipe";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  administrador_principal: boolean;
  primeira_ativacao_concluida: boolean;
};

type UsuarioAtual = {
  id: number;
  perfil: string;
};

type Tutor = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
};

type Vinculo = {
  tutorId: number;
  usuarioId: number | null;
};

type RespostaErro = {
  mensagem?: string;
};

type AbaGerenciamento =
  | "contas"
  | "funcionarios"
  | "tutores";

const apiUrl = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuarioAtualId, setUsuarioAtualId] =
    useState<number | null>(null);

  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);

  const [usuarioSelecionado, setUsuarioSelecionado] = useState("");
  const [tutorSelecionado, setTutorSelecionado] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [abaAtual, setAbaAtual] =
    useState<AbaGerenciamento>("contas");

  const obterToken = () => {
    const token = sessionStorage.getItem("petagenda_token");

    if (!token) {
      throw new Error("Sessão não encontrada. Entre novamente.");
    }

    return token;
  };

  const requisicao = useCallback(
    async <T,>(
      caminho: string,
      opcoes: RequestInit = {}
    ): Promise<T> => {
      const token = obterToken();

      const resposta = await fetch(`${apiUrl}${caminho}`, {
        ...opcoes,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opcoes.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...opcoes.headers
        },
        cache: "no-store"
      });

      const dados: unknown = await resposta.json();

      if (!resposta.ok) {
        const respostaErro = dados as RespostaErro;

        throw new Error(
          respostaErro.mensagem ||
          "Não foi possível concluir a operação."
        );
      }

      return dados as T;
    },
    []
  );

  const carregarDados = useCallback(async () => {
    setAtualizando(true);
    setErro("");

    try {
      const [
        listaUsuarios,
        listaTutores,
        usuarioAtual
      ] = await Promise.all([
        requisicao<Usuario[]>("/api/usuarios"),
        requisicao<Tutor[]>("/api/tutores"),
        requisicao<UsuarioAtual>("/api/usuarios/me")
      ]);

      const listaVinculos = await Promise.all(
        listaTutores.map((tutor) =>
          requisicao<Vinculo>(
            `/api/vinculacoes-tutores/${tutor.id}`
          )
        )
      );

      setUsuarios(listaUsuarios);
      setUsuarioAtualId(usuarioAtual.id);
      setTutores(listaTutores);
      setVinculos(listaVinculos);

      return true;
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Erro ao carregar usuários e tutores."
      );

      return false;
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [requisicao]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  async function atualizarDadosManualmente() {
    setSucesso("");

    const atualizado = await carregarDados();

    if (atualizado) {
      setSucesso("Dados atualizados com sucesso.");
    }
  }

  const usuariosTutores = usuarios.filter(
    (usuario) => usuario.perfil === "Tutor"
  );

  const usuariosDisponiveis = usuariosTutores.filter(
    (usuario) =>
      usuario.ativo &&
      !vinculos.some(
        (vinculo) => vinculo.usuarioId === usuario.id
      )
  );

  const tutoresDisponiveis = tutores.filter(
    (tutor) =>
      !vinculos.some(
        (vinculo) =>
          vinculo.tutorId === tutor.id &&
          vinculo.usuarioId !== null
      )
  );

  async function vincularTutor() {
    if (!usuarioSelecionado || !tutorSelecionado) {
      setErro("Selecione uma conta e um tutor.");
      return;
    }

    const usuario = usuariosDisponiveis.find(
      (item) => item.id === Number(usuarioSelecionado)
    );

    const tutor = tutoresDisponiveis.find(
      (item) => item.id === Number(tutorSelecionado)
    );

    if (!usuario || !tutor) {
      setErro("A seleção não é válida. Atualize os dados.");
      return;
    }

    const confirmado = window.confirm(
      `Confirme que você verificou a identidade de ${usuario.nome}.\n\n` +
      `Deseja vincular esta conta ao cadastro de ${tutor.nome}?\n\n` +
      "Essa conta poderá acessar os animais e as consultas do tutor."
    );

    if (!confirmado) {
      return;
    }

    setProcessando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao(
        `/api/vinculacoes-tutores/${tutor.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            usuarioId: usuario.id
          })
        }
      );

      setUsuarioSelecionado("");
      setTutorSelecionado("");

      const atualizado = await carregarDados();

      if (atualizado) {
        setSucesso("Conta vinculada ao tutor com sucesso.");
      }
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Não foi possível vincular o tutor."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function desvincularTutor(tutor: Tutor) {
    const confirmado = window.confirm(
      `Deseja remover o vínculo da conta de ${tutor.nome}?\n\n` +
      "O usuário perderá o acesso aos animais e às consultas deste tutor."
    );

    if (!confirmado) {
      return;
    }

    setProcessando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao(
        `/api/vinculacoes-tutores/${tutor.id}`,
        {
          method: "DELETE"
        }
      );

      const atualizado = await carregarDados();

      if (atualizado) {
        setSucesso("Vínculo removido com sucesso.");
      }
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Não foi possível remover o vínculo."
      );
    } finally {
      setProcessando(false);
    }
  }

  const administradorAtual = usuarios.find(
    (usuario) => usuario.id === usuarioAtualId
  );

  const administradorPrincipalAtual =
    administradorAtual?.perfil === "Administrador" &&
    administradorAtual.administrador_principal === true;

  function podeAlterarSituacao(usuario: Usuario) {
    if (
      usuario.id === usuarioAtualId ||
      usuario.administrador_principal
    ) {
      return false;
    }

    if (
      usuario.perfil === "Administrador" &&
      !administradorPrincipalAtual
    ) {
      return false;
    }

    // Funcionários sem primeira ativação precisam definir a senha por código.
    if (
      !usuario.ativo &&
      usuario.perfil !== "Tutor" &&
      !usuario.primeira_ativacao_concluida
    ) {
      return false;
    }

    return true;
  }

  async function alterarSituacao(usuario: Usuario) {
    if (
      !podeAlterarSituacao(usuario) ||
      processando ||
      atualizando
    ) {
      return;
    }

    const novaSituacao = !usuario.ativo;
    const acao = novaSituacao ? "reativar" : "desativar";

    const confirmado = window.confirm(
      `Deseja ${acao} a conta de ${usuario.nome}?\n\n` +
      (
        novaSituacao
          ? "O usuário poderá voltar a acessar o sistema com suas credenciais."
          : "O usuário perderá imediatamente o acesso ao sistema."
      )
    );

    if (!confirmado) {
      return;
    }

    setProcessando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao(
        `/api/usuarios/${usuario.id}/situacao`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ativo: novaSituacao
          })
        }
      );

      const atualizado = await carregarDados();

      if (atualizado) {
        setSucesso(
          novaSituacao
            ? "Conta reativada com sucesso."
            : "Conta desativada com sucesso."
        );
      }
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Não foi possível alterar a situação da conta."
      );
    } finally {
      setProcessando(false);
    }
  }

  function obterUsuarioVinculado(tutorId: number) {
    const vinculo = vinculos.find(
      (item) => item.tutorId === tutorId
    );

    if (!vinculo?.usuarioId) {
      return undefined;
    }

    return usuarios.find(
      (usuario) => usuario.id === vinculo.usuarioId
    );
  }

  function obterNomePerfil(usuario: Usuario) {
    if (
      usuario.perfil === "Administrador" &&
      usuario.administrador_principal
    ) {
      return "Administrador Principal";
    }

    if (usuario.perfil === "Secretario") {
      return "Recepcionista";
    }

    if (usuario.perfil === "Veterinario") {
      return "Veterinário";
    }

    return usuario.perfil;
  }

  function obterSituacao(usuario: Usuario) {
    if (!usuario.ativo) {
      return "Inativo";
    }

    if (usuario.perfil === "Tutor") {
      const vinculado = vinculos.some(
        (vinculo) =>
          vinculo.usuarioId === usuario.id
      );

      return vinculado
        ? "Ativo — tutor vinculado"
        : "Ativo — aguardando vinculação";
    }

    return "Ativo";
  }

  const estiloAba = (aba: AbaGerenciamento) => ({
    padding: "12px 20px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    backgroundColor:
      abaAtual === aba ? "#176b50" : "#ffffff",
    color:
      abaAtual === aba ? "#ffffff" : "#176b50"
  });

  if (carregando) {
    return (
      <section className="faculdade-section">
        <h2>Gerenciar Usuários</h2>
        <p>Carregando contas e vínculos...</p>
      </section>
    );
  }

  return (
    <div>
      <section className="faculdade-section">
        <h2>Gerenciar Usuários</h2>

        <p>
          Consulte as contas cadastradas, gerencie
          funcionários e autorize o acesso dos tutores
          aos seus registros.
        </p>

        {erro && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {erro}
          </p>
        )}

        {sucesso && (
          <p role="status" style={{ color: "#15803d" }}>
            {sucesso}
          </p>
        )}

        <div className="faculdade-acoes">
          <button
            type="button"
            onClick={() => void atualizarDadosManualmente()}
            disabled={processando || atualizando}
          >
            {atualizando
              ? "Atualizando..."
              : "Atualizar dados"}
          </button>
        </div>
      </section>

      <div
        role="tablist"
        aria-label="Gerenciamento de usuários"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px"
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={abaAtual === "contas"}
          style={estiloAba("contas")}
          onClick={() => setAbaAtual("contas")}
        >
          Contas cadastradas
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtual === "funcionarios"}
          style={estiloAba("funcionarios")}
          onClick={() => setAbaAtual("funcionarios")}
        >
          Funcionários
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={abaAtual === "tutores"}
          style={estiloAba("tutores")}
          onClick={() => setAbaAtual("tutores")}
        >
          Tutores
        </button>
      </div>

      {abaAtual === "contas" && (
        <section className="faculdade-section">
          <h2>Contas cadastradas</h2>

          {usuarios.length === 0 ? (
            <p>Nenhuma conta encontrada.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left"
                }}
              >
                <thead>
                  <tr>
                    <th style={{ padding: "12px" }}>Nome</th>
                    <th style={{ padding: "12px" }}>E-mail</th>
                    <th style={{ padding: "12px" }}>Perfil</th>
                    <th style={{ padding: "12px" }}>Situação</th>
                    <th style={{ padding: "12px" }}>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td style={{ padding: "12px" }}>
                        {usuario.nome}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {usuario.email}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {obterNomePerfil(usuario)}
                      </td>

                      <td
                        style={{
                          padding: "12px",
                          color: usuario.ativo
                            ? "#15803d"
                            : "#b45309",
                          fontWeight: 600
                        }}
                      >
                        {obterSituacao(usuario)}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {usuario.id === usuarioAtualId ? (
                          "Sua conta"
                        ) : usuario.administrador_principal ? (
                          "Conta protegida"
                        ) : !usuario.ativo &&
                          usuario.perfil !== "Tutor" &&
                          !usuario.primeira_ativacao_concluida ? (
                          "Ativação por código"
                        ) : podeAlterarSituacao(usuario) ? (
                          <button
                            type="button"
                            onClick={() =>
                              void alterarSituacao(usuario)
                            }
                            disabled={processando || atualizando}
                          >
                            {usuario.ativo
                              ? "Desativar"
                              : "Reativar"}
                          </button>
                        ) : (
                          "Sem permissão"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {abaAtual === "funcionarios" && (
        <>
          <GerenciamentoEquipe
            aoCadastrar={async () => {
              await carregarDados();
            }}
          />
        </>
      )}

      {abaAtual === "tutores" && (
        <>
          <section className="faculdade-section">
            <h2>Autorizar acesso de tutor</h2>

            <p>
              Antes de vincular uma conta, confirme a identidade
              da pessoa e sua relação com o cadastro existente.
              Não utilize apenas a coincidência de nomes ou
              e-mails como comprovação.
            </p>

            <div
              style={{
                display: "grid",
                gap: "16px",
                marginTop: "20px"
              }}
            >
              <label>
                Conta que solicitou acesso

                <select
                  value={usuarioSelecionado}
                  onChange={(evento) =>
                    setUsuarioSelecionado(evento.target.value)
                  }
                  disabled={processando}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    marginTop: "8px"
                  }}
                >
                  <option value="">
                    Selecione uma conta
                  </option>

                  {usuariosDisponiveis.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome} — {usuario.email}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Cadastro de tutor existente

                <select
                  value={tutorSelecionado}
                  onChange={(evento) =>
                    setTutorSelecionado(evento.target.value)
                  }
                  disabled={processando}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "12px",
                    marginTop: "8px"
                  }}
                >
                  <option value="">
                    Selecione um tutor
                  </option>

                  {tutoresDisponiveis.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.nome} — {tutor.email || "Sem e-mail"}
                    </option>
                  ))}
                </select>
              </label>

              <div className="faculdade-acoes">
                <button
                  type="button"
                  onClick={() => void vincularTutor()}
                  disabled={
                    processando ||
                    !usuarioSelecionado ||
                    !tutorSelecionado
                  }
                >
                  {processando
                    ? "Processando..."
                    : "Confirmar vínculo"}
                </button>
              </div>
            </div>
          </section>

          <section className="faculdade-section">
            <h2>Vínculos existentes</h2>

            {tutores.length === 0 ? (
              <p>Nenhum tutor cadastrado.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left"
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ padding: "12px" }}>Tutor</th>
                      <th style={{ padding: "12px" }}>Conta vinculada</th>
                      <th style={{ padding: "12px" }}>Ação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {tutores.map((tutor) => {
                      const usuarioVinculado =
                        obterUsuarioVinculado(tutor.id);

                      return (
                        <tr key={tutor.id}>
                          <td style={{ padding: "12px" }}>
                            {tutor.nome}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {usuarioVinculado
                              ? usuarioVinculado.email
                              : "Sem conta vinculada"}
                          </td>

                          <td style={{ padding: "12px" }}>
                            {usuarioVinculado ? (
                              <button
                                type="button"
                                onClick={() =>
                                  void desvincularTutor(tutor)
                                }
                                disabled={processando}
                              >
                                Remover vínculo
                              </button>
                            ) : (
                              "Aguardando"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}