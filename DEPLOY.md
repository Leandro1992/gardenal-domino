# Deploy no Heroku - Dominó Gardenal

## Pré-requisitos

1. Conta no Heroku: https://signup.heroku.com
2. Heroku CLI instalado: https://devcenter.heroku.com/articles/heroku-cli
3. Git configurado no projeto

## Passo a Passo

### 1. Login no Heroku

```bash
heroku login
```

### 2. Criar Aplicação no Heroku

```bash
heroku create gardenal-domino
# ou deixe o Heroku gerar um nome:
# heroku create
```

### 3. Configurar Variáveis de Ambiente

```bash
heroku config:set FIREBASE_PROJECT_ID=seu-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=seu-client-email
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_AQUI\n-----END PRIVATE KEY-----"
heroku config:set JWT_SECRET=seu-jwt-secret-seguro-aleatorio
heroku config:set DEFAULT_ADMIN_EMAIL=admin@gardenal.com
heroku config:set DEFAULT_ADMIN_PASSWORD=senha-segura-inicial
heroku config:set NODE_ENV=production
```

**IMPORTANTE sobre FIREBASE_PRIVATE_KEY:**
- A chave deve ter os `\n` literais para quebras de linha
- Use aspas duplas ao redor da chave completa
- No dashboard do Heroku, cole a chave exatamente como está no arquivo JSON do Firebase

Exemplo:
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEF...
...sua chave aqui...
-----END PRIVATE KEY-----
```

### 4. Adicionar Buildpack do Node.js (Automático)

O Heroku detecta automaticamente Node.js, mas você pode forçar:

```bash
heroku buildpacks:set heroku/nodejs
```

### 5. Deploy da Aplicação

```bash
git add .
git commit -m "Preparar para deploy no Heroku"
git push heroku main
# ou se sua branch principal é master:
# git push heroku master
```

### 6. Executar Seed do Admin (Primeira vez)

```bash
heroku run npm run seed-admin
```

### 7. Abrir Aplicação

```bash
heroku open
```

## Configuração do Firestore

Certifique-se de que:

1. **Firebase Admin SDK** está configurado corretamente
2. **Service Account** foi criado no Firebase Console:
   - Firebase Console > Project Settings > Service Accounts
   - Generate New Private Key
   - Baixe o arquivo JSON

3. **Firestore Database** está habilitado:
   - Firebase Console > Firestore Database
   - Create Database
   - Start in production mode (ou test mode inicialmente)

## Verificar Logs

```bash
# Ver logs em tempo real
heroku logs --tail

# Ver últimos logs
heroku logs --num 200
```

## Comandos Úteis

```bash
# Ver status da aplicação
heroku ps

# Reiniciar aplicação
heroku restart

# Ver variáveis de ambiente
heroku config

# Editar variável específica
heroku config:set VARIAVEL=valor

# Acessar console do Node.js
heroku run node

# Executar comando específico
heroku run npm run seed-admin

# Escalar dynos (se necessário)
heroku ps:scale web=1
```

## Estrutura de Arquivos Importante

```
gardenal-domino/
├── Procfile                    # Define comando de start
├── package.json                # Scripts e dependências
├── next.config.js              # Configuração do Next.js
├── .gitignore                  # Arquivos ignorados no Git
└── scripts/
    └── seed-admin.ts           # Script de seed do admin
```

## Procfile

Já está configurado:
```
web: npm start
```

## Package.json - Scripts

Já estão configurados:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p ${PORT:-3000}",
    "seed-admin": "ts-node scripts/seed-admin.ts",
    "heroku-postbuild": "npm run build"
  }
}
```

- `heroku-postbuild`: Executa automaticamente após install
- `start`: Usa porta do Heroku ($PORT) ou 3000 local

## Troubleshooting

### Erro de Build

```bash
# Limpar cache do Heroku
heroku plugins:install heroku-builds
heroku builds:cache:purge

# Fazer rebuild
git commit --allow-empty -m "Rebuild"
git push heroku main
```

### Erro de Memória

```bash
# Aumentar memória do Node.js
heroku config:set NODE_OPTIONS="--max-old-space-size=4096"
```

### Firestore Connection Error

- Verifique se FIREBASE_PRIVATE_KEY está correta
- Confirme que as quebras de linha `\n` estão presentes
- Teste localmente primeiro com as mesmas variáveis

### Application Error (H10)

```bash
# Ver logs detalhados
heroku logs --tail

# Verificar se build foi concluído
heroku releases

# Verificar se dyno está rodando
heroku ps
```

## Monitoramento

### Métricas do Heroku

```bash
# Abrir dashboard de métricas
heroku open --metrics
```

### Adicionar Logging (Opcional)

```bash
# Papertrail (logs persistentes)
heroku addons:create papertrail:choklad
heroku addons:open papertrail
```

## Domínio Customizado (Opcional)

```bash
# Adicionar domínio
heroku domains:add www.dominogardenal.com

# Ver domínios configurados
heroku domains

# Configurar DNS no provedor do domínio
# Criar CNAME apontando para: 
# [seu-app].herokudns.com
```

## SSL/HTTPS

O Heroku fornece SSL automático para:
- Domínio herokuapp.com (automático)
- Domínios customizados (Automated Certificate Management)

Nenhuma configuração adicional necessária!

## Backup e Restore

### Backup do Firestore

Use Firebase Console ou Firebase CLI:
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export Firestore
firebase firestore:export gs://[BUCKET_NAME]/backup
```

## Custos

- **Dyno Gratuito**: Dorme após 30min de inatividade
- **Hobby Dyno** ($7/mês): Sempre ativo, SSL customizado
- **Professional Dyno** ($25-$500/mês): Recursos avançados

Para produção, recomenda-se **Hobby** ou superior.

## Próximos Passos Após Deploy

1. ✅ Testar login com admin padrão
2. ✅ Criar usuários de teste
3. ✅ Testar criação e finalização de partidas
4. ✅ Verificar estatísticas e ranking
5. ✅ Testar em mobile (PWA no futuro)
6. ✅ Configurar domínio customizado (opcional)
7. ✅ Monitorar logs e performance

## Atualizar Aplicação

Sempre que fizer mudanças:

```bash
git add .
git commit -m "Descrição das mudanças"
git push heroku main
```

O Heroku automaticamente:
1. Detecta mudanças
2. Executa `npm install`
3. Executa `npm run heroku-postbuild` (build)
4. Reinicia a aplicação

---

**🚀 Aplicação pronta para deploy no Heroku!**
