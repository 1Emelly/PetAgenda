import {
  useState,
  type FormEvent
} from "react";

import { useAuth } from "../contexts/AuthContext";

import {
  solicitarAlteracaoEmail,
  confirmarAlteracaoEmail
} from "../services/minha-conta.service";

export default function MinhaConta() {
  const {
    usuario,
    verificarSessao
  } = useAuth();

  const [alterandoEmail, setAlterandoEmail] =
    useState(false);

  const [aguardandoConfirmacao, setAguardandoConfirmacao] =
    useState(false);

  const [novoEmail, setNovoEmail] =
    useState("");

  const [senhaAtual, setSenhaAtual] =
    useState("");

  const [codigo, setCodigo] =
    useState("");

  const [processando, setProcessando] =
    useState(false);

  const [erro, setErro] =
    useState<string | null>(null);

  const [sucesso, setSucesso] =
    useState<string | null>(null);

  function limparMensagens() {
    setErro(null);
    setSucesso(null);
  }

  function cancelarAlteracao() {
    setAlterandoEmail(false);
    setAguardandoConfirmacao(false);
    setNovoEmail("");
    setSenhaAtual("");
    setCodigo("");
    limparMensagens();
  }

  async function solicitarMudanca(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    limparMensagens();
    setProcessando(true);

    try {
      const resultado = await solicitarAlteracaoEmail(
        novoEmail,
        senhaAtual
      );

      setSenhaAtual("");

      if (resultado.confirmacaoNecessaria) {
        setAguardandoConfirmacao(true);
      } else {
        await verificarSessao();

        setAlterandoEmail(false);
        setAguardandoConfirmacao(false);
        setNovoEmail("");
      }

      setSucesso(resultado.mensagem);
    } catch (erroRecebido) {
      setErro(
        erroRecebido instanceof Error
          ? erroRecebido.message
          : "Não foi possível solicitar a alteração."
      );
    } finally {
      setProcessando(false);
    }
  }

  async function confirmarMudanca(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    limparMensagens();
    setProcessando(true);

    try {
      const resultado = await confirmarAlteracaoEmail(
        codigo.trim()
      );

      await verificarSessao();

      setAlterandoEmail(false);
      setAguardandoConfirmacao(false);
      setNovoEmail("");
      setSenhaAtual("");
      setCodigo("");

      setSucesso(resultado.mensagem);
    } catch (erroRecebido) {
      setErro(
        erroRecebido instanceof Error
          ? erroRecebido.message
          : "Não foi possível confirmar a alteração."
      );
    } finally {
      setProcessando(false);
    }
  }

  if (!usuario) {
    return (
      <section>
        <h2>Minha Conta</h2>
        <p>Não foi possível carregar os dados da conta.</p>
      </section>
    );
  }

  return (
    <section
      style={{
        width: "100%",
        maxWidth: "760px"
      }}
    >
      <header
        style={{
          marginBottom: "28px"
        }}
      >
        <h2>Minha Conta</h2>

        <p>
          Consulte seus dados pessoais e gerencie
          as informações da sua conta.
        </p>
      </header>

      <div
        style={{
          padding: "28px",
          border: "1px solid #dce3e8",
          borderRadius: "12px",
          backgroundColor: "#ffffff"
        }}
      >
        <h3
          style={{
            marginTop: 0,
            marginBottom: "24px"
          }}
        >
          Dados Pessoais
        </h3>

        <div
          style={{
            display: "grid",
            gap: "18px"
          }}
        >
          <div>
            <strong>Nome</strong>
            <p>{usuario.nome}</p>
          </div>

          <div>
            <strong>Perfil</strong>
            <p>{usuario.perfil}</p>
          </div>

          <div>
            <strong>E-mail</strong>
            <p>{usuario.email}</p>
          </div>
        </div>

        {!alterandoEmail && (
          <button
            type="button"
            onClick={() => {
              limparMensagens();
              setAlterandoEmail(true);
            }}
            style={{
              marginTop: "20px",
              padding: "12px 18px",
              cursor: "pointer"
            }}
          >
            Alterar e-mail
          </button>
        )}

        {alterandoEmail && !aguardandoConfirmacao && (
          <form
            onSubmit={solicitarMudanca}
            style={{
              display: "grid",
              gap: "16px",
              marginTop: "28px"
            }}
          >
            <h4>Alterar e-mail</h4>

            <label>
              Novo e-mail

              <input
                type="email"
                value={novoEmail}
                onChange={(evento) =>
                  setNovoEmail(evento.target.value)
                }
                required
                maxLength={150}
                autoComplete="email"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "8px",
                  padding: "12px",
                  boxSizing: "border-box"
                }}
              />
            </label>

            <label>
              Senha atual

              <input
                type="password"
                value={senhaAtual}
                onChange={(evento) =>
                  setSenhaAtual(evento.target.value)
                }
                required
                autoComplete="current-password"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "8px",
                  padding: "12px",
                  boxSizing: "border-box"
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <button
                type="submit"
                disabled={processando}
              >
                {processando
                  ? "Processando..."
                  : "Continuar"}
              </button>

              <button
                type="button"
                onClick={cancelarAlteracao}
                disabled={processando}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {alterandoEmail && aguardandoConfirmacao && (
          <form
            onSubmit={confirmarMudanca}
            style={{
              display: "grid",
              gap: "16px",
              marginTop: "28px"
            }}
          >
            <h4>Confirmar novo e-mail</h4>

            <p>
              Informe o código enviado para:
              {" "}
              <strong>{novoEmail}</strong>
            </p>

            <label>
              Código de confirmação

              <input
                type="text"
                value={codigo}
                onChange={(evento) =>
                  setCodigo(evento.target.value)
                }
                required
                minLength={64}
                maxLength={64}
                autoComplete="one-time-code"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: "8px",
                  padding: "12px",
                  boxSizing: "border-box"
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <button
                type="submit"
                disabled={processando}
              >
                {processando
                  ? "Confirmando..."
                  : "Confirmar alteração"}
              </button>

              <button
                type="button"
                onClick={cancelarAlteracao}
                disabled={processando}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {erro && (
        <p
          role="alert"
          style={{
            marginTop: "18px",
            color: "#b42318"
          }}
        >
          {erro}
        </p>
      )}

      {sucesso && (
        <p
          role="status"
          style={{
            marginTop: "18px",
            color: "#167347"
          }}
        >
          {sucesso}
        </p>
      )}
    </section>
  );
}