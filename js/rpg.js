// MÓDULO RPG, OFENSIVA (STREAK) E DASHBOARD

window.App = window.App || {};

(function (App) {
    const STREAK_GOAL_PERCENT = 50; // 50% das tarefas diárias completam o dia da ofensiva
    const STREAK_DAILY_GOLD_BONUS = 15;
    const STREAK_DAILY_XP_BONUS = 15;

    const RPG_TITLES = [
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

    const XP_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1900, 2700, 3700, 5000];

    function calculateLevel() {
        const historyXP = App.state.history.reduce((sum, r) => sum + Number(r.score || 0), 0);
        const totalXP = historyXP + Number(App.state.weeklyScore || 0) + Number(App.state.bonusXp || 0);

        let level = 1;
        for (let i = 1; i < XP_THRESHOLDS.length; i++) {
            if (totalXP >= XP_THRESHOLDS[i]) {
                level = i + 1;
            } else {
                break;
            }
        }

        if (totalXP >= 5000) {
            level = 10 + Math.floor((totalXP - 5000) / 1500);
        }

        const titleObj = RPG_TITLES.find((t) => level >= t.minLevel && level <= t.maxLevel);
        const title = titleObj ? titleObj.title : "Lenda do Auto-Controle";

        let currentLevelXP = 0;
        let nextLevelXP = 100;

        if (level < 10) {
            currentLevelXP = XP_THRESHOLDS[level - 1];
            nextLevelXP = XP_THRESHOLDS[level];
        } else {
            currentLevelXP = 5000 + (level - 10) * 1500;
            nextLevelXP = 5000 + (level - 9) * 1500;
        }

        const xpInCurrentLevel = Math.max(0, totalXP - currentLevelXP);
        const xpNeededForNextLevel = Math.max(1, nextLevelXP - currentLevelXP);
        const percent = Math.min(100, (xpInCurrentLevel / xpNeededForNextLevel) * 100);

        return { level, title, totalXP, xpInCurrentLevel, xpNeededForNextLevel, percent };
    }

    function updateRpgDisplay() {
        const lvlInfo = calculateLevel();
        const rpgTitleEl = document.getElementById("rpg-title");
        const rpgLevelEl = document.getElementById("rpg-level");
        const rpgXpTextEl = document.getElementById("rpg-xp-text");
        const rpgProgressBarEl = document.getElementById("rpg-progress-bar");

        if (rpgTitleEl) rpgTitleEl.textContent = lvlInfo.title;
        if (rpgLevelEl) rpgLevelEl.textContent = `Nível ${lvlInfo.level}`;
        if (rpgXpTextEl) rpgXpTextEl.textContent = `${lvlInfo.xpInCurrentLevel} / ${lvlInfo.xpNeededForNextLevel} XP`;
        if (rpgProgressBarEl) rpgProgressBarEl.style.width = `${lvlInfo.percent}%`;

        const key = App.store.RPG_LEVEL_KEY;
        let oldLevel = 1;
        try {
            const rawLevel = localStorage.getItem(key);
            if (rawLevel) oldLevel = parseInt(rawLevel, 10) || 1;
        } catch (_) {}

        if (lvlInfo.level > oldLevel) {
            try { localStorage.setItem(key, String(lvlInfo.level)); } catch (_) {}
            App.ui.triggerConfetti(140);
            App.ui.playSound("success");
            App.ui.celebrate({
                title: `Level Up! Nível ${lvlInfo.level}`,
                message: `Parabéns! Você evoluiu para o Nível ${lvlInfo.level}!\n\nNovo Título Desbloqueado:\n"${lvlInfo.title}"`,
                buttonText: "Continuar evoluindo",
                icon: "shield"
            });
        } else if (lvlInfo.level < oldLevel) {
            try { localStorage.setItem(key, String(lvlInfo.level)); } catch (_) {}
        }
    }

    // Verifica e atualiza a Ofensiva (Streak 🔥) com base nas tarefas diárias de hoje
    function evaluateDailyStreak(allowCelebration = false) {
        const dailyTasks = App.state.tasks || [];
        const totalDaily = dailyTasks.length;
        const doneDaily = dailyTasks.filter((t) => t.completed).length;
        const dailyPercent = totalDaily > 0 ? Math.round((doneDaily / totalDaily) * 100) : 0;

        const today = App.store.getTodayDateString();
        const yesterday = App.store.getYesterdayDateString();
        const streak = App.state.streak;

        // Se atingiu >= 50% das tarefas diárias e hoje ainda não contou
        if (totalDaily > 0 && dailyPercent >= STREAK_GOAL_PERCENT && streak.lastCompletedDate !== today) {
            if (streak.lastCompletedDate === yesterday) {
                streak.current += 1;
            } else {
                streak.current = 1;
            }
            streak.lastCompletedDate = today;
            if (streak.current > streak.best) {
                streak.best = streak.current;
            }

            // Concede bônus de Ofensiva apenas 1x por dia
            if (streak.lastBonusDate !== today) {
                streak.lastBonusDate = today;
                const multiplier = Math.min(3, 1 + Math.floor((streak.current - 1) / 7));
                const goldReward = STREAK_DAILY_GOLD_BONUS * multiplier;
                const xpReward = STREAK_DAILY_XP_BONUS * multiplier;

                App.state.gold = (App.state.gold || 0) + goldReward;
                App.state.bonusXp = (App.state.bonusXp || 0) + xpReward;

                if (allowCelebration) {
                    App.ui.triggerConfetti(90);
                    App.ui.playSound("success");
                    App.ui.toast(
                        `Ofensiva de ${streak.current} ${streak.current === 1 ? "dia" : "dias"} garantida! Você ganhou +${goldReward} Ouro e +${xpReward} XP.`,
                        { title: "🔥 Fogo Mantido!", type: "success", duration: 5000 }
                    );
                }
            }
            App.store.save();
        }

        // Renderizar card de Ofensiva
        const streakValueEl = document.getElementById("streak-value");
        const streakBestEl = document.getElementById("streak-best");
        const streakBadgeEl = document.getElementById("streak-status-badge");
        const streakBarEl = document.getElementById("streak-progress-bar");

        const isDoneToday = streak.lastCompletedDate === today;
        const dayWord = streak.current === 1 ? "dia" : "dias";
        const bestWord = streak.best === 1 ? "dia" : "dias";

        if (streakValueEl) streakValueEl.textContent = `${streak.current} ${dayWord}`;
        if (streakBestEl) streakBestEl.textContent = `Recorde: ${streak.best} ${bestWord}`;
        if (streakBadgeEl) {
            streakBadgeEl.textContent = isDoneToday ? "Hoje garantido!" : `Meta: ${dailyPercent}/${STREAK_GOAL_PERCENT}%`;
            streakBadgeEl.classList.toggle("completed", isDoneToday);
        }
        if (streakBarEl) {
            const barWidth = isDoneToday ? 100 : Math.min(100, Math.round((dailyPercent / STREAK_GOAL_PERCENT) * 100));
            streakBarEl.style.width = `${barWidth}%`;
        }
    }

    function updateDashboard(options = {}) {
        const activeTasks = App.store.getActiveTasksArray();
        let totalTasks = activeTasks.length;
        let completedTasks = activeTasks.filter((t) => t.completed).length;

        let activePoints = activeTasks
            .filter((t) => t.completed)
            .reduce((sum, t) => sum + App.store.calculateTaskPoints(t), 0);

        if (App.activeSheet === "daily" && App.state.bonusTask) {
            totalTasks += 1;
            if (App.state.bonusTask.completed) {
                completedTasks += 1;
                activePoints += Number(App.state.bonusTask.points || 0);
            }
        }

        const weeklyScoreEl = document.getElementById("weekly-score");
        const todayPointsEl = document.getElementById("today-points");
        const todayPointsLabelEl = document.getElementById("today-points-label");
        const todayPointsSubtextEl = document.getElementById("today-points-subtext");
        const taskProgressEl = document.getElementById("task-progress");
        const taskProgressPercentEl = document.getElementById("task-progress-percent");
        const progressBarEl = document.getElementById("progress-bar");
        const currentWeekScoreEl = document.getElementById("current-week-score");
        const currentMonthScoreEl = document.getElementById("current-month-score");

        if (weeklyScoreEl) weeklyScoreEl.textContent = App.state.weeklyScore;
        if (todayPointsEl) todayPointsEl.textContent = activePoints;

        if (todayPointsLabelEl && todayPointsSubtextEl) {
            if (App.activeSheet === "weekly") {
                todayPointsLabelEl.textContent = "Pontos da Semana";
                todayPointsSubtextEl.textContent = "Creditados no fechamento semanal";
            } else if (App.activeSheet === "monthly") {
                todayPointsLabelEl.textContent = "Pontos do Mês";
                todayPointsSubtextEl.textContent = "Creditados no fechamento mensal";
            } else {
                todayPointsLabelEl.textContent = "Pontos de Hoje";
                todayPointsSubtextEl.textContent = "Somados no reset diário à meia-noite";
            }
        }

        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        if (taskProgressEl) taskProgressEl.textContent = `${completedTasks}/${totalTasks}`;
        if (taskProgressPercentEl) taskProgressPercentEl.textContent = `${percentage}%`;
        if (progressBarEl) progressBarEl.style.width = `${percentage}%`;

        if (currentWeekScoreEl) currentWeekScoreEl.textContent = App.state.weeklyScore;
        if (currentMonthScoreEl) currentMonthScoreEl.textContent = App.state.monthlyScore;

        evaluateDailyStreak(Boolean(options.checkStreakCelebration));
        updateRpgDisplay();
    }

    App.rpg = {
        calculateLevel,
        updateRpgDisplay,
        evaluateDailyStreak,
        updateDashboard
    };
})(window.App);
