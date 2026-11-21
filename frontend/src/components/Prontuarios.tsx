import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "../styles/clinica.css";

type Prontuario = {
  id: number;
  animalId: number;
  atendimentoId: number;
  descricao: string | null;
  criadoEm: string;
};

type Atendimento = {
  id: number;
  consultaId: number;
  diagnostico: string | null;
};

type Consulta = {
  id: number;
  animalId: number;
};

type Animal = {
  id: number;
  nome: string;
  especie: string;
};

type Props = {
  aoAtualizar?: () => void;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

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

function Prontuarios({ aoAtualizar }: Props) {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);

  const [atendimentoId, setAtendimentoId] = useState("");
  const [descricao, setDescricao] = useState("");

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
      const [
        listaProntuarios,
        listaAtendimentos,
        listaConsultas,
        listaAnimais
      ] = await Promise.all([
        requisicao("/api/prontuarios"),
        requisicao("/api/atendimentos"),
        requisicao("/api/consultas"),
        requisicao("/api/animais")
      ]);

      if (
        !Array.isArray(listaProntuarios) ||
        !Array.isArray(listaAtendimentos) ||
        !Array.isArray(listaConsultas) ||
        !Array.isArray(listaAnimais)
      ) {
        throw new Error("A API retornou dados em formato inesperado.");
      }

      setProntuarios(listaProntuarios as Prontuario[]);
      setAtendimentos(listaAtendimentos as Atendimento[]);
      setConsultas(listaConsultas as Consulta[]);
      setAnimais(listaAnimais as Animal[]);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar os prontuários."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  function obterAnimalDoAtendimento(
    atendimento: Atendimento
  ): Animal | undefined {
    const consulta = consultas.find(
      (item) => item.id === atendimento.consultaId
    );

    return animais.find(
      (item) => item.id === consulta?.animalId
    );
  }

  function limparFormulario() {
    setAtendimentoId("");
    setDescricao("");
    setEditandoId(null);
    setFormularioAberto(false);
  }

  function iniciarEdicao(prontuario: Prontuario) {
    setAtendimentoId(String(prontuario.atendimentoId));
    setDescricao(prontuario.descricao ?? "");
    setEditandoId(prontuario.id);
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
      if (descricao.trim().length < 3) {
        throw new Error(
          "A descrição deve ter pelo menos 3 caracteres."
        );
      }

      if (editandoId === null) {
        const atendimento = atendimentos.find(
          (item) => item.id === Number(atendimentoId)
        );

        if (!atendimento) {
          throw new Error("Selecione um atendimento válido.");
        }

        const animal = obterAnimalDoAtendimento(atendimento);

        if (!animal) {
          throw new Error(
            "Não foi possível identificar o animal do atendimento."
          );
        }

        await requisicao("/api/prontuarios", "POST", {
          animalId: animal.id,
          atendimentoId: atendimento.id,
          descricao: descricao.trim()
        });
      } else {
        await requisicao(
          `/api/prontuarios/${editandoId}`,
          "PUT",
          {
            descricao: descricao.trim()
          }
        );
      }

      limparFormulario();
      await carregarDados();

      setSucesso(
        editandoId === null
          ? "Prontuário registrado com sucesso!"
          : "Prontuário atualizado com sucesso!"
      );

      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível salvar o prontuário."
      );
    } finally {
      setSalvando(false);
    }
  }

  const atendimentosDisponiveis = atendimentos.filter(
    (atendimento) =>
      !prontuarios.some(
        (prontuario) =>
          prontuario.atendimentoId === atendimento.id
      )
  );

  const prontuariosFiltrados = prontuarios.filter(
    (prontuario) => {
      const animal = animais.find(
        (item) => item.id === prontuario.animalId
      );

      const texto = [
        prontuario.descricao,
        animal?.nome,
        animal?.especie,
        String(prontuario.atendimentoId)
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
          <h2>Prontuários veterinários</h2>
          <p>
            Registre informações clínicas e consulte o histórico
            dos animais atendidos.
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
          + Novo prontuário
        </button>
      </div>

      <div className="clinica-indicadores">
        <article>
          <span>Prontuários registrados</span>
          <strong>{prontuarios.length}</strong>
        </article>

        <article>
          <span>Atendimentos sem prontuário</span>
          <strong>{atendimentosDisponiveis.length}</strong>
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
                ? "Registrar prontuário"
                : "Editar prontuário"}
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
              Atendimento *
              <select
                value={atendimentoId}
                onChange={(evento) =>
                  setAtendimentoId(evento.target.value)
                }
                disabled={editandoId !== null}
                required
              >
                <option value="">
                  Selecione um atendimento
                </option>

                {editandoId !== null && (
                  <option value={atendimentoId}>
                    Atendimento #{atendimentoId}
                  </option>
                )}

                {editandoId === null &&
                  atendimentosDisponiveis.map(
                    (atendimento) => {
                      const animal =
                        obterAnimalDoAtendimento(atendimento);

                      return (
                        <option
                          key={atendimento.id}
                          value={atendimento.id}
                        >
                          Atendimento #{atendimento.id} —{" "}
                          {animal?.nome ?? "Animal"}
                        </option>
                      );
                    }
                  )}
              </select>
            </label>

            <label className="clinica-campo-largo">
              Descrição clínica *
              <textarea
                value={descricao}
                onChange={(evento) =>
                  setDescricao(evento.target.value)
                }
                placeholder="Descreva o histórico clínico, evolução e informações relevantes."
                rows={6}
                minLength={3}
                required
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
                  atendimentosDisponiveis.length === 0)
              }
            >
              {salvando ? "Salvando..." : "Salvar prontuário"}
            </button>
          </div>
        </form>
      )}

      <div className="clinica-listagem">
        <div className="clinica-listagem-topo">
          <h3>Histórico clínico</h3>

          <input
            type="search"
            placeholder="Buscar prontuário..."
            value={busca}
            onChange={(evento) =>
              setBusca(evento.target.value)
            }
          />
        </div>

        {carregando ? (
          <p className="clinica-vazio">
            Carregando prontuários...
          </p>
        ) : prontuariosFiltrados.length === 0 ? (
          <p className="clinica-vazio">
            Nenhum prontuário encontrado.
          </p>
        ) : (
          <div className="clinica-tabela-container">
            <table className="clinica-tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Animal</th>
                  <th>Atendimento</th>
                  <th>Descrição clínica</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {prontuariosFiltrados.map((prontuario) => {
                  const animal = animais.find(
                    (item) =>
                      item.id === prontuario.animalId
                  );

                  return (
                    <tr key={prontuario.id}>
                      <td>
                        {formatarData(prontuario.criadoEm)}
                      </td>

                      <td>
                        {animal?.nome ??
                          `Animal #${prontuario.animalId}`}
                      </td>

                      <td>#{prontuario.atendimentoId}</td>

                      <td>
                        {prontuario.descricao || "—"}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="clinica-botao-secundario"
                          onClick={() =>
                            iniciarEdicao(prontuario)
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

export default Prontuarios;