export type PerfilUsuario =
  | "Administrador"
  | "Secretario"
  | "Veterinario"
  | "Tutor";

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
}