// MÓDULO CRONÔMETRO POMODORO

window.App = window.App || {};

(function (App) {
    const pomodoro = {
        secondsLeft: 25 * 60,
        timerId: null,
        mode: "focus", // 'focus' | 'break'
        isRunning: false,
        isPaused: false,
        activeTaskId: null
    };

    function getElements() {
        return {
            timeEl: document.getElementById("pomodoro-time"),
            statusEl: document.getElementById("pomodoro-status"),
            taskSelect: document.getElementById("pomodoro-task-select"),
            btnStart: document.getElementById("btn-pomodoro-start"),
            btnReset: document.getElementById("btn-pomodoro-reset"),
            focusInput: document.getElementById("pomodoro-focus-time-input"),
            spreadsheet: document.querySelector(".spreadsheet-section")
        };
    }

    function updateDisplay() {
        const { timeEl, statusEl } = getElements();
        const mins = String(Math.floor(pomodoro.secondsLeft / 60)).padStart(2, "0");
        const secs = String(pomodoro.secondsLeft % 60).padStart(2, "0");

        if (timeEl) timeEl.textContent = `${mins}:${secs}`;
        if (statusEl) {
            statusEl.classList.remove("focus", "break");
            if (!pomodoro.isRunning && !pomodoro.isPaused) {
                statusEl.textContent = "Pronto";
            } else if (pomodoro.isPaused) {
                statusEl.textContent = "Pausado";
            } else if (pomodoro.mode === "focus") {
                statusEl.textContent = "Focando";
                statusEl.classList.add("focus");
            } else {
                statusEl.textContent = "Intervalo";
                statusEl.classList.add("break");
            }
        }
    }

    function updateTaskSelect() {
        const { taskSelect } = getElements();
        if (!taskSelect || pomodoro.isRunning) return;

        const currentVal = taskSelect.value;
        taskSelect.innerHTML = `<option value="">-- Selecione uma tarefa --</option>`;

        App.state.tasks.forEach((t) => {
            if (!t.completed) {
                const option = document.createElement("option");
                option.value = t.id;
                option.textContent = t.name.length > 34 ? `${t.name.slice(0, 34)}...` : t.name;
                taskSelect.appendChild(option);
            }
        });

        if (App.state.tasks.some((t) => t.id === currentVal && !t.completed)) {
            taskSelect.value = currentVal;
        }
    }

    function start() {
        if (pomodoro.isRunning) return;

        const { taskSelect, focusInput, spreadsheet, btnStart, btnReset } = getElements();

        if (typeof Notification !== "undefined" && Notification.permission === "default") {
            Notification.requestPermission().catch(() => {});
        }

        if (pomodoro.mode === "focus" && !pomodoro.isPaused) {
            if (taskSelect && taskSelect.value) {
                pomodoro.activeTaskId = taskSelect.value;
            } else {
                pomodoro.activeTaskId = null;
            }

            if (focusInput) {
                const customMin = parseInt(focusInput.value, 10);
                if (!isNaN(customMin) && customMin >= 1 && customMin <= 120) {
                    pomodoro.secondsLeft = customMin * 60;
                }
                focusInput.disabled = true;
            }

            if (spreadsheet) spreadsheet.classList.add("pomodoro-locked");
            if (taskSelect) taskSelect.disabled = true;
        }

        pomodoro.isRunning = true;
        pomodoro.isPaused = false;

        if (btnStart) btnStart.innerHTML = `<i data-lucide="pause"></i> Pausar`;
        if (btnReset) btnReset.disabled = false;
        App.ui.refreshIcons();
        updateDisplay();
        App.ui.playSound("start");

        pomodoro.timerId = setInterval(() => {
            pomodoro.secondsLeft -= 1;
            updateDisplay();

            if (pomodoro.secondsLeft <= 0) {
                clearInterval(pomodoro.timerId);
                pomodoro.timerId = null;
                pomodoro.isRunning = false;
                pomodoro.isPaused = false;
                onComplete();
            }
        }, 1000);
    }

    function pause() {
        if (!pomodoro.isRunning) return;
        clearInterval(pomodoro.timerId);
        pomodoro.timerId = null;
        pomodoro.isRunning = false;
        pomodoro.isPaused = true;

        const { btnStart } = getElements();
        if (btnStart) btnStart.innerHTML = `<i data-lucide="play"></i> Retomar`;
        App.ui.refreshIcons();
        updateDisplay();
        App.ui.toast("Pomodoro pausado.", { type: "warning", duration: 2200 });
    }

    function reset() {
        clearInterval(pomodoro.timerId);
        pomodoro.timerId = null;
        pomodoro.isRunning = false;
        pomodoro.isPaused = false;
        pomodoro.mode = "focus";

        const { focusInput, spreadsheet, taskSelect, btnStart, btnReset } = getElements();
        let focusMinutes = 25;
        if (focusInput) {
            focusMinutes = Math.max(1, Math.min(120, parseInt(focusInput.value, 10) || 25));
            focusInput.value = focusMinutes;
            focusInput.disabled = false;
        }
        pomodoro.secondsLeft = focusMinutes * 60;

        if (spreadsheet) spreadsheet.classList.remove("pomodoro-locked");
        if (taskSelect) taskSelect.disabled = false;
        if (btnStart) btnStart.innerHTML = `<i data-lucide="play"></i> Iniciar foco`;
        if (btnReset) btnReset.disabled = true;

        App.ui.refreshIcons();
        updateDisplay();
        updateTaskSelect();
    }

    function onComplete() {
        App.ui.playSound("success");
        App.ui.triggerConfetti(100);

        if (pomodoro.mode === "focus") {
            let bonusMsg = "Excelente trabalho! Iniciando intervalo de 5 minutos.";
            App.ui.sendLocalNotification("🎯 Foco Concluído!", bonusMsg);

            if (pomodoro.activeTaskId) {
                const task = App.state.tasks.find((t) => t.id === pomodoro.activeTaskId);
                if (task && !task.completed) {
                    task.completed = true;
                    task.completedViaPomodoro = true;
                    App.store.save();
                    if (App.tasks) App.tasks.render();
                    if (App.rpg) App.rpg.updateDashboard({ checkStreakCelebration: true });
                    const bonusPts = App.store.calculateTaskPoints(task);
                    bonusMsg = `Tarefa "${task.name}" concluída com bônus Pomodoro (+${bonusPts} Pts)! Iniciando descanso de 5 min.`;
                }
            }

            App.ui.toast(bonusMsg, { title: "🎯 Sessão de Foco Concluída!", type: "success", duration: 6000 });
            pomodoro.mode = "break";
            pomodoro.secondsLeft = 5 * 60;
            start();
        } else {
            App.ui.sendLocalNotification("☕ Intervalo Concluído!", "O descanso acabou! Pronto para focar novamente?");
            App.ui.toast("O descanso acabou! Pronto para o próximo ciclo de foco?", {
                title: "☕ Intervalo Concluído",
                type: "info",
                duration: 5000
            });
            reset();
        }
    }

    function toggle() {
        if (pomodoro.isRunning) {
            pause();
        } else {
            start();
        }
    }

    function init() {
        const { btnStart, btnReset, taskSelect, focusInput } = getElements();
        if (btnStart) btnStart.addEventListener("click", toggle);
        if (btnReset) btnReset.addEventListener("click", reset);
        if (taskSelect) {
            taskSelect.addEventListener("change", (e) => {
                pomodoro.activeTaskId = e.target.value || null;
            });
        }
        if (focusInput) {
            focusInput.addEventListener("change", () => {
                if (!pomodoro.isRunning && !pomodoro.isPaused && pomodoro.mode === "focus") {
                    const mins = Math.max(1, Math.min(120, parseInt(focusInput.value, 10) || 25));
                    focusInput.value = mins;
                    pomodoro.secondsLeft = mins * 60;
                    updateDisplay();
                }
            });
        }
        updateDisplay();
        updateTaskSelect();
    }

    App.pomodoro = {
        init,
        updateTaskSelect,
        reset
    };
})(window.App);
