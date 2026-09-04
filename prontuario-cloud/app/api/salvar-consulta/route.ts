import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aplicarAtualizacaoMedicacoes, aplicarAtualizacaoProblemas } from "@/lib/registros";
import type { AtualizacaoMedicacao, AtualizacaoProblema } from "@/lib/prontuario";
import type { Cenario, TipoConsulta } from "@/types/database";

export async function POST(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const pacienteId: string | undefined = body.pacienteId;
  const tipo: TipoConsulta | undefined = body.tipo;
  const cenario: Cenario | undefined = body.cenario;
  const subjetivo: string | undefined = body.subjetivo;
  const objetivo: string | undefined = body.objetivo;
  const avaliacao: string | undefined = body.avaliacao;
  const plano: string | undefined = body.plano;
  const anotacaoBruta: string | undefined = body.anotacaoBruta;
  const atualizacaoProblemas: AtualizacaoProblema[] = body.atualizacaoProblemas ?? [];
  const atualizacaoMedicacoes: AtualizacaoMedicacao[] = body.atualizacaoMedicacoes ?? [];

  if (!pacienteId || !tipo || !cenario || !subjetivo || !objetivo || !avaliacao || !plano) {
    return NextResponse.json({ error: "Campos obrigatórios ausentes." }, { status: 400 });
  }

  const { data: paciente, error: erroPaciente } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("user_id", user.id)
    .single();

  if (erroPaciente || !paciente) {
    return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
  }

  const { data: consulta, error: erroConsulta } = await supabase
    .from("consultas")
    .insert({
      paciente_id: pacienteId,
      user_id: user.id,
      tipo,
      cenario,
      subjetivo,
      objetivo,
      avaliacao,
      plano,
      anotacao_bruta: anotacaoBruta ?? null,
    })
    .select()
    .single();

  if (erroConsulta || !consulta) {
    return NextResponse.json({ error: "Falha ao salvar a consulta." }, { status: 500 });
  }

  const [{ data: problemasAtuais }, { data: medicacoesAtuais }] = await Promise.all([
    supabase.from("problemas").select("*").eq("paciente_id", pacienteId).eq("user_id", user.id),
    supabase.from("medicacoes").select("*").eq("paciente_id", pacienteId).eq("user_id", user.id),
  ]);

  if (atualizacaoProblemas.length > 0) {
    await aplicarAtualizacaoProblemas(supabase, user.id, pacienteId, problemasAtuais ?? [], atualizacaoProblemas);
  }
  if (atualizacaoMedicacoes.length > 0) {
    const prescritor = process.env.NEXT_PUBLIC_MEDICO_NOME ?? "Dr. Reginaldo Chiarini";
    await aplicarAtualizacaoMedicacoes(
      supabase,
      user.id,
      pacienteId,
      medicacoesAtuais ?? [],
      atualizacaoMedicacoes,
      prescritor,
    );
  }

  return NextResponse.json({ consulta });
}
