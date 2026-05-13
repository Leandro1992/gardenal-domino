# Deploy - Heroku

## Pre-requisitos
- Conta Heroku
- Heroku CLI instalado
- Projeto com remote git configurado

## 1) Login
```bash
heroku login
```

## 2) Criar app
```bash
heroku create gardenal-domino
```

## 3) Configurar variaveis
```bash
heroku config:set FIREBASE_PROJECT_ID=seu-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=seu-client-email
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----"
heroku config:set JWT_SECRET=seu-segredo
heroku config:set DEFAULT_ADMIN_EMAIL=admin@gardenal.com
heroku config:set DEFAULT_ADMIN_PASSWORD=senha-inicial
heroku config:set NODE_ENV=production
```

## 4) Deploy
```bash
git push heroku main
```

## 5) Seed do admin (primeiro deploy)
```bash
heroku run npm run seed-admin
```

## Scripts relevantes do projeto
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start -p ${PORT:-3000}",
  "seed-admin": "ts-node --compiler-options {\"module\":\"commonjs\"} scripts/seed-admin.ts",
  "heroku-postbuild": "npm run build"
}
```

## Observacoes importantes
- FIREBASE_PRIVATE_KEY deve manter \n literais para conversao no servidor.
- next.config.js usa imagem sem otimizacao para compatibilidade de deploy.
- Aplicacao depende de Firestore acessivel e credenciais validas.

## Verificacao pos-deploy
1. Login com admin seedado.
2. Criar usuario teste.
3. Criar partida com 4 jogadores.
4. Registrar rodadas e finalizar manualmente.
5. Validar dashboard, ranking e painel de panela.

## Comandos uteis
```bash
heroku logs --tail
heroku ps
heroku restart
heroku config
```
