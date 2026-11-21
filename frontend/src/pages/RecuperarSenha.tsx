import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import "../styles/login.css";

const apiUrl = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

type RespostaApi = {
  mensagem?: string;
};

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [etapa, setEtapa] = useState<"solicitar" | "redefinir">(
    "solicitar"
  );

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [senhaRedefinida, setSenhaRedefinida] = useState(false);

  async function requisicao(
    caminho: string,
    dados: object
  ): Promise<RespostaApi> {
    const resposta = await fetch(`${apiUrl}${caminho}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    });

    const resultado = (await resposta.json()) as RespostaApi;

    if (!resposta.ok) {
      throw new Error(
        resultado.mensagem ||
        "Não foi possível concluir a solicitação."
      );
    }

    return resultado;
  }

  async function solicitarCodigo(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando) {
      return;
    }

    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
      const resultado = await requisicao(
        "/api/recuperacao-senha/solicitar",
        {
          email: email.trim().toLowerCase()
        }
      );

      setSucesso(
        resultado.mensagem ||
        "Se a conta estiver ativa, o código será enviado."
      );

      setEtapa("redefinir");
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Erro ao solicitar recuperação."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarRedefinicao(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando || senhaRedefinida) {
      return;
    }

    if (novaSenha.length < 9 || novaSenha.length > 128) {
      setErro("A senha deve ter entre 9 e 128 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    setErro("");
    setSucesso("");

    try {
      const resultado = await requisicao(
        "/api/recuperacao-senha/redefinir",
        {
          codigo: codigo.trim().toLowerCase(),
          novaSenha
        }
      );

      setSucesso(
        resultado.mensagem ||
        "Senha redefinida com sucesso."
      );

      setSenhaRedefinida(true);
      setCodigo("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Não foi possível redefinir a senha."
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-presentation">
        <div className="login-presentation-content">
          <div className="login-brand login-brand-light">
            <span className="login-brand-icon">
              <span>+</span>
            </span>

            <span className="login-brand-name">
              PetAgenda
            </span>
          </div>

          <div className="login-presentation-text">
            <span className="login-eyebrow">
              GESTÃO VETERINÁRIA
            </span>

            <h1>
              Mais organização para cuidar
              de quem importa.
            </h1>

            <p>
              Gerencie informações, acompanhe
              consultas e mantenha a rotina
              de atendimento organizada em
              um único lugar.
            </p>
          </div>

          <div className="login-presentation-footer">
            <span className="login-footer-line" />

            <p>
              Tecnologia a serviço do cuidado animal.
            </p>
          </div>
        </div>

        <div
          className="login-decoration login-decoration-one"
          aria-hidden="true"
        />

        <div
          className="login-decoration login-decoration-two"
          aria-hidden="true"
        />
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <div className="login-mobile-brand">
            <span className="login-brand-icon">
              <span>+</span>
            </span>

            <span className="login-brand-name">
              PetAgenda
            </span>
          </div>

          <div className="login-heading">
            <span className="login-heading-label">
              SEGURANÇA DA CONTA
            </span>

            <h2>Recuperar senha</h2>

            <p>
              {etapa === "solicitar"
                ? "Informe seu e-mail para solicitar um código de recuperação."
                : "Informe o código recebido e defina uma nova senha."}
            </p>
          </div>

          {erro && (
            <div className="login-error" role="alert">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="login-success" role="status">
              {sucesso}
            </div>
          )}

          {senhaRedefinida ? (
            <div className="login-form-footer">
              <p>
                Sua senha foi alterada. Você já pode
                entrar com a nova senha.
              </p>

              <p>
                <Link to="/login">
                  Ir para o login
                </Link>
              </p>
            </div>
          ) : etapa === "solicitar" ? (
            <form
              className="login-form"
              onSubmit={solicitarCodigo}
            >
              <div className="login-field">
                <label htmlFor="recuperacao-email">
                  E-mail cadastrado
                </label>

                <input
                  id="recuperacao-email"
                  type="email"
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(evento) =>
                    setEmail(evento.target.value)
                  }
                  required
                  disabled={carregando}
                />
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={carregando}
              >
                {carregando
                  ? "Solicitando..."
                  : "Enviar código de recuperação"}
              </button>
            </form>
          ) : (
            <form
              className="login-form"
              onSubmit={confirmarRedefinicao}
            >
              <div className="login-field">
                <label htmlFor="recuperacao-codigo">
                  Código de recuperação
                </label>

                <input
                  id="recuperacao-codigo"
                  type="text"
                  placeholder="Cole o código recebido"
                  value={codigo}
                  onChange={(evento) =>
                    setCodigo(evento.target.value)
                  }
                  minLength={64}
                  maxLength={64}
                  required
                  disabled={carregando}
                />
              </div>

              <div className="login-field">
                <label htmlFor="recuperacao-nova-senha">
                  Nova senha
                </label>

                <input
                  id="recuperacao-nova-senha"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo de 9 caracteres"
                  value={novaSenha}
                  onChange={(evento) =>
                    setNovaSenha(evento.target.value)
                  }
                  minLength={9}
                  maxLength={128}
                  required
                  disabled={carregando}
                />
              </div>

              <div className="login-field">
                <label htmlFor="recuperacao-confirmar-senha">
                  Confirmar nova senha
                </label>

                <input
                  id="recuperacao-confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(evento) =>
                    setConfirmarSenha(evento.target.value)
                  }
                  minLength={9}
                  maxLength={128}
                  required
                  disabled={carregando}
                />
              </div>

              <button
                type="submit"
                className="login-submit"
                disabled={carregando}
              >
                {carregando
                  ? "Redefinindo..."
                  : "Redefinir minha senha"}
              </button>
            </form>
          )}

          {!senhaRedefinida && (
            <div className="login-form-footer">
              {etapa === "redefinir" && (
                <p>
                  <button
                    type="button"
                    className="login-link-button"
                    onClick={() => {
                      setEtapa("solicitar");
                      setErro("");
                      setSucesso("");
                    }}
                    disabled={carregando}
                  >
                    Solicitar outro código
                  </button>
                </p>
              )}

              <p>
                <Link to="/login">
                  Voltar para o login
                </Link>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}