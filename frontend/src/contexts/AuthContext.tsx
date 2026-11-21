import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

import {
  consultarUsuarioAutenticado
} from "../services/auth.service";

import type {
  Usuario
} from "../types/auth";

interface AuthContextType {
  usuario: Usuario | null;
  carregando: boolean;
  erroSessao: string | null;
  autenticar: (
    token: string,
    usuario: Usuario
  ) => void;
  sair: () => void;
  verificarSessao: () => Promise<void>;
}

const AuthContext = createContext<
  AuthContextType | undefined
>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({
  children
}: AuthProviderProps) {
  const [usuario, setUsuario] =
    useState<Usuario | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erroSessao, setErroSessao] =
    useState<string | null>(null);

  const sair = useCallback(() => {
    sessionStorage.removeItem(
      "petagenda_token"
    );

    sessionStorage.removeItem(
      "petagenda_usuario"
    );

    setUsuario(null);
    setErroSessao(null);
    setCarregando(false);
  }, []);

  const autenticar = useCallback((
    token: string,
    dadosUsuario: Usuario
  ) => {
    sessionStorage.setItem(
      "petagenda_token",
      token
    );

    sessionStorage.setItem(
      "petagenda_usuario",
      JSON.stringify(dadosUsuario)
    );

    setUsuario(dadosUsuario);
    setErroSessao(null);
    setCarregando(false);
  }, []);

  const verificarSessao = useCallback(async () => {
    const token = sessionStorage.getItem(
      "petagenda_token"
    );

    if (!token) {
      setUsuario(null);
      setErroSessao(null);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErroSessao(null);

    try {
      const usuarioValidado =
        await consultarUsuarioAutenticado(token);

      sessionStorage.setItem(
        "petagenda_usuario",
        JSON.stringify(usuarioValidado)
      );

      setUsuario(usuarioValidado);
    } catch (erro) {
      if (
        erro instanceof Error &&
        erro.message === "SESSAO_INVALIDA"
      ) {
        sair();
        return;
      }

      setUsuario(null);

      setErroSessao(
        erro instanceof Error
          ? erro.message
          : "Não foi possível verificar a sessão."
      );
    } finally {
      setCarregando(false);
    }
  }, [sair]);

  useEffect(() => {
    void verificarSessao();
  }, [verificarSessao]);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        carregando,
        erroSessao,
        autenticar,
        sair,
        verificarSessao
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error(
      "useAuth deve ser utilizado dentro de AuthProvider."
    );
  }

  return contexto;
}