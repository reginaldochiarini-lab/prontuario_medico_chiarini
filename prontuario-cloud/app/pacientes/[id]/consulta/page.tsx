"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AtualizacaoMedicacao, AtualizacaoProblema, SoapGerado } from "@/lib/prontuario";
import type { Cenario, Paciente, TipoConsulta } from "@/types/database";
import Nav from "@/components/Nav";

export default function NovaConsultaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [tipo, setTipo] = useState<TipoConsulta>("retorno");
  const [cenario, setCenario] = useState<Cenario>("particular");
  const [anotacaoBruta, setAnotacaoBruta] = useState("");

  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [soap, setSoap] = useState<SoapGerado | null>(null);
  const [subjetivo, setSubjetivo] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [avaliacao, setAvaliacao] = useState("");
  const [plano, setPlano] = useState("");
  const [atualizacaoProblemas, setAtualizacaoProblemas] = useState<AtualizacaoProblema[]>([]);
  const [atualizacaoMedicacoes, setAtualizacaoMedicacoes] = useState<AtualizacaoMedicacao[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data } = await supabase.from("pacientes").select("*").eq("id", params.id).single();
      setPaciente(data);
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function gerarProntuario() {
    setErro(null);
    if (!anotacaoBruta.trim()) {
      setErro("Digite ou cole a anotação bruta da consulta antes de gerar.");
      return;
    }
    setGerando(true);
    try {
      const resp = await fetch("/api/gerar-prontuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pacienteId: params.id, anotacaoBruta, tipo, cenario }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error ?? "Erro ao gerar prontuário.");

      const s: SoapGerado = dados.soap;
      setSoap(s);
      setSubjetivo(s.subjetivo);
      setObjetivo(s.objetivo);
      setAvaliacao(s.avaliacao);
      setPlano(s.plano);
      setAtualizacaoProblemas(s.atualizacao_problemas ?? []);
      setAtualizacaoMedicacoes(s.atualizacao_medicacoes ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao gerar prontuário.");
    } finally {
      setGerando(false);
    }
  }

  async function salvarConsulta() {
    setErro(null);
    setSalvando(true);
    try {
      const resp = await fetch("/api/salvar-consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pacienteId: params.id,
          tipo,
          cenario,
          subjetivo,
          objetivo,
          avaliacao,
          plano,
          anotacaoBruta,
          atualizacaoProblemas,
          atualizacaoMedicacoes,
        }),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.error ?? "Erro ao salvar consulta.");
      router.push(`/pacientes/${params.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Nova consulta</h1>
          <p className="text-slate-400 text-sm mt-1">{paciente?.nome ?? "Carregando paciente..."}</p>
        </div>

        <div className="card space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label-field">Tipo de registro</label>
              <select className="input-field" value={tipo} onChange={(e) => setTipo(e.target.value as TipoConsulta)}>
                <option value="primeira_consulta">Primeira consulta</option>
                <option value="retorno">Retorno</option>
                <option value="evolucao">Evolução</option>
              </select>
            </div>
            <div>
              <label className="label-field">Cenário</label>
              <select className="input-field" value={cenario} onChange={(e) => setCenario(e.target.value as Cenario)}>
                <option value="particular">Particular</option>
                <option value="unimed">Unimed</option>
                <option value="santa_casa">Santa Casa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-field">Anotação bruta da consulta</label>
            <textarea
              className="input-field min-h-[160px] font-mono text-sm"
              placeholder="Digite ou cole aqui a anotação livre da consulta..."
              value={anotacaoBruta}
              onChange={(e) => setAnotacaoBruta(e.target.value)}
            />
          </div>

          {erro && <p className="text-sm text-red-400">{erro}</p>}

          <button onClick={gerarProntuario} disabled={gerando} className="btn-primary">
            {gerando ? "Gerando prontuário..." : "Gerar prontuário"}
          </button>
        </div>

        {soap && (
          <div className="card space-y-5">
            <h2 className="text-white font-medium">Revisar e editar antes de salvar</h2>

            <div>
              <label className="label-field">S — Subjetivo</label>
              <textarea className="input-field min-h-[100px]" value={subjetivo} onChange={(e) => setSubjetivo(e.target.value)} />
            </div>
            <div>
              <label className="label-field">O — Objetivo</label>
              <textarea className="input-field min-h-[100px]" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} />
            </div>
            <div>
              <label className="label-field">A — Avaliação</label>
              <textarea className="input-field min-h-[100px]" value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} />
            </div>
            <div>
              <label className="label-field">P — Plano</label>
              <textarea className="input-field min-h-[100px]" value={plano} onChange={(e) => setPlano(e.target.value)} />
            </div>

            {atualizacaoProblemas.length > 0 && (
              <div>
                <p className="label-field">Atualizações de problemas a serem aplicadas</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {atualizacaoProblemas.map((p, i) => (
                    <li key={i}>
                      • {p.condicao} → <span className="text-chiarini-accent2">{p.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {atualizacaoMedicacoes.length > 0 && (
              <div>
                <p className="label-field">Atualizações de medicações a serem aplicadas</p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {atualizacaoMedicacoes.map((m, i) => (
                    <li key={i}>
                      • {m.farmaco} {m.dose} {m.posologia} → <span className="text-chiarini-accent2">{m.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={salvarConsulta} disabled={salvando} className="btn-primary">
              {salvando ? "Salvando..." : "Salvar consulta"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
