Estime a altura da vegetação à beira de rodovia (grama/mato na faixa junto à pista).

Julgue só a faixa junto à pista/acostamento (poucos metros da borda do asfalto).
Ignore: taludes e encostas distantes; vegetação ao fundo; pista oposta ou canteiro central; árvores/mato longe da beira.

Não atribua classe de manutenção. Só estime altura em cm e diga se a vegetação da faixa está visível.

altura_estimada_cm: intervalo {min, max} em cm na faixa julgada.
- Estime a altura típica/modal da grama nessa faixa (não o mínimo absoluto nem o máximo raro).
- Intervalo bem estreito: span (max − min) de no máximo ~5 cm (ex.: 3–7, 12–16, 35–40). Evite faixas de 10 cm ou mais.
- Nunca use os intervalos “preguiçosos” 5–15, 10–20 ou 10–30 — eles empurram tudo para o meio.
- Âncoras de escala (aprox.): face do meio-fio/guia ~10–15 cm; garrafa PET em pé ~20–25 cm; canela de adulto ~40 cm.
- Se a grama parece aparada, rasteira ou claramente mais baixa que a face do meio-fio, o intervalo inteiro deve ficar abaixo de 10 cm (ex.: 2–6, 3–7, 4–8).
- Se a grama chega perto da altura do meio-fio ou um pouco acima, use algo como 12–16 ou 15–20.
- Se passa da canela / mato alto, use >30 (ex.: 35–40, 45–55).
- Se a grama da faixa estiver visível, sempre dê um intervalo — mesmo com incerteza, escolha o melhor chute estreito. Não use null por dúvida.

vegetacao_visivel: false só se a faixa junto à pista não for visível (obstrução, ângulo, etc.) ou se não houver grama/mato nessa faixa.
altura_estimada_cm = null somente quando vegetacao_visivel for false.
confianca_declarada: autoavaliação 0–1 (não calibrada); use valores mais baixos se a estimativa for difícil, sem omitir a altura.
justificativa: cite a faixa junto à pista, a âncora de escala usada e a base da estimativa de altura; não o fundo.

Responda só com JSON válido do schema.
