# Jornada

Plataforma de cuidado de saúde hiper-personalizado para beneficiários de plano de saúde.
Projeto do squad para o **Challenge FIAP 2026**, em parceria com a **Unimed Nacional**.

> **Escopo desta versão:** só o frontend web (React + Vite + Tailwind), com **dados simulados**.
> Não há backend nem banco. A camada `src/services/` imita uma API REST (latência, erros HTTP,
> sessão JWT) para que a troca por um backend real mexa apenas nesses arquivos.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

**Acesso de demonstração:** `ana.souza@email.com` / `jornada123` (a tela de login tem o botão
"Preencher"). Também dá para criar uma conta nova em **Cadastre-se**.

**A demonstração se zera sozinha.** Passados 15 minutos sem uso — com o app aberto ou fechado —, a
sessão cai e os dados voltam ao seed: a Ana volta sem foto, sem consulta marcada no teste anterior e
com as notificações por ler. É para cada apresentação começar igual à primeira vez. Para zerar na
hora, use **Perfil → Restaurar dados de demonstração**; o tema escolhido e a tela de boas-vindas já
vista não são afetados.

## Funcionalidades

| Tela | O que faz |
|---|---|
| Boas-vindas | Onboarding com carrossel e botão "Começar" |
| Login / Cadastro | Validação de CPF, e-mail e senha; consentimento LGPD obrigatório; segmento calculado pela idade/condição crônica |
| Início | Saudação, ações rápidas, próximas consultas, lembrete personalizado por segmento, dados do plano |
| Consultas | Lista de próximas/histórico, cancelamento com confirmação |
| Agendar consulta | Especialidade → médico → unidade → data (calendário) → horário → confirmar |
| Exames / Agendar exame | Tipo de exame → unidade → data → horário, com orientações de preparo |
| Resultados | Busca, filtro por status, laudo com valores de referência e destaque dos alterados |
| Encaminhamentos | Ativos (Ativo/Em processo) e histórico (Concluído), com atalho para agendar |
| Rede credenciada | Unidades Unimed reais, busca, filtros, localização do aparelho e mapa OpenStreetMap com pinos |
| Perfil | Foto de perfil (upload local), dados pessoais (CPF mascarado), carteirinha virtual em tela cheia (frente e verso), estatísticas |
| Notificações | Não lidas em destaque, marcar como lidas, badge no sino e no menu |
| Tema | Claro e escuro, com botão ao lado do sino; na primeira visita segue o sistema |
| Assistente | Chatbot por regras com 30 intenções, entrada por voz, respostas com seus dados reais; recusa pergunta clínica e orienta emergência |
| Plano de cuidado | Score de risco clínico V1, com todos os fatores que pontuaram e os próximos passos |
| Pagamento | Mensalidade, Pix/cartão/boleto/débito e histórico por ano, com parcela em atraso destacada |

Busca global no header (desktop): especialidades, médicos, exames, resultados e unidades.

## Estrutura

```
src/
├── components/
│   ├── agendamento/   Etapa, Calendário, horários, resumo, tela de sucesso
│   ├── brand/         Logo (duas folhas)
│   ├── consulta/      Card de próxima consulta, bloco de data
│   ├── layout/        AppLayout (sidebar ↔ bottom nav), header, busca, menu
│   └── ui/            Button, IconTile, StatusBadge, ServiceHero, TopicList...
├── contexts/          AuthContext, NotificacoesContext
├── hooks/             useAsync, useMesNavegavel
├── pages/             uma página por rota
├── routes/            RotaProtegida / RotaPublica
├── services/          "API" simulada — um arquivo por módulo do domínio
└── utils/             formatação pt-BR, validação, agenda, geo, segmento
```

Identidade visual: tokens de cor em `src/index.css` (`@theme`). Os principais são `petroleo-*`,
`salvia-*`, `nevoa-*` e `lilas-*`, mais os utilitários `glass` e `glass-strong`.

## Deploy (Vercel)

O `vercel.json` já faz o rewrite de SPA. Basta importar o repositório na Vercel (framework: Vite).

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
- **Trilha de auditoria** (LGPD art. 37): acessos, falhas, bloqueios e encerramentos ficam visíveis no Perfil.
- **Direito de exclusão** (LGPD art. 18, VI): botão que apaga todos os dados do dispositivo.
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
- **Mapa:** os tiles do OpenStreetMap só existem em versão clara, então são escurecidos por filtro
  CSS no tema escuro.
- **Contraste medido** (não estimado) no navegador: no tema escuro, os textos ficaram entre 7,3:1 e
  17,9:1, bem acima do mínimo de 4,5:1 do WCAG AA.

### Bibliotecas de terceiros e o que foi verificado

| Pacote | Versão | Para quê | Situação de segurança |
|---|---|---|---|
| `motion` | 13.2.0 | Animações por física de mola | Sem vulnerabilidade conhecida; manutenção ativa |
| `leaflet` | 1.9.4 | Motor do mapa | **CVE-2025-69993** (XSS via `bindPopup`) — mitigado, veja abaixo |
| `react-leaflet` | 5.0.0 | Ligação com React 19 | Sem vulnerabilidade conhecida |

`npm audit`: **0 vulnerabilidades**.

**Sobre o CVE do Leaflet:** a falha está em `bindPopup()` e `divIcon({ html })`, que renderizam
HTML cru. Não existe versão corrigida — os mantenedores consideram comportamento documentado, e a
responsabilidade é de quem passa conteúdo não sanitizado. Nossa mitigação em `MapaRede.jsx`:
o conteúdo dos balões vai como **filhos React** de `<Popup>` (o React escapa), e os ícones usam
**HTML constante**, sem interpolar nome, endereço ou qualquer dado. Nenhum dado chega a um sink de
HTML. A CSP em `vercel.json` é a segunda camada.

**Mapa sem chave de API:** os tiles vêm do OpenStreetMap, que não exige cadastro nem chave — por
isso nada de segredo precisa entrar no repositório. Em troca, a
[política de uso do OSM](https://operations.osmfoundation.org/policies/tiles/) pede atribuição e
desencoraja volume alto; para produção de verdade, o caminho é um provedor de tiles contratado.
O crédito fica recolhido num botão "(i)" no canto do mapa — formato permitido pelas
[diretrizes de atribuição](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines), que
exigem apenas que a licença continue acessível. A CSP libera apenas `https://*.tile.openstreetmap.org` em `img-src`.

**Animações:** os presets ficam em `src/components/ui/animacoes.js` — molas em vez de durações
fixas, que é o que dá o "peso" das interfaces da Apple. Os efeitos: pílula do menu que desliza entre
os itens (elemento compartilhado), transição de página, entrada dos cards em cascata, afundar ao
toque e bolhas do chat. `<MotionConfig reducedMotion="user">` respeita "reduzir movimento" do
sistema operacional.

**Peso:** o pacote inicial ficou em ~170 kB (gzip). O mapa é carregado sob demanda em um chunk
separado de ~46 kB, só ao abrir a rede credenciada.

### Diferenciais: como eles realmente funcionam

**Assistente (chatbot)** — casamento de palavras-chave sobre uma base de 30 regras em
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

**Não há chaves de API, tokens ou segredos neste repositório** — o app não consome nenhum serviço
externo além do Google Fonts. Arquivos `.env` estão no `.gitignore`.

> Os dados de demonstração são **fictícios**: nenhum beneficiário, CPF, médico ou unidade
> corresponde a pessoa ou estabelecimento real, e o CPF do seed é um número de teste. As credenciais
> de demonstração são públicas de propósito, para a banca avaliar a solução.
