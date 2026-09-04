"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Documento, Paciente, TipoDocumento } from "@/types/database";
import Nav from "@/components/Nav";

type DocumentoComPaciente = Documento & { pacientes: { nome: string } | null };

const TIPO_LABEL: Record<TipoDocumento, string> = {
  atestado: "Atestado",
  receita: "Receita",
  encaminhamento: "Encaminhamento",
  relatorio: "Relatório",
};

const MODELOS: Record<TipoDocumento, string> = {
  atestado:
    "Atesto para os devidos fins que o(a) paciente esteve sob meus cuidados médicos nesta data, necessitando de afastamento de suas atividades por __ dia(s), a contar de __/__/____.",
  receita: "Uso: ______\n\n1) Fármaco ___ ___mg — 1 comprimido, via oral, de __/__h, por __ dias.",
  encaminhamento:
    "Encaminho o(a) paciente acima para avaliação especializada em ___, em razão de ___. Segue resumo clínico relevante: ___.",
  relatorio: "Relato clínico referente ao acompanhamento do(a) paciente, para os fins que se fizerem necessários.",
};

export default function DocumentosPage() {
  const supabase = createClient();
  const [documentos, setDocumentos] = useState<DocumentoComPaciente[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [pacienteId, setPacienteId] = useState("");
  const [tipo, setTipo] = useState<TipoDocumento>("atestado");
  const [conteudo, setConteudo] = useState(MODELOS.atestado);

  async function carregar() {
    setCarregando(true);
    const [{ data: docs }, { data: pacs }] = await Promise.all([
      supabase
        .from("documentos")
        .select("*, pacientes(nome)")
        .order("criado_em", { ascending: false }),
      supabase.from("pacientes").select("*").order("nome"),
    ]);
    setDocumentos((docs as DocumentoComPaciente[]) ?? []);
    setPacientes(pacs ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function trocarTipo(novoTipo: TipoDocumento) {
    setTipo(novoTipo);
    setConteudo(MODELOS[novoTipo]);
  }

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) return;
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("documentos").insert({
      user_id: user!.id,
      paciente_id: pacienteId,
      tipo,
      conteudo,
    });

    setSalvando(false);
    setMostrarForm(false);
    setConteudo(MODELOS.atestado);
    setTipo("atestado");
    carregar();
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Documentos</h1>
          <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Novo documento"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={gerar} className="card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Paciente</label>
                <select required className="input-field" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Tipo de documento</label>
                <select className="input-field" value={tipo} onChange={(e) => trocarTipo(e.target.value as TipoDocumento)}>
                  {Object.entries(TIPO_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label-field">Conteúdo</label>
              <textarea className="input-field min-h-[160px]" value={conteudo} onChange={(e) => setConteudo(e.target.value)} />
            </div>
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? "Salvando..." : "Salvar documento"}
            </button>
          </form>
        )}

        <div className="card p-0 overflow-hidden">
          {carregando ? (
            <p className="text-slate-500 text-sm p-6">Carregando...</p>
          ) : documentos.length === 0 ? (
            <p className="text-slate-500 text-sm p-6">Nenhum documento gerado ainda.</p>
          ) : (
            <ul>
              {documentos.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-6 py-4 border-b border-chiarini-border last:border-0">
                  <div>
                    <p className="text-slate-100 font-medium">
                      {TIPO_LABEL[d.tipo]} — {d.pacientes?.nome ?? "Paciente removido"}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(d.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <a
                    href={`/api/gerar-pdf?id=${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    Ver PDF
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
