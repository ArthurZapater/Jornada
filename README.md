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

Para zerar os dados (consultas agendadas, notificações lidas etc.), use **Perfil → Restaurar dados
de demonstração**.

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
| Rede credenciada | Busca, filtros (Todos/Médicos/Clínicas/Hospitais), distância real e mapa ilustrativo |
| Perfil | Dados pessoais (CPF mascarado), carteirinha virtual, estatísticas |
| Notificações | Não lidas em destaque, marcar como lidas, badge no sino e no menu |

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
