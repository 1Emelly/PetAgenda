import {
  BrowserRouter,
  Navigate,
  Route,
  Routes
} from "react-router-dom";

import Login from "./pages/Login";

import Painel from "./pages/Painel";

import AtivarConta from "./pages/AtivarConta";

import RecuperarSenha from "./pages/RecuperarSenha";

import ProtectedRoute from "./components/ProtectedRoute";

import {
  AuthProvider
} from "./contexts/AuthContext";

import "./App.css";
import "./styles/faculdade.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/ativar-conta"
            element={<AtivarConta />}
          />

          <Route
            path="/recuperar-senha"
            element={<RecuperarSenha />}
          />

          <Route
            element={<ProtectedRoute />}
          >
            <Route
              path="/painel"
              element={<Painel />}
            />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;