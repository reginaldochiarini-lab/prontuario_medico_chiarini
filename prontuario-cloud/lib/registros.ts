import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { Medicacao, Problema } from "@/types/database";
import type { AtualizacaoMedicacao, AtualizacaoProblema } from "@/lib/prontuario";

/**
 * REGRA DE OURO: problemas e medicações nunca são deletados. Uma condição
 * resolvida migra para status 'inativo' com data_resolucao; uma medicação
 * suspensa migra para 'suspenso' com data_suspensao. Uma condição/fármaco
 * novo é inserido como linha nova. Nada é sobrescrito silenciosamente —
 * toda mudança fica datada em atualizado_em pelo trigger do banco.
 */
export async function aplicarAtualizacaoProblemas(
  supabase: TypedSupabaseClient,
  userId: string,
  pacienteId: string,
  problemasAtuais: Problema[],
  atualizacoes: AtualizacaoProblema[],
): Promise<void> {
  const hoje = new Date().toISOString().slice(0, 10);

  for (const upd of atualizacoes) {
    const existente = problemasAtuais.find(
      (p) => p.condicao.trim().toLowerCase() === upd.condicao.trim().toLowerCase(),
    );

    if (existente) {
      await supabase
        .from("problemas")
        .update({
          status: upd.status,
          cid_10: upd.cid_10 ?? existente.cid_10,
          codigo_ciap: upd.codigo_ciap ?? existente.codigo_ciap,
          data_resolucao: upd.status === "inativo" ? existente.data_resolucao ?? hoje : null,
        })
        .eq("id", existente.id)
        .eq("user_id", userId);
    } else {
      await supabase.from("problemas").insert({
        paciente_id: pacienteId,
        user_id: userId,
        condicao: upd.condicao,
        data_inicio: hoje,
        status: upd.status,
        cid_10: upd.cid_10 ?? null,
        codigo_ciap: upd.codigo_ciap ?? null,
        data_resolucao: upd.status === "inativo" ? hoje : null,
      });
    }
  }
}

export async function aplicarAtualizacaoMedicacoes(
  supabase: TypedSupabaseClient,
  userId: string,
  pacienteId: string,
  medicacoesAtuais: Medicacao[],
  atualizacoes: AtualizacaoMedicacao[],
  prescritor: string,
): Promise<void> {
  const hoje = new Date().toISOString().slice(0, 10);

  for (const upd of atualizacoes) {
    const existente = medicacoesAtuais.find(
      (m) => m.farmaco.trim().toLowerCase() === upd.farmaco.trim().toLowerCase() && m.status === "ativo",
    );

    if (existente && upd.status === "suspenso") {
      // Suspender a medicação existente — nunca deletar.
      await supabase
        .from("medicacoes")
        .update({ status: "suspenso", data_suspensao: hoje })
        .eq("id", existente.id)
        .eq("user_id", userId);
    } else if (existente && upd.status === "ativo") {
      const doseMudou = upd.dose && upd.dose !== existente.dose;
      const posologiaMudou = upd.posologia && upd.posologia !== existente.posologia;
      if (doseMudou || posologiaMudou) {
        // Ajuste de dose/posologia: suspende a linha antiga (datada) e cria
        // uma nova — preserva o histórico em vez de sobrescrever.
        await supabase
          .from("medicacoes")
          .update({ status: "suspenso", data_suspensao: hoje })
          .eq("id", existente.id)
          .eq("user_id", userId);

        await supabase.from("medicacoes").insert({
          paciente_id: pacienteId,
          user_id: userId,
          farmaco: upd.farmaco,
          dose: upd.dose ?? existente.dose,
          posologia: upd.posologia ?? existente.posologia,
          data_inicio: hoje,
          prescritor,
          status: "ativo",
        });
      }
    } else if (!existente) {
      await supabase.from("medicacoes").insert({
        paciente_id: pacienteId,
        user_id: userId,
        farmaco: upd.farmaco,
        dose: upd.dose ?? null,
        posologia: upd.posologia ?? null,
        data_inicio: hoje,
        prescritor,
        status: upd.status,
        data_suspensao: upd.status === "suspenso" ? hoje : null,
      });
    }
  }
}
