# Verdia x Motiva — upgrade do protótipo

## O que mudou
- Dashboard operacional com KPIs, alertas e mapa.
- Identidade visual Verdia + Motiva baseada no logo enviado.
- Mapa operacional com cada captura georreferenciada.
- Cadastro/seleção de rodovias e tabela por rodovia.
- Importação e exportação `.xlsx`.
- Overwrite manual da decisão da IA com motivo e auditoria.
- Observabilidade de volume, confiança, falhas e taxa de intervenção humana.
- Modelo de dados preparado para altura em cm, KM, sentido, modelo e versão da decisão.
- Migração Supabase para `rodovias`, `trechos`, `capturas` e `captura_overrides`.

## Rodar
```bash
cd apps/web
npm install
npm run dev
```

Adicione ao `.env.local`:
```env
DEMO_PASSWORD=verdia-demo
SUPABASE_URL=
SUPABASE_SECRET_KEY=
INFERENCE_URL=http://127.0.0.1:8000
INFERENCE_API_KEY=
WEB_URL=http://127.0.0.1:3000
```

Aplique `supabase/migrations/20260807090000_verdia_operacional.sql` antes de usar o modo Supabase.

> Os limites de 30/60 cm são parâmetros de demonstração. Não representam o limite contratual da Motiva e precisam ser configurados com os critérios oficiais.

## Contrato de ingestão sugerido
`POST /api/capturas` recebe JSON com:
- `rodoviaId`, `trechoId`, `lat`, `lon`, `capturedAt`
- `km`, `sentido`
- `alturaCm`
- `aiClasse`, `aiConfidence`, `modelVersion`
- `imageBase64`, `contentType`
- `inferenceError` quando houver falha

O próximo passo para o veículo é fazer o agente de captura gerar exatamente esse payload após cada frame/foto ou após um intervalo definido de vídeo.

## Sincronização operacional

A versão atual usa uma única fonte de dados (`src/lib/verdia-store.ts`) para planilhas, mapa, planejamento, observabilidade e visão geral.

- Com `SUPABASE_URL` + `SUPABASE_SECRET_KEY`: dados ficam no Supabase.
- Sem Supabase: o modo local persiste capturas em `apps/web/.data/verdia-local.json`, evitando perda ao trocar de rota, atualizar a página ou ocorrer HMR durante o desenvolvimento.
- O endpoint `GET /api/capturas` agora usa a mesma fonte de dados do restante da aplicação.
- Visão geral, mapa, planejamento, observabilidade e rodovias fazem revalidação automática a cada 5 segundos.
