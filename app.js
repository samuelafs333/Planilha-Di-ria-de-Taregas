// CONTROLADOR DE LOGICA - PLANILHA DE TAREFAS DIÁRIAS

// Configurações e Estado Inicial
let state = {
    tasks: [],
    weeklyScore: 0,
    monthlyScore: 0,
    lastResetDate: "",
    lastWeeklyResetDate: "",
    theme: "dark",
    history: []
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

// Elementos do DOM (declarados como let e inicializados após o carregamento do DOM)
let taskTableBody, btnAddTask, btnResetChecklist, btnRunDaily, btnRunWeekly, btnRunMonthly, btnClearLogs, btnGuide, themeToggle;
let weeklyScoreEl, todayPointsEl, taskProgressEl, progressBarEl, nextResetEl, consoleLogsEl, currentWeekScoreEl, currentMonthScoreEl;
let rpgTitleEl, rpgLevelEl, rpgXpTextEl, rpgProgressBarEl;
let pomodoroTimeEl, pomodoroStatusEl, pomodoroTaskSelect, btnPomodoroStart, btnPomodoroReset, pomodoroFocusTimeInput;
let notesTextarea, btnProcessNotes;
let spreadsheetSection;
let guideModal, btnCloseModal, btnCloseModalFooter, btnCopyCode;

function initDOMReferences() {
    taskTableBody = document.getElementById("task-table-body");
    btnAddTask = document.getElementById("btn-add-task");
    btnResetChecklist = document.getElementById("btn-reset-checklist");
    btnRunDaily = document.getElementById("btn-run-daily");
    btnRunWeekly = document.getElementById("btn-run-weekly");
    btnRunMonthly = document.getElementById("btn-run-monthly");
    btnClearLogs = document.getElementById("btn-clear-logs");
    btnGuide = document.getElementById("btn-guide");
    themeToggle = document.getElementById("theme-toggle");

    weeklyScoreEl = document.getElementById("weekly-score");
    todayPointsEl = document.getElementById("today-points");
    taskProgressEl = document.getElementById("task-progress");
    progressBarEl = document.getElementById("progress-bar");
    nextResetEl = document.getElementById("next-reset");
    consoleLogsEl = document.getElementById("console-logs");
    currentWeekScoreEl = document.getElementById("current-week-score");
    currentMonthScoreEl = document.getElementById("current-month-score");

    rpgTitleEl = document.getElementById("rpg-title");
    rpgLevelEl = document.getElementById("rpg-level");
    rpgXpTextEl = document.getElementById("rpg-xp-text");
    rpgProgressBarEl = document.getElementById("rpg-progress-bar");

    pomodoroTimeEl = document.getElementById("pomodoro-time");
    pomodoroStatusEl = document.getElementById("pomodoro-status");
    pomodoroTaskSelect = document.getElementById("pomodoro-task-select");
    btnPomodoroStart = document.getElementById("btn-pomodoro-start");
    btnPomodoroReset = document.getElementById("btn-pomodoro-reset");
    pomodoroFocusTimeInput = document.getElementById("pomodoro-focus-time-input");

    notesTextarea = document.getElementById("notes-textarea");
    btnProcessNotes = document.getElementById("btn-process-notes");

    spreadsheetSection = document.querySelector(".spreadsheet-section");

    guideModal = document.getElementById("guide-modal");
    btnCloseModal = document.getElementById("btn-close-modal");
    btnCloseModalFooter = document.getElementById("btn-close-modal-footer");
    btnCopyCode = document.getElementById("btn-copy-code");
}

// --- INICIALIZAÇÃO ---
document.addEventListener("DOMContentLoaded", () => {
    initDOMReferences();
    try { loadFromLocalStorage(); } catch (e) { console.error("Erro no LocalStorage:", e); }
    try { setupTheme(); } catch (e) { console.error("Erro no tema:", e); }
    try { renderTasks(); } catch (e) { console.error("Erro nas tarefas:", e); }
    try { updateDashboard(); } catch (e) { console.error("Erro no dashboard:", e); }
    try { checkAutomatedResets(); } catch (e) { console.error("Erro nos resets:", e); }
    try { startCountdown(); } catch (e) { console.error("Erro no cronometro:", e); }
    try { setupEventListeners(); } catch (e) { console.error("Erro nos listeners:", e); }
    try { renderHistory(); } catch (e) { console.error("Erro no historico:", e); }
    
    // Inicializar Bloco de Notas
    try {
        if (notesTextarea) {
            notesTextarea.value = state.notesText || "";
        }
        renderNotesTasks();
    } catch (e) {
        console.error("Erro no Bloco de Notas:", e);
    }
    
    addLog("[SISTEMA] Aplicação pronta. Inicialização concluída.", "system");
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
            if (state.monthlyScore === undefined) state.monthlyScore = 0;
            if (!state.history) state.history = [];
            if (!state.lastResetDate) state.lastResetDate = getTodayDateString();
            if (!state.lastWeeklyResetDate) state.lastWeeklyResetDate = getSundayOfCurrentWeekString();
            if (!state.theme) state.theme = "dark";
            if (state.notesText === undefined) state.notesText = "";
            if (!state.notesTasks) state.notesTasks = [];
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
        monthlyScore: 0,
        lastResetDate: getTodayDateString(),
        lastWeeklyResetDate: getSundayOfCurrentWeekString(),
        theme: "dark",
        history: [],
        notesText: "",
        notesTasks: []
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
    
    // 1. Verificar Reset Mensal Automático (Se o mês ou ano mudou desde o último reset)
    const lastResetParts = state.lastResetDate ? state.lastResetDate.split("-") : [];
    const todayParts = today.split("-");
    if (lastResetParts.length > 1 && (lastResetParts[0] !== todayParts[0] || lastResetParts[1] !== todayParts[1])) {
        addLog("[ACIONADOR AUTOMÁTICO] Novo mês detectado! Executando resetPontuacaoMensal()...", "warning");
        executeMonthlyResetLogic(true);
    }

    // 2. Verificar Reset Semanal Automático (Domingo à meia-noite)
    const currentSunday = getSundayOfCurrentWeekString();
    if (state.lastWeeklyResetDate !== currentSunday) {
        addLog("[ACIONADOR AUTOMÁTICO] Nova semana detectada! Executando resetPontuacaoSemanal()...", "warning");
        executeWeeklyResetLogic(true);
    }
   
    // 3. Verificar Reset Diário Automático
    if (state.lastResetDate !== today) {
        addLog("[ACIONADOR AUTOMÁTICO] Novo dia detectado! Executando resetDiarioETotalizador()...", "warning");
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
        const pointsEarned = completedTasksList.reduce((sum, t) => sum + Number(t.points || 0), 0);
        
        addLog(`[Apps Script] Lendo aba ativa: "Tarefas_Diarias"...`, "info");
        addLog(`[Apps Script] Obtendo intervalo B2:C${1 + numTasks} (Checkboxes e Pontos)`, "info");
        
        setTimeout(() => {
            addLog(`[Apps Script] Encontradas ${completedTasks} de ${numTasks} caixas marcadas (TRUE).`, "success");
            addLog(`[Apps Script] Pontuação gerada hoje: ${pointsEarned} pontos (soma das células da Coluna C).`, "success");
            
            setTimeout(() => {
                const oldScore = state.weeklyScore;
                state.weeklyScore += pointsEarned;
                state.monthlyScore += pointsEarned;
                
                // Desmarcar todas as checkboxes
                state.tasks.forEach(t => t.completed = false);
                state.lastResetDate = getTodayDateString();
                saveToLocalStorage();
                
                addLog(`[Automação] Lendo Placar Semanal. Valor anterior: ${oldScore}`, "info");
                addLog(`[Automação] Novo Placar Semanal: ${state.weeklyScore}`, "success");
                addLog(`[Automação] Redefinindo status das caixas de seleção.`, "info");
                
                // Atualiza a tela
                renderTasks();
                updateDashboard();
                
                addLog(`[Automação] Rotina de Reset Diário executada com sucesso!`, "success");
                
                if (!isAuto) {
                    enableButton(btnRunDaily);
                    triggerConfetti(100);
                    setTimeout(() => {
                        alert(`Reset Diário Concluído!\n\nPontos calculados hoje: +${pointsEarned} Pts\nNovo Placar Semanal: ${state.weeklyScore} Pts\n\nAs caixas de seleção foram desmarcadas para o dia seguinte.`);
                    }, 100);
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

    addLog(`[Automação] Iniciando reset da pontuação semanal...`, "info");
    
    setTimeout(() => {
        addLog(`[Automação] Salvando pontuação semanal no histórico...`, "info");
        
        setTimeout(() => {
            const oldScore = state.weeklyScore;
            
            // Salvar pontuação semanal no histórico
            if (state.weeklyScore > 0) {
                const label = getWeeklyLabel(state.lastWeeklyResetDate);
                state.history.push({
                    id: Date.now().toString(),
                    label: label,
                    score: state.weeklyScore,
                    type: "weekly",
                    date: state.lastWeeklyResetDate
                });
            }
            
            state.weeklyScore = 0;
            state.lastWeeklyResetDate = getSundayOfCurrentWeekString();
            saveToLocalStorage();
            
            addLog(`[Automação] Placar Semanal zerado (Valor anterior: ${oldScore}).`, "warning");
            
            // Atualiza a tela
            updateDashboard();
            renderHistory();
            
            addLog(`[Automação] Reset Semanal concluído com sucesso! Placar zerado.`, "success");
            
            if (!isAuto) {
                enableButton(btnRunWeekly);
                setTimeout(() => {
                    alert(`Reset Semanal Concluído!\n\nPontos da semana anterior salvos no histórico: +${oldScore} Pts\nO Placar Semanal foi zerado.`);
                }, 100);
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
    console.log(`[${type.toUpperCase()}] ${text}`); // Fallback para console do navegador
    if (!consoleLogsEl) return;
    
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
        
        const sheetRowIndex = index + 1;
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
    if (window.lucide) lucide.createIcons();
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
                    addLog(`Tarefa ${state.tasks.indexOf(task) + 1} marcada como concluída (${task.name.substring(0, 20)}...)`, "success");
                    triggerConfetti(50);
                } else {
                    row.classList.remove("task-completed");
                    addLog(`Tarefa ${state.tasks.indexOf(task) + 1} desmarcada`, "warning");
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
            addLog(`Modo de edição ativado para a tarefa ${state.tasks.findIndex(t => t.id === id) + 1}`, "info");
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
                addLog(`Tarefa ${state.tasks.indexOf(task) + 1} atualizada: "${oldName.substring(0, 15)}..." (+${oldPoints} Pts) -> "${newName.substring(0, 15)}..." (+${newPoints} Pts)`, "success");
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
                addLog(`Excluindo tarefa ${taskIndex + 1}: "${task.name.substring(0, 20)}..."`, "warning");
                state.tasks.splice(taskIndex, 1);
                saveToLocalStorage();
                renderTasks();
                updateDashboard();
            }
        });
    });

    // Atualizar dropdown do Pomodoro
    updatePomodoroTaskSelect();
}

// --- DASHBOARD E STATS ---
function updateDashboard() {
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.completed).length;
    
    // Pontos de Hoje (soma dos pontos de todas as tarefas concluídas)
    // Inclui bônus de 50% para tarefas concluídas via Pomodoro!
    const todayPoints = state.tasks.filter(t => t.completed).reduce((sum, t) => {
        const base = Number(t.points || 0);
        return sum + (t.completedViaPomodoro ? Math.round(base * 1.5) : base);
    }, 0);
    
    if (todayPointsEl) todayPointsEl.textContent = todayPoints;
    
    // Placar Semanal
    if (weeklyScoreEl) weeklyScoreEl.textContent = state.weeklyScore;
    
    // Progresso
    if (taskProgressEl) taskProgressEl.textContent = `${completedTasks}/${totalTasks}`;
    
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    if (progressBarEl) progressBarEl.style.width = `${percentage}%`;

    // Atualiza pontuações correntes da seção de histórico
    if (currentWeekScoreEl) currentWeekScoreEl.textContent = state.weeklyScore;
    if (currentMonthScoreEl) currentMonthScoreEl.textContent = state.monthlyScore;

    // Atualiza RPG de Produtividade
    updateRpgDisplay();
}

// --- LISTENERS DE CONFIGURAÇÃO DO APLICATIVO ---
function setupEventListeners() {
    // Adicionar Tarefa
    if (btnAddTask) {
        btnAddTask.addEventListener("click", () => {
            const nextIndex = state.tasks.length + 1; // Próximo número de tarefa
            const newTask = {
                id: Date.now().toString(),
                name: `Nova tarefa ${nextIndex}`,
                completed: false,
                points: 10
            };
            
            state.tasks.push(newTask);
            editingTaskId = newTask.id; // Abre a edição automaticamente
            saveToLocalStorage();
            renderTasks();
            updateDashboard();
            addLog(`Nova tarefa adicionada (Número ${nextIndex}). Insira o nome e pontuação.`, "info");
            
            // Focar no novo input criado
            setTimeout(() => {
                const lastInput = document.querySelector(`.task-input-edit[data-id="${newTask.id}"]`);
                if (lastInput) {
                    lastInput.focus();
                    lastInput.select();
                }
            }, 50);
        });
    }

    // Limpar checklist manual
    if (btnResetChecklist) {
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
    }

    // Executores de Simulação do Apps Script
    if (btnRunDaily) {
        btnRunDaily.addEventListener("click", () => {
            executeDailyResetLogic(false);
        });
    }

    if (btnRunWeekly) {
        btnRunWeekly.addEventListener("click", () => {
            if (confirm("Isso vai zerar o placar semanal. Deseja continuar?")) {
                executeWeeklyResetLogic(false);
            }
        });
    }

    if (btnRunMonthly) {
        btnRunMonthly.addEventListener("click", () => {
            if (confirm("Isso vai fechar o mês atual e salvar os pontos no histórico. Deseja continuar?")) {
                executeMonthlyResetLogic(false);
            }
        });
    }

    // Limpar logs
    if (btnClearLogs && consoleLogsEl) {
        btnClearLogs.addEventListener("click", () => {
            consoleLogsEl.innerHTML = `
                <div class="console-line system">[SISTEMA] Console limpo pelo usuário.</div>
            `;
        });
    }

    // Modal de Guia
    if (btnGuide && guideModal) {
        btnGuide.addEventListener("click", () => {
            guideModal.classList.add("open");
        });
    }

    if (btnCloseModal && guideModal) {
        btnCloseModal.addEventListener("click", () => {
            guideModal.classList.remove("open");
        });
    }

    if (btnCloseModalFooter && guideModal) {
        btnCloseModalFooter.addEventListener("click", () => {
            guideModal.classList.remove("open");
        });
    }

    // Fechar ao clicar fora do modal card
    if (guideModal) {
        guideModal.addEventListener("click", (e) => {
            if (e.target === guideModal) {
                guideModal.classList.remove("open");
            }
        });
    }

    // Copiar código do Apps Script
    if (btnCopyCode) {
        btnCopyCode.addEventListener("click", () => {
            const codeSnippetEl = document.getElementById("code-snippet");
            if (!codeSnippetEl) return;
            const codeText = codeSnippetEl.textContent.trim();
            navigator.clipboard.writeText(codeText)
                .then(() => {
                    addLog("Código do Apps Script copiado para a área de transferência!", "success");
                    btnCopyCode.innerHTML = `<i data-lucide="check"></i> Copiado!`;
                    if (window.lucide) lucide.createIcons();
                    setTimeout(() => {
                        btnCopyCode.innerHTML = `<i data-lucide="copy"></i> Copiar Código`;
                        if (window.lucide) lucide.createIcons();
                    }, 2000);
                })
                .catch(err => {
                    console.error("Erro ao copiar código:", err);
                    addLog("Não foi possível copiar o código. Por favor, copie manualmente.", "warning");
                });
        });
    }

    // Eventos do Pomodoro
    if (btnPomodoroStart) {
        btnPomodoroStart.addEventListener("click", togglePomodoro);
    }
    if (btnPomodoroReset) {
        btnPomodoroReset.addEventListener("click", resetPomodoro);
    }
    if (pomodoroTaskSelect) {
        pomodoroTaskSelect.addEventListener("change", (e) => {
            pomodoro.activeTaskId = e.target.value;
        });
    }

    // Bloco de Notas Eventos
    if (notesTextarea) {
        notesTextarea.addEventListener("input", (e) => {
            state.notesText = e.target.value;
            saveToLocalStorage();
        });
    }
    
    if (btnProcessNotes) {
        btnProcessNotes.addEventListener("click", () => {
            if (!notesTextarea) return;
            const text = notesTextarea.value.trim();
            if (text === "") {
                alert("Escreva alguma missão antes de processar!");
                return;
            }
            
            // Separar linhas e remover vazias
            const lines = text.split("\n")
                .map(l => l.trim().replace(/^[-*+•\s]+/, "")) // limpa marcadores comuns
                .filter(l => l !== "");
                
            if (lines.length === 0) {
                alert("Nenhuma missão válida encontrada!");
                return;
            }
            
            // Criar tarefas do bloco de notas
            state.notesTasks = lines.map(line => ({
                id: Date.now().toString() + "_" + Math.random().toString().substring(2, 6),
                name: line,
                completed: false
            }));
            
            saveToLocalStorage();
            renderNotesTasks();
            addLog(`Missões diárias processadas: ${lines.length} missões criadas!`, "success");
        });
    }
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

    if (themeToggle) {
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
}

function updateThemeToggleIcon(theme) {
    if (!themeToggle) return;
    if (theme === "light") {
        themeToggle.innerHTML = `<i data-lucide="moon"></i>`;
    } else {
        themeToggle.innerHTML = `<i data-lucide="sun"></i>`;
    }
    if (window.lucide) lucide.createIcons();
}

// --- CONFETES ---
function triggerConfetti(count) {
    if (typeof confetti === 'function') {
        confetti({
            particleCount: count,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#60a5fa', '#34d399', '#fbbf24']
        });
    } else {
        console.log("Biblioteca de confetes offline/indisponível.");
    }
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

// --- HISTÓRICO DE EVOLUÇÃO E AUXILIARES ---

function executeMonthlyResetLogic(isAuto = false) {
    const lastMonthLabel = getMonthYearString(state.lastResetDate) || "Mês Anterior";
    const scoreToArchive = state.monthlyScore;
    if (scoreToArchive > 0) {
        state.history.push({
            id: Date.now().toString(),
            label: lastMonthLabel,
            score: scoreToArchive,
            type: "monthly",
            date: state.lastResetDate
        });
    }
    state.monthlyScore = 0;
    saveToLocalStorage();
    renderHistory();
    addLog(`[SISTEMA] Reset Mensal executado. Pontuação de ${lastMonthLabel} salva no histórico.`, "warning");
    
    if (!isAuto) {
        setTimeout(() => {
            alert(`Reset Mensal Concluído!\n\nPontos do mês arquivados no histórico: +${scoreToArchive} Pts\nO placar mensal em andamento foi zerado.`);
        }, 100);
    }
}

function getMonthYearString(dateStr) {
    if (!dateStr || dateStr.length < 7) return "";
    const parts = dateStr.split("-");
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const monthIdx = parseInt(parts[1]) - 1;
    return `${monthNames[monthIdx]}/${parts[0]}`;
}

function getWeeklyLabel(sundayDateStr) {
    if (!sundayDateStr) return "Semana Anterior";
    const parts = sundayDateStr.split("-");
    const sunday = new Date(parts[0], parts[1] - 1, parts[2]);
    
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    
    const format = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    return `Semana de ${format(sunday)} a ${format(saturday)}`;
}

function renderHistory() {
    const weeklyHistoryBody = document.getElementById("weekly-history-body");
    const monthlyHistoryBody = document.getElementById("monthly-history-body");
    
    if (!weeklyHistoryBody || !monthlyHistoryBody) return;
    
    weeklyHistoryBody.innerHTML = "";
    monthlyHistoryBody.innerHTML = "";
    
    const weeklyRecords = state.history.filter(r => r.type === "weekly").reverse();
    const monthlyRecords = state.history.filter(r => r.type === "monthly").reverse();
    
    if (weeklyRecords.length === 0) {
        weeklyHistoryBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum histórico semanal registrado ainda.</td></tr>`;
    } else {
        weeklyRecords.forEach(r => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="padding: 0.65rem 1.0rem; border-bottom: 1px solid var(--cell-border); font-weight: 500;">${r.label}</td>
                <td style="padding: 0.65rem 1.0rem; border-bottom: 1px solid var(--cell-border); text-align: center; color: var(--primary); font-weight: 600;">+${r.score} Pts</td>
            `;
            weeklyHistoryBody.appendChild(row);
        });
    }
    
    if (monthlyRecords.length === 0) {
        monthlyHistoryBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Nenhum histórico mensal registrado ainda.</td></tr>`;
    } else {
        monthlyRecords.forEach(r => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td style="padding: 0.65rem 1.0rem; border-bottom: 1px solid var(--cell-border); font-weight: 500;">${r.label}</td>
                <td style="padding: 0.65rem 1.0rem; border-bottom: 1px solid var(--cell-border); text-align: center; color: var(--success); font-weight: 600;">+${r.score} Pts</td>
            `;
            monthlyHistoryBody.appendChild(row);
        });
    }
}

// --- RPG DE PRODUTIVIDADE ---

const rpgTitles = [
    { minLevel: 1, maxLevel: 1, title: "Aprendiz Focado" },
    { minLevel: 2, maxLevel: 2, title: "Guerreiro Disciplinado" },
    { minLevel: 3, maxLevel: 3, title: "Destruidor de Distrações" },
    { minLevel: 4, maxLevel: 4, title: "Foco Blindado" },
    { minLevel: 5, maxLevel: 5, title: "Monge da Produtividade" },
    { minLevel: 6, maxLevel: 6, title: "Mestre da Execução" },
    { minLevel: 7, maxLevel: 7, title: "Executor Implacável" },
    { minLevel: 8, maxLevel: 8, title: "Ninja do Tempo" },
    { minLevel: 9, maxLevel: 9, title: "Cérebro Inabalável" },
    { minLevel: 10, maxLevel: Infinity, title: "Lenda do Auto-Controle" }
];

function calculateLevel() {
    const totalXP = state.history.reduce((sum, r) => sum + r.score, 0) + state.weeklyScore;
    const xpThresholds = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000];
    
    let level = 1;
    for (let i = 1; i < xpThresholds.length; i++) {
        if (totalXP >= xpThresholds[i]) {
            level = i + 1;
        } else {
            break;
        }
    }
    
    if (totalXP >= 5000) {
        level = 10 + Math.floor((totalXP - 5000) / 1500);
    }
    
    const titleObj = rpgTitles.find(t => level >= t.minLevel && level <= t.maxLevel);
    const title = titleObj ? titleObj.title : "Lenda do Auto-Controle";
    
    let currentLevelXP = 0;
    let nextLevelXP = 100;
    
    if (level < 10) {
        currentLevelXP = xpThresholds[level - 1];
        nextLevelXP = xpThresholds[level];
    } else {
        currentLevelXP = 5000 + (level - 10) * 1500;
        nextLevelXP = 5000 + (level - 9) * 1500;
    }
    
    const xpInCurrentLevel = totalXP - currentLevelXP;
    const xpNeededForNextLevel = nextLevelXP - currentLevelXP;
    const percent = Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);
    
    return {
        level,
        title,
        totalXP,
        xpInCurrentLevel,
        xpNeededForNextLevel,
        percent
    };
}

function updateRpgDisplay() {
    const lvlInfo = calculateLevel();
    if (rpgTitleEl) rpgTitleEl.textContent = lvlInfo.title;
    if (rpgLevelEl) rpgLevelEl.textContent = `Nível ${lvlInfo.level}`;
    if (rpgXpTextEl) rpgXpTextEl.textContent = `${lvlInfo.xpInCurrentLevel} / ${lvlInfo.xpNeededForNextLevel} XP`;
    if (rpgProgressBarEl) rpgProgressBarEl.style.width = `${lvlInfo.percent}%`;
    
    const oldLevel = localStorage.getItem("rpg_level") ? parseInt(localStorage.getItem("rpg_level")) : 1;
    if (lvlInfo.level > oldLevel) {
        localStorage.setItem("rpg_level", lvlInfo.level);
        triggerConfetti(150);
        setTimeout(() => {
            alert(`🎉 LEVEL UP! 🎉\n\nVocê alcançou o Nível ${lvlInfo.level}!\nNovo Título: "${lvlInfo.title}"`);
        }, 200);
    }
}

// --- CRONÔMETRO POMODORO ---

let pomodoro = {
    secondsLeft: 25 * 60,
    timerId: null,
    mode: 'focus', // 'focus' | 'break'
    isRunning: false,
    activeTaskId: null
};

function togglePomodoro() {
    if (pomodoro.isRunning) {
        pausePomodoro();
    } else {
        startPomodoro();
    }
}

function startPomodoro() {
    if (pomodoro.isRunning) return;
    
    if (pomodoro.mode === 'focus') {
        const select = document.getElementById("pomodoro-task-select");
        if (select && select.value) {
            pomodoro.activeTaskId = select.value;
            const task = state.tasks.find(t => t.id === pomodoro.activeTaskId);
            if (task) {
                addLog(`[POMODORO] Foco iniciado na tarefa: "${task.name.substring(0, 20)}..."`, "info");
            }
        } else {
            addLog(`[POMODORO] Foco geral iniciado.`, "info");
        }
        
        // Obter tempo de foco customizado
        if (pomodoroFocusTimeInput) {
            const customMin = parseInt(pomodoroFocusTimeInput.value);
            if (!isNaN(customMin) && customMin > 0) {
                pomodoro.secondsLeft = customMin * 60;
            }
            pomodoroFocusTimeInput.disabled = true;
        }
        
        if (spreadsheetSection) spreadsheetSection.classList.add("pomodoro-locked");
        if (pomodoroTaskSelect) pomodoroTaskSelect.disabled = true;
    }
    
    pomodoro.isRunning = true;
    btnPomodoroStart.innerHTML = `<i data-lucide="pause"></i> Pausar`;
    btnPomodoroReset.disabled = false;
    if (window.lucide) lucide.createIcons();
    
    playSound('start');
    
    pomodoro.timerId = setInterval(() => {
        pomodoro.secondsLeft--;
        updatePomodoroDisplay();
        
        if (pomodoro.secondsLeft <= 0) {
            clearInterval(pomodoro.timerId);
            pomodoro.isRunning = false;
            pomodoroComplete();
        }
    }, 1000);
}

function pausePomodoro() {
    if (!pomodoro.isRunning) return;
    clearInterval(pomodoro.timerId);
    pomodoro.isRunning = false;
    btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Retomar`;
    if (window.lucide) lucide.createIcons();
    addLog(`[POMODORO] Cronômetro pausado.`, "warning");
}

function resetPomodoro() {
    clearInterval(pomodoro.timerId);
    pomodoro.isRunning = false;
    pomodoro.mode = 'focus';
    
    // Restaurar tempo inicial a partir do input
    let focusMinutes = 25;
    if (pomodoroFocusTimeInput) {
        focusMinutes = parseInt(pomodoroFocusTimeInput.value) || 25;
        pomodoroFocusTimeInput.disabled = false;
    }
    pomodoro.secondsLeft = focusMinutes * 60;
    
    if (spreadsheetSection) spreadsheetSection.classList.remove("pomodoro-locked");
    if (pomodoroTaskSelect) pomodoroTaskSelect.disabled = false;
    
    updatePomodoroDisplay();
    
    btnPomodoroStart.innerHTML = `<i data-lucide="play"></i> Iniciar`;
    btnPomodoroReset.disabled = true;
    if (window.lucide) lucide.createIcons();
    
    addLog(`[POMODORO] Cronômetro reiniciado.`, "info");
}

function updatePomodoroDisplay() {
    const mins = String(Math.floor(pomodoro.secondsLeft / 60)).padStart(2, '0');
    const secs = String(pomodoro.secondsLeft % 60).padStart(2, '0');
    pomodoroTimeEl.textContent = `${mins}:${secs}`;
    
    if (pomodoro.mode === 'focus') {
        pomodoroStatusEl.textContent = "Focando";
        pomodoroStatusEl.style.color = "var(--danger)";
    } else {
        pomodoroStatusEl.textContent = "Intervalo";
        pomodoroStatusEl.style.color = "var(--success)";
    }
}

function pomodoroComplete() {
    playSound('success');
    triggerConfetti(100);
    
    if (pomodoro.mode === 'focus') {
        addLog(`[POMODORO] Sessão de foco concluída! Hora do descanso.`, "success");
        
        if (pomodoro.activeTaskId) {
            const task = state.tasks.find(t => t.id === pomodoro.activeTaskId);
            if (task && !task.completed) {
                task.completed = true;
                task.completedViaPomodoro = true; // Habilita bônus de 50%
                saveToLocalStorage();
                renderTasks();
                updateDashboard();
                const bonusPoints = Math.round(Number(task.points || 0) * 1.5);
                addLog(`[POMODORO] Tarefa concluída via foco: "${task.name}" (+${bonusPoints} XP/Pts)! (Incluindo bônus de 50%)`, "success");
            }
        }
        
        alert("Excelente trabalho! Foco concluído. Iniciando descanso de 5 minutos.");
        
        pomodoro.mode = 'break';
        pomodoro.secondsLeft = 5 * 60;
        startPomodoro();
    } else {
        addLog(`[POMODORO] Intervalo concluído!`, "success");
        alert("O descanso acabou! Pronto para focar novamente?");
        resetPomodoro();
    }
}

function updatePomodoroTaskSelect() {
    if (!pomodoroTaskSelect || pomodoro.isRunning) return;
    const currentVal = pomodoroTaskSelect.value;
    pomodoroTaskSelect.innerHTML = '<option value="">-- Selecione uma tarefa --</option>';
    
    state.tasks.forEach(t => {
        if (!t.completed) {
            const option = document.createElement("option");
            option.value = t.id;
            option.textContent = t.name.substring(0, 30) + (t.name.length > 30 ? '...' : '');
            pomodoroTaskSelect.appendChild(option);
        }
    });
    
    if (state.tasks.find(t => t.id === currentVal && !t.completed)) {
        pomodoroTaskSelect.value = currentVal;
    }
}

function playSound(type) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        if (type === 'start') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'success') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15);
            oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3);
            gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        }
    } catch (e) {
        console.log("AudioContext blocked or not supported:", e);
    }
}

// --- FUNÇÕES DO BLOCO DE NOTAS ---

function renderNotesTasks() {
    const container = document.getElementById("notes-tasks-container");
    const list = document.getElementById("notes-tasks-list");
    if (!container || !list) return;
    
    if (!state.notesTasks || state.notesTasks.length === 0) {
        container.style.display = "none";
        return;
    }
    
    container.style.display = "block";
    list.innerHTML = "";
    
    state.notesTasks.forEach(task => {
        const item = document.createElement("div");
        item.style = `display: flex; justify-content: space-between; align-items: center; padding: 0.4rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 6px; gap: 0.5rem; transition: all 0.2s ease;`;
        
        if (task.completed) {
            item.style.opacity = "0.6";
        }
        
        const nameSpan = document.createElement("span");
        nameSpan.textContent = task.name;
        nameSpan.style = `font-size: 0.75rem; color: var(--text-primary); word-break: break-all;`;
        if (task.completed) {
            nameSpan.style.textDecoration = "line-through";
            nameSpan.style.color = "var(--text-muted)";
        }
        
        const btn = document.createElement("button");
        if (task.completed) {
            btn.className = "btn-icon";
            btn.style = `background: transparent; border: none; padding: 0; display: flex; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem;`;
            btn.innerHTML = `<i data-lucide="check-circle" style="color: var(--success); width: 1.1rem; height: 1.1rem;"></i>`;
            btn.disabled = true;
        } else {
            btn.className = "btn btn-accent";
            btn.style = `padding: 0.2rem 0.4rem; font-size: 0.7rem; height: auto; display: flex; align-items: center; gap: 0.25rem;`;
            btn.innerHTML = `<i data-lucide="check" style="width: 0.8rem; height: 0.8rem;"></i> Concluir`;
            btn.addEventListener("click", () => {
                task.completed = true;
                saveToLocalStorage();
                
                addLog(`Missão concluída: "${task.name}"`, "success");
                
                triggerConfetti(60);
                updateDashboard();
                renderNotesTasks();
            });
        }
        
        item.appendChild(nameSpan);
        item.appendChild(btn);
        list.appendChild(item);
    });
    
    if (window.lucide) lucide.createIcons();
}
