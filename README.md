# Jornada

Monorepo do Jornada, plataforma de cuidado de saúde hiper-personalizado desenvolvida para o
Challenge FIAP 2026 em parceria com a Unimed Nacional.

## Estrutura

| Diretório | Responsabilidade | Deploy previsto |
|---|---|---|
| `frontend/` | React, Vite, Tailwind, telas e experiência do beneficiário | Vercel |
| `backend/` | Java, Spring Boot, API REST, autenticação e regras de negócio | Render |
| `docs/` | Arquitetura, decisões, contratos e materiais técnicos | — |

O PostgreSQL será hospedado no Supabase. O Git guarda apenas migrations, documentação e arquivos de
exemplo; credenciais e segredos não entram no repositório.

## Frontend atual

O app continua funcional em `frontend/`, ainda com dados simulados no navegador. A documentação
completa, credenciais de demonstração e comandos está em [frontend/README.md](frontend/README.md).

```powershell
cd frontend
npm install
npm run dev
```

Na Vercel, configure `frontend` como **Root Directory**. A função de voz está em
`frontend/api/voz.js` e permanece no mesmo deploy do app.

## Backend planejado

O backend será criado em `backend/` usando Java + Spring Boot, PostgreSQL/Supabase, Flyway, Spring
Security e JWT. A primeira entrega vertical será login → home → agendamento de consulta.

As telas já acessam uma camada de serviços; a migração para HTTP deve preservar os DTOs e suas
assinaturas para reduzir mudanças no frontend.

## Convenções

- Migrations do banco ficam em `backend/src/main/resources/db/migration/`.
- Cada mudança deve indicar se afeta frontend, backend, documentação ou mais de uma área.
- Pull requests devem registrar como a alteração foi validada.
