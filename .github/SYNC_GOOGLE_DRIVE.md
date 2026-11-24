# Sincronização Automática: GitHub → Google Drive

Este projeto já está configurado com um workflow do GitHub Actions ([`sync-google-drive.yml`](./workflows/sync-google-drive.yml)) que envia automaticamente para a pasta **Planilha Diária de Tarefas** no Google Drive todo arquivo **adicionado ou modificado** na branch `main`.

- **Pasta no Google Drive:** [Planilha Diária de Tarefas](https://drive.google.com/drive/folders/1D89YqTGSKaA2bvUdupbfAknGM9jyy9rL)
- **ID da pasta:** `1D89YqTGSKaA2bvUdupbfAknGM9jyy9rL`

> Como a sincronização usa um **Web App do Google Apps Script** na sua própria conta Google, **não precisa criar projeto no Google Cloud**, **não expira em 7 dias** e funciona tanto para arquivos de texto (`.html`, `.css`, `.js`, `.json`, `.md`, `.svg`) quanto para imagens (`.png`, `.jpg`) e novas subpastas.

---

## Ativação única (2 minutos)

### 1. Criar o Web App no Google Apps Script
1. Acesse [script.google.com](https://script.google.com) com a mesma conta do Google Drive e clique em **Novo projeto**.
2. Apague o conteúdo inicial de `Código.gs` (`Code.gs`) e cole todo o código de [`.github/google-apps-script/Code.gs`](./google-apps-script/Code.gs).
3. No menu lateral esquerdo, clique em **Configurações do projeto** (ícone de engrenagem) → role até **Propriedades do script** → **Adicionar propriedade de script**:
   - **Propriedade:** `SYNC_SECRET`
   - **Valor:** crie uma senha forte (exemplo: uma sequência aleatória de letras e números) e guarde-a para o próximo passo.
   - Clique em **Salvar propriedades do script**.
4. No canto superior direito, clique em **Implantar** → **Nova implantação**:
   - Clique na engrenagem ao lado de "Selecionar tipo" e escolha **App da Web**.
   - **Executar como:** `Eu` (sua conta Google).
   - **Quem pode acessar:** `Qualquer pessoa` *(o script exige o `SYNC_SECRET` em toda requisição `POST`)*.
   - Clique em **Implantar**, autorize o acesso ao Google Drive e **copie a URL do App da Web** (termina em `/exec`).

### 2. Cadastrar os 2 Secrets no GitHub
1. No repositório no GitHub, acesse **Settings → Secrets and variables → Actions**.
2. Clique em **New repository secret** e crie:
   - `GDRIVE_WEBHOOK_URL`: cole a URL do App da Web (`/exec`) obtida no passo 1.
   - `GDRIVE_SYNC_SECRET`: cole a mesma senha definida em `SYNC_SECRET`.

### 3. Testar
1. Acesse a aba **Actions** no GitHub → clique em **Sincronizar com Google Drive** → **Run workflow** para validar a conexão imediatamente.
2. A partir daí, qualquer arquivo adicionado ou modificado na branch `main` (via `git push`, Pull Request ou edição direta pelo site do GitHub) atualizará a pasta **Planilha Diária de Tarefas** no Google Drive automaticamente!
