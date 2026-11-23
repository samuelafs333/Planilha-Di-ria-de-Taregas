// MÓDULO DE INTERFACE: TOASTS, MODAL, TEMA, NAVEGAÇÃO, CONFETES, SOM E NOTIFICAÇÕES

window.App = window.App || {};

(function (App) {
    let modalResolve = null;

    function escapeHtml(str) {
        if (str === null || str === undefined) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function refreshIcons() {
        if (window.lucide && typeof window.lucide.createIcons === "function") {
            window.lucide.createIcons();
        }
    }

    // TOASTS (substitui alert())
    function toast(message, options = {}) {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const {
            title = "",
            type = "info", // 'success' | 'info' | 'warning' | 'error'
            duration = 3800
        } = options;

        const iconMap = {
            success: "check-circle-2",
            info: "info",
            warning: "alert-triangle",
            error: "x-circle"
        };

        const el = document.createElement("div");
        el.className = `toast ${type}`;
        el.setAttribute("role", "status");
        el.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${iconMap[type] || "info"}"></i>
            </div>
            <div class="toast-body">
                ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ""}
                <div class="toast-text">${escapeHtml(message)}</div>
            </div>
        `;

        const dismiss = () => {
            if (el.classList.contains("toast-leaving")) return;
            el.classList.add("toast-leaving");
            setTimeout(() => el.remove(), 200);
        };

        el.addEventListener("click", dismiss);
        container.appendChild(el);
        refreshIcons();

        if (duration > 0) {
            setTimeout(dismiss, duration);
        }
    }

    // MODAL CUSTOMIZADO (substitui confirm() e alertas importantes)
    function initModalListeners() {
        const overlay = document.getElementById("app-modal-overlay");
        const btnCancel = document.getElementById("app-modal-cancel");
        const btnConfirm = document.getElementById("app-modal-confirm");
        const btnClose = document.getElementById("app-modal-close");

        if (!overlay) return;

        const closeWith = (result) => {
            overlay.classList.remove("open");
            if (modalResolve) {
                const fn = modalResolve;
                modalResolve = null;
                fn(result);
            }
        };

        if (btnConfirm) btnConfirm.addEventListener("click", () => closeWith(true));
        if (btnCancel) btnCancel.addEventListener("click", () => closeWith(false));
        if (btnClose) btnClose.addEventListener("click", () => closeWith(false));

        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeWith(false);
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlay.classList.contains("open")) {
                closeWith(false);
            }
        });
    }

    function openModal({
        title = "Confirmação",
        message = "",
        confirmText = "Confirmar",
        cancelText = "Cancelar",
        showCancel = true,
        variant = "primary", // 'primary' | 'danger' | 'success'
        icon = "help-circle"
    }) {
        const overlay = document.getElementById("app-modal-overlay");
        const titleEl = document.getElementById("app-modal-title");
        const msgEl = document.getElementById("app-modal-message");
        const iconEl = document.getElementById("app-modal-icon");
        const btnConfirm = document.getElementById("app-modal-confirm");
        const btnCancel = document.getElementById("app-modal-cancel");

        if (!overlay) return Promise.resolve(false);

        titleEl.textContent = title;
        msgEl.textContent = message;

        iconEl.className = `modal-icon-badge ${variant === "danger" ? "danger" : variant === "success" ? "success" : ""}`;
        iconEl.innerHTML = `<i data-lucide="${icon}"></i>`;

        btnConfirm.textContent = confirmText;
        btnConfirm.className = `btn btn-sm ${variant === "danger" ? "btn-danger" : variant === "success" ? "btn-accent" : "btn-primary"}`;

        btnCancel.textContent = cancelText;
        btnCancel.classList.toggle("hidden", !showCancel);

        overlay.classList.add("open");
        refreshIcons();

        return new Promise((resolve) => {
            modalResolve = resolve;
        });
    }

    function confirm(options) {
        return openModal(Object.assign({ showCancel: true }, options));
    }

    function celebrate({ title, message, buttonText = "Incrível!", icon = "trophy" }) {
        return openModal({
            title,
            message,
            confirmText: buttonText,
            showCancel: false,
            variant: "success",
            icon
        });
    }

    // TEMA CLARO E ESCURO
    function applyTheme(theme) {
        const isLight = theme === "light";
        document.body.classList.toggle("light-theme", isLight);
        document.body.classList.toggle("dark-theme", !isLight);

        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) {
            themeMeta.setAttribute("content", isLight ? "#f7f6f2" : "#111112");
        }

        const toggleBtn = document.getElementById("theme-toggle");
        if (toggleBtn) {
            toggleBtn.innerHTML = isLight ? `<i data-lucide="moon"></i>` : `<i data-lucide="sun"></i>`;
            toggleBtn.title = isLight ? "Mudar para Tema Escuro" : "Mudar para Tema Claro";
        }
        refreshIcons();
    }

    function setupTheme() {
        applyTheme(App.state.theme);

        const toggleBtn = document.getElementById("theme-toggle");
        if (!toggleBtn) return;

        toggleBtn.addEventListener("click", () => {
            App.state.theme = App.state.theme === "dark" ? "light" : "dark";
            App.store.save();
            applyTheme(App.state.theme);
            if (App.history && App.history.render) App.history.render();
            toast(`Tema alterado para ${App.state.theme === "light" ? "Claro" : "Escuro"}.`, { type: "info", duration: 2000 });
        });
    }

    // NAVEGAÇÃO POR ABAS
    function setupTabNavigation() {
        const tabs = document.querySelectorAll(".nav-tab");
        const tabTasks = document.getElementById("tab-tasks-content");
        const tabShop = document.getElementById("tab-shop-content");
        const tabMotivation = document.getElementById("tab-motivation-content");

        tabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                const target = tab.dataset.tab;
                tabs.forEach((t) => {
                    const active = t === tab;
                    t.classList.toggle("active", active);
                    t.setAttribute("aria-selected", String(active));
                });

                if (tabTasks) tabTasks.classList.toggle("hidden", target !== "tab-tasks");
                if (tabShop) tabShop.classList.toggle("hidden", target !== "tab-shop");
                if (tabMotivation) tabMotivation.classList.toggle("hidden", target !== "tab-motivation");

                if (target === "tab-shop" && App.shop) App.shop.render();
                if (target === "tab-motivation" && App.motivation) App.motivation.render();
                if (target === "tab-tasks" && App.history) App.history.render();
            });
        });
    }

    // CONFETES
    function triggerConfetti(count = 60) {
        if (typeof window.confetti === "function") {
            window.confetti({
                particleCount: count,
                spread: 70,
                origin: { y: 0.65 },
                colors: ["#3b82f6", "#10b981", "#60a5fa", "#34d399", "#fbbf24", "#f97316"]
            });
        }
    }

    // EFEITOS SONOROS (Web Audio API)
    function playSound(type) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === "start") {
                osc.type = "sine";
                osc.frequency.setValueAtTime(440, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
                gain.gain.setValueAtTime(0.07, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
                osc.start();
                osc.stop(ctx.currentTime + 0.25);
            } else if (type === "success") {
                osc.type = "triangle";
                osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.14);
                osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.28);
                gain.gain.setValueAtTime(0.11, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
                osc.start();
                osc.stop(ctx.currentTime + 0.48);
            }
        } catch (err) {
            // Ignora silenciosamente se áudio bloqueado pelo navegador
        }
    }

    // NOTIFICAÇÕES LOCAIS
    function sendLocalNotification(title, body) {
        const options = {
            body,
            icon: "./assets/icon-192.png",
            badge: "./assets/icon-192.png",
            vibrate: [200, 100, 200]
        };

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            if ("serviceWorker" in navigator) {
                navigator.serviceWorker.ready
                    .then((reg) => reg.showNotification(title, options))
                    .catch(() => {
                        try { new Notification(title, options); } catch (_) {}
                    });
            } else {
                try { new Notification(title, options); } catch (_) {}
            }
        }
    }

    App.ui = {
        escapeHtml,
        refreshIcons,
        toast,
        initModalListeners,
        confirm,
        celebrate,
        applyTheme,
        setupTheme,
        setupTabNavigation,
        triggerConfetti,
        playSound,
        sendLocalNotification
    };
})(window.App);
