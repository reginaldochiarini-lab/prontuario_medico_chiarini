import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";

function calcularIdade(nascimento: string | null): number | null {
  if (!nascimento) return null;
  const hoje = new Date();
  const nasc = new Date(nascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  ) {
    idade -= 1;
  }
  return idade;
}

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta: "Primeira consulta",
  retorno: "Retorno",
  evolucao: "Evolução",
};

export default async function FichaPacientePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .single();

  if (!paciente) notFound();

  const [{ data: problemas }, { data: medicacoes }, { data: consultas }] = await Promise.all([
    supabase
      .from("problemas")
      .select("*")
      .eq("paciente_id", params.id)
      .order("status", { ascending: true })
      .order("criado_em", { ascending: false }),
    supabase
      .from("medicacoes")
      .select("*")
      .eq("paciente_id", params.id)
      .order("status", { ascending: true })
      .order("criado_em", { ascending: false }),
    supabase
      .from("consultas")
      .select("*")
      .eq("paciente_id", params.id)
      .order("data", { ascending: false })
      .order("criado_em", { ascending: false }),
  ]);

  const idade = calcularIdade(paciente.nascimento);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">{paciente.nome}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {idade !== null ? `${idade} anos` : "Idade não informada"} ·{" "}
              {paciente.sexo === "M" ? "Masculino" : paciente.sexo === "F" ? "Feminino" : "Não informado"}
              {paciente.telefone ? ` · ${paciente.telefone}` : ""}
            </p>
          </div>
          <Link href={`/pacientes/${paciente.id}/consulta`} className="btn-primary">
            + Nova consulta
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card">
            <h2 className="text-white font-medium mb-4">Lista de problemas</h2>
            {problemas && problemas.length > 0 ? (
              <ul className="space-y-3">
                {problemas.map((p) => (
                  <li key={p.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${p.status === "ativo" ? "bg-emerald-400" : "bg-slate-600"}`}
                      />
                      <span className={p.status === "ativo" ? "text-slate-100" : "text-slate-500 line-through"}>
                        {p.condicao}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs pl-4">
                      {p.cid_10 ? `CID-10 ${p.cid_10}` : ""}
                      {p.codigo_ciap ? ` · CIAP-2 ${p.codigo_ciap}` : ""}
                      {p.data_inicio ? ` · desde ${new Date(p.data_inicio).toLocaleDateString("pt-BR")}` : ""}
                      {p.status === "inativo" && p.data_resolucao
                        ? ` · resolvido em ${new Date(p.data_resolucao).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum problema registrado.</p>
            )}
          </section>

          <section className="card">
            <h2 className="text-white font-medium mb-4">Medicações</h2>
            {medicacoes && medicacoes.length > 0 ? (
              <ul className="space-y-3">
                {medicacoes.map((m) => (
                  <li key={m.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${m.status === "ativo" ? "bg-emerald-400" : "bg-slate-600"}`}
                      />
                      <span className={m.status === "ativo" ? "text-slate-100" : "text-slate-500 line-through"}>
                        {m.farmaco} {m.dose}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs pl-4">
                      {m.posologia}
                      {m.data_inicio ? ` · desde ${new Date(m.data_inicio).toLocaleDateString("pt-BR")}` : ""}
                      {m.status === "suspenso" && m.data_suspensao
                        ? ` · suspenso em ${new Date(m.data_suspensao).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Nenhuma medicação registrada.</p>
            )}
          </section>
        </div>

        <section className="card">
          <h2 className="text-white font-medium mb-4">Histórico de consultas</h2>
          {consultas && consultas.length > 0 ? (
            <div className="space-y-4">
              {consultas.map((c) => (
                <details key={c.id} className="border border-chiarini-border rounded-lg p-4">
                  <summary className="cursor-pointer flex items-center justify-between text-sm">
                    <span className="text-slate-100 font-medium">
                      {new Date(c.data).toLocaleDateString("pt-BR")} — {TIPO_LABEL[c.tipo] ?? c.tipo}
                    </span>
                    <span className="text-slate-500 uppercase text-xs">{c.cenario}</span>
                  </summary>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <div>
                      <p className="text-slate-500 font-medium mb-1">S — Subjetivo</p>
                      <p className="whitespace-pre-wrap">{c.subjetivo}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-1">O — Objetivo</p>
                      <p className="whitespace-pre-wrap">{c.objetivo}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-1">A — Avaliação</p>
                      <p className="whitespace-pre-wrap">{c.avaliacao}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium mb-1">P — Plano</p>
                      <p className="whitespace-pre-wrap">{c.plano}</p>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Nenhuma consulta registrada ainda.</p>
          )}
        </section>
      </main>
    </div>
  );
}
