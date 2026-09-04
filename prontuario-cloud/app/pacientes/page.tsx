"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Paciente, Sexo } from "@/types/database";
import Nav from "@/components/Nav";

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sexo, setSexo] = useState<Sexo>("F");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  async function carregar() {
    setCarregando(true);
    const { data } = await supabase.from("pacientes").select("*").order("nome", { ascending: true });
    setPacientes(data ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("pacientes").insert({
      user_id: user!.id,
      nome,
      nascimento: nascimento || null,
      sexo,
      telefone: telefone || null,
      email: email || null,
    });

    setSalvando(false);
    if (error) {
      setErro("Não foi possível cadastrar o paciente.");
      return;
    }

    setNome("");
    setNascimento("");
    setTelefone("");
    setEmail("");
    setMostrarForm(false);
    carregar();
  }

  const pacientesFiltrados = pacientes.filter((p) =>
    p.nome.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Pacientes</h1>
          <button className="btn-primary" onClick={() => setMostrarForm((v) => !v)}>
            {mostrarForm ? "Cancelar" : "+ Novo paciente"}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={cadastrar} className="card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label-field">Nome completo *</label>
                <input required className="input-field" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <label className="label-field">Data de nascimento</label>
                <input type="date" className="input-field" value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
              </div>
              <div>
                <label className="label-field">Sexo</label>
                <select className="input-field" value={sexo} onChange={(e) => setSexo(e.target.value as Sexo)}>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="X">Outro / não informado</option>
                </select>
              </div>
              <div>
                <label className="label-field">Telefone</label>
                <input className="input-field" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div>
                <label className="label-field">E-mail</label>
                <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            {erro && <p className="text-sm text-red-400">{erro}</p>}
            <button type="submit" disabled={salvando} className="btn-primary">
              {salvando ? "Salvando..." : "Cadastrar paciente"}
            </button>
          </form>
        )}

        <input
          className="input-field"
          placeholder="Buscar paciente por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        <div className="card p-0 overflow-hidden">
          {carregando ? (
            <p className="text-slate-500 text-sm p-6">Carregando...</p>
          ) : pacientesFiltrados.length === 0 ? (
            <p className="text-slate-500 text-sm p-6">Nenhum paciente encontrado.</p>
          ) : (
            <ul>
              {pacientesFiltrados.map((p) => (
                <li key={p.id} className="border-b border-chiarini-border last:border-0">
                  <Link href={`/pacientes/${p.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-slate-800/40 transition-colors">
                    <div>
                      <p className="text-slate-100 font-medium">{p.nome}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {p.nascimento ? new Date(p.nascimento).toLocaleDateString("pt-BR") : "Nascimento não informado"}
                      </p>
                    </div>
                    <span className="text-slate-500 text-sm">Ver ficha →</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
