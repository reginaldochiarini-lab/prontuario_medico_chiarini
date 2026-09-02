export type Sexo = "M" | "F" | "X";
export type TipoConsulta = "primeira_consulta" | "retorno" | "evolucao";
export type Cenario = "particular" | "unimed" | "santa_casa";
export type StatusProblema = "ativo" | "inativo";
export type StatusMedicacao = "ativo" | "suspenso";
export type StatusAgenda = "agendado" | "realizado" | "faltou" | "cancelado";
export type TipoDocumento = "atestado" | "receita" | "encaminhamento" | "relatorio";

export type Paciente = {
  id: string;
  user_id: string;
  nome: string;
  nascimento: string | null;
  sexo: Sexo | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cid: string | null;
  ciap: string | null;
  observacoes: string | null;
  criado_em: string;
};
type PacienteInsert = Partial<Paciente> & Pick<Paciente, "user_id" | "nome">;
type PacienteUpdate = Partial<Paciente>;

export type Consulta = {
  id: string;
  paciente_id: string;
  user_id: string;
  data: string;
  tipo: TipoConsulta;
  cenario: Cenario;
  subjetivo: string | null;
  objetivo: string | null;
  avaliacao: string | null;
  plano: string | null;
  anotacao_bruta: string | null;
  criado_em: string;
};
type ConsultaInsert = Partial<Consulta> & Pick<Consulta, "paciente_id" | "user_id" | "tipo" | "cenario">;
type ConsultaUpdate = Partial<Consulta>;

export type Problema = {
  id: string;
  paciente_id: string;
  user_id: string;
  condicao: string;
  data_inicio: string | null;
  status: StatusProblema;
  cid_10: string | null;
  codigo_ciap: string | null;
  data_resolucao: string | null;
  criado_em: string;
  atualizado_em: string;
};
type ProblemaInsert = Partial<Problema> & Pick<Problema, "paciente_id" | "user_id" | "condicao">;
type ProblemaUpdate = Partial<Problema>;

export type Medicacao = {
  id: string;
  paciente_id: string;
  user_id: string;
  farmaco: string;
  dose: string | null;
  posologia: string | null;
  data_inicio: string | null;
  prescritor: string | null;
  status: StatusMedicacao;
  data_suspensao: string | null;
  criado_em: string;
  atualizado_em: string;
};
type MedicacaoInsert = Partial<Medicacao> & Pick<Medicacao, "paciente_id" | "user_id" | "farmaco">;
type MedicacaoUpdate = Partial<Medicacao>;

export type AgendaItem = {
  id: string;
  paciente_id: string | null;
  user_id: string;
  data_hora: string;
  motivo: string | null;
  status: StatusAgenda;
  criado_em: string;
};
type AgendaInsert = Partial<AgendaItem> & Pick<AgendaItem, "user_id" | "data_hora">;
type AgendaUpdate = Partial<AgendaItem>;

export type Documento = {
  id: string;
  paciente_id: string;
  user_id: string;
  tipo: TipoDocumento;
  conteudo: string;
  criado_em: string;
};
type DocumentoInsert = Partial<Documento> & Pick<Documento, "paciente_id" | "user_id" | "tipo" | "conteudo">;
type DocumentoUpdate = Partial<Documento>;

export type Database = {
  public: {
    Tables: {
      pacientes: { Row: Paciente; Insert: PacienteInsert; Update: PacienteUpdate; Relationships: [] };
      consultas: { Row: Consulta; Insert: ConsultaInsert; Update: ConsultaUpdate; Relationships: [] };
      problemas: { Row: Problema; Insert: ProblemaInsert; Update: ProblemaUpdate; Relationships: [] };
      medicacoes: { Row: Medicacao; Insert: MedicacaoInsert; Update: MedicacaoUpdate; Relationships: [] };
      agenda: { Row: AgendaItem; Insert: AgendaInsert; Update: AgendaUpdate; Relationships: [] };
      documentos: { Row: Documento; Insert: DocumentoInsert; Update: DocumentoUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
