import { useEffect, useState } from "react";

type AnimalTutor = {
  id: number;
  nome: string;
  especie: string;
  raca: string;
  idade: number;
  tutorId: number;
};

type ConsultaTutor = {
  id: number;
  animalId: number;
  veterinarioId: number;
  dataHora: string;
  motivo: string;
  status: string;
};

type CadastroTutor = {
  id: number;
  nome: string;
  telefone: string;
  email: string;
};

type Props = {
  pagina: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function AreaTutor({ pagina }: Props) {
  const [animais, setAnimais] = useState<AnimalTutor[]>([]);
  const [consultas, setConsultas] = useState<ConsultaTutor[]>([]);
  const [cadastro, setCadastro] = useState<CadastroTutor | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function buscarDados<T>(caminho: string): Promise<T> {
      const token = sessionStorage.getItem("petagenda_token");

      if (!token) {
        throw new Error("Sessão não encontrada. Entre novamente.");
      }

      const resposta = await fetch(`${API_URL}${caminho}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
      });

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

        throw new Error("Não foi possível carregar os dados do tutor.");
      }

      return dados as T;
    }

    async function carregar() {
      setCarregando(true);
      setErro("");

      try {
        const [listaAnimais, listaConsultas, dadosTutor] =
          await Promise.all([
            buscarDados<AnimalTutor[]>("/api/tutores/me/animais"),
            buscarDados<ConsultaTutor[]>("/api/tutores/me/consultas"),
            buscarDados<CadastroTutor>("/api/tutores/me")
          ]);

        if (!ativo) {
          return;
        }

        setAnimais(listaAnimais);
        setConsultas(listaConsultas);
        setCadastro(dadosTutor);
      } catch (falha) {
        if (ativo) {
          setErro(
            falha instanceof Error
              ? falha.message
              : "Erro ao carregar informações."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  function nomeAnimal(animalId: number): string {
    return animais.find((animal) => animal.id === animalId)?.nome
      ?? `Animal #${animalId}`;
  }

  function formatarData(valor: string): string {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return data.toLocaleString("pt-BR");
  }

  const historico = consultas.filter(
    (consulta) => consulta.status === "Concluída"
  );

  if (carregando) {
    return (
      <section className="faculdade-section">
        <p>Carregando informações do tutor...</p>
      </section>
    );
  }

  if (erro) {
    return (
      <section className="faculdade-section" role="alert">
        <h2>Não foi possível carregar seus dados</h2>
        <p>{erro}</p>
      </section>
    );
  }

  if (pagina === "Meus Animais") {
    return (
      <section className="faculdade-section">
        <h2>Meus Animais</h2>
        <p>Animais vinculados ao seu cadastro.</p>

        {animais.length === 0 ? (
          <p>Nenhum animal vinculado à sua conta.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left" }}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Espécie</th>
                  <th>Raça</th>
                  <th>Idade</th>
                </tr>
              </thead>
              <tbody>
                {animais.map((animal) => (
                  <tr key={animal.id}>
                    <td>{animal.nome}</td>
                    <td>{animal.especie}</td>
                    <td>{animal.raca}</td>
                    <td>{animal.idade} anos</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  if (pagina === "Minhas Consultas" || pagina === "Histórico") {
    const lista =
      pagina === "Histórico" ? historico : consultas;

    return (
      <section className="faculdade-section">
        <h2>{pagina}</h2>
        <p>
          {pagina === "Histórico"
            ? "Consultas concluídas dos seus animais."
            : "Consultas vinculadas aos seus animais."}
        </p>

        {lista.length === 0 ? (
          <p>Nenhuma consulta encontrada.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", textAlign: "left" }}>
              <thead>
                <tr>
                  <th>Animal</th>
                  <th>Data e horário</th>
                  <th>Motivo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((consulta) => (
                  <tr key={consulta.id}>
                    <td>{nomeAnimal(consulta.animalId)}</td>
                    <td>{formatarData(consulta.dataHora)}</td>
                    <td>{consulta.motivo}</td>
                    <td>{consulta.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  if (pagina === "Configurações") {
    return (
      <section className="faculdade-section">
        <h2>Meu cadastro</h2>

        {cadastro && (
          <>
            <p><strong>Nome:</strong> {cadastro.nome}</p>
            <p><strong>E-mail:</strong> {cadastro.email}</p>
            <p><strong>Telefone:</strong> {cadastro.telefone}</p>
          </>
        )}

        <p>Perfil de acesso: Tutor</p>
      </section>
    );
  }

  if (pagina === "Agendar Consulta") {
    return (
      <section className="faculdade-section">
        <h2>Agendar Consulta</h2>
        <p>
          O agendamento pelo próprio tutor ainda não está
          habilitado no backend acadêmico.
        </p>
        <p>
          Por enquanto, os agendamentos devem ser realizados
          pela recepção ou administração.
        </p>
      </section>
    );
  }

  if (pagina === "Prontuários") {
    return (
      <section className="faculdade-section">
        <h2>Prontuários</h2>
        <p>
          A consulta de prontuários pelo tutor ainda depende
          de uma rota específica com verificação de acesso.
        </p>
        <p>
          Seus registros clínicos permanecem protegidos.
        </p>
      </section>
    );
  }

  return null;
}

export default AreaTutor;