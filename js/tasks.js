// MÓDULO PLANILHA DE TAREFAS (COM DRAG & DROP), TAREFA BÔNUS E MISSÕES DIÁRIAS

window.App = window.App || {};

(function (App) {
    let draggedTaskId = null;

    function getSheetDisplayName(sheet) {
        if (sheet === "weekly") return "Semanais";
        if (sheet === "monthly") return "Mensais";
        return "Diárias";
    }

    // Reordena tarefa no array ativo
    function moveTask(fromId, toId, insertAfter = false) {
        if (!fromId || !toId || fromId === toId) return;
        const list = App.store.getActiveTasksArray();
        const fromIdx = list.findIndex((t) => t.id === fromId);
        const toIdx = list.findIndex((t) => t.id === toId);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = list.splice(fromIdx, 1);
        const newTargetIdx = list.findIndex((t) => t.id === toId);
        const insertIdx = insertAfter ? newTargetIdx + 1 : newTargetIdx;
        list.splice(insertIdx, 0, moved);

        App.store.save();
        render();
    }

    function moveTaskByStep(taskId, delta) {
        const list = App.store.getActiveTasksArray();
        const idx = list.findIndex((t) => t.id === taskId);
        const target = idx + delta;
        if (idx === -1 || target < 0 || target >= list.length) return;
        const temp = list[idx];
        list[idx] = list[target];
        list[target] = temp;
        App.store.save();
        render();
    }

    function render() {
        const tbody = document.getElementById("task-table-body");
        if (!tbody) return;

        tbody.innerHTML = "";
        const activeTasks = App.store.getActiveTasksArray();

        if (activeTasks.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-table-cell">
                        Nenhuma tarefa criada nesta aba. Clique em "Adicionar Tarefa" para começar.
                    </td>
                </tr>
            `;
            if (App.pomodoro) App.pomodoro.updateTaskSelect();
            return;
        }

        activeTasks.forEach((task, index) => {
            const row = document.createElement("tr");
            row.dataset.id = task.id;
            if (task.completed) row.classList.add("task-completed");

            const isEditing = task.id === App.editingTaskId;
            if (!isEditing) {
                row.draggable = true;
            }

            if (isEditing) {
                row.classList.add("is-editing");
                row.innerHTML = `
                    <td class="col-drag"></td>
                    <td class="col-checkbox">
                        <div class="checkbox-cell-wrapper">
                            <input type="checkbox" class="sheets-checkbox task-checkbox" data-id="${task.id}" ${task.completed ? "checked" : ""} disabled>
                        </div>
                    </td>
                    <td class="col-task">
                        <input type="text" class="task-input-edit" value="${App.ui.escapeHtml(task.name)}" data-id="${task.id}" aria-label="Nome da tarefa">
                    </td>
                    <td class="col-points">
                        <div class="edit-points-wrapper">
                            <span>+</span>
                            <input type="number" class="points-input-edit" value="${task.points || 0}" data-id="${task.id}" min="0" max="1000" aria-label="Pontos">
                        </div>
                    </td>
                    <td class="col-actions">
                        <div class="actions-cell-wrapper">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-success btn-save-task" data-id="${task.id}" title="Salvar Alterações">
                                <i data-lucide="check"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger btn-cancel-edit" data-id="${task.id}" title="Cancelar">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                const effectivePts = App.store.calculateTaskPoints(task);
                const pomodoroTag = task.completedViaPomodoro
                    ? `<span class="pomodoro-pill" title="Concluída via Pomodoro (+50%)">1.5x</span>`
                    : "";

                row.innerHTML = `
                    <td class="col-drag" title="Arraste para reordenar">
                        <span class="drag-handle-cell">
                            <i data-lucide="grip-vertical"></i>
                        </span>
                    </td>
                    <td class="col-checkbox">
                        <div class="checkbox-cell-wrapper">
                            <input type="checkbox" class="sheets-checkbox task-checkbox" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Marcar tarefa ${App.ui.escapeHtml(task.name)}">
                        </div>
                    </td>
                    <td class="col-task">
                        <span class="task-name-text" title="Clique duplo para editar">
                            ${App.ui.escapeHtml(task.name)}
                            ${pomodoroTag}
                        </span>
                    </td>
                    <td class="col-points">
                        <span class="points-tag">+${effectivePts}</span>
                    </td>
                    <td class="col-actions">
                        <div class="actions-cell-wrapper">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-move-up" data-id="${task.id}" title="Mover para cima" ${index === 0 ? "disabled" : ""}>
                                <i data-lucide="arrow-up"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-move-down" data-id="${task.id}" title="Mover para baixo" ${index === activeTasks.length - 1 ? "disabled" : ""}>
                                <i data-lucide="arrow-down"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-info btn-edit-task" data-id="${task.id}" title="Editar Tarefa">
                                <i data-lucide="pencil"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger btn-delete-task" data-id="${task.id}" title="Excluir Tarefa">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                `;
            }

            tbody.appendChild(row);
        });

        App.ui.refreshIcons();
        attachTableListeners();
        if (App.pomodoro) App.pomodoro.updateTaskSelect();
    }

    function attachTableListeners() {
        const activeTasks = App.store.getActiveTasksArray();
        const tbody = document.getElementById("task-table-body");
        if (!tbody) return;

        // Drag & Drop nas linhas
        tbody.querySelectorAll("tr[draggable='true']").forEach((row) => {
            row.addEventListener("dragstart", (e) => {
                draggedTaskId = row.dataset.id;
                row.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", draggedTaskId);
            });

            row.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (!draggedTaskId || row.dataset.id === draggedTaskId) return;
                const rect = row.getBoundingClientRect();
                const isBelow = e.clientY > rect.top + rect.height / 2;
                row.classList.toggle("drag-over-bottom", isBelow);
                row.classList.toggle("drag-over-top", !isBelow);
            });

            row.addEventListener("dragleave", () => {
                row.classList.remove("drag-over-top", "drag-over-bottom");
            });

            row.addEventListener("drop", (e) => {
                e.preventDefault();
                const targetId = row.dataset.id;
                const insertAfter = row.classList.contains("drag-over-bottom");
                row.classList.remove("drag-over-top", "drag-over-bottom");
                if (draggedTaskId && targetId && draggedTaskId !== targetId) {
                    moveTask(draggedTaskId, targetId, insertAfter);
                    App.ui.toast("Ordem da tarefa atualizada.", { type: "info", duration: 1800 });
                }
            });

            row.addEventListener("dragend", () => {
                draggedTaskId = null;
                tbody.querySelectorAll("tr").forEach((r) => {
                    r.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
                });
            });
        });

        // Checkboxes
        tbody.querySelectorAll(".task-checkbox").forEach((chk) => {
            chk.addEventListener("change", (e) => {
                const id = e.target.dataset.id;
                const completed = e.target.checked;
                const task = activeTasks.find((t) => t.id === id);
                if (!task) return;

                task.completed = completed;
                if (!completed) task.completedViaPomodoro = false;
                App.store.save();

                const row = e.target.closest("tr");
                if (row) row.classList.toggle("task-completed", completed);

                // Confete reservado apenas para fechar 100% da lista (não a cada clique comum)
                if (completed && activeTasks.length > 0 && activeTasks.every((t) => t.completed)) {
                    App.ui.triggerConfetti(90);
                    App.ui.playSound("success");
                    App.ui.toast("Todas as tarefas desta lista foram concluídas!", {
                        title: "Dia completo",
                        type: "success"
                    });
                }

                if (App.rpg) {
                    App.rpg.updateDashboard({ checkStreakCelebration: App.activeSheet === "daily" && completed });
                }
                if (App.pomodoro) App.pomodoro.updateTaskSelect();
            });
        });

        // Mover cima/baixo (touch-friendly)
        tbody.querySelectorAll(".btn-move-up").forEach((btn) => {
            btn.addEventListener("click", () => moveTaskByStep(btn.dataset.id, -1));
        });
        tbody.querySelectorAll(".btn-move-down").forEach((btn) => {
            btn.addEventListener("click", () => moveTaskByStep(btn.dataset.id, 1));
        });

        // Editar
        tbody.querySelectorAll(".btn-edit-task").forEach((btn) => {
            btn.addEventListener("click", () => {
                App.editingTaskId = btn.dataset.id;
                render();
                const input = tbody.querySelector(`.task-input-edit[data-id="${btn.dataset.id}"]`);
                if (input) {
                    input.focus();
                    input.select();
                }
            });
        });

        tbody.querySelectorAll(".task-name-text").forEach((span) => {
            span.addEventListener("dblclick", () => {
                const row = span.closest("tr");
                const btnEdit = row ? row.querySelector(".btn-edit-task") : null;
                if (btnEdit) btnEdit.click();
            });
        });

        // Salvar edição (clique ou Enter)
        const saveEdit = (id) => {
            const nameInput = tbody.querySelector(`.task-input-edit[data-id="${id}"]`);
            const pointsInput = tbody.querySelector(`.points-input-edit[data-id="${id}"]`);
            const newName = nameInput ? nameInput.value.trim() : "";
            const newPoints = pointsInput ? parseInt(pointsInput.value, 10) : NaN;

            if (!newName || isNaN(newPoints) || newPoints < 0) {
                App.ui.toast("Informe um nome válido e pontos maiores ou iguais a 0.", { type: "warning" });
                return;
            }

            const task = activeTasks.find((t) => t.id === id);
            if (!task) return;

            task.name = newName;
            task.points = newPoints;
            App.editingTaskId = null;
            App.store.save();
            render();
            if (App.rpg) App.rpg.updateDashboard();
            App.ui.toast("Tarefa atualizada com sucesso!", { type: "success", duration: 2200 });
        };

        tbody.querySelectorAll(".btn-save-task").forEach((btn) => {
            btn.addEventListener("click", () => saveEdit(btn.dataset.id));
        });

        tbody.querySelectorAll(".task-input-edit, .points-input-edit").forEach((input) => {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    saveEdit(input.dataset.id);
                } else if (e.key === "Escape") {
                    App.editingTaskId = null;
                    render();
                }
            });
        });

        tbody.querySelectorAll(".btn-cancel-edit").forEach((btn) => {
            btn.addEventListener("click", () => {
                App.editingTaskId = null;
                render();
            });
        });

        // Excluir tarefa
        tbody.querySelectorAll(".btn-delete-task").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const id = btn.dataset.id;
                const taskIdx = activeTasks.findIndex((t) => t.id === id);
                if (taskIdx === -1) return;
                const task = activeTasks[taskIdx];

                const ok = await App.ui.confirm({
                    title: "Excluir Tarefa",
                    message: `Deseja remover a tarefa "${task.name}"?`,
                    confirmText: "Excluir",
                    variant: "danger",
                    icon: "trash-2"
                });

                if (!ok) return;
                activeTasks.splice(taskIdx, 1);
                App.store.save();
                render();
                if (App.rpg) App.rpg.updateDashboard();
                App.ui.toast("Tarefa excluída.", { type: "warning", duration: 2200 });
            });
        });
    }

    // TAREFA BÔNUS ESPECIAL
    function renderBonusTask() {
        const container = document.getElementById("bonus-task-container");
        if (!container) return;
        container.innerHTML = "";

        if (!App.state.bonusTask) {
            const isCreating = container.dataset.creating === "true";

            if (isCreating) {
                container.innerHTML = `
                    <div class="bonus-form-row">
                        <input type="text" id="bonus-name-input" class="form-input flex-1" placeholder="Ex: Fazer 1 hora de caminhada...">
                        <div class="edit-points-wrapper">
                            <span>+</span>
                            <input type="number" id="bonus-points-input" class="form-input form-input-compact" value="100" min="0" max="1000">
                            <span>Pts</span>
                        </div>
                        <div class="actions-cell-wrapper">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-success" id="btn-save-bonus" title="Salvar Tarefa Bônus">
                                <i data-lucide="check"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger" id="btn-cancel-bonus" title="Cancelar">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </div>
                `;

                const nameInput = document.getElementById("bonus-name-input");
                const pointsInput = document.getElementById("bonus-points-input");
                const btnSave = document.getElementById("btn-save-bonus");
                const btnCancel = document.getElementById("btn-cancel-bonus");

                if (nameInput) nameInput.focus();

                const saveBonus = () => {
                    const name = nameInput.value.trim();
                    const points = parseInt(pointsInput.value, 10);
                    if (!name || isNaN(points) || points < 0) {
                        App.ui.toast("Digite um nome e uma pontuação válida para a tarefa bônus.", { type: "warning" });
                        return;
                    }
                    App.state.bonusTask = { name, points, completed: false };
                    App.store.save();
                    container.dataset.creating = "false";
                    renderBonusTask();
                    if (App.rpg) App.rpg.updateDashboard();
                    App.ui.toast(`Tarefa bônus "${name}" (+${points} Pts) criada!`, { type: "success" });
                };

                btnSave.addEventListener("click", saveBonus);
                nameInput.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") saveBonus();
                    if (e.key === "Escape") {
                        container.dataset.creating = "false";
                        renderBonusTask();
                    }
                });
                btnCancel.addEventListener("click", () => {
                    container.dataset.creating = "false";
                    renderBonusTask();
                });
            } else {
                container.innerHTML = `
                    <button type="button" class="btn btn-outline btn-dashed btn-sm btn-full" id="btn-init-bonus">
                        <i data-lucide="plus-circle"></i> Definir Tarefa Bônus do Dia
                    </button>
                `;
                document.getElementById("btn-init-bonus").addEventListener("click", () => {
                    container.dataset.creating = "true";
                    renderBonusTask();
                });
            }
        } else {
            const bt = App.state.bonusTask;
            container.innerHTML = `
                <div class="bonus-item-box">
                    <div class="bonus-item-left">
                        <input type="checkbox" id="bonus-task-checkbox" class="sheets-checkbox" ${bt.completed ? "checked" : ""}>
                        <span id="bonus-task-name" class="bonus-item-name ${bt.completed ? "completed" : ""}">${App.ui.escapeHtml(bt.name)}</span>
                    </div>
                    <div class="bonus-item-right">
                        <span class="bonus-points-label">+${bt.points} Pts</span>
                        <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger" id="btn-delete-bonus" title="Remover Tarefa Bônus">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </div>
            `;

            const chk = document.getElementById("bonus-task-checkbox");
            const labelName = document.getElementById("bonus-task-name");
            const btnDel = document.getElementById("btn-delete-bonus");

            chk.addEventListener("change", (e) => {
                App.state.bonusTask.completed = e.target.checked;
                App.store.save();
                labelName.classList.toggle("completed", App.state.bonusTask.completed);
                if (App.rpg) App.rpg.updateDashboard();

                if (App.state.bonusTask.completed) {
                    App.ui.triggerConfetti(70);
                    App.ui.playSound("success");
                    App.ui.toast(`Tarefa bônus concluída (+${App.state.bonusTask.points} Pts)!`, { type: "success" });
                }
            });

            btnDel.addEventListener("click", async () => {
                const ok = await App.ui.confirm({
                    title: "Remover Tarefa Bônus",
                    message: `Deseja remover a tarefa bônus "${App.state.bonusTask.name}"?`,
                    confirmText: "Remover",
                    variant: "danger",
                    icon: "trash-2"
                });
                if (!ok) return;
                App.state.bonusTask = null;
                App.store.save();
                renderBonusTask();
                if (App.rpg) App.rpg.updateDashboard();
                App.ui.toast("Tarefa bônus removida.", { type: "info" });
            });
        }

        App.ui.refreshIcons();
    }

    // MISSÕES DIÁRIAS (BLOCO DE NOTAS)
    function renderNotesTasks() {
        const container = document.getElementById("notes-tasks-container");
        const list = document.getElementById("notes-tasks-list");
        if (!container || !list) return;

        if (!App.state.notesTasks || App.state.notesTasks.length === 0) {
            container.classList.add("hidden");
            return;
        }

        container.classList.remove("hidden");
        list.innerHTML = "";

        App.state.notesTasks.forEach((task) => {
            const item = document.createElement("div");
            item.className = `notes-task-item ${task.completed ? "completed" : ""}`;

            const nameSpan = document.createElement("span");
            nameSpan.className = "notes-task-name";
            nameSpan.textContent = task.name;
            item.appendChild(nameSpan);

            if (task.completed) {
                const doneBadge = document.createElement("span");
                doneBadge.className = "notes-done-icon";
                doneBadge.innerHTML = `<i data-lucide="check-circle-2"></i>`;
                item.appendChild(doneBadge);
            } else {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn btn-accent btn-xs";
                btn.innerHTML = `<i data-lucide="check"></i> Concluir`;
                btn.addEventListener("click", () => {
                    task.completed = true;
                    App.store.save();
                    App.ui.triggerConfetti(55);
                    renderNotesTasks();
                    App.ui.toast(`Missão concluída: "${task.name}"`, { type: "success", duration: 2500 });
                });
                item.appendChild(btn);
            }

            list.appendChild(item);
        });

        App.ui.refreshIcons();
    }

    function init() {
        // Abas da planilha (Diárias, Semanais, Mensais)
        document.querySelectorAll(".sheet-tab").forEach((tab) => {
            tab.addEventListener("click", () => {
                document.querySelectorAll(".sheet-tab").forEach((t) => t.classList.remove("active"));
                tab.classList.add("active");
                App.activeSheet = tab.dataset.sheet || "daily";
                App.editingTaskId = null;
                render();
                if (App.rpg) App.rpg.updateDashboard();
            });
        });

        // Adicionar tarefa
        const btnAdd = document.getElementById("btn-add-task");
        if (btnAdd) {
            btnAdd.addEventListener("click", () => {
                const list = App.store.getActiveTasksArray();
                const nextNum = list.length + 1;
                const defaultPts = App.activeSheet === "weekly" ? 50 : App.activeSheet === "monthly" ? 100 : 10;

                const newTask = {
                    id: String(Date.now()),
                    name: `Nova tarefa ${nextNum}`,
                    completed: false,
                    points: defaultPts
                };

                list.push(newTask);
                App.editingTaskId = newTask.id;
                App.store.save();
                render();
                if (App.rpg) App.rpg.updateDashboard();

                const input = document.querySelector(`.task-input-edit[data-id="${newTask.id}"]`);
                if (input) {
                    input.focus();
                    input.select();
                }
            });
        }

        // Limpar caixas manualmente
        const btnReset = document.getElementById("btn-reset-checklist");
        if (btnReset) {
            btnReset.addEventListener("click", async () => {
                const list = App.store.getActiveTasksArray();
                const completedCount = list.filter((t) => t.completed).length;
                if (completedCount === 0) {
                    App.ui.toast("Nenhuma tarefa está marcada nesta aba.", { type: "warning" });
                    return;
                }

                const ok = await App.ui.confirm({
                    title: "Limpar Caixas de Seleção",
                    message: `Deseja desmarcar ${completedCount} tarefa(s) da aba ${getSheetDisplayName(App.activeSheet)} sem somar pontos?`,
                    confirmText: "Desmarcar tudo",
                    variant: "danger",
                    icon: "refresh-cw"
                });
                if (!ok) return;

                list.forEach((t) => {
                    t.completed = false;
                    t.completedViaPomodoro = false;
                });
                App.store.save();
                render();
                if (App.rpg) App.rpg.updateDashboard();
                App.ui.toast(`Checkboxes de ${getSheetDisplayName(App.activeSheet)} limpas.`, { type: "info" });
            });
        }

        // Missões diárias (bloco de notas)
        const notesTextarea = document.getElementById("notes-textarea");
        const btnProcessNotes = document.getElementById("btn-process-notes");
        const btnClearNotes = document.getElementById("btn-clear-notes-tasks");

        if (notesTextarea) {
            notesTextarea.value = App.state.notesText || "";
            notesTextarea.addEventListener("input", (e) => {
                App.state.notesText = e.target.value;
                App.store.save();
            });
        }

        if (btnProcessNotes && notesTextarea) {
            btnProcessNotes.addEventListener("click", () => {
                const text = notesTextarea.value.trim();
                if (!text) {
                    App.ui.toast("Escreva alguma missão antes de processar!", { type: "warning" });
                    return;
                }

                const lines = text
                    .split("\n")
                    .map((l) => l.trim().replace(/^[-*+•\s]+/, ""))
                    .filter((l) => l.length > 0);

                if (lines.length === 0) {
                    App.ui.toast("Nenhuma missão válida encontrada.", { type: "warning" });
                    return;
                }

                App.state.notesTasks = lines.map((line, i) => ({
                    id: `${Date.now()}_${i}`,
                    name: line,
                    completed: false
                }));
                App.store.save();
                renderNotesTasks();
                App.ui.toast(`${lines.length} missões diárias prontas!`, { type: "success" });
            });
        }

        if (btnClearNotes) {
            btnClearNotes.addEventListener("click", () => {
                App.state.notesTasks = [];
                App.store.save();
                renderNotesTasks();
                App.ui.toast("Lista de missões limpa.", { type: "info" });
            });
        }

        render();
        renderBonusTask();
        renderNotesTasks();
    }

    App.tasks = {
        init,
        render,
        renderBonusTask,
        renderNotesTasks
    };
})(window.App);
