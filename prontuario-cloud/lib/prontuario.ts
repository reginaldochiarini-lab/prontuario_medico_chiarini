import Anthropic from "@anthropic-ai/sdk";
import { montarPromptProntuario, type ContextoPaciente } from "@/lib/prompt-prontuario";

export interface AtualizacaoProblema {
  condicao: string;
  status: "ativo" | "inativo";
  cid_10?: string;
  codigo_ciap?: string;
}

export interface AtualizacaoMedicacao {
  farmaco: string;
  dose?: string;
  posologia?: string;
  status: "ativo" | "suspenso";
}

export interface SoapGerado {
  subjetivo: string;
  objetivo: string;
  avaliacao: string;
  plano: string;
  atualizacao_problemas: AtualizacaoProblema[];
  atualizacao_medicacoes: AtualizacaoMedicacao[];
}

const client = new Anthropic();

/**
 * Extrai o primeiro objeto JSON válido de uma string. A IA foi instruída a
 * responder apenas com JSON, mas isso protege contra crases ou texto extra
 * ocasional.
 */
function extrairJson(texto: string): unknown {
  const inicio = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (inicio === -1 || fim === -1 || fim < inicio) {
    throw new Error("A IA não retornou um JSON reconhecível.");
  }
  return JSON.parse(texto.slice(inicio, fim + 1));
}

function validarSoap(obj: unknown): SoapGerado {
  if (typeof obj !== "object" || obj === null) {
    throw new Error("Formato de resposta inválido da IA.");
  }
  const o = obj as Record<string, unknown>;
  const camposTexto = ["subjetivo", "objetivo", "avaliacao", "plano"] as const;
  for (const campo of camposTexto) {
    if (typeof o[campo] !== "string") {
      throw new Error(`Campo obrigatório ausente ou inválido: ${campo}`);
    }
  }
  return {
    subjetivo: o.subjetivo as string,
    objetivo: o.objetivo as string,
    avaliacao: o.avaliacao as string,
    plano: o.plano as string,
    atualizacao_problemas: Array.isArray(o.atualizacao_problemas)
      ? (o.atualizacao_problemas as AtualizacaoProblema[])
      : [],
    atualizacao_medicacoes: Array.isArray(o.atualizacao_medicacoes)
      ? (o.atualizacao_medicacoes as AtualizacaoMedicacao[])
      : [],
  };
}

export async function gerarProntuario(ctx: ContextoPaciente): Promise<SoapGerado> {
  const prompt = montarPromptProntuario(ctx);

  const response = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system:
      "Você segue rigorosamente o formato solicitado. Responda apenas com JSON válido, sem markdown, sem texto fora do JSON.",
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("A IA recusou a geração deste registro. Revise a anotação e tente novamente.");
  }

  const textoResposta = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return validarSoap(extrairJson(textoResposta));
}
