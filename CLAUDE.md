# Jornada — contexto para assistentes de código

App web do Challenge FIAP 2026 (Unimed Nacional). **Escopo atual: frontend** (React 19 + Vite +
Tailwind 4 + React Router 7 + lucide-react), com dados simulados. A única exceção é `api/voz.js`
(função da Vercel que guarda a chave da OpenAI). Não criar outro backend/banco sem o time pedir.

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
  - Conversa por voz: estado único no `ConversaProvider` (AppLayout), usado por `BotaoConversar` e
    `PainelConversa` em qualquer tela; o chat só se registra com `registrarOuvinte`. Não criar outra
    instância de `useConversaPorVoz`. Não criar resposta própria — sempre `enviarPergunta`. O microfone só reabre quando a fala do assistente **terminou**
    (`falar` resolve `true`); interrompida resolve `false` e não religa. Silêncio pausa.
  - `iniciar()` (que chama `destravarAudio`, `prepararVoz` e `voz.destravar()`) precisa rodar **dentro do
    clique**: sem gesto, o celular recusa o `<audio>` da voz natural (que chega segundos depois) e a
    conversa cai na voz robótica. `destravar()` toca um silêncio no MESMO elemento reusado em todas as
    falas; não criar `new Audio()` por fala.
  - Latência da voz natural: resposta dividida por `dividirParaFala` com pedidos em paralelo, e
    `aquecerVozNatural()` ao abrir. Não voltar para um pedido único com o texto inteiro.
  - Voz: `useVozNatural` tenta `/api/voz` e cai para `useSinteseDeFala`. Nunca chamar a OpenAI do
    navegador nem colocar chave em `VITE_*` (vai para o bundle).
  - `api/voz.js`: não logar o texto (pode ter dado de saúde) nem repassar erro da OpenAI.
  - Uso só por voz não gera toque: chame `sinalizarAtividade()` a cada troca, senão a sessão de
    15 min cai no meio da conversa.
  - Intenção que responde com dado do próprio beneficiário e colide com "clínico" (ex.: "meus
    remédios") vai em `PRIORITARIAS` antes de `clinico`, com `exceto` para "posso", "devo"...
    `ignorar` remove só uma expressão da frase antes de pontuar.
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

## Perfil de saúde e questionário do 1º acesso

- Respostas ficam em `beneficiario.perfilSaude`; opções, limites, completude e `validarPerfil` em
  `src/utils/perfilSaude.js`. A mesma `validarPerfil` roda na tela e no serviço — não duplicar regra.
- Pergunta nova: opção fechada em `OPCOES` (evitar texto livre, é dado sensível), campo em
  `PERFIL_VAZIO` e na etapa certa de `etapasPerfil.js` (é o que diz onde mostrar o erro).
- `RotaProtegida` manda para `/completar-perfil` enquanto `questionario === 'PENDENTE'`. A sessão
  guarda só esse status, nunca as respostas.
- Quem muda o perfil deve regravar a sessão e chamar `sincronizarUsuario()` (nome de tratamento e
  segmento aparecem no cabeçalho e na Home).
- Nome na interface: `comoChamar(usuario)`, não `primeiroNome(usuario.nome)`.
- Mexeu no formato do beneficiário do seed, suba `VERSAO` em `mockDb.js`.

## Configurações e preferências

- Tema: `useTema().definir('claro' | 'escuro' | 'sistema')`. Demais preferências (texto, movimento,
  voz, notificações) em `PreferenciasContext` → `jornada:preferencias`; listas em `utils/preferencias.js`.
- Tamanho do texto escala o rem da raiz: tamanho de fonte em componente vai em **rem**, nunca
  `text-[Npx]`, senão não cresce.
- Tipo de notificação novo entra em `TIPOS_NOTIFICACAO`; o filtro do sino esconde tipos desligados.
- Tela nova visitada raramente entra com `lazy()` em `App.jsx`.

## Teleconsulta

- `Consulta.modalidade`: `PRESENCIAL` | `TELECONSULTA`. Na teleconsulta `unidadeId` e o DTO `unidade` são
  `null`: todo lugar que mostra endereço de consulta precisa tratar isso.
- Janela da sala e regras em `src/utils/teleconsulta.js`; especialidade que não atende por vídeo tem
  `teleconsulta: false` no seed, e o serviço valida.
- Não simular chamada de vídeo nem ligar câmera (o Permissions-Policy bloqueia): a sala é de espera.

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
- Não apagar `jornada:tema`, `jornada:preferencias` nem `jornada:onboarding-visto` nesse
  reinício: são preferência de interface, não dado da demo. O questionário do 1º acesso, sim, volta a
  aparecer — faz parte da demo.

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
- Mapa = MapLibre GL + estilos do OpenFreeMap (sem chave). Não trocar por Google/Apple/CARTO: todos
  exigem chave, que ficaria exposta no navegador.
- **Nunca** usar `Popup.setHTML`, atribuição personalizada nem `innerHTML` com dado
  (GHSA-jrc7-96c5-q579). Pino é DOM com dado só via `setAttribute`; detalhes do local vão no
  `CartaoLocal` (React).
- O MapLibre escreve no `transform` do elemento do marcador: rotação/escala vão num filho
  (`.pino-mapa` dentro de `.suporte-pino`).
- Cor do estilo escuro vem dos tokens (`TINTA_ESCURA` em `MapaRede.jsx`), nada de hex ali.
- Host novo de mapa precisa entrar na CSP (`connect-src`) do `vercel.json`.
- `MapaRede` é carregado com `lazy()` (~280 kB gzip); manter assim.

## Segurança

- Regras e auditoria ficam em `src/services/segurancaService.js`; cabeçalhos HTTP em `vercel.json`.
- Erro de login é sempre genérico — não revelar se a conta existe.
- Ações sensíveis novas devem chamar `registrarEvento(...)` para entrar na trilha de auditoria.
- Nunca commitar `.env` nem dados reais de beneficiário; o seed é fictício por definição.
- Imagem enviada pelo usuário passa sempre por `prepararFotoPerfil` (`src/utils/imagem.js`), que
  redesenha no canvas: descarta EXIF, derruba arquivo disfarçado e limita o peso. Não aceitar SVG
  nem guardar o arquivo original.
