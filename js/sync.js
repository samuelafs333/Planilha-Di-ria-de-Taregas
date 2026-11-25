// MÓDULO DE SINCRONIZAÇÃO EM NUVEM (VPS HETZNER + NOD WHATSAPP + OBSIDIAN)

window.App = window.App || {};

(function (App) {
    const DEFAULT_SYNC_URL = "https://tarefas.2-29-212-239.sslip.io";
    const TOKEN_KEY = "planilha_sync_token";
    const URL_KEY = "planilha_sync_url";
    const LAST_SYNC_KEY = "planilha_sync_updated_at";

    let pushTimer = null;
    let isPulling = false;
    let isPushing = false;

    function getSyncUrl() {
        return (localStorage.getItem(URL_KEY) || DEFAULT_SYNC_URL).replace(/\/+$/, "");
    }

    function getToken() {
        return (localStorage.getItem(TOKEN_KEY) || "").trim();
    }

    function isConfigured() {
        return Boolean(getToken());
    }

    function updateSyncButtonUI(status) {
        const btn = document.getElementById("btn-cloud-sync");
        if (!btn) return;
        const label = btn.querySelector(".btn-label");
        if (!isConfigured()) {
            btn.title = "Conectar sincronização com VPS / WhatsApp / Obsidian";
            btn.style.color = "";
            if (label) label.textContent = "Sync";
            return;
        }
        if (status === "syncing") {
            btn.title = "Sincronizando com a VPS...";
            if (label) label.textContent = "Sync...";
        } else if (status === "error") {
            btn.title = "Erro na sincronização — clique para verificar o token";
            btn.style.color = "#ef4444";
            if (label) label.textContent = "Sync !";
        } else {
            btn.title = "Sincronizado com VPS / WhatsApp / Obsidian — clique para gerenciar";
            btn.style.color = "#10b981";
            if (label) label.textContent = "Sync ✓";
        }
    }

    function rerenderAll() {
        if (App.ui && App.ui.applyTheme) App.ui.applyTheme(App.state.theme);
        const notesTextarea = document.getElementById("notes-textarea");
        if (notesTextarea && document.activeElement !== notesTextarea) {
            notesTextarea.value = App.state.notesText || "";
        }
        if (App.tasks) {
            App.tasks.render();
            App.tasks.renderBonusTask();
            App.tasks.renderNotesTasks();
        }
        if (App.rpg) App.rpg.updateDashboard();
        if (App.history) App.history.render();
        if (App.shop) App.shop.render();
        if (App.motivation) App.motivation.render();
    }

    async function pushNow() {
        if (!isConfigured() || isPulling || isPushing) return false;
        isPushing = true;
        updateSyncButtonUI("syncing");
        try {
            const res = await fetch(`${getSyncUrl()}/api/state`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ state: App.state })
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data && data.updatedAt) {
                localStorage.setItem(LAST_SYNC_KEY, data.updatedAt);
            }
            updateSyncButtonUI("ok");
            return true;
        } catch (err) {
            console.warn("[Sync] Erro ao enviar estado:", err);
            updateSyncButtonUI("error");
            return false;
        } finally {
            isPushing = false;
        }
    }

    function schedulePush() {
        if (!isConfigured() || isPulling) return;
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            pushNow();
        }, 600);
    }

    async function pullNow({ silent = true, forceApply = false } = {}) {
        if (!isConfigured() || isPulling || isPushing) return false;
        isPulling = true;
        if (!silent) updateSyncButtonUI("syncing");
        try {
            const res = await fetch(`${getSyncUrl()}/api/state`, {
                method: "GET",
                headers: { Authorization: `Bearer ${getToken()}` },
                cache: "no-store"
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const remoteUpdatedAt = data && data.updatedAt ? data.updatedAt : "";
            const localUpdatedAt = localStorage.getItem(LAST_SYNC_KEY) || "";

            if (data && data.state && Array.isArray(data.state.tasks)) {
                const remoteIsNewer = forceApply || (remoteUpdatedAt && remoteUpdatedAt !== localUpdatedAt);
                if (remoteIsNewer) {
                    const validated = App.store.validateBackupData({ state: data.state });
                    App.state = validated.state;
                    localStorage.setItem(App.store.STORAGE_KEY, JSON.stringify(App.state));
                    if (remoteUpdatedAt) localStorage.setItem(LAST_SYNC_KEY, remoteUpdatedAt);
                    rerenderAll();
                }
            }
            updateSyncButtonUI("ok");
            return true;
        } catch (err) {
            console.warn("[Sync] Erro ao buscar estado:", err);
            updateSyncButtonUI("error");
            return false;
        } finally {
            isPulling = false;
        }
    }

    async function openSyncConfig() {
        const currentToken = getToken();
        const msg = currentToken
            ? "Sincronização ativa com a VPS.\n\nCole um novo token para atualizar, clique em OK com o atual para sincronizar agora, ou apague tudo e clique em OK para desconectar:"
            : "Cole o Token de Sincronização da sua VPS para conectar este navegador ao WhatsApp (Nod) e ao Obsidian:";

        const input = window.prompt(msg, currentToken);
        if (input === null) return;

        const trimmed = input.trim();
        if (!trimmed) {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(LAST_SYNC_KEY);
            updateSyncButtonUI("off");
            if (App.ui) App.ui.toast("Sincronização em nuvem desconectada.", { type: "info" });
            return;
        }

        const isFirstConnect = !currentToken;
        localStorage.setItem(TOKEN_KEY, trimmed);
        localStorage.setItem(URL_KEY, DEFAULT_SYNC_URL);

        if (isFirstConnect) {
            const hasLocalProgress =
                (App.state.tasks || []).some((t) => t.completed) ||
                Number(App.state.weeklyScore || 0) > 0 ||
                Number(App.state.gold || 0) > 0 ||
                (App.state.history || []).length > 0;

            const ok = hasLocalProgress ? await pushNow() : await pullNow({ silent: false, forceApply: true });
            if (App.ui) {
                App.ui.toast(
                    ok
                        ? "Conectado à VPS! Suas tarefas agora sincronizam com WhatsApp e Obsidian."
                        : "Não foi possível conectar. Verifique o token e tente novamente.",
                    { type: ok ? "success" : "error", duration: 5000 }
                );
            }
        } else {
            const ok = await pullNow({ silent: false, forceApply: true });
            if (App.ui) {
                App.ui.toast(ok ? "Sincronizado com a VPS!" : "Erro ao sincronizar com a VPS.", {
                    type: ok ? "success" : "error"
                });
            }
        }
    }

    function init() {
        if (App.store && typeof App.store.save === "function" && !App.store._syncWrapped) {
            const originalSave = App.store.save;
            App.store.save = function () {
                originalSave.apply(this, arguments);
                schedulePush();
            };
            App.store._syncWrapped = true;
        }

        const btn = document.getElementById("btn-cloud-sync");
        if (btn) {
            btn.addEventListener("click", openSyncConfig);
        }

        updateSyncButtonUI(isConfigured() ? "ok" : "off");

        if (isConfigured()) {
            pullNow({ silent: true, forceApply: true });
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible" && isConfigured()) {
                pullNow({ silent: true });
            }
        });
        setInterval(() => {
            if (document.visibilityState === "visible" && isConfigured()) {
                pullNow({ silent: true });
            }
        }, 25000);
    }

    App.sync = { init, pullNow, pushNow, openSyncConfig, isConfigured };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(window.App);
