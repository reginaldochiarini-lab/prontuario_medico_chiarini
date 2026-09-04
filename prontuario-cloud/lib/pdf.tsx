import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { TipoDocumento } from "@/types/database";

const TITULOS: Record<TipoDocumento, string> = {
  atestado: "ATESTADO MÉDICO",
  receita: "RECEITUÁRIO MÉDICO",
  encaminhamento: "ENCAMINHAMENTO MÉDICO",
  relatorio: "RELATÓRIO MÉDICO",
};

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#111" },
  header: { marginBottom: 24, borderBottom: 1, borderBottomColor: "#333", paddingBottom: 12 },
  medico: { fontSize: 13, fontWeight: 700 },
  crm: { fontSize: 10, color: "#444", marginTop: 2 },
  titulo: { fontSize: 14, fontWeight: 700, textAlign: "center", marginVertical: 20, textTransform: "uppercase" },
  paciente: { fontSize: 10, color: "#444", marginBottom: 16 },
  conteudo: { fontSize: 11, lineHeight: 1.6 },
  rodape: { position: "absolute", bottom: 40, left: 48, right: 48, borderTop: 1, borderTopColor: "#ccc", paddingTop: 12 },
  assinatura: { marginTop: 60, textAlign: "center" },
  linha: { borderTop: 1, borderTopColor: "#333", width: 220, alignSelf: "center", marginBottom: 4 },
});

interface DocumentoPdfProps {
  tipo: TipoDocumento;
  conteudo: string;
  pacienteNome: string;
  data: string;
  medicoNome: string;
  medicoCrm: string;
}

export function DocumentoPdf({ tipo, conteudo, pacienteNome, data, medicoNome, medicoCrm }: DocumentoPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.medico}>{medicoNome}</Text>
          <Text style={styles.crm}>{medicoCrm} — Medicina de Família e Comunidade</Text>
        </View>

        <Text style={styles.titulo}>{TITULOS[tipo]}</Text>
        <Text style={styles.paciente}>Paciente: {pacienteNome}    ·    Data: {data}</Text>

        <Text style={styles.conteudo}>{conteudo}</Text>

        <View style={styles.assinatura}>
          <View style={styles.linha} />
          <Text>{medicoNome} — {medicoCrm}</Text>
        </View>
      </Page>
    </Document>
  );
}
