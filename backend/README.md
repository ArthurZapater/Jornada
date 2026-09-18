# Backend — Jornada

Área reservada para a API Java + Spring Boot.

## Arquitetura prevista

```text
Controller → Service → Repository → Entity
```

Módulos: beneficiário/autenticação, agendamento, exames, encaminhamentos, rede, pagamentos,
notificações, risco, chatbot e segurança/auditoria.

## Banco

PostgreSQL hospedado no Supabase. As migrations Flyway ficarão em
`src/main/resources/db/migration/`.

Nunca versionar `.env`, senhas, JWT secret ou connection strings.
