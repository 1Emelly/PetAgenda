import {
  Navigate,
  Outlet
} from "react-router-dom";

import {
  useAuth
} from "../contexts/AuthContext";

function ProtectedRoute() {
  const {
    usuario,
    carregando,
    erroSessao,
    verificarSessao
  } = useAuth();

  if (carregando) {
    return (
      <main className="painel-provisorio">
        <h1>PetAgenda</h1>

        <p>
          Verificando sua sessão...
        </p>
      </main>
    );
  }

  if (erroSessao) {
    return (
      <main className="painel-provisorio">
        <h1>PetAgenda</h1>

        <p role="alert">
          {erroSessao}
        </p>

        <button
          type="button"
          onClick={() => {
            void verificarSessao();
          }}
        >
          Tentar novamente
        </button>
      </main>
    );
  }

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;