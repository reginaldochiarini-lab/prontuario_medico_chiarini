import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gerarProntuario } from "@/lib/prontuario";
import type { Cenario, TipoConsulta } from "@/types/database";

function calcularIdade(nascimento: string | null): number | null {
  if (!nascimento) return null;
  const hoje = new Date();
  const nasc = new Date(nascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate());
  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

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
  const anotacaoBruta: string | undefined = body.anotacaoBruta;
  const tipo: TipoConsulta | undefined = body.tipo;
  const cenario: Cenario | undefined = body.cenario;

  if (!pacienteId || !anotacaoBruta || !tipo || !cenario) {
    return NextResponse.json(
      { error: "Campos obrigatórios: pacienteId, anotacaoBruta, tipo, cenario." },
      { status: 400 },
    );
  }

  const { data: paciente, error: erroPaciente } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", pacienteId)
    .eq("user_id", user.id)
    .single();

  if (erroPaciente || !paciente) {
    return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });
  }

  const [{ data: problemas }, { data: medicacoes }] = await Promise.all([
    supabase.from("problemas").select("*").eq("paciente_id", pacienteId).eq("user_id", user.id),
    supabase.from("medicacoes").select("*").eq("paciente_id", pacienteId).eq("user_id", user.id),
  ]);

  try {
    const soap = await gerarProntuario({
      nome: paciente.nome,
      idade: calcularIdade(paciente.nascimento),
      sexo: paciente.sexo,
      problemas: problemas ?? [],
      medicacoes: medicacoes ?? [],
      cenario,
      tipo,
      anotacaoBruta,
    });

    return NextResponse.json({ soap });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao gerar prontuário.";
    return NextResponse.json({ error: mensagem }, { status: 502 });
  }
}
