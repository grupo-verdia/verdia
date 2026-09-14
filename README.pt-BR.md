# verdia

Também em [inglês](./README.md).

A Motiva ainda classifica a grama na margem da rodovia no olhômetro. verdia pega uma foto com GPS, estima a altura e diz o que cortar primeiro.

A [Motiva](https://www.motiva.com.br/) (antes Grupo CCR) opera concessões de rodovia, ferrovia e aeroporto. Este produto cobre só a vegetação na margem. A classe é o que a foto mostrou. O planejamento ordena pelo prazo até 30 cm.

## O que faz

Você envia fotos pelo navegador, ou importa uma planilha. A planilha traz números, não fotos. Nessas linhas a interface mostra Sem imagem. Cada foto precisa de GPS, no arquivo ou digitado. Sem GPS, não é captura. Cada captura vale 500 m de margem, o mesmo comprimento que a Motiva usa quando alguém faz isso à mão.

Um modelo de visão estima a altura em centímetros. O código encaixa isso nas faixas da Motiva:

- abaixo de 10 cm: baixa
- 10-30 cm: média
- acima de 30 cm: alta

Se a faixa não aparece na foto, ou não tem grama, a classe fica vazia depois da classificação. Enquanto a foto espera na fila, a classe também fica vazia. Se o modelo não tiver certeza, ainda estima a altura, com confiança menor. A severidade segue a classe. A fila de corte usa o prazo até 30 cm. Classe vazia depois da classificação não tem prazo. Falha de classificação não entra no Planejamento.

Se a classificação falhar, a captura mesmo assim é salva, com o erro nela.

Dali o operador vê as capturas, marca no mapa, agrupa por rodovia, corrige uma classe errada e trabalha a fila: prazo até 30 cm, depois rodovia, depois km.

A interface está em português.

- Visão geral mostra as capturas e o que cortar agora ou nesta semana, inclusive quantas ainda esperam.
- Nova captura é o envio de fotos com GPS, de até 10 MB cada. Foto pesada é reduzida no navegador antes de subir. O lote é salvo primeiro, depois classificado. Fecha a aba: as fotos ficam. Continue em Nova captura.
- O mapa mostra um pino por captura, na cor da classe. Clique na bolinha para ver a foto junto dos dados.
- Rodovias agrupa por rodovia, importa e exporta Excel, e deixa corrigir a classe ou remover uma captura. A lista mostra a foto de cada captura.
- Claro e escuro usam o mesmo layout. O botão na barra lateral (e no topo do celular) troca o modo.
- Planejamento é a fila de corte, menor prazo até 30 cm primeiro. Não entra foto ainda na fila nem foto cuja classificação falhou.
- Observabilidade mostra confiança, fila, falhas e correções.

Ficou de fora o vídeo sincronizado com GPS, a detecção de deriva, a otimização de rota e a conta de usuário. Uma senha compartilhada libera o acesso.

Os termos do produto (captura, trecho, classe, severidade, prazo, rodovia) estão no [`CONTEXT.md`](./CONTEXT.md).

O app do operador fica em `apps/web`. É o mesmo site no celular. Abaixo de ~700px, a navegação é uma barra embaixo, não um app separado. O classificador fica em `services/ai`.

## Na sua máquina

Você precisa de Node.js 22+, npm, Python 3.12+, [uv](https://docs.astral.sh/uv/) e um projeto Supabase. Nuvem ou `supabase start` servem. Sem `SUPABASE_URL` e `SUPABASE_SECRET_KEY`, o app web não sobe.

### Web

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Coloque `DEMO_PASSWORD`, `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no `.env.local`. Rode o SQL em `supabase/migrations/` antes, na ordem do timestamp.

Abra [http://localhost:3000](http://localhost:3000). Você cai em `/login`. A senha de `DEMO_PASSWORD` libera o app.

### Classificador

Para classificar de verdade na Nova captura, coloque `GOOGLE_API_KEY` em `apps/web/.env.local`. É a mesma chave de `services/ai/.env` (copie de `services/ai/.env.example`). No Vercel, a Nova captura também usa essa chave. Não configure `VLM_INFERENCE_URL` no Vercel.

Para classificar com o servidor Python local, deixe `GOOGLE_API_KEY` de fora do processo web e aponte para ele:

```bash
cd services/ai
uv sync
VLM_FAKE=1 uv run python -m verdia_ai serve
```

No `apps/web/.env.local`:

```bash
VLM_INFERENCE_URL=http://127.0.0.1:8000
```

`VLM_FAKE=1` é o stub. Tire isso e exporte `GOOGLE_API_KEY` quando quiser chamada real. Detalhes: [`services/ai/README.md`](./services/ai/README.md).

Classificar uma pasta sem o servidor HTTP:

```bash
cd services/ai
VLM_FAKE=1 uv run python -m verdia_ai.classify path/to/photos --summary
```

### Testes

```bash
cd apps/web
npm test
npm run lint
npm run typecheck

cd services/ai
uv run pytest
```

Os testes do web fingem o banco. O app rodando, não.

## Publicar

Web no Vercel, dados no Supabase. Nova captura no Vercel classifica com `GOOGLE_API_KEY`.

