# Arquitetura proposta — Verdia x Motiva

```text
CARRO / CÂMERA 360°
        │
        ├── imagem JPG/PNG ou vídeo
        ├── GPS
        ├── timestamp
        ├── KM/sentido (quando disponível)
        ▼
INGESTÃO
POST /api/capturas
        │
        ▼
INFERENCE API
altura_cm + classe + confiança + model_version + overlay
        │
        ▼
SUPABASE
rodovias ─ trechos ─ capturas ─ captura_overrides
        │
        ├───────────────┬─────────────────┐
        ▼               ▼                 ▼
   MAPA             PLANILHA         OBSERVABILIDADE
   pontos GPS       por rodovia      volume / confiança
   severidade       XLSX import/export falhas / overrides
        │
        ▼
EQUIPE MOTIVA
revisa exceções → overwrite → auditoria → manutenção
```

## Vídeo x foto
Para operação em velocidade, a arquitetura deve aceitar os dois. A recomendação para a primeira versão é **vídeo 360° + extração de frames por distância/tempo**, porque reduz a chance de perder ocorrências entre fotos e mantém um fluxo contínuo. Cada frame deve herdar o timestamp e a posição interpolada do GPS. Se o hardware já produzir fotos geotagueadas com intervalo pequeno, o mesmo endpoint funciona sem mudança no painel.

## Regra de severidade
A IA deve produzir `altura_cm` e `ai_classe`. O backend mantém `classe_final`. Quando houver divergência, a pessoa autorizada usa o overwrite. O histórico vai para `captura_overrides`, nunca apagando a decisão original.

Os limites de 30/60 cm no protótipo são **placeholders**. Eles precisam ser configurados com os critérios oficiais da Motiva antes de qualquer uso operacional.

## Excel operacional
- Importação aceita variações de cabeçalho com/sem acentos e diferentes capitalizações.
- Datas Excel seriais, datas BR e ISO são normalizadas para ISO 8601.
- A importação retorna linhas recebidas, importadas e erros por linha; a interface atualiza a tabela sem reload.
- `Classe Final`, `Decisão` e `Motivo Override` são respeitados e, quando necessário, registrados como override auditável.
- Exportação gera uma aba `Capturas` com o mesmo contrato de dados usado na importação e uma aba `Resumo`.
