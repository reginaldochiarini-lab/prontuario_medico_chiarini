import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { DocumentoPdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const documentoId = request.nextUrl.searchParams.get("id");
  if (!documentoId) {
    return NextResponse.json({ error: "Parâmetro 'id' é obrigatório." }, { status: 400 });
  }

  const { data: documento, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("id", documentoId)
    .eq("user_id", user.id)
    .single();

  if (error || !documento) {
    return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  }

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("nome")
    .eq("id", documento.paciente_id)
    .eq("user_id", user.id)
    .single();

  const pacienteNome = paciente?.nome ?? "Paciente";
  const medicoNome = process.env.NEXT_PUBLIC_MEDICO_NOME ?? "Dr. Reginaldo Chiarini";
  const medicoCrm = process.env.NEXT_PUBLIC_MEDICO_CRM ?? "CRM-SP 122194";

  const buffer = await renderToBuffer(
    DocumentoPdf({
      tipo: documento.tipo,
      conteudo: documento.conteudo,
      pacienteNome,
      data: new Date(documento.criado_em).toLocaleDateString("pt-BR"),
      medicoNome,
      medicoCrm,
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${documento.tipo}-${pacienteNome.replace(/\s+/g, "_")}.pdf"`,
    },
  });
}
