# Planilha de Tarefas Diárias (Com Simulador de Apps Script)

Este é um projeto de gerenciador de tarefas diárias gamificado que replica a lógica de automação e pontuação do Google Planilhas usando scripts baseados em tempo (Google Apps Script).

O objetivo deste aplicativo é funcionar como:
1. **Gerenciador de Tarefas Standalone**: Um aplicativo offline e local para listar, marcar e acumular pontos por tarefas diárias concluídas.
2. **Simulador Didático de Apps Script**: Um ambiente de simulação onde você pode visualizar logs em tempo real que explicam como os scripts rodam na nuvem do Google (com simulação de acionadores diários e semanais).
3. **Guia e Código Pronto**: Um guia passo a passo embutido contendo o código `.gs` exato e instruções para implementar o sistema no seu próprio Google Planilhas e usá-lo pelo celular.

---

## 🚀 Como Executar o Projeto

Como o projeto é construído em **HTML, CSS e JavaScript puros (Vanilla)**, ele não possui dependências complexas ou necessidade de build.

Para executá-lo:
1. Navegue até a pasta `E:\antigravity\planilha-tarefas-diarias`.
2. Dê um duplo clique no arquivo **`index.html`** para abri-lo diretamente em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).
3. Para uma experiência completa, você também pode subir um servidor local rápido (como a extensão Live Server do VS Code ou usando o comando `python -m http.server 8000` no terminal).

---

## 🛠️ Principais Funcionalidades

* **Planilha Grid Premium**: Visual inspirado no Excel e Google Planilhas, com células de texto editáveis para alterar o nome das tarefas e caixas de seleção interativas.
* **Pontuação Acumulada**: Cada tarefa diária marcada como concluída gera **+10 pontos**.
* **Simulador de Acionador Diário**: Executa o processo de somar os pontos de hoje ao placar semanal (célula D2) e desmarcar todas as tarefas para começar o dia seguinte com o checklist limpo.
* **Simulador de Acionador Semanal**: Simula a limpeza automática de domingo à meia-noite, zerando o placar semanal da célula D2.
* **Terminal de Logs Realistas**: Um console interativo que simula a saída de depuração do Google Apps Script com atrasos de tempo que ilustram a conexão em nuvem.
* **Persistência Local (LocalStorage)**: Todos os seus dados, pontuações, configurações de tema e tarefas personalizadas são mantidos salvos localmente no navegador.
* **Guia de Instalação no Sheets**: Instruções passo a passo fáceis e botão de clique único para copiar o script necessário.
