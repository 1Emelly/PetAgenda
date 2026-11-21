import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "../styles/cadastros.css";

type TipoCadastro = "Tutores" | "Animais" | "Veterinários";

type Tutor = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
};

type Animal = {
  id: number;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  tutorId: number;
  tutor?: {
    id: number;
    nome: string;
  } | null;
};

type Veterinario = {
  id: number;
  nome: string;
  crmv: string;
  telefone: string;
  email: string;
};

type Registro = Tutor | Animal | Veterinario;

type Formulario = {
  nome: string;
  telefone: string;
  email: string;
  especie: string;
  raca: string;
  idade: string;
  tutorId: string;
  crmv: string;
};

type Props = {
  tipo: TipoCadastro;
  perfil: string;
  aoAtualizar?: () => void;
};

const formularioInicial: Formulario = {
  nome: "",
  telefone: "",
  email: "",
  especie: "",
  raca: "",
  idade: "",
  tutorId: "",
  crmv: ""
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

const caminhos: Record<TipoCadastro, string> = {
  Tutores: "/api/tutores",
  Animais: "/api/animais",
  Veterinários: "/api/veterinarios"
};

async function requisicao(
  caminho: string,
  metodo = "GET",
  dados?: object
): Promise<unknown> {
  const token = sessionStorage.getItem("petagenda_token");

  if (!token) {
    throw new Error("Sessão expirada. Entre novamente.");
  }

  const resposta = await fetch(`${API_URL}${caminho}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(dados ? { "Content-Type": "application/json" } : {})
    },
    ...(dados ? { body: JSON.stringify(dados) } : {})
  });

  const conteudo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (conteudo && typeof conteudo === "object") {
      const respostaErro = conteudo as {
        mensagem?: string;
        erros?: Array<{ mensagem: string }>;
      };

      const detalhes = respostaErro.erros
        ?.map((erro) => erro.mensagem)
        .join(" ");

      throw new Error(
        detalhes ||
          respostaErro.mensagem ||
          "Não foi possível concluir a operação."
      );
    }

    throw new Error("Não foi possível concluir a operação.");
  }

  return conteudo;
}

function Cadastros({ tipo, perfil, aoAtualizar }: Props) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");

  const podeEditar =
    perfil === "Administrador" || perfil === "Secretario";

  const podeCadastrar =
    tipo === "Veterinários"
      ? perfil === "Administrador"
      : podeEditar;

  const podeExcluir =
    tipo === "Tutores" || tipo === "Veterinários"
      ? perfil === "Administrador"
      : podeEditar;

  const caminho = caminhos[tipo];

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const resultado = await requisicao(caminho);

      if (!Array.isArray(resultado)) {
        throw new Error("A API retornou uma lista inválida.");
      }

      setRegistros(resultado as Registro[]);

      if (tipo === "Animais" && podeEditar) {
        const resultadoTutores = await requisicao("/api/tutores");

        if (!Array.isArray(resultadoTutores)) {
          throw new Error("Não foi possível carregar os tutores.");
        }

        setTutores(resultadoTutores as Tutor[]);
      }
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Erro ao carregar os cadastros."
      );
    } finally {
      setCarregando(false);
    }
  }, [caminho, tipo, podeEditar]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  function alterarCampo(campo: keyof Formulario, valor: string) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor
    }));
  }

  function novoCadastro() {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setErro("");
    setSucesso("");
    setFormularioAberto(true);
  }

  function editarRegistro(registro: Registro) {
    if (!podeCadastrar) {
      return;
    }

    const dados = registro as unknown as Record<string, unknown>;

    setFormulario({
      nome: String(dados.nome ?? ""),
      telefone: String(dados.telefone ?? ""),
      email: String(dados.email ?? ""),
      especie: String(dados.especie ?? ""),
      raca: String(dados.raca ?? ""),
      idade: String(dados.idade ?? ""),
      tutorId: String(dados.tutorId ?? ""),
      crmv: String(dados.crmv ?? "")
    });

    setEditandoId(registro.id);
    setErro("");
    setSucesso("");
    setFormularioAberto(true);
  }

  function fecharFormulario() {
    setFormularioAberto(false);
    setEditandoId(null);
    setFormulario(formularioInicial);
  }

  async function salvarRegistro(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!podeCadastrar) {
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      let dados: object;

      if (tipo === "Tutores") {
        dados = {
          nome: formulario.nome.trim(),
          telefone: formulario.telefone.trim(),
          email: formulario.email.trim()
        };
      } else if (tipo === "Veterinários") {
        dados = {
          nome: formulario.nome.trim(),
          crmv: formulario.crmv.trim(),
          telefone: formulario.telefone.trim(),
          email: formulario.email.trim()
        };
      } else {
        dados = {
          nome: formulario.nome.trim(),
          especie: formulario.especie.trim(),
          raca: formulario.raca.trim(),
          idade: Number(formulario.idade),
          tutorId: Number(formulario.tutorId)
        };
      }

      const editando = editandoId !== null;

      await requisicao(
        editando ? `${caminho}/${editandoId}` : caminho,
        editando ? "PUT" : "POST",
        dados
      );

      fecharFormulario();

      await carregarDados();

      setSucesso(
        editando
          ? "Cadastro atualizado com sucesso!"
          : "Cadastro realizado com sucesso!"
      );

      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o cadastro."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRegistro(registro: Registro) {
    if (!podeExcluir) {
      return;
    }

    const confirmado = window.confirm(
      `Deseja realmente excluir "${registro.nome}"?`
    );

    if (!confirmado) {
      return;
    }

    setErro("");
    setSucesso("");

    try {
      await requisicao(`${caminho}/${registro.id}`, "DELETE");

      await carregarDados();

      setSucesso("Cadastro excluído com sucesso!");
      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível excluir o cadastro."
      );
    }
  }

  const registrosFiltrados = registros.filter((registro) => {
    const texto = JSON.stringify(registro).toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  return (
    <section className="cadastros">
      <div className="cadastros-topo">
        <div>
          <h2>Gerenciar {tipo.toLowerCase()}</h2>
          <p>
            Consulte e organize os registros da clínica veterinária.
          </p>
        </div>

        {podeCadastrar && (
          <button
            type="button"
            className="cadastros-botao-principal"
            onClick={novoCadastro}
          >
            + Novo cadastro
          </button>
        )}
      </div>

      {erro && (
        <div className="cadastros-alerta erro" role="alert">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="cadastros-alerta sucesso" role="status">
          {sucesso}
        </div>
      )}

      {formularioAberto && podeCadastrar && (
        <form
          className="cadastros-formulario"
          onSubmit={(evento) => void salvarRegistro(evento)}
        >
          <div className="cadastros-formulario-topo">
            <h3>
              {editandoId !== null
                ? `Editar ${tipo.toLowerCase()}`
                : `Cadastrar ${tipo.toLowerCase()}`}
            </h3>

            <button
              type="button"
              onClick={fecharFormulario}
              className="cadastros-botao-secundario"
            >
              Cancelar
            </button>
          </div>

          <div className="cadastros-campos">
            <label>
              Nome *
              <input
                type="text"
                value={formulario.nome}
                onChange={(evento) =>
                  alterarCampo("nome", evento.target.value)
                }
                required
              />
            </label>

            {tipo === "Animais" ? (
              <>
                <label>
                  Espécie *
                  <input
                    type="text"
                    placeholder="Ex.: Cachorro"
                    value={formulario.especie}
                    onChange={(evento) =>
                      alterarCampo("especie", evento.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Raça *
                  <input
                    type="text"
                    value={formulario.raca}
                    onChange={(evento) =>
                      alterarCampo("raca", evento.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Idade *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formulario.idade}
                    onChange={(evento) =>
                      alterarCampo("idade", evento.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Tutor responsável *
                  <select
                    value={formulario.tutorId}
                    onChange={(evento) =>
                      alterarCampo("tutorId", evento.target.value)
                    }
                    required
                  >
                    <option value="">Selecione um tutor</option>

                    {tutores.map((tutor) => (
                      <option key={tutor.id} value={tutor.id}>
                        {tutor.nome}
                      </option>
                    ))}
                  </select>
                </label>

                {tutores.length === 0 && (
                  <p className="cadastros-aviso">
                    Cadastre um tutor antes de cadastrar um animal.
                  </p>
                )}
              </>
            ) : (
              <>
                {tipo === "Veterinários" && (
                  <label>
                    CRMV *
                    <input
                      type="text"
                      value={formulario.crmv}
                      onChange={(evento) =>
                        alterarCampo("crmv", evento.target.value)
                      }
                      required
                    />
                  </label>
                )}

                <label>
                  Telefone *
                  <input
                    type="tel"
                    minLength={8}
                    value={formulario.telefone}
                    onChange={(evento) =>
                      alterarCampo("telefone", evento.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  E-mail *
                  <input
                    type="email"
                    value={formulario.email}
                    onChange={(evento) =>
                      alterarCampo("email", evento.target.value)
                    }
                    required
                  />
                </label>
              </>
            )}
          </div>

          <div className="cadastros-formulario-acoes">
            <button
              type="submit"
              className="cadastros-botao-principal"
              disabled={
                salvando ||
                (tipo === "Animais" && tutores.length === 0)
              }
            >
              {salvando ? "Salvando..." : "Salvar cadastro"}
            </button>
          </div>
        </form>
      )}

      <div className="cadastros-listagem">
        <div className="cadastros-listagem-topo">
          <h3>Registros cadastrados</h3>

          <input
            type="search"
            placeholder="Buscar cadastro..."
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
          />
        </div>

        {carregando ? (
          <p className="cadastros-vazio">Carregando registros...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p className="cadastros-vazio">
            Nenhum registro encontrado.
          </p>
        ) : (
          <div className="cadastros-tabela-container">
            <table className="cadastros-tabela">
              <thead>
                <tr>
                  <th>Nome</th>

                  {tipo === "Animais" ? (
                    <>
                      <th>Espécie</th>
                      <th>Raça</th>
                      <th>Idade</th>
                      <th>Tutor</th>
                    </>
                  ) : (
                    <>
                      {tipo === "Veterinários" && <th>CRMV</th>}
                      <th>Telefone</th>
                      <th>E-mail</th>
                    </>
                  )}

                  {(podeCadastrar || podeExcluir) && (
                    <th>Ações</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {registrosFiltrados.map((registro) => {
                  const dados = registro as unknown as Record<
                    string,
                    unknown
                  >;

                  const tutor = dados.tutor as
                    | { nome?: string }
                    | null
                    | undefined;

                  return (
                    <tr key={registro.id}>
                      <td>{registro.nome}</td>

                      {tipo === "Animais" ? (
                        <>
                          <td>{String(dados.especie ?? "")}</td>
                          <td>{String(dados.raca ?? "")}</td>
                          <td>{String(dados.idade ?? "")}</td>
                          <td>
                            {tutor?.nome ||
                              tutores.find(
                                (item) =>
                                  item.id === Number(dados.tutorId)
                              )?.nome ||
                              "Não informado"}
                          </td>
                        </>
                      ) : (
                        <>
                          {tipo === "Veterinários" && (
                            <td>{String(dados.crmv ?? "")}</td>
                          )}

                          <td>{String(dados.telefone ?? "")}</td>
                          <td>{String(dados.email ?? "")}</td>
                        </>
                      )}

                      {(podeCadastrar || podeExcluir) && (
                        <td>
                          <div className="cadastros-acoes">
                            {podeCadastrar && (
                              <button
                                type="button"
                                onClick={() => editarRegistro(registro)}
                              >
                                Editar
                              </button>
                            )}

                            {podeExcluir && (
                              <button
                                type="button"
                                className="excluir"
                                onClick={() =>
                                  void excluirRegistro(registro)
                                }
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Cadastros;