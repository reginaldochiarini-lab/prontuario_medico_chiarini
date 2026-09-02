import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

// Fase 2: chat de apoio clínico contextualizado ao paciente em tela.
// Mantido simples de propósito — sem histórico persistido ainda.
const client = new Anthropic();

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { pergunta, pacienteId } = await request.json();
  if (!pergunta) {
    return NextResponse.json({ error: "Campo 'pergunta' é obrigatório." }, { status: 400 });
  }

  let contexto = "";
  if (pacienteId) {
    const [{ data: paciente }, { data: problemas }, { data: medicacoes }] = await Promise.all([
      supabase.from("pacientes").select("nome, nascimento, sexo").eq("id", pacienteId).eq("user_id", user.id).single(),
      supabase.from("problemas").select("condicao, status").eq("paciente_id", pacienteId).eq("user_id", user.id).eq("status", "ativo"),
      supabase.from("medicacoes").select("farmaco, dose, posologia").eq("paciente_id", pacienteId).eq("user_id", user.id).eq("status", "ativo"),
    ]);

    if (paciente) {
      contexto = `Paciente: ${paciente.nome} (${paciente.sexo ?? "sexo não informado"}).
Problemas ativos: ${(problemas ?? []).map((p) => p.condicao).join(", ") || "nenhum"}.
Medicações em uso: ${(medicacoes ?? []).map((m) => `${m.farmaco} ${m.dose ?? ""}`).join(", ") || "nenhuma"}.`;
    }
  }

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system:
      "Você é um assistente de apoio clínico para um médico de Medicina de Família e Comunidade (Dr. Reginaldo Chiarini, CRM-SP 122194). Responda com rigor técnico-científico, baseado em evidências, de forma objetiva. Você não substitui o julgamento clínico do médico — é uma ferramenta de apoio à decisão." +
      (contexto ? `\n\nContexto do paciente em tela:\n${contexto}` : ""),
    messages: [{ role: "user", content: pergunta }],
  });

  if (response.stop_reason === "refusal") {
    return NextResponse.json({ error: "A IA não pôde responder a esta pergunta." }, { status: 502 });
  }

  const texto = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return NextResponse.json({ resposta: texto });
}
