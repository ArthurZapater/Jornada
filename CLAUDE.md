# Jornada — contexto para assistentes de código

App web do Challenge FIAP 2026 (Unimed Nacional). **Escopo atual: só frontend** (React 19 + Vite +
Tailwind 4 + React Router 7 + lucide-react), com dados simulados. Não criar backend/banco sem o
time pedir.

## Regras do projeto

- **Idioma:** UI em pt-BR. Domínio em português (`consulta`, `beneficiario`, `encaminhamento`),
  termos técnicos em inglês quando forem do ecossistema (`useState`, `props`, `Button`).
- **Cores:** só via tokens de `src/index.css` (`petroleo-*`, `salvia-*`, `nevoa-*`, `lilas-*`,
  `alerta-*`, `ambar-*`) e os utilitários `glass`/`glass-strong`. Nada de hex solto em componente.
- **Texto secundário:** `text-salvia-600` (passa WCAG AA sobre o vidro). Não usar tons mais claros
  em texto.
- **Dados:** páginas nunca leem `mockDb` direto. Sempre chamam `src/services/*Service.js`, que são
  assíncronos e retornam DTOs, para uma API real poder substituir o mock sem mexer nas telas.
- **Datas do seed** são relativas a "hoje" (`mockDb.js`), para a demo nunca ficar vencida.
  `Consulta.dataHora` usa o formato local `AAAA-MM-DDTHH:MM`.
- **Layout:** `lg` (1024px) é o breakpoint entre sidebar (desktop) e bottom nav (mobile).
- **Padrão de tela de serviço:** `ServiceHero` + `TopicList` + botão pílula de CTA + `SecurityNote`.

## Comandos

- `npm run dev` — servidor local (porta 5173)
- `npm run build` — build de produção
- `npm run lint` — oxlint

Login de demo: `ana.souza@email.com` / `jornada123`.

## Diferenciais implementados

- **Chatbot** (`chatbotService.js`): regras por palavra-chave, sem LLM. Nova intenção entra em
  `INTENCOES_SERVICOS`. Nunca responder pergunta clínica — redirecionar para consulta/emergência.
- **Score de risco** (`riscoService.js`): V1 heurística, determinística. Todo fator novo precisa
  devolver `{ chave, rotulo, detalhe, pontos }`, senão deixa de ser explicável na tela.
- **Pagamento** (`pagamentoService.js`): simulação. Nunca criar campo de cartão, CVV ou conta.

## Segurança

- Regras e auditoria ficam em `src/services/segurancaService.js`; cabeçalhos HTTP em `vercel.json`.
- Erro de login é sempre genérico — não revelar se a conta existe.
- Ações sensíveis novas devem chamar `registrarEvento(...)` para entrar na trilha de auditoria.
- Nunca commitar `.env` nem dados reais de beneficiário; o seed é fictício por definição.
