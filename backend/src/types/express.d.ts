import type { PerfilUsuario } from "./usuario.js";

declare global {
  namespace Express {
    interface Request {
      usuario?: {
        id: number;
        perfil: PerfilUsuario;
      };
    }
  }
}

export {};