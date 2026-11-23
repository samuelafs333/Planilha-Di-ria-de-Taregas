// MÓDULO PRINCIPAL (BOOTSTRAP, PWA, BACKUP JSON, LEMBRETE E CRONÔMETRO DE RESET)

window.App = window.App || {};

(function (App) {
    let deferredInstallPrompt = null;

    function registerServiceWorker() {
        if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
            navigator.serviceWorker
                .register("./sw.js")
                .catch((err) => console.warn("Service Worker não registrado:", err));
        }
    }

    function setupPwaInstall() {
        const installBtn = document.getElementById("btn-install-pwa");
        if (!installBtn) return;

        window.addEventListener("beforeinstallprompt", (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            installBtn.classList.remove("hidden");
        });

        installBtn.addEventListener("click", async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice.outcome === "accepted") {
                App.ui.toast("Aplicativo instalado com sucesso!", { type: "success" });
            }
            deferredInstallPrompt = null;
            installBtn.classList.add("hidden");
        });

        window.addEventListener("appinstalled", () => {
            installBtn.classList.add("hidden");
            deferredInstallPrompt = null;
        });
    }

    function setupBackupControls() {
        const btnExport = document.getElementById("btn-export-backup");
        const btnImport = document.getElementById("btn-import-backup");
        const fileInput = document.getElementById("import-backup-input");

        if (btnExport) {
            btnExport.addEventListener("click", () => {
                App.store.exportBackup();
                App.ui.toast("Backup JSON exportado com sucesso!", {
                    title: "Backup Salvo",
                    type: "success"
                });
            });
        }

        if (btnImport && fileInput) {
            btnImport.addEventListener("click", () => {
                fileInput.value = "";
                fileInput.click();
            });

            fileInput.addEventListener("change", (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = async (ev) => {
                    try {
                        const parsed = JSON.parse(ev.target.result);
                        const validated = App.store.validateBackupData(parsed);
                        const s = validated.state;

                        const exportedLabel = validated.exportedAt
                            ? new Date(validated.exportedAt).toLocaleString("pt-BR")
                            : "Data desconhecida";

                        const ok = await App.ui.confirm({
                            title: "Restaurar Backup JSON",
                            message:
                                `Arquivo: ${file.name}\nExportado em: ${exportedLabel}\n\n` +
                                `Resumo do backup:\n` +
                                `• Tarefas diárias: ${s.tasks.length}\n` +
                                `• Placar semanal: ${s.weeklyScore} Pts\n` +
                                `• Moedas de ouro: ${s.gold}\n` +
                                `• Registros no histórico: ${s.history.length}\n\n` +
                                `Isso substituirá seus dados atuais neste navegador. Continuar?`,
                            confirmText: "Restaurar Dados",
                            variant: "primary",
                            icon: "upload"
                        });

                        if (!ok) return;

                        App.store.applyBackup(validated);
                        App.ui.applyTheme(App.state.theme);
                        syncReminderInputs();
                        const notesTextarea = document.getElementById("notes-textarea");
                        if (notesTextarea) notesTextarea.value = App.state.notesText || "";

                        App.tasks.render();
                        App.tasks.renderBonusTask();
                        App.tasks.renderNotesTasks();
                        App.rpg.updateDashboard();
                        App.history.render();
                        App.shop.render();
                        App.motivation.render();

                        App.ui.triggerConfetti(75);
                        App.ui.toast("Backup restaurado com sucesso!", {
                            title: "Dados Recuperados",
                            type: "success"
                        });
                    } catch (err) {
                        App.ui.toast(err.message || "Arquivo de backup inválido.", {
                            title: "Erro ao importar",
                            type: "error",
                            duration: 5000
                        });
                    }
                };
                reader.readAsText(file);
            });
        }
    }

    function syncReminderInputs() {
        const timeEl = document.getElementById("reminder-time");
        const enabledEl = document.getElementById("reminder-enabled");
        const messageEl = document.getElementById("reminder-message");

        if (timeEl) timeEl.value = App.state.reminderTime || "17:00";
        if (enabledEl) enabledEl.checked = Boolean(App.state.reminderEnabled);
        if (messageEl) messageEl.value = App.state.reminderMessage || "";
    }

    function setupReminders() {
        const timeEl = document.getElementById("reminder-time");
        const enabledEl = document.getElementById("reminder-enabled");
        const messageEl = document.getElementById("reminder-message");

        syncReminderInputs();

        if (timeEl) {
            timeEl.addEventListener("change", (e) => {
                App.state.reminderTime = e.target.value;
                App.store.save();
            });
        }

        if (enabledEl) {
            enabledEl.addEventListener("change", (e) => {
                App.state.reminderEnabled = e.target.checked;
                App.store.save();
                if (App.state.reminderEnabled) {
                    if (typeof Notification !== "undefined" && Notification.permission === "default") {
                        Notification.requestPermission().catch(() => {});
                    }
                    App.ui.toast(`Lembrete ativado para às ${App.state.reminderTime}.`, { type: "success" });
                } else {
                    App.ui.toast("Lembrete diário desativado.", { type: "info" });
                }
            });
        }

        if (messageEl) {
            messageEl.addEventListener("input", (e) => {
                App.state.reminderMessage = e.target.value;
                App.store.save();
            });
        }
    }

    function checkScheduledReminders() {
        if (!App.state.reminderEnabled || !App.state.reminderTime) return;

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const todayStr = App.store.getTodayDateString();

        if (currentTime === App.state.reminderTime && App.state.lastReminderTriggeredDate !== todayStr) {
            App.state.lastReminderTriggeredDate = todayStr;
            App.store.save();

            const msg = App.state.reminderMessage || "Hora de revisar suas tarefas diárias!";
            App.ui.sendLocalNotification("⏰ Lembrete Diário", msg);
            App.ui.playSound("success");
            App.ui.toast(msg, { title: "⏰ Lembrete Diário", type: "warning", duration: 7000 });
        }
    }

    function updateHeaderDate() {
        const titleEl = document.getElementById("header-date-title");
        if (!titleEl) return;
        const now = new Date();
        const formatted = now.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long"
        });
        // "segunda-feira, 23 de novembro" -> "Segunda, 23 de novembro"
        const clean = formatted.replace("-feira", "");
        titleEl.textContent = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    function startClockAndAutoResets() {
        updateHeaderDate();
        const nextResetEl = document.getElementById("next-reset");
        let lastCheckedDate = App.store.getTodayDateString();

        const tick = () => {
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            const diffMs = Math.max(0, midnight - now);
            const h = String(Math.floor((diffMs / 3600000) % 24)).padStart(2, "0");
            const m = String(Math.floor((diffMs / 60000) % 60)).padStart(2, "0");
            const s = String(Math.floor((diffMs / 1000) % 60)).padStart(2, "0");

            if (nextResetEl) nextResetEl.textContent = `${h}:${m}:${s}`;

            checkScheduledReminders();

            // Se a aba ficar aberta durante a virada da meia-noite, dispara os resets automaticamente
            const today = App.store.getTodayDateString();
            if (today !== lastCheckedDate) {
                lastCheckedDate = today;
                updateHeaderDate();
                const res = App.store.checkAutomatedResets();
                if (res.daily || res.weekly || res.monthly) {
                    App.tasks.render();
                    App.tasks.renderBonusTask();
                    App.rpg.updateDashboard();
                    App.history.render();
                    App.shop.render();
                    App.ui.toast("Novo dia iniciado! Pontos contabilizados automaticamente.", {
                        title: "🌙 Reset da Meia-Noite",
                        type: "info"
                    });
                }
            }
        };

        tick();
        setInterval(tick, 1000);
    }

    function bootstrap() {
        const safeRun = (label, fn) => {
            try {
                fn();
            } catch (err) {
                console.error(`[Inicialização] Erro em ${label}:`, err);
            }
        };

        safeRun("ServiceWorker", registerServiceWorker);
        safeRun("Modal", () => App.ui.initModalListeners());
        safeRun("State", () => App.store.load());

        let resetSummary = { daily: false, pointsAdded: 0 };
        safeRun("AutoResets", () => {
            resetSummary = App.store.checkAutomatedResets();
        });

        safeRun("Theme", () => App.ui.setupTheme());
        safeRun("Tabs", () => App.ui.setupTabNavigation());
        safeRun("Tasks", () => App.tasks.init());
        safeRun("Pomodoro", () => App.pomodoro.init());
        safeRun("RPG", () => App.rpg.updateDashboard());
        safeRun("History", () => App.history.init());
        safeRun("Shop", () => App.shop.init());
        safeRun("Motivation", () => App.motivation.init());
        safeRun("Reminders", setupReminders);
        safeRun("Backup", setupBackupControls);
        safeRun("PWA", setupPwaInstall);
        safeRun("Clock", startClockAndAutoResets);
        safeRun("Icons", () => App.ui.refreshIcons());

        if (resetSummary && resetSummary.daily) {
            App.ui.toast(
                `Reset diário automático aplicado (+${resetSummary.pointsAdded} Pts e Ouro creditados).`,
                { title: "☀️ Bom dia!", type: "success", duration: 5000 }
            );
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
        bootstrap();
    }

    // Garante que ícones Lucide carregados via async sejam renderizados assim que prontos
    window.addEventListener("load", () => {
        if (App.ui) App.ui.refreshIcons();
    });
})(window.App);
