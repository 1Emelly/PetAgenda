import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "../styles/clinica.css";

type Atendimento = {
  id: number;
  consultaId: number;
  diagnostico: string | null;
  procedimentos: string | null;
  observacoes: string | null;
  orientacoes: string | null;
  dataAtendimento: string;
};

type Consulta = {
  id: number;
  animalId: number;
  veterinarioId: number;
  dataHora: string;
  motivo: string;
  status: string;
};

type Animal = {
  id: number;
  nome: string;
};

type Props = {
  aoAtualizar?: () => void;
};

type Formulario = {
  consultaId: string;
  diagnostico: string;
  procedimentos: string;
  observacoes: string;
  orientacoes: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

const formularioInicial: Formulario = {
  consultaId: "",
  diagnostico: "",
  procedimentos: "",
  observacoes: "",
  orientacoes: ""
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
    const erro =
      conteudo && typeof conteudo === "object"
        ? (conteudo as {
            mensagem?: string;
            erros?: Array<{ mensagem: string }>;
          })
        : null;

    throw new Error(
      erro?.erros?.map((item) => item.mensagem).join(" ") ||
        erro?.mensagem ||
        "Não foi possível concluir a operação."
    );
  }

  return conteudo;
}

function formatarData(valor: string): string {
  const data = new Date(valor);

  return Number.isNaN(data.getTime())
    ? "Data indisponível"
    : data.toLocaleString("pt-BR");
}

function Atendimentos({ aoAtualizar }: Props) {
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);

  const [formulario, setFormulario] =
    useState<Formulario>(formularioInicial);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const [listaAtendimentos, listaConsultas, listaAnimais] =
        await Promise.all([
          requisicao("/api/atendimentos"),
          requisicao("/api/consultas"),
          requisicao("/api/animais")
        ]);

      if (
        !Array.isArray(listaAtendimentos) ||
        !Array.isArray(listaConsultas) ||
        !Array.isArray(listaAnimais)
      ) {
        throw new Error("A API retornou dados em formato inesperado.");
      }

      setAtendimentos(listaAtendimentos as Atendimento[]);
      setConsultas(listaConsultas as Consulta[]);
      setAnimais(listaAnimais as Animal[]);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar os atendimentos."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  function atualizarCampo(
    campo: keyof Formulario,
    valor: string
  ) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor
    }));
  }

  function limparFormulario() {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setFormularioAberto(false);
  }

  function iniciarEdicao(atendimento: Atendimento) {
    setFormulario({
      consultaId: String(atendimento.consultaId),
      diagnostico: atendimento.diagnostico ?? "",
      procedimentos: atendimento.procedimentos ?? "",
      observacoes: atendimento.observacoes ?? "",
      orientacoes: atendimento.orientacoes ?? ""
    });

    setEditandoId(atendimento.id);
    setFormularioAberto(true);
    setErro("");
    setSucesso("");
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      if (formulario.diagnostico.trim().length < 3) {
        throw new Error(
          "O diagnóstico deve ter pelo menos 3 caracteres."
        );
      }

      const dados = {
        diagnostico: formulario.diagnostico.trim(),
        procedimentos: formulario.procedimentos.trim(),
        observacoes: formulario.observacoes.trim(),
        orientacoes: formulario.orientacoes.trim()
      };

      if (editandoId === null) {
        if (!formulario.consultaId) {
          throw new Error("Selecione uma consulta.");
        }

        await requisicao("/api/atendimentos", "POST", {
          consultaId: Number(formulario.consultaId),
          ...dados
        });
      } else {
        await requisicao(
          `/api/atendimentos/${editandoId}`,
          "PUT",
          dados
        );
      }

      limparFormulario();
      await carregarDados();

      setSucesso(
        editandoId === null
          ? "Atendimento registrado com sucesso!"
          : "Atendimento atualizado com sucesso!"
      );

      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o atendimento."
      );
    } finally {
      setSalvando(false);
    }
  }

  const consultasDisponiveis = consultas.filter(
    (consulta) =>
      (consulta.status === "Em atendimento" ||
        consulta.status === "Concluída") &&
      !atendimentos.some(
        (atendimento) =>
          atendimento.consultaId === consulta.id
      )
  );

  const atendimentosFiltrados = atendimentos.filter(
    (atendimento) => {
      const consulta = consultas.find(
        (item) => item.id === atendimento.consultaId
      );

      const animal = animais.find(
        (item) => item.id === consulta?.animalId
      );

      const texto = [
        atendimento.diagnostico,
        atendimento.procedimentos,
        atendimento.observacoes,
        atendimento.orientacoes,
        animal?.nome,
        String(atendimento.consultaId)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return texto.includes(busca.trim().toLowerCase());
    }
  );

  return (
    <section className="clinica-modulo">
      <div className="clinica-topo">
        <div>
          <h2>Atendimentos veterinários</h2>
          <p>
            Registre diagnósticos, procedimentos e orientações
            dos atendimentos realizados.
          </p>
        </div>

        <button
          type="button"
          className="clinica-botao-principal"
          onClick={() => {
            limparFormulario();
            setFormularioAberto(true);
            setErro("");
            setSucesso("");
          }}
        >
          + Novo atendimento
        </button>
      </div>

      <div className="clinica-indicadores">
        <article>
          <span>Atendimentos registrados</span>
          <strong>{atendimentos.length}</strong>
        </article>

        <article>
          <span>Consultas disponíveis</span>
          <strong>{consultasDisponiveis.length}</strong>
        </article>
      </div>

      {erro && (
        <div className="clinica-alerta erro" role="alert">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="clinica-alerta sucesso" role="status">
          {sucesso}
        </div>
      )}

      {formularioAberto && (
        <form
          className="clinica-formulario"
          onSubmit={(evento) => void salvar(evento)}
        >
          <div className="clinica-formulario-topo">
            <h3>
              {editandoId === null
                ? "Registrar atendimento"
                : "Editar atendimento"}
            </h3>

            <button
              type="button"
              className="clinica-botao-secundario"
              onClick={limparFormulario}
            >
              Fechar
            </button>
          </div>

          <div className="clinica-campos">
            <label>
              Consulta *
              <select
                value={formulario.consultaId}
                onChange={(evento) =>
                  atualizarCampo(
                    "consultaId",
                    evento.target.value
                  )
                }
                disabled={editandoId !== null}
                required
              >
                <option value="">Selecione uma consulta</option>

                {editandoId !== null && (
                  <option value={formulario.consultaId}>
                    Consulta #{formulario.consultaId}
                  </option>
                )}

                {editandoId === null &&
                  consultasDisponiveis.map((consulta) => {
                    const animal = animais.find(
                      (item) => item.id === consulta.animalId
                    );

                    return (
                      <option
                        key={consulta.id}
                        value={consulta.id}
                      >
                        Consulta #{consulta.id} —{" "}
                        {animal?.nome ?? "Animal"} —{" "}
                        {formatarData(consulta.dataHora)}
                      </option>
                    );
                  })}
              </select>
            </label>

            <label className="clinica-campo-largo">
              Diagnóstico *
              <textarea
                value={formulario.diagnostico}
                onChange={(evento) =>
                  atualizarCampo(
                    "diagnostico",
                    evento.target.value
                  )
                }
                rows={3}
                minLength={3}
                required
              />
            </label>

            <label className="clinica-campo-largo">
              Procedimentos realizados
              <textarea
                value={formulario.procedimentos}
                onChange={(evento) =>
                  atualizarCampo(
                    "procedimentos",
                    evento.target.value
                  )
                }
                rows={3}
              />
            </label>

            <label className="clinica-campo-largo">
              Observações
              <textarea
                value={formulario.observacoes}
                onChange={(evento) =>
                  atualizarCampo(
                    "observacoes",
                    evento.target.value
                  )
                }
                rows={3}
              />
            </label>

            <label className="clinica-campo-largo">
              Orientações
              <textarea
                value={formulario.orientacoes}
                onChange={(evento) =>
                  atualizarCampo(
                    "orientacoes",
                    evento.target.value
                  )
                }
                rows={3}
              />
            </label>
          </div>

          <div className="clinica-formulario-acoes">
            <button
              type="submit"
              className="clinica-botao-principal"
              disabled={
                salvando ||
                (editandoId === null &&
                  consultasDisponiveis.length === 0)
              }
            >
              {salvando ? "Salvando..." : "Salvar atendimento"}
            </button>
          </div>
        </form>
      )}

      <div className="clinica-listagem">
        <div className="clinica-listagem-topo">
          <h3>Histórico de atendimentos</h3>

          <input
            type="search"
            placeholder="Buscar atendimento..."
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
          />
        </div>

        {carregando ? (
          <p className="clinica-vazio">
            Carregando atendimentos...
          </p>
        ) : atendimentosFiltrados.length === 0 ? (
          <p className="clinica-vazio">
            Nenhum atendimento encontrado.
          </p>
        ) : (
          <div className="clinica-tabela-container">
            <table className="clinica-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Consulta</th>
                  <th>Animal</th>
                  <th>Diagnóstico</th>
                  <th>Procedimentos</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {atendimentosFiltrados.map((atendimento) => {
                  const consulta = consultas.find(
                    (item) =>
                      item.id === atendimento.consultaId
                  );

                  const animal = animais.find(
                    (item) =>
                      item.id === consulta?.animalId
                  );

                  return (
                    <tr key={atendimento.id}>
                      <td>
                        {formatarData(
                          atendimento.dataAtendimento
                        )}
                      </td>

                      <td>#{atendimento.consultaId}</td>

                      <td>
                        {animal?.nome ??
                          `Animal #${consulta?.animalId ?? "?"}`}
                      </td>

                      <td>
                        {atendimento.diagnostico || "—"}
                      </td>

                      <td>
                        {atendimento.procedimentos || "—"}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="clinica-botao-secundario"
                          onClick={() =>
                            iniciarEdicao(atendimento)
                          }
                        >
                          Editar
                        </button>
                      </td>
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

export default Atendimentos;