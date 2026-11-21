import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import "../styles/consultas.css";

type StatusConsulta =
  | "Agendada"
  | "Confirmada"
  | "Em atendimento"
  | "Concluída"
  | "Cancelada";

type Consulta = {
  id: number;
  animalId: number;
  veterinarioId: number;
  dataHora: string;
  motivo: string;
  status: StatusConsulta;
};

type Animal = {
  id: number;
  nome: string;
  especie: string;
};

type Veterinario = {
  id: number;
  nome: string;
  crmv: string;
};

type Props = {
  perfil: string;
  modo?: "Agenda" | "Consultas";
  aoAtualizar?: () => void;
};

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

const transicoes: Record<StatusConsulta, StatusConsulta[]> = {
  Agendada: ["Confirmada", "Cancelada"],
  Confirmada: ["Em atendimento", "Cancelada"],
  "Em atendimento": ["Concluída"],
  Concluída: [],
  Cancelada: []
};

function dataLocalParaISO(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    throw new Error("Informe uma data e um horário válidos.");
  }

  return data.toISOString();
}

function isoParaCampoLocal(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

function formatarData(valor: string): string {
  const data = new Date(valor);

  if (Number.isNaN(data.getTime())) {
    return "Data inválida";
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

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
      const erro = conteudo as {
        mensagem?: string;
        erros?: Array<{ mensagem: string }>;
      };

      const detalhes = erro.erros
        ?.map((item) => item.mensagem)
        .join(" ");

      throw new Error(
        detalhes ||
          erro.mensagem ||
          "Não foi possível concluir a operação."
      );
    }

    throw new Error("Não foi possível concluir a operação.");
  }

  return conteudo;
}

function Consultas({
  perfil,
  modo = "Consultas",
  aoAtualizar
}: Props) {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [veterinarios, setVeterinarios] = useState<Veterinario[]>([]);

  const [animalId, setAnimalId] = useState("");
  const [veterinarioId, setVeterinarioId] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [motivo, setMotivo] = useState("");

  const [reagendandoId, setReagendandoId] = useState<number | null>(null);
  const [novaDataHora, setNovaDataHora] = useState("");

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroData, setFiltroData] = useState("");

  const podeAgendar =
    perfil === "Administrador" || perfil === "Secretario";

  const podeAlterarStatus =
    perfil === "Administrador" ||
    perfil === "Secretario" ||
    perfil === "Veterinario";

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const [dadosConsultas, dadosAnimais, dadosVeterinarios] =
        await Promise.all([
          requisicao("/api/consultas"),
          requisicao("/api/animais"),
          requisicao("/api/veterinarios")
        ]);

      if (
        !Array.isArray(dadosConsultas) ||
        !Array.isArray(dadosAnimais) ||
        !Array.isArray(dadosVeterinarios)
      ) {
        throw new Error("A API retornou dados em formato inesperado.");
      }

      setConsultas(dadosConsultas as Consulta[]);
      setAnimais(dadosAnimais as Animal[]);
      setVeterinarios(dadosVeterinarios as Veterinario[]);
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível carregar as consultas."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  function limparFormulario() {
    setAnimalId("");
    setVeterinarioId("");
    setDataHora("");
    setMotivo("");
    setFormularioAberto(false);
  }

  async function agendar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!podeAgendar) {
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      if (!animalId || !veterinarioId || !dataHora) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }

      if (motivo.trim().length < 3) {
        throw new Error("O motivo deve ter pelo menos 3 caracteres.");
      }

      await requisicao("/api/consultas", "POST", {
        animalId: Number(animalId),
        veterinarioId: Number(veterinarioId),
        dataHora: dataLocalParaISO(dataHora),
        motivo: motivo.trim()
      });

      limparFormulario();
      await carregarDados();
      setSucesso("Consulta agendada com sucesso!");
      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível agendar a consulta."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function reagendar(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!podeAgendar || reagendandoId === null) {
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      await requisicao(
        `/api/consultas/${reagendandoId}/reagendar`,
        "PUT",
        {
          dataHora: dataLocalParaISO(novaDataHora)
        }
      );

      setReagendandoId(null);
      setNovaDataHora("");
      await carregarDados();

      setSucesso("Consulta reagendada com sucesso!");
      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível reagendar a consulta."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function alterarStatus(
    consulta: Consulta,
    novoStatus: StatusConsulta
  ) {
    if (!podeAlterarStatus) {
      return;
    }

    setErro("");
    setSucesso("");

    try {
      await requisicao(
        `/api/consultas/${consulta.id}/status`,
        "PATCH",
        { status: novoStatus }
      );

      await carregarDados();
      setSucesso("Status atualizado com sucesso!");
      aoAtualizar?.();
    } catch (falha) {
      setErro(
        falha instanceof Error
          ? falha.message
          : "Não foi possível atualizar o status."
      );
    }
  }

  const consultasFiltradas = consultas
    .filter((consulta) => {
      const animal = animais.find(
        (item) => item.id === consulta.animalId
      );

      const veterinario = veterinarios.find(
        (item) => item.id === consulta.veterinarioId
      );

      const texto = [
        consulta.motivo,
        consulta.status,
        animal?.nome ?? "",
        veterinario?.nome ?? ""
      ]
        .join(" ")
        .toLowerCase();

      const correspondeBusca = texto.includes(
        busca.trim().toLowerCase()
      );

      const correspondeStatus =
        filtroStatus === "Todos" ||
        consulta.status === filtroStatus;

      const correspondeData =
        !filtroData ||
        isoParaCampoLocal(consulta.dataHora).slice(0, 10) ===
          filtroData;

      return (
        correspondeBusca &&
        correspondeStatus &&
        correspondeData
      );
    })
    .sort(
      (primeira, segunda) =>
        new Date(primeira.dataHora).getTime() -
        new Date(segunda.dataHora).getTime()
    );

  const totalAgendadas = consultas.filter(
    (consulta) => consulta.status === "Agendada"
  ).length;

  const totalConfirmadas = consultas.filter(
    (consulta) => consulta.status === "Confirmada"
  ).length;

  const totalEmAtendimento = consultas.filter(
    (consulta) => consulta.status === "Em atendimento"
  ).length;

  const totalConcluidas = consultas.filter(
    (consulta) => consulta.status === "Concluída"
  ).length;

  return (
    <section className="consultas-modulo">
      <div className="consultas-topo">
        <div>
          <h2>
            {modo === "Agenda"
              ? "Agenda de atendimentos"
              : "Gerenciar consultas"}
          </h2>

          <p>
            Acompanhe os agendamentos e os atendimentos da clínica.
          </p>
        </div>

        {podeAgendar && (
          <button
            type="button"
            className="consultas-botao-principal"
            onClick={() => {
              setErro("");
              setSucesso("");
              setFormularioAberto(true);
            }}
          >
            + Nova consulta
          </button>
        )}
      </div>

      <div className="consultas-indicadores">
        <article>
          <span>Agendadas</span>
          <strong>{totalAgendadas}</strong>
        </article>

        <article>
          <span>Confirmadas</span>
          <strong>{totalConfirmadas}</strong>
        </article>

        <article>
          <span>Em atendimento</span>
          <strong>{totalEmAtendimento}</strong>
        </article>

        <article>
          <span>Concluídas</span>
          <strong>{totalConcluidas}</strong>
        </article>
      </div>

      {erro && (
        <div className="consultas-alerta erro" role="alert">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="consultas-alerta sucesso" role="status">
          {sucesso}
        </div>
      )}

      {formularioAberto && podeAgendar && (
        <form
          className="consultas-formulario"
          onSubmit={(evento) => void agendar(evento)}
        >
          <div className="consultas-formulario-topo">
            <h3>Agendar nova consulta</h3>

            <button
              type="button"
              className="consultas-botao-secundario"
              onClick={limparFormulario}
            >
              Cancelar
            </button>
          </div>

          <div className="consultas-campos">
            <label>
              Animal *
              <select
                value={animalId}
                onChange={(evento) =>
                  setAnimalId(evento.target.value)
                }
                required
              >
                <option value="">Selecione um animal</option>

                {animais.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.nome} — {animal.especie}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Veterinário *
              <select
                value={veterinarioId}
                onChange={(evento) =>
                  setVeterinarioId(evento.target.value)
                }
                required
              >
                <option value="">Selecione um veterinário</option>

                {veterinarios.map((veterinario) => (
                  <option
                    key={veterinario.id}
                    value={veterinario.id}
                  >
                    {veterinario.nome} — {veterinario.crmv}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Data e horário *
              <input
                type="datetime-local"
                value={dataHora}
                onChange={(evento) =>
                  setDataHora(evento.target.value)
                }
                required
              />
            </label>

            <label className="consultas-campo-largo">
              Motivo da consulta *
              <textarea
                value={motivo}
                onChange={(evento) =>
                  setMotivo(evento.target.value)
                }
                placeholder="Descreva o motivo do atendimento."
                minLength={3}
                rows={3}
                required
              />
            </label>
          </div>

          <div className="consultas-formulario-acoes">
            <button
              type="submit"
              className="consultas-botao-principal"
              disabled={
                salvando ||
                animais.length === 0 ||
                veterinarios.length === 0
              }
            >
              {salvando ? "Salvando..." : "Confirmar agendamento"}
            </button>
          </div>

          {(animais.length === 0 ||
            veterinarios.length === 0) && (
            <p className="consultas-aviso">
              É necessário cadastrar pelo menos um animal e um
              veterinário antes de agendar consultas.
            </p>
          )}
        </form>
      )}

      <div className="consultas-listagem">
        <div className="consultas-listagem-topo">
          <h3>Consultas cadastradas</h3>

          <div className="consultas-filtros">
            <input
              type="search"
              placeholder="Buscar consulta..."
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />

            <select
              value={filtroStatus}
              onChange={(evento) =>
                setFiltroStatus(evento.target.value)
              }
            >
              <option value="Todos">Todos os status</option>
              <option value="Agendada">Agendada</option>
              <option value="Confirmada">Confirmada</option>
              <option value="Em atendimento">
                Em atendimento
              </option>
              <option value="Concluída">Concluída</option>
              <option value="Cancelada">Cancelada</option>
            </select>

            <input
              type="date"
              aria-label="Filtrar por data"
              value={filtroData}
              onChange={(evento) =>
                setFiltroData(evento.target.value)
              }
            />
          </div>
        </div>

        {carregando ? (
          <p className="consultas-vazio">
            Carregando consultas...
          </p>
        ) : consultasFiltradas.length === 0 ? (
          <p className="consultas-vazio">
            Nenhuma consulta encontrada.
          </p>
        ) : (
          <div className="consultas-tabela-container">
            <table className="consultas-tabela">
              <thead>
                <tr>
                  <th>Data e horário</th>
                  <th>Animal</th>
                  <th>Veterinário</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {consultasFiltradas.map((consulta) => {
                  const animal = animais.find(
                    (item) => item.id === consulta.animalId
                  );

                  const veterinario = veterinarios.find(
                    (item) =>
                      item.id === consulta.veterinarioId
                  );

                  const statusPermitidos =
                    transicoes[consulta.status] ?? [];

                  const podeReagendar =
                    podeAgendar &&
                    consulta.status !== "Concluída" &&
                    consulta.status !== "Cancelada";

                  return (
                    <tr key={consulta.id}>
                      <td>{formatarData(consulta.dataHora)}</td>

                      <td>
                        {animal?.nome ??
                          `Animal #${consulta.animalId}`}
                      </td>

                      <td>
                        {veterinario?.nome ??
                          `Veterinário #${consulta.veterinarioId}`}
                      </td>

                      <td>{consulta.motivo}</td>

                      <td>
                        <span className="consultas-status">
                          {consulta.status}
                        </span>
                      </td>

                      <td>
                        <div className="consultas-acoes">
                          {podeReagendar && (
                            <button
                              type="button"
                              onClick={() => {
                                setReagendandoId(consulta.id);
                                setNovaDataHora(
                                  isoParaCampoLocal(
                                    consulta.dataHora
                                  )
                                );
                                setErro("");
                                setSucesso("");
                              }}
                            >
                              Reagendar
                            </button>
                          )}

                          {podeAlterarStatus &&
                            statusPermitidos.map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  void alterarStatus(
                                    consulta,
                                    status
                                  )
                                }
                              >
                                {status === "Cancelada"
                                  ? "Cancelar consulta"
                                  : status}
                              </button>
                            ))}
                        </div>

                        {reagendandoId === consulta.id && (
                          <form
                            className="consultas-reagendamento"
                            onSubmit={(evento) =>
                              void reagendar(evento)
                            }
                          >
                            <label>
                              Novo horário
                              <input
                                type="datetime-local"
                                value={novaDataHora}
                                onChange={(evento) =>
                                  setNovaDataHora(
                                    evento.target.value
                                  )
                                }
                                required
                              />
                            </label>

                            <button
                              type="submit"
                              disabled={salvando}
                            >
                              Salvar
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setReagendandoId(null);
                                setNovaDataHora("");
                              }}
                            >
                              Fechar
                            </button>
                          </form>
                        )}
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

export default Consultas;