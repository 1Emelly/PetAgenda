import {
  useState,
  type FormEvent
} from "react";

import { Link, useNavigate } from "react-router-dom";

import {
  realizarLogin
} from "../services/auth.service";

import {
  useAuth
} from "../contexts/AuthContext";

import "../styles/login.css";

type ModoAcesso = "entrar" | "cadastro";

function Login() {
  const navigate = useNavigate();

  const {
    autenticar
  } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [mostrarSenha, setMostrarSenha] =
    useState(false);

  const [carregando, setCarregando] =
    useState(false);

  const [erro, setErro] = useState("");

  // Novos estados exclusivos do cadastro.
  const [modoAcesso, setModoAcesso] =
    useState<ModoAcesso>("entrar");

  const [nomeCadastro, setNomeCadastro] =
    useState("");

  const [emailCadastro, setEmailCadastro] =
    useState("");

  const [telefoneCadastro, setTelefoneCadastro] =
    useState("");

  const [senhaCadastro, setSenhaCadastro] =
    useState("");

  const [confirmarSenha, setConfirmarSenha] =
    useState("");

  const [mostrarSenhaCadastro, setMostrarSenhaCadastro] =
    useState(false);

  const [sucessoCadastro, setSucessoCadastro] =
    useState("");

  const apiUrl = (
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");

  function alterarModo(novoModo: ModoAcesso) {
    if (carregando) {
      return;
    }

    setModoAcesso(novoModo);
    setErro("");
    setSucessoCadastro("");
    setMostrarSenha(false);
    setMostrarSenhaCadastro(false);
  }

  async function enviarFormulario(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando) {
      return;
    }

    setErro("");

    const emailNormalizado =
      email.trim().toLowerCase();

    if (!emailNormalizado || !senha) {
      setErro(
        "Preencha seu e-mail e sua senha para continuar."
      );

      return;
    }

    setCarregando(true);

    try {
      const resposta = await realizarLogin({
        email: emailNormalizado,
        senha
      });

      autenticar(
        resposta.token,
        resposta.usuario
      );

      navigate("/painel", {
        replace: true
      });
    } catch (erroDesconhecido) {
      if (erroDesconhecido instanceof Error) {
        setErro(erroDesconhecido.message);
      } else {
        setErro(
          "Ocorreu um erro inesperado. Tente novamente."
        );
      }
    } finally {
      setCarregando(false);
    }
  }

  async function enviarCadastro(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando) {
      return;
    }

    setErro("");
    setSucessoCadastro("");

    const nomeNormalizado = nomeCadastro.trim();
    const emailNormalizado =
      emailCadastro.trim().toLowerCase();

    const telefoneNormalizado =
      telefoneCadastro.replace(/\D/g, "");

    if (nomeNormalizado.length < 3) {
      setErro(
        "Informe seu nome completo com pelo menos 3 caracteres."
      );
      return;
    }

    if (!emailNormalizado) {
      setErro("Informe um e-mail válido.");
      return;
    }

    if (telefoneNormalizado.length < 10) {
      setErro(
        "Informe um telefone válido com DDD."
      );
      return;
    }

    if (senhaCadastro.length < 8) {
      setErro(
        "A senha deve ter pelo menos 8 caracteres."
      );
      return;
    }

    if (senhaCadastro !== confirmarSenha) {
      setErro(
        "As senhas informadas não coincidem."
      );
      return;
    }

    setCarregando(true);

    try {
      const resposta = await fetch(
        `${apiUrl}/api/usuarios/cadastro`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            nome: nomeNormalizado,
            email: emailNormalizado,
            senha: senhaCadastro,
            perfil: "Tutor"
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
          "Não foi possível criar sua conta."
        );
      }

      // O cadastro público cria a conta de acesso.
      // O telefone e o vínculo com o cadastro de tutor
      // serão tratados na próxima parte da etapa.
      setEmail(emailNormalizado);
      setSenha("");

      setNomeCadastro("");
      setEmailCadastro("");
      setTelefoneCadastro("");
      setSenhaCadastro("");
      setConfirmarSenha("");

      setModoAcesso("entrar");

      setSucessoCadastro(
        "Conta de Tutor criada com sucesso! " +
        "Entre com seu e-mail e senha. " +
        "O vínculo com seus animais será realizado pela administração."
      );
    } catch (erroDesconhecido) {
      setErro(
        erroDesconhecido instanceof Error
          ? erroDesconhecido.message
          : "Ocorreu um erro inesperado ao criar sua conta."
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

          <div className="login-access-tabs">
            <button
              type="button"
              className={
                modoAcesso === "entrar"
                  ? "login-access-tab ativo"
                  : "login-access-tab"
              }
              onClick={() => alterarModo("entrar")}
              disabled={carregando}
              aria-pressed={modoAcesso === "entrar"}
            >
              Entrar
            </button>

            <button
              type="button"
              className={
                modoAcesso === "cadastro"
                  ? "login-access-tab ativo"
                  : "login-access-tab"
              }
              onClick={() => alterarModo("cadastro")}
              disabled={carregando}
              aria-pressed={modoAcesso === "cadastro"}
            >
              Criar conta
            </button>
          </div>

          {modoAcesso === "entrar" ? (
            <>
              <div className="login-heading">
                <span className="login-heading-label">
                  ACESSO À PLATAFORMA
                </span>

                <h2>Bem-vindo de volta</h2>

                <p>
                  Entre com suas credenciais
                  para acessar sua conta.
                </p>
              </div>

              <form
                className="login-form"
                onSubmit={enviarFormulario}
              >
                <div className="login-field">
                  <label htmlFor="email">
                    E-mail
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    value={email}
                    onChange={(evento) => {
                      setEmail(evento.target.value);
                    }}
                    required
                    disabled={carregando}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="senha">
                    Senha
                  </label>

                  <div className="login-password-wrapper">
                    <input
                      id="senha"
                      name="senha"
                      type={
                        mostrarSenha
                          ? "text"
                          : "password"
                      }
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      value={senha}
                      onChange={(evento) => {
                        setSenha(evento.target.value);
                      }}
                      required
                      disabled={carregando}
                    />

                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => {
                        setMostrarSenha(!mostrarSenha);
                      }}
                      aria-label={
                        mostrarSenha
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                      aria-pressed={mostrarSenha}
                    >
                      {mostrarSenha ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                {erro && (
                  <div
                    className="login-error"
                    role="alert"
                  >
                    {erro}
                  </div>
                )}

                {sucessoCadastro && (
                  <div
                    className="login-success"
                    role="status"
                  >
                    {sucessoCadastro}
                  </div>
                )}

                <button
                  type="submit"
                  className="login-submit"
                  disabled={carregando}
                >
                  {carregando
                    ? "Entrando..."
                    : "Entrar na plataforma"}
                </button>
              </form>

              <div className="login-form-footer">
                <p>
                  Acesso destinado aos usuários
                  cadastrados no PetAgenda.
                </p>

                <p>
                  <Link to="/recuperar-senha">
                    Esqueci minha senha
                  </Link>
                </p>

                <p>
                  Primeiro acesso como funcionário?{" "}
                  <Link to="/ativar-conta">
                    Ativar minha conta
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="login-heading">
                <span className="login-heading-label">
                  CADASTRO DE TUTOR
                </span>

                <h2>Crie sua conta</h2>

                <p>
                  Cadastre-se para acompanhar
                  seus animais e suas consultas.
                </p>
              </div>

              <form
                className="login-form"
                onSubmit={enviarCadastro}
              >
                <div className="login-field">
                  <label htmlFor="cadastro-nome">
                    Nome completo
                  </label>

                  <input
                    id="cadastro-nome"
                    name="nome"
                    type="text"
                    placeholder="Digite seu nome completo"
                    autoComplete="name"
                    value={nomeCadastro}
                    onChange={(evento) => {
                      setNomeCadastro(evento.target.value);
                    }}
                    minLength={3}
                    required
                    disabled={carregando}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="cadastro-email">
                    E-mail
                  </label>

                  <input
                    id="cadastro-email"
                    name="email"
                    type="email"
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    value={emailCadastro}
                    onChange={(evento) => {
                      setEmailCadastro(evento.target.value);
                    }}
                    required
                    disabled={carregando}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="cadastro-telefone">
                    Telefone com DDD
                  </label>

                  <input
                    id="cadastro-telefone"
                    name="telefone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                    value={telefoneCadastro}
                    onChange={(evento) => {
                      setTelefoneCadastro(evento.target.value);
                    }}
                    required
                    disabled={carregando}
                  />
                </div>

                <div className="login-field">
                  <label htmlFor="cadastro-senha">
                    Senha
                  </label>

                  <div className="login-password-wrapper">
                    <input
                      id="cadastro-senha"
                      name="senha"
                      type={
                        mostrarSenhaCadastro
                          ? "text"
                          : "password"
                      }
                      placeholder="Mínimo de 8 caracteres"
                      autoComplete="new-password"
                      value={senhaCadastro}
                      onChange={(evento) => {
                        setSenhaCadastro(evento.target.value);
                      }}
                      minLength={8}
                      required
                      disabled={carregando}
                    />

                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => {
                        setMostrarSenhaCadastro(
                          !mostrarSenhaCadastro
                        );
                      }}
                      aria-label={
                        mostrarSenhaCadastro
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                      aria-pressed={mostrarSenhaCadastro}
                    >
                      {mostrarSenhaCadastro
                        ? "Ocultar"
                        : "Mostrar"}
                    </button>
                  </div>
                </div>

                <div className="login-field">
                  <label htmlFor="cadastro-confirmar-senha">
                    Confirmar senha
                  </label>

                  <input
                    id="cadastro-confirmar-senha"
                    name="confirmarSenha"
                    type={
                      mostrarSenhaCadastro
                        ? "text"
                        : "password"
                    }
                    placeholder="Digite sua senha novamente"
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(evento) => {
                      setConfirmarSenha(evento.target.value);
                    }}
                    required
                    disabled={carregando}
                  />
                </div>

                <p className="login-cadastro-aviso">
                  O cadastro público é destinado
                  exclusivamente a tutores.
                  Contas da equipe são criadas
                  pela administração.
                </p>

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
                  disabled={carregando}
                >
                  {carregando
                    ? "Criando conta..."
                    : "Criar minha conta"}
                </button>
              </form>

              <div className="login-form-footer">
                <p>
                  Já possui uma conta?{" "}
                  <button
                    type="button"
                    className="login-link-button"
                    onClick={() => alterarModo("entrar")}
                    disabled={carregando}
                  >
                    Entrar na plataforma
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Login;