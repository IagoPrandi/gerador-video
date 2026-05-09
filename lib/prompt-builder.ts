export function buildVideoPrompt(userPrompt: string) {
  return `
Crie um vídeo cinematográfico com base nesta ideia:

"${userPrompt}"

Direção visual:
- Movimento de câmera claro e natural.
- Iluminação bem descrita.
- Estilo visual consistente do início ao fim.
- Ação principal simples e compreensível.
- Sem texto na tela, a menos que tenha sido pedido.
- Composição profissional.
- Evite mudanças bruscas de personagem, cenário ou estilo.

Prompt final:
${userPrompt}
`.trim();
}
