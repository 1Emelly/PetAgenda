import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Cadastros from "../components/Cadastros";
import Consultas from "../components/Consultas";
import Atendimentos from "../components/Atendimentos";
import Prontuarios from "../components/Prontuarios";
import AreaTutor from "../components/AreaTutor";
import GerenciarUsuarios from "../components/GerenciarUsuarios";
import MinhaConta from "../components/MinhaConta";

type Indicadores = {
  animais: number;
  tutores: number;
  veterinarios: number;
  consultas: number;
};

type DadosApi = Record<string, unknown>;

function Painel() {
  const navigate = useNavigate();
  const { usuario, sair } = useAuth();

  const [paginaAtual, setPaginaAtual] = useState("Início");

  const [indicadores, setIndicadores] = useState<Indicadores>({
    animais: 0,
    tutores: 0,
    veterinarios: 0,
    consultas: 0
  });

  const [carregandoDados, setCarregandoDados] = useState(true);
  const [erroDados, setErroDados] = useState("");
  const [versaoDados, setVersaoDados] = useState(0);

  const perfil = usuario?.perfil ?? "";

  const nomePerfil =
    perfil === "Secretario"
      ? "Recepcionista"
      : perfil === "Veterinario"
        ? "Veterinário"
        : perfil === "Tutor"
          ? "Tutor"
          : "Administrador";

  const menusPorPerfil: Record<string, string[]> = {
    Administrador: [
      "Início",
      "Agenda",
      "Tutores",
      "Animais",
      "Consultas",
      "Atendimentos",
      "Prontuários",
      "Veterinários",
      "Gerenciar Usuários",
      "Minha Conta"
    ],
    Secretario: [
      "Início",
      "Agenda",
      "Tutores",
      "Animais",
      "Consultas",
      "Minha Conta"
    ],
    Veterinario: [
      "Início",
      "Minha Agenda",
      "Consultas",
      "Atendimentos",
      "Animais",
      "Tutores",
      "Histórico",
      "Prontuários",
      "Minha Conta"
    ],
    Tutor: [
      "Início",
      "Meus Animais",
      "Agendar Consulta",
      "Minhas Consultas",
      "Histórico",
      "Prontuários",
      "Minha Conta"
    ]
  };

  const menus = menusPorPerfil[perfil] ?? ["Início"];

  const cardsPorPerfil: Record<string, string[]> = {
    Administrador: [
      "Consultas",
      "Tutores",
      "Animais",
      "Veterinários"
    ],
    Secretario: [
      "Consultas",
      "Tutores",
      "Animais",
      "Veterinários"
    ],
    Veterinario: [
      "Minha agenda",
      "Consultas",
      "Pacientes",
      "Prontuários"
    ],
    Tutor: [
      "Meus animais",
      "Próximas consultas",
      "Histórico",
      "Prontuários"
    ]
  };

  const cards = cardsPorPerfil[perfil] ?? [];

  const apiUrl = (
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  useEffect(() => {
    if (!usuario) {
      return;
    }

    let ativo = true;

    async function buscarLista(
      caminho: string,
      token: string
    ): Promise<DadosApi[]> {
      const resposta = await fetch(`${apiUrl}${caminho}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

      if (!resposta.ok) {
        throw new Error(
          `Não foi possível carregar os dados de ${caminho}.`
        );
      }

      const dados: unknown = await resposta.json();

      if (!Array.isArray(dados)) {
        throw new Error(
          `A API retornou um formato inesperado em ${caminho}.`
        );
      }

      return dados as DadosApi[];
    }

    async function carregarIndicadores() {
      setCarregandoDados(true);
      setErroDados("");

      const token = sessionStorage.getItem("petagenda_token");

      if (!token) {
        if (ativo) {
          setErroDados("Sessão não encontrada. Entre novamente.");
          setCarregandoDados(false);
        }

        return;
      }

      try {
        let animais: DadosApi[] = [];
        let tutores: DadosApi[] = [];
        let veterinarios: DadosApi[] = [];
        let consultas: DadosApi[] = [];

        if (perfil === "Tutor") {
          [animais, consultas] = await Promise.all([
            buscarLista("/api/tutores/me/animais", token),
            buscarLista("/api/tutores/me/consultas", token)
          ]);
        } else {
          [animais, tutores, veterinarios, consultas] =
            await Promise.all([
              buscarLista("/api/animais", token),
              buscarLista("/api/tutores", token),
              buscarLista("/api/veterinarios", token),
              buscarLista("/api/consultas", token)
            ]);
        }

        if (!ativo) {
          return;
        }

        setIndicadores({
          animais: animais.length,
          tutores: tutores.length,
          veterinarios: veterinarios.length,
          consultas: consultas.length
        });
      } catch (erro) {
        if (!ativo) {
          return;
        }

        setErroDados(
          erro instanceof Error
            ? erro.message
            : "Não foi possível carregar os indicadores."
        );
      } finally {
        if (ativo) {
          setCarregandoDados(false);
        }
      }
    }

    void carregarIndicadores();

    return () => {
      ativo = false;
    };
  }, [usuario, perfil, apiUrl, versaoDados]);

  if (!usuario) {
    return null;
  }

  function encerrarSessao() {
    sair();

    navigate("/login", {
      replace: true
    });
  }

  function obterValorCard(card: string): string {
    if (carregandoDados) {
      return "...";
    }

    if (erroDados) {
      return "—";
    }

    if (
      card === "Consultas" ||
      card === "Minha agenda" ||
      card === "Próximas consultas"
    ) {
      return String(indicadores.consultas);
    }

    if (card === "Tutores") {
      return String(indicadores.tutores);
    }

    if (
      card === "Animais" ||
      card === "Pacientes" ||
      card === "Meus animais"
    ) {
      return String(indicadores.animais);
    }

    if (card === "Veterinários") {
      return String(indicadores.veterinarios);
    }

    return "—";
  }

  const cadastroAtual =
    paginaAtual === "Tutores" ||
    paginaAtual === "Animais" ||
    paginaAtual === "Veterinários"
      ? paginaAtual
      : null;

  const consultaAtual =
    paginaAtual === "Agenda" ||
    paginaAtual === "Minha Agenda" ||
    paginaAtual === "Consultas"
      ? paginaAtual
      : null;

  const acessoClinico =
    perfil === "Administrador" ||
    perfil === "Veterinario";

  const mostrarAtendimentos =
    acessoClinico &&
    (paginaAtual === "Atendimentos" ||
      paginaAtual === "Histórico");

  const mostrarProntuarios =
    acessoClinico && paginaAtual === "Prontuários";


  return (
    <div className="faculdade-layout">
      <aside className="faculdade-sidebar">
        <div className="faculdade-logo">
          <span className="faculdade-logo-icon">+</span>
          <span>PetAgenda</span>
        </div>

        <nav
          className="faculdade-nav"
          aria-label="Menu principal"
        >
          {menus.map((menu) => (
            <button
              key={menu}
              type="button"
              className={
                paginaAtual === menu ? "ativo" : ""
              }
              onClick={() => setPaginaAtual(menu)}
            >
              {menu}
            </button>
          ))}
        </nav>

        <div className="faculdade-sidebar-footer">
          <strong>{usuario.nome}</strong>
          <span>{nomePerfil}</span>

          <button
            type="button"
            className="faculdade-sair"
            onClick={encerrarSessao}
          >
            Sair da conta
          </button>
        </div>
      </aside>

      <main className="faculdade-main">
        <header className="faculdade-header">
          <div>
            <h1>
              {paginaAtual === "Início"
                ? `Olá, ${usuario.nome.split(" ")[0]}!`
                : paginaAtual}
            </h1>

            <p>
              {paginaAtual === "Início"
                ? "Bem-vindo ao seu painel PetAgenda."
                : "Área de gerenciamento PetAgenda."}
            </p>
          </div>

          <span className="faculdade-perfil">
            {nomePerfil}
          </span>
        </header>

        {paginaAtual === "Início" && (
          <>
            <div className="faculdade-cards">
              {cards.map((card) => (
                <article
                  key={card}
                  className="faculdade-card"
                >
                  <span>{card}</span>
                  <strong>{obterValorCard(card)}</strong>
                </article>
              ))}
            </div>

            {erroDados && (
              <section
                className="faculdade-section"
                role="alert"
                style={{ marginBottom: "24px" }}
              >
                <h2>Não foi possível atualizar os dados</h2>
                <p>{erroDados}</p>
              </section>
            )}
          </>
        )}

        {paginaAtual === "Minha Conta" ? (
          <MinhaConta />
        ) : perfil === "Tutor" && paginaAtual !== "Início" ? (
          <AreaTutor
            key={paginaAtual}
            pagina={paginaAtual}
          />
        ) : perfil === "Administrador" &&
          paginaAtual === "Gerenciar Usuários" ? (
          <GerenciarUsuarios />
        ) : cadastroAtual ? (
          <Cadastros
            key={cadastroAtual}
            tipo={cadastroAtual}
            perfil={perfil}
            aoAtualizar={() =>
              setVersaoDados((anterior) => anterior + 1)
            }
          />
        ) : consultaAtual ? (
          <Consultas
            key={consultaAtual}
            perfil={perfil}
            modo={
              consultaAtual === "Consultas"
                ? "Consultas"
                : "Agenda"
            }
            aoAtualizar={() =>
              setVersaoDados((anterior) => anterior + 1)
            }
          />
        ) : mostrarAtendimentos ? (
          <Atendimentos
            aoAtualizar={() =>
              setVersaoDados((anterior) => anterior + 1)
            }
          />
        ) : mostrarProntuarios ? (
          <Prontuarios
            aoAtualizar={() =>
              setVersaoDados((anterior) => anterior + 1)
            }
          />
        ) : (
          <section className="faculdade-section">
            <h2>
              {paginaAtual === "Início"
                ? "Acesso rápido"
                : paginaAtual}
            </h2>

            <p>
              {paginaAtual === "Início"
                ? "Selecione uma das áreas abaixo para navegar pelo sistema."
                : "Esta seção será conectada às funcionalidades existentes do backend acadêmico."}
            </p>

            {paginaAtual === "Início" && (
              <div className="faculdade-acoes">
                {menus
                  .filter((menu) => menu !== "Início")
                  .slice(0, 4)
                  .map((menu) => (
                    <button
                      key={menu}
                      type="button"
                      onClick={() => setPaginaAtual(menu)}
                    >
                      {menu}
                    </button>
                  ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default Painel;