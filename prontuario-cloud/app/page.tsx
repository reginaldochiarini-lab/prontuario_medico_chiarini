import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const agora = new Date();
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
  const fimHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1).toISOString();

  const [{ data: proximasConsultas }, { data: totalPacientes }, { data: ultimosPacientes }] = await Promise.all([
    supabase
      .from("agenda")
      .select("*, pacientes(nome)")
      .eq("user_id", user!.id)
      .gte("data_hora", inicioHoje)
      .lt("data_hora", fimHoje)
      .eq("status", "agendado")
      .order("data_hora", { ascending: true }),
    supabase.from("pacientes").select("id").eq("user_id", user!.id),
    supabase
      .from("pacientes")
      .select("*")
      .eq("user_id", user!.id)
      .order("criado_em", { ascending: false })
      .limit(5),
  ]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bem-vindo, Dr. Reginaldo Chiarini</h1>
          <p className="text-slate-400 text-sm mt-1">CRM-SP 122194 — Medicina de Família e Comunidade</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-slate-400 text-sm">Pacientes cadastrados</p>
            <p className="text-3xl font-semibold text-white mt-2">{totalPacientes?.length ?? 0}</p>
          </div>
          <div className="card">
            <p className="text-slate-400 text-sm">Consultas agendadas hoje</p>
            <p className="text-3xl font-semibold text-white mt-2">{proximasConsultas?.length ?? 0}</p>
          </div>
          <div className="card flex flex-col justify-center gap-2">
            <Link href="/pacientes" className="btn-primary text-center">
              + Novo paciente
            </Link>
            <Link href="/agenda" className="btn-secondary text-center">
              Ver agenda completa
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="card">
            <h2 className="text-white font-medium mb-4">Próximas consultas de hoje</h2>
            {proximasConsultas && proximasConsultas.length > 0 ? (
              <ul className="space-y-2">
                {proximasConsultas.map((c: any) => (
                  <li key={c.id} className="flex items-center justify-between text-sm border-b border-chiarini-border pb-2 last:border-0">
                    <span className="text-slate-200">{c.pacientes?.nome ?? "Paciente"}</span>
                    <span className="text-slate-400">
                      {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Nenhuma consulta agendada para hoje.</p>
            )}
          </section>

          <section className="card">
            <h2 className="text-white font-medium mb-4">Pacientes recentes</h2>
            {ultimosPacientes && ultimosPacientes.length > 0 ? (
              <ul className="space-y-2">
                {ultimosPacientes.map((p) => (
                  <li key={p.id} className="border-b border-chiarini-border pb-2 last:border-0">
                    <Link href={`/pacientes/${p.id}`} className="text-slate-200 hover:text-chiarini-accent2 text-sm">
                      {p.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">Nenhum paciente cadastrado ainda.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
