import { useState, type FormEvent } from "react";

import { Link, useNavigate } from "react-router-dom";

import "../styles/login.css";

const apiUrl = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

export default function AtivarConta() {
  const navigate = useNavigate();

  const [codigo, setCodigo] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] =
    useState("");

  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  async function ativarConta(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    setErro("");

    if (senha.length < 12) {
      setErro(
        "A senha deve ter pelo menos 12 caracteres."
      );
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setProcessando(true);

    try {
      const resposta = await fetch(
        `${apiUrl}/api/usuarios/ativacao-equipe/concluir`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            token: codigo.trim(),
            senha
          })
        }
      );

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

        throw new Error(
          "Não foi possível ativar a conta."
        );
      }

      setCodigo("");
      setSenha("");
      setConfirmarSenha("");
      setSucesso(true);
    } catch (erroCapturado) {
      setErro(
        erroCapturado instanceof Error
          ? erroCapturado.message
          : "Erro inesperado ao ativar conta."
      );
    } finally {
      setProcessando(false);
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
              Ativação de acesso
            </h1>

            <p>
              Defina sua senha para acessar
              o ambiente de trabalho do PetAgenda.
            </p>
          </div>

          <div className="login-presentation-footer">
            <span className="login-footer-line" />

            <p>
              Tecnologia a serviço do cuidado animal.
            </p>
          </div>
        </div>
      </section>

      <section className="login-form-section">
        <div className="login-form-container">
          <div className="login-heading">
            <span className="login-heading-label">
              PRIMEIRO ACESSO
            </span>

            <h2>Ativar minha conta</h2>

            <p>
              Utilize o código temporário fornecido
              pela administração e crie sua senha.
            </p>
          </div>

          {sucesso ? (
            <div>
              <p
                className="login-success"
                role="status"
              >
                Sua conta foi ativada com sucesso.
                Você já pode entrar na plataforma.
              </p>

              <button
                type="button"
                className="login-submit"
                onClick={() => navigate("/login")}
              >
                Ir para o login
              </button>
            </div>
          ) : (
            <form
              className="login-form"
              onSubmit={ativarConta}
            >
              <div className="login-field">
                <label htmlFor="codigo-ativacao">
                  Código de ativação
                </label>

                <input
                  id="codigo-ativacao"
                  type="text"
                  value={codigo}
                  onChange={(evento) =>
                    setCodigo(evento.target.value)
                  }
                  minLength={64}
                  maxLength={64}
                  autoComplete="off"
                  required
                  disabled={processando}
                />
              </div>

              <div className="login-field">
                <label htmlFor="nova-senha">
                  Nova senha
                </label>

                <input
                  id="nova-senha"
                  type="password"
                  value={senha}
                  onChange={(evento) =>
                    setSenha(evento.target.value)
                  }
                  minLength={12}
                  autoComplete="new-password"
                  required
                  disabled={processando}
                />
              </div>

              <div className="login-field">
                <label htmlFor="confirmar-nova-senha">
                  Confirmar senha
                </label>

                <input
                  id="confirmar-nova-senha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(evento) =>
                    setConfirmarSenha(evento.target.value)
                  }
                  minLength={12}
                  autoComplete="new-password"
                  required
                  disabled={processando}
                />
              </div>

              {erro && (
                <div
                  className="login-error"
                  role="alert"
                >
                  {erro}
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={processando}
              >
                {processando
                  ? "Ativando..."
                  : "Ativar minha conta"}
              </button>
            </form>
          )}

          <div className="login-form-footer">
            <p>
              <Link to="/login">
                Voltar para o login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}