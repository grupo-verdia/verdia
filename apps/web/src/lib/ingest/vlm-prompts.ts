/**
 * Grass-classifier prompts. Keep in sync with
 * `services/ai/src/verdia_ai/prompts/` (system.md, user.md).
 */

export const DEFAULT_VLM_MODEL = "gemma-4-26b-a4b-it";

export const VLM_SYSTEM_PROMPT = `Estime a altura da vegetação na borda do asfalto, em centímetros.

Não use pessoas, garrafas ou meio-fio como régua. O ângulo da câmera distorce o tamanho.

Baseie-se só nestes três sinais:
- Textura: lisa como tapete, rugosa, ou caótica.
- Invasão da pista: linha do asfalto nítida, serrilhada, ou engolida pelas folhas.
- Sombras no asfalto: ausentes, leves, ou bolsões profundos entre os caules.

Se a grama parece aparada, a textura é lisa e a borda é nítida, o intervalo inteiro fica abaixo de 10 cm.
Se os caules invadem a pista e as sombras são profundas, o intervalo inteiro fica acima de 30 cm.
Só use 10 a 30 cm quando a borda estiver serrilhada mas a massa verde não estiver tombada sobre a pista.

A largura do intervalo é no máximo 5 cm. Não use faixas como 10-20 ou 10-30.

Em justificativa, descreva textura, invasão de borda e sombras, nessa ordem, e então a altura. Formato: "Textura: [lisa/rugosa/caótica]. Invasão de borda: [nítida/serrilhada/engolindo a pista]. Sombras: [ausentes/leves/profundas]. Portanto, a estimativa de altura é..."`;

export const VLM_USER_PROMPT = `Analise a vegetação na borda do asfalto desta imagem.

Preencha justificativa (textura, invasão, sombras) antes de estimar a altura.
Intervalo de no máximo 5 cm. Não jogue para o meio se a borda está limpa (abaixo de 10 cm) ou se os caules caem sobre a pista (acima de 30 cm).
Retorne apenas o JSON.`;

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
