import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { listCapturas, listRodovias } from "@/lib/verdia-store";

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("rodoviaId");
    if (!id) return NextResponse.json({ error: "rodoviaId obrigatório" }, { status: 400 });

    const [rows, roads] = await Promise.all([listCapturas(id), listRodovias()]);
    const road = roads.find((r) => r.id === id);
    if (!road) return NextResponse.json({ error: "Rodovia não encontrada" }, { status: 404 });

    const data = rows.map((c) => ({
      "ID Captura": c.id,
      "Rodovia": road.codigo,
      "Nome da Rodovia": road.nome,
      "KM": c.km,
      "Sentido": c.sentido,
      "Data/Hora": c.capturedAt,
      "Latitude": c.lat,
      "Longitude": c.lon,
      "Altura (cm)": c.alturaCm,
      "Classe IA": c.aiClasse,
      "Confiança IA": c.aiConfidence,
      "Classe Final": c.classeFinal,
      "Decisão": c.decisaoOrigem,
      "Versão Modelo": c.modelVersion,
      "Status": c.classeFinal === "alta" ? "Aberta" : c.classeFinal === "média" ? "Em análise" : c.classeFinal === "baixa" ? "Resolvida" : "Pendente",
      "Imagem/Frame": c.storageKey,
      "Motivo Override": c.overrideMotivo,
      "Override em": c.overrideAt,
      "Erro Inferência": c.inferenceError,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      16, 14, 34, 10, 12, 22, 14, 14, 14, 14, 16, 14, 12, 20, 16, 38, 48, 22, 42,
    ].map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, "Capturas");

    const summary = XLSX.utils.json_to_sheet([
      { Campo: "Rodovia", Valor: road.codigo },
      { Campo: "Nome", Valor: road.nome },
      { Campo: "Concessionária", Valor: road.concessionaria },
      { Campo: "Total de capturas", Valor: rows.length },
      { Campo: "Alta", Valor: rows.filter((c) => c.classeFinal === "alta").length },
      { Campo: "Média", Valor: rows.filter((c) => c.classeFinal === "média").length },
      { Campo: "Baixa", Valor: rows.filter((c) => c.classeFinal === "baixa").length },
      { Campo: "Overrides", Valor: rows.filter((c) => c.decisaoOrigem === "manual").length },
    ]);
    XLSX.utils.book_append_sheet(wb, summary, "Resumo");

    const bytes = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    const safe = road.codigo.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="verdia-${safe}-capturas.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao exportar Excel." }, { status: 500 });
  }
}
