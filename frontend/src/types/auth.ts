export type PerfilUsuario =
  | "Administrador"
  | "Secretario"
  | "Veterinario"
  | "Tutor";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

export interface RespostaLogin {
  mensagem: string;
  token: string;
  usuario: Usuario;
}

export interface CredenciaisLogin {
  email: string;
  senha: string;
}