# Prompt2Video Studio

Projeto MVP em Next.js para gerar vídeo a partir de um prompt e URLs de imagens de referência usando a API da OpenRouter.

## Requisitos

- Node.js 18+
- Uma chave da OpenRouter

## Como rodar

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra:

```txt
http://localhost:3000
```

## Configure sua API key

Edite o arquivo `.env.local`:

```env
OPENROUTER_API_KEY=sua_chave_aqui
OPENROUTER_VIDEO_MODEL=kwaivgi/kling-v3.0-std
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

O arquivo `.env.local` está no `.gitignore` e não deve ser enviado para repositórios.

## Como usar

1. Digite um prompt descrevendo o vídeo.
2. Opcionalmente cole URLs públicas de imagens de referência, uma por linha.
3. Escolha duração, resolução e formato.
4. Clique em **Gerar vídeo**.
5. Clique em **Consultar status** ou deixe o auto status ligado.
6. Quando o status for `completed`, o vídeo aparecerá na tela.

## Estrutura

```txt
app/
  api/videos/create/route.ts   # cria o job de vídeo na OpenRouter
  api/videos/status/route.ts   # consulta status do job
  page.tsx                     # interface web
lib/
  openrouter.ts                # cliente da OpenRouter
  prompt-builder.ts            # melhoria simples do prompt
types/
  video.ts                     # tipos TypeScript
```

## Observações

- O MVP usa URLs públicas de imagens como referência.
- Para upload real de arquivos, use S3, Cloudflare R2, Supabase Storage ou outro storage público/assinado.
- O polling automático está configurado para consultar a cada 30 segundos.
