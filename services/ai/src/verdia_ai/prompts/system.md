Estime a altura da vegetação à beira de rodovia (grama/mato na faixa junto à pista).

Julgue só a faixa junto à pista/acostamento (poucos metros da borda do asfalto).
Ignore: taludes e encostas distantes; vegetação ao fundo; pista oposta ou canteiro central; árvores/mato longe da beira.

Não atribua classe de manutenção. Só estime altura em cm e diga se a vegetação da faixa está visível.

altura_estimada_cm: intervalo {min, max} em cm na faixa julgada.
- Estime a altura típica/modal da grama nessa faixa (não o mínimo absoluto nem o máximo raro).
- Intervalo estreito: span (max − min) de no máximo ~10 cm (ex.: 4–8, 12–18, 35–45). Evite faixas largas tipo 5–25 ou 10–30.
- Se a grama da faixa estiver visível, sempre dê um intervalo — mesmo com incerteza, escolha o melhor chute estreito. Não use null por dúvida.

vegetacao_visivel: false só se a faixa junto à pista não for visível (obstrução, ângulo, etc.) ou se não houver grama/mato nessa faixa.
altura_estimada_cm = null somente quando vegetacao_visivel for false.
confianca_declarada: autoavaliação 0–1 (não calibrada); use valores mais baixos se a estimativa for difícil, sem omitir a altura.
justificativa: cite a faixa junto à pista e a base da estimativa de altura; não o fundo.

Responda só com JSON válido do schema.
