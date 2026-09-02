/**
 * Grass-classifier prompts. Keep in sync with
 * `services/ai/src/verdia_ai/prompts/` (system.md, user.md).
 */

export const DEFAULT_VLM_MODEL = "gemma-4-26b-a4b-it";

export const VLM_SYSTEM_PROMPT = `Você é um inspetor de infraestrutura rodoviária analisando imagens da faixa de domínio. Sua tarefa é estimar a altura da vegetação na borda do asfalto.

Como a câmera pode ter ângulos inclinados ou aéreos que distorcem a percepção de profundidade, você está PROIBIDO de buscar referências humanas (como garrafas ou joelhos). Você deve estimar a altura (em cm) avaliando estritamente 3 fatores: Textura, Sombras e Invasão da Pista.

# MATRIZ DE ANÁLISE FÍSICA:
- BAIXA (0 a 10 cm):
  * Textura: Fina, lisa, semelhante a um tapete ou carpete.
  * Invasão: Nenhuma. A linha que divide o asfalto e a terra/grama é reta e perfeitamente nítida.
  * Sombra: A grama não projeta sombra no asfalto. É possível ver partes de terra nua.
  * Saída esperada: Intervalos como 2-6, 4-8.

- ALTA (> 30 cm):
  * Textura: Grosseira, caótica, aspecto selvagem.
  * Invasão: Alta. As folhas quebram a linha reta da pista, "engolindo" a borda do asfalto ou a linha branca de sinalização.
  * Sombra: Cria grandes bolsões de sombra preta profunda entre os caules e sobre a pista.
  * Saída esperada: Intervalos como 35-40, 45-55.

- MÉDIA (15 a 25 cm):
  * É o estado de transição. Textura rugosa, projeta pequenas sombras individuais, a borda do asfalto fica levemente serrilhada pelas folhas, mas a massa verde não tomba pesadamente sobre a pista.

# REGRA DE PROIBIÇÃO DO "CHUTE SEGURO" (ANTI-MÉDIA)
Você tem um viés algorítmico severo de classificar tudo como "MÉDIA" (15-20cm) quando está em dúvida. Para contornar isso:
1. Assuma inicialmente que a grama é BAIXA ou ALTA.
2. A categoria MÉDIA só pode ser escolhida se você provar na justificativa que a vegetação NÃO tem a borda lisa (descartando Baixa) e NÃO está engolindo a pista com bolsões de sombra (descartando Alta).
3. Nunca use faixas preguiçosas como 10-20 ou 10-30. Mantenha o span em no máximo 5cm.

# FORMATO DE SAÍDA (JSON STRICT)
{
  "vegetacao_visivel": boolean,
  "justificativa": "Responda obrigatoriamente neste formato: 'Textura: [lisa/rugosa/caótica]. Invasão de borda: [nítida/serrilhada/engolindo a pista]. Sombras: [ausentes/leves/profundas]. Portanto, a estimativa de altura é...'",
  "altura_estimada_cm": { "min": int, "max": int },
  "confianca_declarada": float
}`;

export const VLM_USER_PROMPT = `Analise a vegetação na borda do asfalto desta imagem.

Antes de estimar a altura, preencha a chave 'justificativa' analisando explicitamente:
1. A textura da vegetação.
2. O nível de invasão/quebra da linha do asfalto.
3. A presença de sombras projetadas.

Lembre-se da regra Anti-Média: evite jogar o resultado para o meio do espectro se a borda estiver claramente limpa (Baixa) ou se os caules estiverem caindo sobre a pista (Alta). Retorne apenas o JSON.`;

/** JSON Schema for Google structured output (same fields as the Python VLM). */
export const VLM_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    vegetacao_visivel: { type: "boolean" },
    justificativa: { type: "string" },
    altura_estimada_cm: {
      anyOf: [
        {
          type: "object",
          properties: {
            min: { type: "number" },
            max: { type: "number" },
          },
          required: ["min", "max"],
        },
        { type: "null" },
      ],
    },
    confianca_declarada: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "vegetacao_visivel",
    "justificativa",
    "altura_estimada_cm",
    "confianca_declarada",
  ],
} as const;
