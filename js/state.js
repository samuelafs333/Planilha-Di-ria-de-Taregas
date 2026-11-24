// MÓDULO DE ESTADO, PERSISTÊNCIA, BACKUP E RESETS AUTOMÁTICOS

window.App = window.App || {};

(function (App) {
    const STORAGE_KEY = "planilha_tarefas_state";
    const RPG_LEVEL_KEY = "rpg_level";

    const DEFAULT_TASKS = [
        { id: "1", name: "Passar fio dental / escovar os dentes", completed: false, points: 10 },
        { id: "2", name: "Não tomar energético", completed: false, points: 20 },
        { id: "3", name: "Ler ao menos 2 páginas de um livro", completed: false, points: 15 },
        { id: "4", name: "Arrumar a cama", completed: false, points: 5 },
        { id: "5", name: "Estudar", completed: false, points: 25 },
        { id: "6", name: "Meditar ao menos 5 minutos", completed: false, points: 15 },
        { id: "7", name: "Revisar/fazer as missões do dia", completed: false, points: 5 },
        { id: "8", name: "Guardar as coisas no lugar logo após o uso", completed: false, points: 10 },
        { id: "9", name: "Passar 5 minutos organizando o quarto/mesa", completed: false, points: 10 },
        { id: "10", name: "Fazer uma refeição sem olhar o celular", completed: false, points: 15 },
        { id: "11", name: "Fazer um exercício por dia", completed: false, points: 30 },
        { id: "12", name: "Diminuir o uso do celular", completed: false, points: 5 },
        { id: "13", name: "Não comer salgado", completed: false, points: 5 }
    ];

    const DEFAULT_WEEKLY_TASKS = [
        { id: "w1", name: "Dar uma geral no quarto", completed: false, points: 50 },
        { id: "w2", name: "Fazer algo especial com a patroa", completed: false, points: 80 }
    ];

    const DEFAULT_MONTHLY_TASKS = [
        { id: "m1", name: "Dia de Lazer Especial", completed: false, points: 150 },
        { id: "m2", name: "Lavar o carro", completed: false, points: 100 }
    ];

    const DEFAULT_REWARDS = [
        { id: "r1", name: "Tomar um Café Premium", price: 50, icon: "food", custom: false },
        { id: "r2", name: "Jogar 30 Minutos de Videogame", price: 150, icon: "game", custom: false },
        { id: "r3", name: "Assistir 1 Episódio de Série", price: 200, icon: "watch", custom: false },
        { id: "r4", name: "Refeição Livre / Cheat Meal", price: 500, icon: "food", custom: false }
    ];

    const DEFAULT_PENALTIES = [
        { id: "p1", name: "Tomei energético", cost: 30 },
        { id: "p2", name: "Comi salgado", cost: 15 },
        { id: "p3", name: "Exagerei no uso do celular", cost: 20 }
    ];

    const DEFAULT_MOTIVATION_LIST = [
        { id: "motive1", text: "Minha família e as pessoas que amo." },
        { id: "motive2", text: "Construir um futuro sólido e cheio de realizações." },
        { id: "motive3", text: "Ter momentos de lazer e descanso sem culpa." }
    ];

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function formatDateYMD(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function getTodayDateString() {
        return formatDateYMD(new Date());
    }

    function getYesterdayDateString() {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return formatDateYMD(d);
    }

    function getSundayOfCurrentWeekString() {
        const d = new Date();
        const diff = d.getDate() - d.getDay();
        const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
        return formatDateYMD(sunday);
    }

    function getMonthYearString(dateStr) {
        if (!dateStr || dateStr.length < 7) return "";
        const parts = dateStr.split("-");
        const monthNames = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        const monthIdx = parseInt(parts[1], 10) - 1;
        return monthNames[monthIdx] ? `${monthNames[monthIdx]}/${parts[0]}` : "";
    }

    function getWeeklyLabel(sundayDateStr) {
        if (!sundayDateStr) return "Semana Anterior";
        const parts = sundayDateStr.split("-");
        const sunday = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        const fmt = (dt) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
        return `Semana de ${fmt(sunday)} a ${fmt(saturday)}`;
    }

    function createDefaultState() {
        return {
            tasks: clone(DEFAULT_TASKS),
            weeklyTasks: clone(DEFAULT_WEEKLY_TASKS),
            monthlyTasks: clone(DEFAULT_MONTHLY_TASKS),
            weeklyScore: 0,
            monthlyScore: 0,
            lastResetDate: getTodayDateString(),
            lastWeeklyResetDate: getSundayOfCurrentWeekString(),
            theme: "dark",
            history: [],
            notesText: "",
            notesTasks: [],
            reminderEnabled: false,
            reminderTime: "17:00",
            reminderMessage: "Hora de revisar suas tarefas diárias!",
            lastReminderTriggeredDate: "",
            gold: 0,
            rewards: clone(DEFAULT_REWARDS),
            penalties: clone(DEFAULT_PENALTIES),
            purchaseHistory: [],
            motivationList: clone(DEFAULT_MOTIVATION_LIST),
            bonusTask: null,
            bonusXp: 0,
            tasksPrint2026Synced: true,
            streak: {
                current: 0,
                best: 0,
                lastCompletedDate: "",
                lastBonusDate: ""
            }
        };
    }

    function normalizeState(raw) {
        const base = createDefaultState();
        const merged = Object.assign({}, base, raw || {});

        // Migração herdada de lista inicial antiga
        if (merged.tasks && merged.tasks.length > 0 && merged.tasks[0].name === "Beber 2L de água ao longo do dia") {
            merged.tasks = clone(DEFAULT_TASKS);
        }

        if (!Array.isArray(merged.tasks) || merged.tasks.length === 0) {
            merged.tasks = clone(DEFAULT_TASKS);
        } else {
            merged.tasks.forEach((t) => {
                if (t.points === undefined || isNaN(Number(t.points))) {
                    const def = DEFAULT_TASKS.find((d) => d.name === t.name);
                    t.points = def ? def.points : 10;
                }
            });

            // Migração única para sincronizar as 13 tarefas atualizadas do print sem perder progresso
            if (!raw || !raw.tasksPrint2026Synced) {
                const task7 = merged.tasks.find(
                    (t) => t.name === "Revisar tarefas do dia" || t.name === "Revisar/fazer as missões do dia"
                );
                if (task7) {
                    task7.name = "Revisar/fazer as missões do dia";
                    task7.points = 5;
                }
                if (!merged.tasks.some((t) => t.name === "Diminuir o uso do celular")) {
                    merged.tasks.push({ id: "12", name: "Diminuir o uso do celular", completed: false, points: 5 });
                }
                if (!merged.tasks.some((t) => t.name === "Não comer salgado")) {
                    merged.tasks.push({ id: "13", name: "Não comer salgado", completed: false, points: 5 });
                }
                merged.tasksPrint2026Synced = true;
            }
        }

        if (!Array.isArray(merged.weeklyTasks) || merged.weeklyTasks.length === 0) {
            merged.weeklyTasks = clone(DEFAULT_WEEKLY_TASKS);
        }
        if (!Array.isArray(merged.monthlyTasks) || merged.monthlyTasks.length === 0) {
            merged.monthlyTasks = clone(DEFAULT_MONTHLY_TASKS);
        }
        if (!Array.isArray(merged.rewards) || merged.rewards.length === 0) {
            merged.rewards = clone(DEFAULT_REWARDS);
        }
        if (!Array.isArray(merged.penalties)) {
            merged.penalties = clone(DEFAULT_PENALTIES);
        }
        if (!Array.isArray(merged.motivationList) || merged.motivationList.length === 0) {
            merged.motivationList = clone(DEFAULT_MOTIVATION_LIST);
        }
        if (!Array.isArray(merged.history)) merged.history = [];
        if (!Array.isArray(merged.notesTasks)) merged.notesTasks = [];
        if (!Array.isArray(merged.purchaseHistory)) merged.purchaseHistory = [];

        merged.weeklyScore = Number(merged.weeklyScore || 0);
        merged.monthlyScore = Number(merged.monthlyScore || 0);
        merged.gold = raw && raw.gold !== undefined ? Number(raw.gold) : merged.weeklyScore;
        merged.bonusXp = Number(merged.bonusXp || 0);
        merged.lastResetDate = merged.lastResetDate || getTodayDateString();
        merged.lastWeeklyResetDate = merged.lastWeeklyResetDate || getSundayOfCurrentWeekString();
        merged.theme = merged.theme === "light" ? "light" : "dark";
        merged.notesText = typeof merged.notesText === "string" ? merged.notesText : "";
        merged.reminderEnabled = Boolean(merged.reminderEnabled);
        merged.reminderTime = merged.reminderTime || "17:00";
        merged.reminderMessage = merged.reminderMessage || "Hora de revisar suas tarefas diárias!";
        merged.lastReminderTriggeredDate = merged.lastReminderTriggeredDate || "";
        if (merged.bonusTask === undefined) merged.bonusTask = null;

        merged.streak = Object.assign(
            { current: 0, best: 0, lastCompletedDate: "", lastBonusDate: "" },
            merged.streak || {}
        );
        merged.streak.current = Number(merged.streak.current || 0);
        merged.streak.best = Math.max(Number(merged.streak.best || 0), merged.streak.current);

        return merged;
    }

    App.state = createDefaultState();
    App.activeSheet = "daily";
    App.editingTaskId = null;
    App.editingRewardId = null;

    function safeGetStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (err) {
            console.warn("LocalStorage indisponível para leitura:", err);
            return null;
        }
    }

    function safeSetStorage(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (err) {
            console.warn("LocalStorage indisponível para escrita:", err);
        }
    }

    function load() {
        const saved = safeGetStorage(STORAGE_KEY);
        if (!saved) {
            App.state = createDefaultState();
            save();
            return;
        }
        try {
            App.state = normalizeState(JSON.parse(saved));
            save();
        } catch (err) {
            console.error("Erro ao carregar estado do LocalStorage:", err);
            App.state = createDefaultState();
            save();
        }
    }

    function save() {
        safeSetStorage(STORAGE_KEY, JSON.stringify(App.state));
    }

    function getActiveTasksArray() {
        if (App.activeSheet === "weekly") return App.state.weeklyTasks;
        if (App.activeSheet === "monthly") return App.state.monthlyTasks;
        return App.state.tasks;
    }

    function calculateTaskPoints(task) {
        const base = Number(task.points || 0);
        return task.completedViaPomodoro ? Math.round(base * 1.5) : base;
    }

    function verifyStreakContinuity() {
        const today = getTodayDateString();
        const yesterday = getYesterdayDateString();
        const last = App.state.streak.lastCompletedDate;
        if (last && last !== today && last !== yesterday) {
            App.state.streak.current = 0;
            save();
        }
    }

    // Executa resets pendentes em ordem cronológica correta (diário -> semanal -> mensal)
    function checkAutomatedResets() {
        const today = getTodayDateString();
        const prevResetDate = App.state.lastResetDate;
        const summary = { daily: false, weekly: false, monthly: false, pointsAdded: 0 };

        // 1. Reset Diário (contabiliza o dia anterior antes de fechar semana/mês)
        if (prevResetDate && prevResetDate !== today) {
            const completedDaily = App.state.tasks.filter((t) => t.completed);
            const taskPoints = completedDaily.reduce((sum, t) => sum + calculateTaskPoints(t), 0);
            const bonusPoints = App.state.bonusTask && App.state.bonusTask.completed
                ? Number(App.state.bonusTask.points || 0)
                : 0;
            const totalDayPoints = taskPoints + bonusPoints;

            App.state.weeklyScore += totalDayPoints;
            App.state.monthlyScore += totalDayPoints;
            App.state.gold = (App.state.gold || 0) + totalDayPoints;

            App.state.tasks.forEach((t) => {
                t.completed = false;
                t.completedViaPomodoro = false;
            });
            App.state.bonusTask = null;
            App.state.lastResetDate = today;

            summary.daily = true;
            summary.pointsAdded += totalDayPoints;
        }

        // 2. Reset Semanal (domingo à meia-noite)
        const currentSunday = getSundayOfCurrentWeekString();
        if (App.state.lastWeeklyResetDate && App.state.lastWeeklyResetDate !== currentSunday) {
            const completedWeekly = App.state.weeklyTasks.filter((t) => t.completed);
            const weeklyTasksPoints = completedWeekly.reduce((sum, t) => sum + Number(t.points || 0), 0);
            const totalWeeklyScore = App.state.weeklyScore + weeklyTasksPoints;

            if (totalWeeklyScore > 0) {
                App.state.history.push({
                    id: "w_" + Date.now(),
                    label: getWeeklyLabel(App.state.lastWeeklyResetDate),
                    score: totalWeeklyScore,
                    type: "weekly",
                    date: App.state.lastWeeklyResetDate
                });
            }

            if (weeklyTasksPoints > 0) {
                App.state.gold = (App.state.gold || 0) + weeklyTasksPoints;
                App.state.monthlyScore += weeklyTasksPoints;
            }

            App.state.weeklyTasks.forEach((t) => {
                t.completed = false;
                t.completedViaPomodoro = false;
            });
            App.state.weeklyScore = 0;
            App.state.lastWeeklyResetDate = currentSunday;
            summary.weekly = true;
        }

        // 3. Reset Mensal (mudança de mês ou ano)
        const lastParts = prevResetDate ? prevResetDate.split("-") : [];
        const todayParts = today.split("-");
        if (lastParts.length >= 2 && (lastParts[0] !== todayParts[0] || lastParts[1] !== todayParts[1])) {
            const completedMonthly = App.state.monthlyTasks.filter((t) => t.completed);
            const monthlyTasksPoints = completedMonthly.reduce((sum, t) => sum + Number(t.points || 0), 0);
            const totalMonthlyScore = App.state.monthlyScore + monthlyTasksPoints;
            const lastMonthLabel = getMonthYearString(prevResetDate) || "Mês Anterior";

            if (totalMonthlyScore > 0) {
                App.state.history.push({
                    id: "m_" + Date.now(),
                    label: lastMonthLabel,
                    score: totalMonthlyScore,
                    type: "monthly",
                    date: prevResetDate
                });
            }

            if (monthlyTasksPoints > 0) {
                App.state.gold = (App.state.gold || 0) + monthlyTasksPoints;
            }

            App.state.monthlyTasks.forEach((t) => {
                t.completed = false;
                t.completedViaPomodoro = false;
            });
            App.state.monthlyScore = 0;
            summary.monthly = true;
        }

        verifyStreakContinuity();
        if (summary.daily || summary.weekly || summary.monthly) {
            save();
        }
        return summary;
    }

    // Exportar Backup JSON
    function exportBackup() {
        const payload = {
            app: "planilha-tarefas-diarias",
            version: 3,
            exportedAt: new Date().toISOString(),
            rpgLevel: Number(localStorage.getItem(RPG_LEVEL_KEY) || 1),
            state: App.state
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `planilha-tarefas-backup-${getTodayDateString()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    // Validar e extrair estado de arquivo JSON importado
    function validateBackupData(parsed) {
        if (!parsed || typeof parsed !== "object") {
            throw new Error("O arquivo não contém um objeto JSON válido.");
        }

        // Suporta tanto o novo formato envelopado ({ version, state }) quanto export direto do state
        const rawState = parsed.state && typeof parsed.state === "object" ? parsed.state : parsed;
        if (!Array.isArray(rawState.tasks)) {
            throw new Error("Backup inválido: lista de tarefas não encontrada.");
        }

        const normalized = normalizeState(rawState);
        const rpgLevel = parsed.rpgLevel ? Number(parsed.rpgLevel) : null;
        return { state: normalized, rpgLevel, exportedAt: parsed.exportedAt || null };
    }

    function applyBackup(backupObj) {
        App.state = backupObj.state;
        save();
        if (backupObj.rpgLevel && !isNaN(backupObj.rpgLevel)) {
            localStorage.setItem(RPG_LEVEL_KEY, String(backupObj.rpgLevel));
        }
    }

    App.store = {
        STORAGE_KEY,
        RPG_LEVEL_KEY,
        load,
        save,
        getActiveTasksArray,
        calculateTaskPoints,
        checkAutomatedResets,
        verifyStreakContinuity,
        exportBackup,
        validateBackupData,
        applyBackup,
        getTodayDateString,
        getYesterdayDateString,
        getSundayOfCurrentWeekString,
        getMonthYearString,
        getWeeklyLabel
    };
})(window.App);
