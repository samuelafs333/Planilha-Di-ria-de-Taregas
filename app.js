// CONTROLADOR DE LOGICA - PLANILHA DE TAREFAS DIÁRIAS

// Configurações e Estado Inicial
let state = {
    tasks: [],
    weeklyScore: 0,
    lastResetDate: "",
    lastWeeklyResetDate: "",
    theme: "dark"
};

let editingTaskId = null;

// Tarefas padrão para inicializar o app pela primeira vez
const defaultTasks = [
    { id: "1", name: "Passar fio dental / escovar os dentes", completed: false, points: 10 },
    { id: "2", name: "Não tomar energético", completed: false, points: 20 },
    { id: "3", name: "Ler ao menos 2 páginas de um livro", completed: false, points: 15 },
    { id: "4", name: "Arrumar a cama", completed: false, points: 5 },
    { id: "5", name: "Estudar", completed: false, points: 25 },
    { id: "6", name: "Meditar ao menos 5 minutos", completed: false, points: 15 },
    { id: "7", name: "Revisar tarefas do dia", completed: false, points: 10 },
    { id: "8", name: "Guardar as coisas no lugar logo após o uso", completed: false, points: 10 },
    { id: "9", name: "Passar 5 minutos organizando o quarto/mesa", completed: false, points: 10 },
    { id: "10", name: "Fazer uma refeição sem olhar o celular", completed: false, points: 15 },
    { id: "11", name: "Fazer um exercício por dia", completed: false, points: 30 }
];

// Elementos do DOM
const taskTableBody = document.getElementById("task-table-body");
const btnAddTask = document.getElementById("btn-add-task");
const btnResetChecklist = document.getElementById("btn-reset-checklist");
const btnRunDaily = document.getElementById("btn-run-daily");
const btnRunWeekly = document.getElementById("btn-run-weekly");
const btnClearLogs = document.getElementById("btn-clear-logs");
const btnGuide = document.getElementById("btn-guide");
const themeToggle = document.getElementById("theme-toggle");

const weeklyScoreEl = document.getElementById("weekly-score");
const todayPointsEl = document.getElementById("today-points");
const taskProgressEl = document.getElementById("task-progress");
const progressBarEl = document.getElementById("progress-bar");
const nextResetEl = document.getElementById("next-reset");
const consoleLogsEl = document.getElementById("console-logs");

// Modais
const guideModal = document.getElementById("guide-modal");
const btnCloseModal = document.getElementById("btn-close-modal");
const btnCloseModalFooter = document.getElementById("btn-close-modal-footer");
const btnCopyCode = document.getElementById("btn-copy-code");

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    loadFromLocalStorage();
    setupTheme();
    renderTasks();
    updateDashboard();
    checkAutomatedResets();
    startCountdown();
    setupEventListeners();
    addLog("[SISTEMA] Aplicação pronta. Dados carregados do LocalStorage.", "system");
});

// --- PERSISTÊNCIA E ESTADO ---
function loadFromLocalStorage() {
    const savedState = localStorage.getItem("planilha_tarefas_state");
    if (savedState) {
        try {
            state = JSON.parse(savedState);
            
            // Migração: se as tarefas antigas padrão estiverem salvas, atualiza para a nova lista do usuário
            if (state.tasks && state.tasks.length > 0 && state.tasks[0].name === "Beber 2L de água ao longo do dia") {
                state.tasks = [...defaultTasks];
                saveToLocalStorage();
            }
            
            // Garantir que as chaves obrigatórias existem
            if (!state.tasks || state.tasks.length === 0) {
                state.tasks = [...defaultTasks];
            } else {
                // Garantir que todas as tarefas tenham a propriedade 'points'
                state.tasks.forEach(t => {
                    if (t.points === undefined) {
                        const def = defaultTasks.find(d => d.name === t.name);
                        t.points = def ? def.points : 10;
                    }
                });
            }
            if (state.weeklyScore === undefined) state.weeklyScore = 0;
            if (!state.lastResetDate) state.lastResetDate = getTodayDateString();
            if (!state.lastWeeklyResetDate) state.lastWeeklyResetDate = getSundayOfCurrentWeekString();
            if (!state.theme) state.theme = "dark";
        } catch (e) {
            console.error("Erro ao carregar o estado, usando padrão:", e);
            resetToDefaultState();
        }
    } else {
        resetToDefaultState();
    }
}

function resetToDefaultState() {
    state = {
        tasks: [...defaultTasks],
        weeklyScore: 0,
        lastResetDate: getTodayDateString(),
        lastWeeklyResetDate: getSundayOfCurrentWeekString(),
        theme: "dark"
    };
    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem("planilha_tarefas_state", JSON.stringify(state));
}

// Auxiliares de Data
function getTodayDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Obtém a data do último domingo da semana atual (para controle de reset semanal)
function getSundayOfCurrentWeekString() {
    const d = new Date();
    const day = d.getDay(); // 0 = Domingo, 1 = Segunda...
    const diff = d.getDate() - day; // Retrocede até o domingo anterior
    const sunday = new Date(d.setDate(diff));
    return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
}

// --- CONTROLE DE ACIONADORES DE TEMPO (AUTOMÁTICOS) ---
function checkAutomatedResets() {
    const today = getTodayDateString();
    
    // 1. Verificar Reset Semanal Automático (Domingo à meia-noite)
    // Se o último reset semanal foi feito numa semana calendário anterior à atual, executamos o reset semanal.
    const currentSunday = getSundayOfCurrentWeekString();
    if (state.lastWeeklyResetDate !== currentSunday) {
        addLog("[ACIONADOR AUTOMÁTICO] Nova semana detectada! Executando resetPontuacaoSemanal()...", "warning");
        executeWeeklyResetLogic(true);
    }

    // 2. Verificar Reset Diário Automático
    // Se a data de hoje for diferente da data do último reset, executa a soma diária e reseta checklist.
    if (state.lastResetDate !== today) {
        addLog("[ACIONADOR AUTOMÁTICO] Novo dia detectada! Executando resetDiarioETotalizador()...", "warning");
        executeDailyResetLogic(true);
    }
}

// Contagem regressiva até a meia-noite
function startCountdown() {
    setInterval(() => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0); // Define para 00:00 do dia seguinte
        
        const diffMs = midnight - now;
        const hours = String(Math.floor((diffMs / (1000 * 60 * 60)) % 24)).padStart(2, '0');
        const minutes = String(Math.floor((diffMs / (1000 * 60)) % 60)).padStart(2, '0');
        const seconds = String(Math.floor((diffMs / 1000) % 60)).padStart(2, '0');
        
        nextResetEl.textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

// --- LOGICA DOS ACIONADORES (SIMULAÇÃO GOOGLE APPS SCRIPT) ---

// 1. Reset Diário (Soma pontos e desmarca caixas)
function executeDailyResetLogic(isAuto = false) {
    if (!isAuto) {
        disableButton(btnRunDaily);
    }

    addLog(`[Apps Script] Iniciando função: resetDiarioETotalizador()...`, "info");
    
    setTimeout(() => {
        const numTasks = state.tasks.length;
        const completedTasksList = state.tasks.filter(t => t.completed);
        const completedTasks = completedTasksList.length;
        const pointsEarned = completedTasksList.reduce((sum, t) => sum + (t.points || 0), 0);
        
        addLog(`[Apps Script] Lendo aba ativa: "Tarefas_Diarias"...`, "info");
        addLog(`[Apps Script] Obtendo intervalo B2:C${1 + numTasks} (Checkboxes e Pontos)`, "info");
        
        setTimeout(() => {
            addLog(`[Apps Script] Encontradas ${completedTasks} de ${numTasks} caixas marcadas (TRUE).`, "success");
            addLog(`[Apps Script] Pontuação gerada hoje: ${pointsEarned} pontos (soma das células da Coluna C).`, "success");
            
            setTimeout(() => {
                const oldScore = state.weeklyScore;
                state.weeklyScore += pointsEarned;
                
                // Desmarcar todas as checkboxes
                state.tasks.forEach(t => t.completed = false);
                state.lastResetDate = getTodayDateString();
                saveToLocalStorage();
                
                addLog(`[Apps Script] Lendo célula D2 (Placar Semanal). Valor anterior: ${oldScore}`, "info");
                addLog(`[Apps Script] Escrevendo novo valor na célula D2: ${state.weeklyScore}`, "success");
                addLog(`[Apps Script] Limpando intervalo B2:B${1 + numTasks} para o valor FALSE.`, "info");
                
                // Atualiza a tela
                renderTasks();
                updateDashboard();
                
                addLog(`[Apps Script] Função resetDiarioETotalizador() executada com sucesso!`, "success");
                
                if (!isAuto) {
                    enableButton(btnRunDaily);
                    triggerConfetti(100);
                }
            }, 800);
        }, 800);
    }, 400);
}

// 2. Reset Semanal (Zera pontos)
function executeWeeklyResetLogic(isAuto = false) {
    if (!isAuto) {
        disableButton(btnRunWeekly);
    }

    addLog(`[Apps Script] Iniciando função: resetPontuacaoSemanal()...`, "info");
    
    setTimeout(() => {
        addLog(`[Apps Script] Acessando célula D2 (Placar Semanal)...`, "info");
        
        setTimeout(() => {
            const oldScore = state.weeklyScore;
            state.weeklyScore = 0;
            state.lastWeeklyResetDate = getSundayOfCurrentWeekString();
            saveToLocalStorage();
            
            addLog(`[Apps Script] Redefinindo valor de D2. Valor anterior: ${oldScore} -> Novo valor: 0.`, "warning");
            
            // Atualiza a tela
            updateDashboard();
            
            addLog(`[Apps Script] Função resetPontuacaoSemanal() concluída com sucesso! Placar zerado.`, "success");
            
            if (!isAuto) {
                enableButton(btnRunWeekly);
            }
        }, 800);
    }, 400);
}

// Auxiliares de Botão do Simulador
function disableButton(btn) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
}

function enableButton(btn) {
    btn.disabled = false;
    btn.style.opacity = "1";
    btn.style.cursor = "pointer";
}

// --- TERMINAL DE LOGS ---
function addLog(text, type = "info") {
    const timestamp = new Date().toLocaleTimeString("pt-BR");
    const line = document.createElement("div");
    line.className = `console-line ${type}`;
    line.textContent = `[${timestamp}] ${text}`;
    
    consoleLogsEl.appendChild(line);
    consoleLogsEl.scrollTop = consoleLogsEl.scrollHeight;
    
    // Manter no máximo 60 linhas de log para desempenho
    while (consoleLogsEl.children.length > 60) {
        consoleLogsEl.removeChild(consoleLogsEl.firstChild);
    }
}

// --- RENDERIZAÇÃO DA PLANILHA (GRID) ---
function renderTasks() {
    taskTableBody.innerHTML = "";
    
    if (state.tasks.length === 0) {
        taskTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    Nenhuma tarefa criada. Clique em "Adicionar Tarefa" para começar.
                </td>
            </tr>
        `;
        return;
    }

    state.tasks.forEach((task, index) => {
        const row = document.createElement("tr");
        if (task.completed) {
            row.className = "task-completed";
        }
        
        const sheetRowIndex = index + 2;
        const isEditing = task.id === editingTaskId;
        
        if (isEditing) {
            row.innerHTML = `
                <td class="col-index">${sheetRowIndex}</td>
                <td class="col-checkbox">
                    <div class="checkbox-cell-wrapper">
                        <input type="checkbox" class="sheets-checkbox task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''} disabled>
                    </div>
                </td>
                <td class="col-task">
                    <input type="text" class="task-input-edit" value="${escapeHtml(task.name)}" data-id="${task.id}" style="width: 100%; border: 1px solid var(--primary); border-radius: 4px; background: var(--cell-focus-bg); color: var(--text-primary); padding: 0.4rem 0.6rem; outline: none;">
                </td>
                <td class="col-points" style="text-align: center; vertical-align: middle;">
                    <div style="display: inline-flex; align-items: center; gap: 0.25rem; justify-content: center;">
                        <span>+</span>
                        <input type="number" class="points-input-edit" value="${task.points || 0}" data-id="${task.id}" min="0" max="1000" style="width: 65px; text-align: center; border: 1px solid var(--primary); border-radius: 4px; background: var(--cell-focus-bg); color: var(--text-primary); padding: 0.4rem 0.2rem; outline: none;">
                        <span>Pts</span>
                    </div>
                </td>
                <td class="col-actions">
                    <div class="actions-cell-wrapper" style="display: flex; gap: 0.25rem; justify-content: center; align-items: center;">
                        <button class="btn btn-icon btn-icon-success btn-save-task" data-id="${task.id}" title="Salvar Alterações">
                            <i data-lucide="check"></i>
                        </button>
                        <button class="btn btn-icon btn-icon-danger btn-cancel-edit" data-id="${task.id}" title="Cancelar">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td class="col-index">${sheetRowIndex}</td>
                <td class="col-checkbox">
                    <div class="checkbox-cell-wrapper">
                        <input type="checkbox" class="sheets-checkbox task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                    </div>
                </td>
                <td class="col-task">
                    <span class="task-name-text" style="padding-left: 0.6rem; font-weight: 500; cursor: pointer;" title="Clique duplo para editar">${escapeHtml(task.name)}</span>
                </td>
                <td class="col-points">+${task.points || 10} Pontos</td>
                <td class="col-actions">
                    <div class="actions-cell-wrapper" style="display: flex; gap: 0.25rem; justify-content: center; align-items: center;">
                        <button class="btn btn-icon btn-icon-info btn-edit-task" data-id="${task.id}" title="Editar Tarefa">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="btn btn-icon btn-icon-danger btn-delete-task" data-id="${task.id}" title="Excluir Tarefa">
                            <i data-lucide="trash"></i>
                        </button>
                    </div>
                </td>
            `;
        }
        
        taskTableBody.appendChild(row);
    });

    // Recriar ícones lucide na tabela dinâmica
    lucide.createIcons();
    attachTableListeners();
}

function attachTableListeners() {
    // 1. Listeners para Checkboxes
    document.querySelectorAll(".task-checkbox").forEach(chk => {
        chk.addEventListener("change", (e) => {
            const id = e.target.dataset.id;
            const completed = e.target.checked;
            
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.completed = completed;
                saveToLocalStorage();
                updateDashboard();
                
                // Aplicar classe riscada na linha
                const row = e.target.closest("tr");
                if (completed) {
                    row.classList.add("task-completed");
                    addLog(`Checkbox B${state.tasks.indexOf(task) + 2} marcada como TRUE (${task.name.substring(0, 20)}...)`, "success");
                    triggerConfetti(50);
                } else {
                    row.classList.remove("task-completed");
                    addLog(`Checkbox B${state.tasks.indexOf(task) + 2} desmarcada para FALSE`, "warning");
                }
            }
        });
    });

    // 2. Click no Botão de Editar
    document.querySelectorAll(".btn-edit-task").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const btnTarget = e.target.closest(".btn-edit-task");
            const id = btnTarget.dataset.id;
            editingTaskId = id;
            renderTasks();
            addLog(`Modo de edição ativado para a linha ${state.tasks.findIndex(t => t.id === id) + 2}`, "info");
        });
    });

    // Double-click para entrar em modo de edição (atalho de planilha)
    document.querySelectorAll(".task-name-text").forEach(span => {
        span.addEventListener("dblclick", (e) => {
            const row = e.target.closest("tr");
            const btnEdit = row.querySelector(".btn-edit-task");
            if (btnEdit) btnEdit.click();
        });
    });

    // 3. Click no Botão de Salvar Edição
    document.querySelectorAll(".btn-save-task").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const btnTarget = e.target.closest(".btn-save-task");
            const id = btnTarget.dataset.id;
            
            const nameInput = document.querySelector(`.task-input-edit[data-id="${id}"]`);
            const pointsInput = document.querySelector(`.points-input-edit[data-id="${id}"]`);
            
            const newName = nameInput.value.trim();
            const newPoints = parseInt(pointsInput.value);
            
            const task = state.tasks.find(t => t.id === id);
            if (task && newName !== "" && !isNaN(newPoints)) {
                const oldName = task.name;
                const oldPoints = task.points;
                task.name = newName;
                task.points = newPoints;
                editingTaskId = null;
                saveToLocalStorage();
                renderTasks();
                updateDashboard();
                addLog(`Linha ${state.tasks.indexOf(task) + 2} atualizada: "${oldName.substring(0, 15)}..." (+${oldPoints} Pts) -> "${newName.substring(0, 15)}..." (+${newPoints} Pts)`, "success");
            }
        });
    });

    // 4. Click no Botão de Cancelar Edição
    document.querySelectorAll(".btn-cancel-edit").forEach(btn => {
        btn.addEventListener("click", () => {
            editingTaskId = null;
            renderTasks();
            addLog("Edição cancelada pelo usuário.", "info");
        });
    });

    // 5. Listeners para Excluir Tarefa
    document.querySelectorAll(".btn-delete-task").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const btnTarget = e.target.closest(".btn-delete-task");
            const id = btnTarget.dataset.id;
            
            const taskIndex = state.tasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                const task = state.tasks[taskIndex];
                addLog(`Excluindo tarefa da linha ${taskIndex + 2}: "${task.name.substring(0, 20)}..."`, "warning");
                state.tasks.splice(taskIndex, 1);
                saveToLocalStorage();
                renderTasks();
                updateDashboard();
            }
        });
    });
}

// --- DASHBOARD E STATS ---
function updateDashboard() {
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    
    // Pontos de Hoje (soma dos pontos de todas as tarefas concluídas)
    const todayPoints = state.tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.points || 0), 0);
    todayPointsEl.textContent = todayPoints;
    
    // Placar Semanal
    weeklyScoreEl.textContent = state.weeklyScore;
    
    // Progresso
    taskProgressEl.textContent = `${completedTasks}/${totalTasks}`;
    
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    progressBarEl.style.width = `${percentage}%`;
}

// --- LISTENERS DE CONFIGURAÇÃO DO APLICATIVO ---
function setupEventListeners() {
    // Adicionar Tarefa
    btnAddTask.addEventListener("click", () => {
        const nextIndex = state.tasks.length + 2; // Linha da planilha correspondente
        const newTask = {
            id: Date.now().toString(),
            name: `Nova tarefa na linha ${nextIndex}`,
            completed: false,
            points: 10
        };
        
        state.tasks.push(newTask);
        editingTaskId = newTask.id; // Abre a edição automaticamente
        saveToLocalStorage();
        renderTasks();
        updateDashboard();
        addLog(`Nova linha adicionada (Célula A${nextIndex}). Insira o nome da sua tarefa e pontuação.`, "info");
        
        // Focar no novo input criado
        setTimeout(() => {
            const lastInput = document.querySelector(`.task-input-edit[data-id="${newTask.id}"]`);
            if (lastInput) {
                lastInput.focus();
                lastInput.select();
            }
        }, 50);
    });

    // Limpar checklist manual
    btnResetChecklist.addEventListener("click", () => {
        const completedCount = state.tasks.filter(t => t.completed).length;
        if (completedCount === 0) {
            addLog("[AVISO] Nenhuma checkbox está marcada para ser limpa.", "warning");
            return;
        }

        if (confirm("Deseja apenas desmarcar as checkboxes sem somar pontos ao placar?")) {
            state.tasks.forEach(t => t.completed = false);
            saveToLocalStorage();
            renderTasks();
            updateDashboard();
            addLog("Checkboxes limpas manualmente (sem pontuar).", "warning");
        }
    });

    // Executores de Simulação do Apps Script
    btnRunDaily.addEventListener("click", () => {
        executeDailyResetLogic(false);
    });

    btnRunWeekly.addEventListener("click", () => {
        if (confirm("Isso vai zerar o placar semanal da célula D2. Deseja continuar?")) {
            executeWeeklyResetLogic(false);
        }
    });

    // Limpar logs
    btnClearLogs.addEventListener("click", () => {
        consoleLogsEl.innerHTML = `
            <div class="console-line system">[SISTEMA] Console limpo pelo usuário.</div>
        `;
    });

    // Modal de Guia
    btnGuide.addEventListener("click", () => {
        guideModal.classList.add("open");
    });

    btnCloseModal.addEventListener("click", () => {
        guideModal.classList.remove("open");
    });

    btnCloseModalFooter.addEventListener("click", () => {
        guideModal.classList.remove("open");
    });

    // Fechar ao clicar fora do modal card
    guideModal.addEventListener("click", (e) => {
        if (e.target === guideModal) {
            guideModal.classList.remove("open");
        }
    });

    // Copiar código do Apps Script
    btnCopyCode.addEventListener("click", () => {
        const codeText = document.getElementById("code-snippet").textContent.trim();
        navigator.clipboard.writeText(codeText)
            .then(() => {
                addLog("Código do Apps Script copiado para a área de transferência!", "success");
                btnCopyCode.innerHTML = `<i data-lucide="check"></i> Copiado!`;
                lucide.createIcons();
                setTimeout(() => {
                    btnCopyCode.innerHTML = `<i data-lucide="copy"></i> Copiar Código`;
                    lucide.createIcons();
                }, 2000);
            })
            .catch(err => {
                console.error("Erro ao copiar código:", err);
                addLog("Não foi possível copiar o código. Por favor, copie manualmente.", "warning");
            });
    });
}

// --- TEMA CLARO E ESCURO ---
function setupTheme() {
    if (state.theme === "light") {
        document.body.classList.remove("dark-theme");
        document.body.classList.add("light-theme");
        updateThemeToggleIcon("light");
    } else {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
        updateThemeToggleIcon("dark");
    }

    themeToggle.addEventListener("click", () => {
        if (document.body.classList.contains("dark-theme")) {
            document.body.classList.remove("dark-theme");
            document.body.classList.add("light-theme");
            state.theme = "light";
            updateThemeToggleIcon("light");
            addLog("Tema alterado para Claro.", "info");
        } else {
            document.body.classList.remove("light-theme");
            document.body.classList.add("dark-theme");
            state.theme = "dark";
            updateThemeToggleIcon("dark");
            addLog("Tema alterado para Escuro.", "info");
        }
        saveToLocalStorage();
    });
}

function updateThemeToggleIcon(theme) {
    if (theme === "light") {
        themeToggle.innerHTML = `<i data-lucide="moon"></i>`;
    } else {
        themeToggle.innerHTML = `<i data-lucide="sun"></i>`;
    }
    lucide.createIcons();
}

// --- CONFETES ---
function triggerConfetti(count) {
    confetti({
        particleCount: count,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#60a5fa', '#34d399', '#fbbf24']
    });
}

// --- SEGURANÇA / HIGIENIZAÇÃO HTML ---
function escapeHtml(string) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return string.replace(/[&<>"']/g, function(m) { return map[m]; });
}
