"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AgendaItem, Paciente, StatusAgenda } from "@/types/database";
import Nav from "@/components/Nav";

type AgendaComPaciente = AgendaItem & { pacientes: { nome: string } | null };

const STATUS_LABEL: Record<StatusAgenda, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendaPage() {
  const supabase = createClient();
  const [data, setData] = useState(hojeISO());
  const [itens, setItens] = useState<AgendaComPaciente[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [pacienteId, setPacienteId] = useState("");
  const [hora, setHora] = useState("09:00");
  const [motivo, setMotivo] = useState("");

  async function carregar() {
    setCarregando(true);
    const inicio = new Date(`${data}T00:00:00`).toISOString();
    const fim = new Date(`${data}T23:59:59`).toISOString();
    const [{ data: agendaData }, { data: pacientesData }] = await Promise.all([
      supabase
        .from("agenda")
        .select("*, pacientes(nome)")
        .gte("data_hora", inicio)
        .lte("data_hora", fim)
        .order("data_hora", { ascending: true }),
      supabase.from("pacientes").select("*").order("nome"),
    ]);
    setItens((agendaData as AgendaComPaciente[]) ?? []);
    setPacientes(pacientesData ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function agendar(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("agenda").insert({
      user_id: user!.id,
      paciente_id: pacienteId,
      data_hora: new Date(`${data}T${hora}:00`).toISOString(),
      motivo: motivo || null,
      status: "agendado",
    });

    setMotivo("");
    setMostrarForm(false);
    carregar();
  }

  async function mudarStatus(id: string, status: StatusAgenda) {
    await supabase.from("agenda").update({ status }).eq("id", id);
    carregar();
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-semibold text-white">Agenda</h1>
          <div className="flex items-center gap-3">
            <input type="date" className="input-field w-auto" value={data} onChange={(e) => setData(e.target.value)} />
            <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
              {mostrarForm ? "Cancelar" : "+ Agendar"}
            </button>
          </div>
        </div>

        {mostrarForm && (
          <form onSubmit={agendar} className="card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="label-field">Paciente</label>
                <select required className="input-field" value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {pacientes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-field">Horário</label>
                <input type="time" className="input-field" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label-field">Motivo</label>
              <input className="input-field" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Confirmar agendamento</button>
          </form>
        )}

        <div className="card p-0 overflow-hidden">
          {carregando ? (
            <p className="text-slate-500 text-sm p-6">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="text-slate-500 text-sm p-6">Nenhuma consulta agendada para este dia.</p>
          ) : (
            <ul>
              {itens.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-6 py-4 border-b border-chiarini-border last:border-0">
                  <div>
                    <p className="text-slate-100 font-medium">
                      {new Date(item.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} —{" "}
                      {item.pacientes?.nome ?? "Paciente removido"}
                    </p>
                    {item.motivo && <p className="text-slate-500 text-xs mt-0.5">{item.motivo}</p>}
                  </div>
                  <select
                    className="input-field w-auto text-xs py-1"
                    value={item.status}
                    onChange={(e) => mudarStatus(item.id, e.target.value as StatusAgenda)}
                  >
                    {Object.entries(STATUS_LABEL).map(([valor, label]) => (
                      <option key={valor} value={valor}>{label}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
