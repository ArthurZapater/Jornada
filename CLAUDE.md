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

- **Chatbot** (`chatbotService.js`): regras por palavra-chave, sem LLM. Nunca responder pergunta
  clínica — redirecionar para consulta/emergência.
  - Intenção nova entra em `INTENCOES_SERVICOS`, `INTENCOES_PLANO` ou `INTENCOES_APP`; `PRIORITARIAS`
    e `ACOES` são camadas de desempate, não listas de assunto.
  - Palavra-chave de verbo vai como **radical** (`cancel`, `agend`), senão "cancelo" não casa.
  - Não inventar regra de contrato (carência, reembolso, cobertura): responder que não sabe e marcar
    `whatsapp: true`. Idem para o que o app ainda não faz.
- **Voz** (`useReconhecimentoDeFala`): só liga sob toque do usuário, e a tela avisa que a
  transcrição é feita pelo navegador. Navegador sem suporte simplesmente não mostra o botão.
  - O envio é automático ao fim da fala (`aoConcluir`), com o ditado acumulado numa ref — não
    depender do estado do React ter sido aplicado a tempo.
  - A API é lida por `obterReconhecimento()` na hora de usar, não no topo do módulo: é o que permite
    trocá-la por um dublê ao testar.
- **Score de risco** (`riscoService.js`): V1 heurística, determinística. Todo fator novo precisa
  devolver `{ chave, rotulo, detalhe, pontos }`, senão deixa de ser explicável na tela.
- **Pagamento** (`pagamentoService.js`): simulação. Nunca criar campo de cartão, CVV ou conta.
- **Foto de perfil** (`FotoPerfil.jsx` + `beneficiarioService.js`): fica no beneficiário como data URL
  JPEG. Quem altera o beneficiário deve regravar a sessão e chamar `sincronizarUsuario()` do
  `AuthContext`, senão o avatar do cabeçalho continua com o dado velho.

## Carteirinha

- `Carteirinha.jsx` tem as duas faces; os tamanhos internos são em `cqw`, então o mesmo componente
  serve à prévia do perfil e à tela cheia. Manter tudo relativo ao container — nada de `px`/`rem`
  no conteúdo do cartão.
- Proporção do cartão físico: `aspect-[1.586]`. O giro para deitar no celular é CSS
  (`.giro-carteirinha` em `index.css`), não transform do Motion — as duas coisas brigam pelo mesmo
  `transform`.
- Dados contratuais ficam em `src/utils/plano.js` (fictícios). O verso deve continuar dizendo que o
  cartão é de demonstração.

## Rede credenciada

- As unidades do seed são **dados reais** do OpenStreetMap (unidades próprias Unimed): não inventar
  nome, endereço ou coordenada nesse array, e não apresentá-lo como a rede credenciada completa.
  Mexeu no array, suba `VERSAO` em `mockDb.js`.
- Localização real só sob clique do usuário, só em memória, e sempre com `registrarEvento`. O
  fallback é `LOCALIZACAO_USUARIO`.
- `listarRede` recebe `origem`; quem chamar sem ela cai na posição de demonstração.

## WhatsApp

- Integração é só por link `wa.me` (`src/utils/whatsapp.js` + `BotaoWhatsApp`). Não tentar Cloud
  API sem backend: o token ficaria legível no navegador.
- **Toda mensagem nova entra em `whatsapp.js`** e não pode conter resultado, diagnóstico, valor de
  exame nem nome de procedimento — só o aviso de que há novidade no app.
- Número da central em `CENTRAL_WHATSAPP`; vazio faz o WhatsApp pedir o contato, que é o
  comportamento esperado na demo.

## Estado da demonstração

- 15 min sem uso derrubam a sessão **e** recriam o seed (`authService.reiniciarDemonstracao`). A
  marca de atividade (`jornada:ultima-atividade`) fica no localStorage, então isso vale também
  entre aberturas do app — é o que garante demo sempre limpa.
- Quem zera estado deve passar por `reiniciarDemonstracao`, não por `restaurarDadosDemo` direto,
  senão auditoria e tentativas de login ficam para trás.
- Não apagar `jornada:tema` nem `jornada:onboarding-visto` nesse reinício: são preferência de
  interface, não dado da demo.

## Temas (claro/escuro)

- **Nunca** usar `bg-white`, `ring-white` ou `text-petroleo-*` para texto: use os papéis
  `bg-superficie`, `ring-borda`, `text-texto` e `text-acento`, senão a tela quebra no escuro.
- `text-white` continua válido **sobre fundo verde sólido ou gradiente** (botão primário, avatar,
  bloco de data, carteirinha).
- Os valores dos dois temas ficam em `src/index.css`; o bloco escuro é duplicado de propósito
  (`prefers-color-scheme` + `[data-tema='escuro']`) — ao mexer em um, mexa no outro.
- Ao criar tela nova, medir contraste no navegador antes de dar por pronta.

## Animações e mapa

- Animações só pelos presets de `src/components/ui/animacoes.js` (molas, não durações fixas).
- Pílula de menu ativa usa `layoutId`; não duplicar o mesmo `layoutId` em outra árvore.
- Mapa: **nunca** usar `bindPopup` com string nem `divIcon` com HTML interpolado (CVE-2025-69993).
  Conteúdo de balão vai como filho React de `<Popup>`.
- `MapaRede` é carregado com `lazy()`; manter assim para não pesar o pacote inicial.

## Segurança

- Regras e auditoria ficam em `src/services/segurancaService.js`; cabeçalhos HTTP em `vercel.json`.
- Erro de login é sempre genérico — não revelar se a conta existe.
- Ações sensíveis novas devem chamar `registrarEvento(...)` para entrar na trilha de auditoria.
- Nunca commitar `.env` nem dados reais de beneficiário; o seed é fictício por definição.
- Imagem enviada pelo usuário passa sempre por `prepararFotoPerfil` (`src/utils/imagem.js`), que
  redesenha no canvas: descarta EXIF, derruba arquivo disfarçado e limita o peso. Não aceitar SVG
  nem guardar o arquivo original.
