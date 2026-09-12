# Jornada

Plataforma de cuidado de saúde hiper-personalizado para beneficiários de plano de saúde.
Projeto do squad para o **Challenge FIAP 2026**, em parceria com a **Unimed Nacional**.

> **Escopo desta versão:** o frontend web (React + Vite + Tailwind), com **dados simulados**. Não
> há banco. A camada `src/services/` imita uma API REST (latência, erros HTTP, sessão JWT) para que a
> troca por um backend real mexa apenas nesses arquivos. A única peça de servidor é uma função da
> Vercel (`api/voz.js`) que gera a voz natural do assistente e guarda a chave da OpenAI fora do
> navegador.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

**Acesso de demonstração:** `ana.souza@email.com` / `jornada123` (a tela de login tem o botão
"Preencher"). Também dá para criar uma conta nova em **Cadastre-se**.

**A demonstração se zera sozinha.** Passados 15 minutos sem uso — com o app aberto ou fechado —, a
sessão cai e os dados voltam ao seed: a Ana volta sem foto, sem consulta marcada no teste anterior,
com as notificações por ler e com o **questionário do primeiro acesso** por responder. É para cada
apresentação começar igual à primeira vez. Para zerar na hora, use **Configurações → Restaurar
dados de demonstração**; tema, preferências de Configurações e a tela de boas-vindas já vista não
são afetados.

## Funcionalidades

| Tela | O que faz |
|---|---|
| Boas-vindas | Onboarding com carrossel e botão "Começar" |
| Login / Cadastro | Validação de CPF, e-mail e senha; consentimento LGPD obrigatório; segmento calculado pela idade/condição crônica |
| Questionário do 1º acesso | Logo depois do primeiro login: 5 etapas opcionais (sobre você, saúde, alergias e histórico, dia a dia, contatos e objetivos), com "Responder depois" |
| Perfil de saúde | Edição das mesmas respostas a qualquer momento, com barra de completude e resumo no perfil (tipo sanguíneo, alergias, IMC, contato de emergência) |
| Início | Saudação, ações rápidas, próximas consultas, lembrete personalizado por segmento, dados do plano |
| Consultas | Lista de próximas/histórico, cancelamento com confirmação |
| Agendar consulta | Especialidade → médico → unidade → data (calendário) → horário → confirmar |
| Exames / Agendar exame | Tipo de exame → unidade → data → horário, com orientações de preparo |
| Resultados | Busca, filtro por status, laudo com valores de referência e destaque dos alterados |
| Encaminhamentos | Ativos (Ativo/Em processo) e histórico (Concluído), com atalho para agendar |
| Rede credenciada | Unidades Unimed reais, busca, filtros, localização do aparelho e mapa vetorial (MapLibre + OpenFreeMap) com pinos, cartão do local e "Como chegar" |
| Perfil | Foto de perfil (upload local), dados pessoais (CPF mascarado), carteirinha virtual em tela cheia (frente e verso), resumo do perfil de saúde, estatísticas |
| Configurações | Tema (claro, escuro, automático), tamanho do texto, reduzir animações, voz e velocidade do assistente, quais avisos aparecem, perfil de saúde, segurança e restauração da demo |
| Sobre | Versão e build, aviso de protótipo, squad, tratamento de dados, recursos do aparelho, fontes (OpenStreetMap) e licenças de código aberto |
| Notificações | Não lidas em destaque, marcar como lidas, badge no sino e no menu |
| Tema | Claro e escuro, com botão ao lado do sino; na primeira visita segue o sistema |
| Assistente | Chatbot por regras com 33 intenções, entrada por voz, **conversa por voz** (fala e ouve), respostas com seus dados reais e do perfil de saúde; recusa pergunta clínica e orienta emergência |
| Plano de cuidado | Score de risco clínico V1, com todos os fatores que pontuaram e os próximos passos |
| Pagamento | Mensalidade, Pix/cartão/boleto/débito e histórico por ano, com parcela em atraso destacada |

Busca global no header (desktop): especialidades, médicos, exames, resultados, unidades e as telas de Configurações, Perfil de saúde e Sobre.

## Estrutura

```
src/
├── components/
│   ├── agendamento/   Etapa, Calendário, horários, resumo, tela de sucesso
│   ├── brand/         Logo (duas folhas)
│   ├── consulta/      Card de próxima consulta, bloco de data
│   ├── layout/        AppLayout (sidebar ↔ bottom nav), header, busca, menu
│   └── ui/            Button, IconTile, StatusBadge, ServiceHero, TopicList...
├── contexts/          AuthContext, NotificacoesContext, TemaContext, PreferenciasContext
├── hooks/             useAsync, useMesNavegavel, useReconhecimentoDeFala, useSinteseDeFala
├── pages/             uma página por rota
├── routes/            RotaProtegida / RotaPublica
├── services/          "API" simulada — um arquivo por módulo do domínio
└── utils/             formatação pt-BR, validação, agenda, geo, segmento
```

Identidade visual: tokens de cor em `src/index.css` (`@theme`). Os principais são `petroleo-*`,
`salvia-*`, `nevoa-*` e `lilas-*`, mais os utilitários `glass` e `glass-strong`.

## Deploy (Vercel)

O `vercel.json` já faz o rewrite de SPA (menos `/api`). Basta importar o repositório na Vercel
(framework: Vite).

**Voz natural do assistente (opcional):** em *Project → Settings → Environment Variables*, crie
`OPENAI_API_KEY` com a chave da OpenAI (ambientes Production e Preview) e faça um novo deploy. Sem
ela, a rota `/api/voz` responde 503 e o app usa a voz do aparelho. Defina também um **limite de uso
mensal** no projeto da OpenAI: é a proteção real contra gasto (veja "Voz natural" abaixo). Para
testar localmente com a função, use `vercel dev` com a chave num `.env.local` (modelo em
`.env.example`); o `npm run dev` comum não roda a função e cai na voz do aparelho.

## Trocando o mock por uma API real

1. Em `src/services/http.js`, troque `simularRequisicao` por um cliente axios com
   `baseURL = import.meta.env.VITE_API_URL` e o header `Authorization: Bearer <token>`.
2. Reescreva as funções de cada `*Service.js` como chamadas HTTP, mantendo as mesmas assinaturas
   e o mesmo formato de retorno (DTOs). As páginas não precisam mudar.

## Squad

Enzo de Lucca Borba Pires · Felipe Silva de Carvalho · Arthur Zapater · Gabriel Morais

## Segurança e privacidade

### No servidor (deploy) — `vercel.json`

Cabeçalhos aplicados a todas as respostas:

| Cabeçalho | Efeito |
|---|---|
| `Content-Security-Policy` | Só executa script do próprio domínio; fontes apenas do Google Fonts; bloqueia `object`/`base` e o uso do app dentro de iframes |
| `Strict-Transport-Security` | Força HTTPS por 2 anos |
| `X-Frame-Options: DENY` | Impede clickjacking |
| `X-Content-Type-Options: nosniff` | Impede o navegador de adivinhar o tipo do arquivo |
| `Referrer-Policy` | Não vaza a URL interna para sites externos |
| `Permissions-Policy` | Desliga câmera, microfone, geolocalização, pagamento e USB |
| `Cross-Origin-Opener-Policy` | Isola a janela de outras origens |

### No app — `src/services/segurancaService.js`

- **Bloqueio por tentativas:** 5 erros no mesmo login bloqueiam o acesso por 5 minutos.
- **Mensagem de erro genérica:** a resposta é igual para conta inexistente e senha errada, para não permitir descobrir quais e-mails/CPFs estão cadastrados.
- **Sessão:** expira em 8 horas e também após 15 minutos sem interação, protegendo computador
  compartilhado. A marca de última atividade fica no dispositivo, então o relógio de inatividade
  também corre com o app fechado — não adianta fechar a aba para manter a sessão viva.
- **Senha:** guardada apenas como hash SHA-256; nunca em texto puro.
- **Minimização de dados:** o CPF aparece mascarado na interface e a auditoria guarda só "navegador · sistema", não o user agent completo.
- **Consentimento LGPD:** obrigatório no cadastro, com data registrada.
- **Trilha de auditoria** (LGPD art. 37): acessos, falhas, bloqueios, encerramentos e alterações do perfil de saúde ficam visíveis em Configurações.
- **Direito de exclusão** (LGPD art. 18, VI): botão que apaga todos os dados do dispositivo, e outro só para o perfil de saúde.
- **Perfil de saúde** (`perfilSaudeService.js`): condição, alergia, remédio e histórico familiar são
  dado sensível (art. 11). Tudo é opcional; as respostas de escolha são listas fechadas (menos texto
  livre, menos dado desnecessário); o serviço descarta opção desconhecida, apara texto no limite e
  recusa formato inválido (422) em vez de confiar na tela; e a sessão guarda só o *status* do
  questionário, nunca as respostas.
- **Foto de perfil** (`src/utils/imagem.js`): a imagem escolhida nunca é guardada como veio. Ela é
  decodificada e redesenhada num canvas, e o que fica salvo é um JPEG novo de 256px. Com isso os
  metadados EXIF — inclusive a geolocalização de onde a foto foi tirada — são descartados, e um
  arquivo que só finja ser imagem não sobrevive ao redesenho. SVG não é aceito (pode conter script)
  e a troca/remoção entra na trilha de auditoria. A foto fica apenas no dispositivo.

### Rede credenciada: dados reais e localização

**As unidades são reais.** Nome, endereço e coordenadas de 22 unidades próprias das cooperativas
Unimed (São Paulo e região, Baixada Santista, Campinas, Rio de Janeiro e Belo Horizonte) vêm do
OpenStreetMap, consultado por Overpass (estabelecimentos de saúde com "Unimed" no nome) e Nominatim.
É o único dado do seed que não é inventado — o resto (beneficiária, médicos, consultas, exames)
continua fictício, e os médicos fictícios foram distribuídos entre as unidades reais.

**O que isso não é:** a rede credenciada completa. Ela passa de 30 mil estabelecimentos, muda por
cooperativa e por plano, e não existe em lista pública para download — a fonte oficial é o Guia
Médico. Ser uma unidade Unimed também não garante atendimento a qualquer plano Unimed (há regras de
intercâmbio). A tela diz isso abaixo da lista, em vez de deixar subentendido.

**Localização real** (`localizacaoService.js` + `useLocalizacao`): o botão "Usar minha localização"
recalcula todas as distâncias e reordena a lista a partir de onde o aparelho está.

- A posição **só é pedida quando o usuário clica** — nunca ao abrir a tela.
- Ela fica **apenas na memória da sessão**: não vai para o localStorage nem para lugar nenhum, já
  que o cálculo de distância roda no próprio aparelho. Recarregou a página, voltou para a posição de
  demonstração (Av. Paulista), e há um botão para voltar a ela na hora.
- O uso entra na **trilha de auditoria**, como as outras ações sensíveis.
- Exigiu liberar `geolocation=(self)` no `Permissions-Policy` do `vercel.json`, que antes bloqueava
  a API inteira. Continua negada para terceiros em iframe.

### WhatsApp

Integração por **link** (`wa.me`), em `src/utils/whatsapp.js`: o app monta a conversa já escrita e
quem aperta "enviar" é o usuário. Não exige chave, conta Business nem servidor. Está em quatro
lugares: mandar os detalhes de uma consulta para quem vai acompanhar, falar com uma unidade da rede,
passar do assistente para um atendente e avisar que um resultado saiu.

- **Nenhuma mensagem leva conteúdo clínico.** Dado de saúde é dado sensível (LGPD, art. 11) e
  mensagem aparece na tela de bloqueio, à vista de quem estiver por perto. O aviso de resultado não
  cita nem valores nem o nome do exame — o próprio procedimento já entrega informação clínica. Quem
  quiser ver, abre o app, que fica atrás do login. Os textos ficam todos em `whatsapp.js` para essa
  regra ser verificável num arquivo só.
- **Número da central:** `CENTRAL_WHATSAPP`, em `whatsapp.js`. Vazio de propósito — sem número, o
  link abre o WhatsApp com a mensagem pronta e o usuário escolhe o destinatário, então a
  demonstração funciona sem depender de uma linha real. Preenchendo, os botões de atendimento caem
  direto nessa conversa.
- **Mandar mensagem sozinho** (lembrete de consulta, aviso automático de resultado) é outra coisa:
  exige a Cloud API da Meta, com número dedicado, modelos aprovados, cobrança por mensagem e um
  servidor guardando o token — token em código de navegador é token público. Fica para quando o
  backend Spring existir; aí o WhatsApp entra como mais um canal ao lado da notificação que o app já
  tem.

### Carteirinha em tela cheia

Tocar no cartão abre a carteirinha ocupando a tela inteira, para ser mostrada no balcão do
atendimento:

- **No celular em pé o cartão aparece deitado**, sem depender de a rotação automática do aparelho
  estar liberada. Quando o usuário vira o telefone, a media query de orientação deixa de valer e o
  cartão volta ao natural — do ponto de vista dele, nada mudou.
- **Frente e verso** com giro em 3D (`rotateY` + `backface-visibility`): frente com número, nome,
  nascimento e titularidade; verso com registro ANS, acomodação, abrangência, segmentação, cartão
  SUS, telefones e código de barras.
- O **código de barras é Code 39 de verdade** (`CodigoBarras.jsx`), gerado a partir do número da
  carteirinha — a saída renderizada foi conferida módulo a módulo contra a tabela de uma
  implementação independente. O número, como todo o resto, é fictício.
- Enquanto a carteirinha está aberta, a tela não apaga (`navigator.wakeLock`, ignorado por
  navegador sem suporte).

### Tema claro e escuro

Botão ao lado do sino de notificações (no cabeçalho do desktop e na barra superior do mobile).

- **Primeira visita:** segue a preferência do sistema operacional. Depois disso, vale a escolha do
  usuário, guardada no navegador.
- **Sem piscada:** o CSS já aplica o tema escuro via `prefers-color-scheme` antes do React montar;
  o atributo `data-tema` no `<html>` só entra depois, para a escolha manual.
- **Como funciona:** em vez de espalhar variantes `dark:` pelos componentes, o app usa **papéis
  semânticos** — `superficie`, `borda`, `texto` e `acento` — mais a escala sálvia, que muda de
  valor entre os temas. Trocar o tema é trocar um conjunto de variáveis CSS.
- **Mapa:** estilo claro Liberty e estilo escuro próprio — o Dark do OpenFreeMap repintado com os
  tokens do tema escuro (chão verde-petróleo, água azulada, ruas mais claras que o fundo).
- **Contraste medido** (não estimado) no navegador: no tema escuro, os textos ficaram entre 7,3:1 e
  17,9:1, bem acima do mínimo de 4,5:1 do WCAG AA.

### Bibliotecas de terceiros e o que foi verificado

| Pacote | Versão | Para quê | Situação de segurança |
|---|---|---|---|
| `motion` | 13.2.0 | Animações por física de mola | Sem vulnerabilidade conhecida; manutenção ativa |
| `maplibre-gl` | 6.9.0 | Mapa vetorial (WebGL) | GHSA-jrc7-96c5-q579 (XSS em `DOM.sanitize`) afetava até 6.4.0 — corrigida na 6.4.1; e o app não usa as APIs afetadas, veja abaixo |

`npm audit`: **0 vulnerabilidades**.

**Por que MapLibre + OpenFreeMap, e não Google ou Apple:** o Google Maps e o Apple MapKit JS exigem
chave (ou token) que ficaria legível no navegador, e o CARTO passou a exigir chave também. O
[OpenFreeMap](https://openfreemap.org) não pede chave, cadastro nem cookie, permite uso comercial e
não limita visualizações; os estilos vetoriais dão o visual de mapa de celular (rótulos nítidos,
zoom suave). Antes o app usava Leaflet com os tiles raster padrão do OpenStreetMap — o Leaflet saiu,
e com ele o CVE-2025-69993.

**O que foi feito no mapa:** pino redondo com ícone (clínica ou hospital), borda branca e sombra;
ponto do usuário pulsando; pontos de interesse do estilo escondidos para os pinos da rede se
destacarem; tocar num pino abre um **cartão de vidro** na base do mapa com nome, endereço, distância
e **Como chegar** (Apple Mapas no iPhone/Mac, Google Maps no resto — só as coordenadas públicas da
unidade vão no link, nunca a posição do usuário). Rotação e inclinação ficam desligadas, e "reduzir
animações" zera os deslizamentos.

**Segurança do mapa:** a falha GHSA-jrc7-96c5-q579 do MapLibre estava no sanitizador de HTML e
atingia quem exibe texto de atribuição vindo do estilo ou atribuição personalizada. O app desliga o
controle de atribuição do MapLibre (o crédito é um componente React) e não usa `Popup` nem
`setHTML`: os pinos são montados com a API do DOM (dado só por `setAttribute`; o único
`innerHTML` é o desenho constante do ícone) e o cartão do local é React, que escapa o texto. O worker
do MapLibre é servido pelo próprio site, então a CSP só precisou de `connect-src
https://tiles.openfreemap.org`, `worker-src 'self'` e `blob:` em `img-src` (testado: sem ele os
sprites do estilo não carregam). Sem WebGL, o mapa mostra um aviso e a lista segue funcionando.

**Atribuição:** "OpenFreeMap © OpenMapTiles, dados © colaboradores do OpenStreetMap", recolhida num
botão "(i)" no canto do mapa — formato permitido pelas
[diretrizes de atribuição](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines), que
exigem apenas que a licença continue acessível.

**Animações:** os presets ficam em `src/components/ui/animacoes.js` — molas em vez de durações
fixas, que é o que dá o "peso" das interfaces da Apple. Os efeitos: pílula do menu que desliza entre
os itens (elemento compartilhado), transição de página, entrada dos cards em cascata, afundar ao
toque e bolhas do chat. `<MotionConfig reducedMotion="user">` respeita "reduzir movimento" do
sistema operacional.

**Peso:** o pacote inicial ficou em ~189 kB (gzip). O mapa é carregado sob demanda, só ao abrir a rede
credenciada: ~280 kB (gzip), mais o worker. É bem mais que o Leaflet (~46 kB) — o preço de um motor
vetorial em WebGL —, por isso ele nunca entra no pacote inicial; Configurações, Sobre, o questionário e a edição
do perfil de saúde também são carregados só quando abertos (juntos, ~15 kB).

### Diferenciais: como eles realmente funcionam

**Assistente (chatbot)** — casamento de palavras-chave sobre uma base de 33 regras em
`src/services/chatbotService.js`. **Não usa LLM.** O que o torna contextual é responder com os dados
do beneficiário: próxima consulta (com "daqui a N dias"), exame agendado e seu preparo, resultados
liberados, encaminhamentos, mensalidade, unidade e hospital mais perto, histórico de consultas.

O roteamento tem três camadas, nesta ordem:

1. **Urgência e assunto clínico** — qualquer palavra basta para vencer. Sintoma, remédio ou
   diagnóstico é redirecionado para consulta; sinal de urgência, para o SAMU 192 e o pronto-socorro
   mais próximo (calculado, não fixo no texto).
2. **Verbos de ação** (cancelar, agendar/remarcar, atraso) — vencem substantivo: "como cancelo minha
   consulta" é cancelamento, não pergunta sobre a próxima consulta. As palavras são radicais
   (`cancel`, `agend`, `remarc`), para pegar as conjugações.
3. **Maior pontuação** — soma do tamanho das palavras-chave casadas, então "quando sai meu
   resultado" vai para resultados (9 letras) e não para consultas por causa do "quando" (6).

Quando a resposta depende do contrato (carência, reembolso, cobertura, dependentes), ele **diz que
não sabe** e oferece um atendente no WhatsApp, em vez de inventar regra de plano. O mesmo vale para
o que o app ainda não faz (telemedicina, alteração de cadastro).

**Falar em vez de digitar** (`useReconhecimentoDeFala`) — botão de microfone ao lado do campo, com
a Web Speech API em pt-BR e transcrição parcial aparecendo enquanto a pessoa fala. **Parou de falar,
o assistente responde**: a pergunta vai sozinha, sem apertar enviar. O que já estava digitado no
campo entra junto com o ditado, e parar o microfone sem ter falado nada não envia coisa alguma. Dois avisos honestos: na maioria dos navegadores essa
API **manda o áudio para o serviço de voz do fabricante** (não é local), e a tela diz isso; e o
Firefox não implementa a API, caso em que o botão nem aparece. Exigiu `microphone=(self)` no
`Permissions-Policy` do `vercel.json`.

**Conversa por voz** (`ConversaContext` + `useConversaPorVoz` + `PainelConversa`) — a bolinha
colorida fica em **todas as telas**, ao lado do botão do Assistente, e abre a conversa **ali mesmo**:
um painel flutua acima do menu, e a conversa continua ao navegar (tocar em "Ver resultados" no meio
dela, por exemplo). No chat, a bolinha fica acima do botão de enviar e troca a barra de digitar pelo
painel. O painel traz a **bolinha animada**
(no espírito do Gemini Live) e a **legenda** do que a pessoa está falando e do que o assistente
responde. Um som curto marca o início, a volta do microfone e o fim (sintetizados com Web Audio, sem
arquivo). A pessoa fala, o assistente
responde **falando** e volta a ouvir sozinho. As respostas são exatamente as do chat
(`enviarPergunta`), e cada troca entra no histórico. O ciclo automático tem freios: o microfone só
liga depois de um toque, só abre quando a voz do assistente termina (para não transcrever a si
mesmo), silêncio **pausa** a conversa em vez de religar o microfone sem parar, trocar de aba desliga
tudo, e dizer "tchau" encerra. Testado com dublês das APIs de voz e da rota `/api/voz` (o navegador
de automação bloqueia microfone); a transcrição e a voz reais dependem do Chrome/Safari de cada
aparelho.

**Voz natural** (`api/voz.js` + `useVozNatural`) — a resposta vira áudio no `gpt-4o-mini-tts` da
OpenAI, voz `marin`, com instrução de falar em português do Brasil, tom acolhedor. A chave fica só
na variável de ambiente da Vercel; o navegador chama `/api/voz` e recebe o MP3. Barreiras da função:
só `POST`, só da mesma origem, texto de 1 a 1.200 caracteres, até 40 pedidos por IP a cada 5 minutos,
`Cache-Control: no-store`, e nem o texto nem o erro da OpenAI vão para o log ou para a resposta.
**Limite honesto:** sem login no servidor, alguém determinado ainda consegue chamar a rota fora do
app; por isso o limite de gasto na conta da OpenAI é obrigatório. Se a rota falhar (sem chave, sem
rede, limite), o app cai para a voz do aparelho e para de tentar na sessão. **Privacidade:** o texto
das respostas — que pode citar consulta, alergia ou mensalidade — é enviado à OpenAI; o painel e
Configurações dizem isso, e a opção "Voz natural" pode ser desligada. CSP: `media-src 'self' blob:`
para tocar o áudio.

**Velocidade da resposta falada:** gerar o áudio de uma resposta inteira leva uns 3 s. Para a voz
começar antes, a resposta é dividida — a primeira frase sozinha, o resto em blocos de até ~260
caracteres — e todos os pedidos saem ao mesmo tempo; a primeira frase fica pronta primeiro e já toca
enquanto as outras chegam. Ao abrir a conversa, um pedido vazio "acorda" a função da Vercel (é
recusado na hora, sem chamar a OpenAI), poupando a partida a frio na primeira resposta. E a latência
simulada do assistente cai de 500 ms para 120 ms na conversa por voz. Por isso o limite por IP da
função subiu para 150 pedidos a cada 5 minutos.

**Personalização pelo perfil de saúde** — o questionário não fica guardado à toa. O nome escolhido
passa a ser usado na Home, no chat e na conversa por voz; condições crônicas mudam o perfil de
cuidado (e com ele o lembrete da Home); o plano de cuidado ganha os fatores **Hábitos** (fumo,
sedentarismo, sono) e **Histórico familiar**, com recomendações próprias; e o assistente responde
"minhas alergias", "meus remédios", "meu tipo sanguíneo" com o que a pessoa informou — e, num
pedido de emergência, lembra o contato de emergência cadastrado. "Posso tomar meu remédio com…"
continua indo para a resposta clínica (não orienta).

**Score de risco clínico (V1)** — soma de pontos por regras fixas em `src/services/riscoService.js`:
faixa etária, perfil de cuidado, condição crônica declarada, exames alterados nos últimos 12 meses,
acompanhamento médico, encaminhamentos em aberto e cancelamentos. **Não é IA e não é diagnóstico.**
A tela mostra cada fator e quantos pontos ele somou, de modo que o número seja sempre explicável.
A evolução para um modelo de ML exige trocar apenas `calcularScore()`; o histórico fica em
`scoresRisco` para comparar versões.

**Pagamento** — simulação. Nenhum dado de cartão, CVV ou conta bancária é pedido, transmitido ou
guardado: o usuário escolhe a forma e o app marca a mensalidade como paga.

### Limites honestos desta versão

Como **não há backend**, tudo roda no navegador do próprio usuário. Essas proteções defendem a
sessão no dispositivo (uso indevido do aparelho, sessão esquecida aberta, tentativa de adivinhar
senha na tela), mas **não substituem validação no servidor**. Quando o backend Spring entrar, as
mesmas regras passam a ser aplicadas lá, com rate limit por IP e auditoria no banco.

**Não há chaves de API, tokens ou segredos neste repositório.** A chave da OpenAI existe só como
variável de ambiente na Vercel, lida pela função `api/voz.js`; `.env*` está no `.gitignore` e o
`.env.example` vai sem valor.

> Os dados de demonstração são **fictícios**: nenhum beneficiário, CPF, médico ou unidade
> corresponde a pessoa ou estabelecimento real, e o CPF do seed é um número de teste. As credenciais
> de demonstração são públicas de propósito, para a banca avaliar a solução.
