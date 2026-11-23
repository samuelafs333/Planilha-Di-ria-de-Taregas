// MÓDULO LOJA DE RECOMPENSAS

window.App = window.App || {};

(function (App) {
    function getRewardIconHtml(iconType) {
        const iconMap = {
            food: { name: "utensils", color: "var(--gold)" },
            game: { name: "gamepad-2", color: "var(--ink-secondary)" },
            watch: { name: "tv", color: "var(--ink-secondary)" },
            leisure: { name: "compass", color: "var(--positive)" },
            penalty: { name: "trending-down", color: "var(--danger)" }
        };
        const cfg = iconMap[iconType] || { name: "gift", color: "var(--ink-secondary)" };
        return `<i data-lucide="${cfg.name}" style="color: ${cfg.color}; width: 1.05rem; height: 1.05rem; flex-shrink: 0;"></i>`;
    }

    function renderRewardsList() {
        const listEl = document.getElementById("shop-rewards-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        if (!App.state.rewards || App.state.rewards.length === 0) {
            listEl.innerHTML = `<div class="empty-box-message">Nenhuma recompensa cadastrada. Crie uma recompensa customizada abaixo!</div>`;
            return;
        }

        App.state.rewards.forEach((reward, rewardIndex) => {
            const card = document.createElement("article");
            card.className = "reward-card-item";

            if (reward.id === App.editingRewardId) {
                card.classList.add("editing");
                card.innerHTML = `
                    <div class="shop-form">
                        <div class="form-group">
                            <label class="form-label">Nome:</label>
                            <input type="text" class="form-input edit-reward-name" value="${App.ui.escapeHtml(reward.name)}">
                        </div>
                        <div class="form-row">
                            <div class="form-group flex-1">
                                <label class="form-label">Preço:</label>
                                <input type="number" class="form-input edit-reward-price" value="${reward.price}" min="1">
                            </div>
                            <div class="form-group flex-1-2">
                                <label class="form-label">Categoria:</label>
                                <select class="form-select edit-reward-icon">
                                    <option value="leisure" ${reward.icon === "leisure" ? "selected" : ""}>✈️ Lazer</option>
                                    <option value="food" ${reward.icon === "food" ? "selected" : ""}>🍔 Comida</option>
                                    <option value="game" ${reward.icon === "game" ? "selected" : ""}>🎮 Jogar</option>
                                    <option value="watch" ${reward.icon === "watch" ? "selected" : ""}>🎬 Assistir</option>
                                    <option value="penalty" ${reward.icon === "penalty" ? "selected" : ""}>📉 Descumpri o compromisso</option>
                                </select>
                            </div>
                        </div>
                        <div class="reward-edit-actions">
                            <button type="button" class="btn btn-secondary btn-xs btn-cancel-reward-edit">Cancelar</button>
                            <button type="button" class="btn btn-accent btn-xs btn-save-reward-edit">Salvar</button>
                        </div>
                    </div>
                `;

                card.querySelector(".btn-save-reward-edit").addEventListener("click", () => {
                    const newName = card.querySelector(".edit-reward-name").value.trim();
                    const newPrice = parseInt(card.querySelector(".edit-reward-price").value, 10);
                    const newIcon = card.querySelector(".edit-reward-icon").value;

                    if (!newName || isNaN(newPrice) || newPrice <= 0) {
                        App.ui.toast("Preencha um nome válido e preço maior que 0.", { type: "warning" });
                        return;
                    }

                    reward.name = newName;
                    reward.price = newPrice;
                    reward.icon = newIcon;
                    App.editingRewardId = null;
                    App.store.save();
                    render();
                    App.ui.toast(`Recompensa "${newName}" atualizada!`, { type: "success" });
                });

                card.querySelector(".btn-cancel-reward-edit").addEventListener("click", () => {
                    App.editingRewardId = null;
                    render();
                });
            } else {
                const canAfford = Number(App.state.gold || 0) >= Number(reward.price || 0);
                const isPenalty = reward.icon === "penalty";

                card.innerHTML = `
                    <div class="reward-card-header">
                        <div class="reward-title-group">
                            ${getRewardIconHtml(reward.icon || "leisure")}
                            <h4 class="reward-item-title">${App.ui.escapeHtml(reward.name)}</h4>
                        </div>
                        <div class="reward-card-actions">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-reward-up" title="Mover para cima" ${rewardIndex === 0 ? "disabled" : ""}>
                                <i data-lucide="arrow-up"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-reward-down" title="Mover para baixo" ${rewardIndex === App.state.rewards.length - 1 ? "disabled" : ""}>
                                <i data-lucide="arrow-down"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-reward-edit" title="Editar">
                                <i data-lucide="pencil"></i>
                            </button>
                            ${reward.custom ? `
                                <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger btn-reward-delete" title="Excluir">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            ` : ""}
                        </div>
                    </div>
                    <div class="reward-card-footer">
                        <span class="reward-price-tag ${isPenalty ? "penalty" : ""}">
                            <i data-lucide="coins"></i> ${reward.price} Ouro
                        </span>
                        <button type="button" class="btn btn-sm ${canAfford ? "btn-accent" : "btn-secondary"} btn-reward-redeem" ${canAfford ? "" : "disabled"}>
                            ${canAfford ? `<i data-lucide="gift"></i> Resgatar` : "Falta Ouro"}
                        </button>
                    </div>
                `;

                const btnUp = card.querySelector(".btn-reward-up");
                if (btnUp && rewardIndex > 0) {
                    btnUp.addEventListener("click", () => {
                        const tmp = App.state.rewards[rewardIndex];
                        App.state.rewards[rewardIndex] = App.state.rewards[rewardIndex - 1];
                        App.state.rewards[rewardIndex - 1] = tmp;
                        App.store.save();
                        render();
                    });
                }

                const btnDown = card.querySelector(".btn-reward-down");
                if (btnDown && rewardIndex < App.state.rewards.length - 1) {
                    btnDown.addEventListener("click", () => {
                        const tmp = App.state.rewards[rewardIndex];
                        App.state.rewards[rewardIndex] = App.state.rewards[rewardIndex + 1];
                        App.state.rewards[rewardIndex + 1] = tmp;
                        App.store.save();
                        render();
                    });
                }

                card.querySelector(".btn-reward-edit").addEventListener("click", () => {
                    App.editingRewardId = reward.id;
                    render();
                });

                const btnDelete = card.querySelector(".btn-reward-delete");
                if (btnDelete) {
                    btnDelete.addEventListener("click", async () => {
                        const ok = await App.ui.confirm({
                            title: "Excluir Recompensa",
                            message: `Deseja excluir "${reward.name}" da loja?`,
                            confirmText: "Excluir",
                            variant: "danger",
                            icon: "trash-2"
                        });
                        if (!ok) return;
                        App.state.rewards = App.state.rewards.filter((r) => r.id !== reward.id);
                        App.store.save();
                        render();
                        App.ui.toast("Recompensa removida da loja.", { type: "warning" });
                    });
                }

                const btnRedeem = card.querySelector(".btn-reward-redeem");
                if (btnRedeem && canAfford) {
                    btnRedeem.addEventListener("click", async () => {
                        const ok = await App.ui.confirm({
                            title: "Resgatar Recompensa",
                            message: `Deseja resgatar "${reward.name}" por ${reward.price} Moedas de Ouro?`,
                            confirmText: "Resgatar agora",
                            variant: "success",
                            icon: "gift"
                        });
                        if (!ok) return;

                        App.state.gold -= reward.price;
                        const now = new Date();
                        const purchase = {
                            id: String(Date.now()),
                            name: reward.name,
                            price: reward.price,
                            date: `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                        };
                        App.state.purchaseHistory.unshift(purchase);
                        App.store.save();

                        App.ui.triggerConfetti(100);
                        App.ui.playSound("success");
                        render();

                        App.ui.celebrate({
                            title: "Resgate Concluído!",
                            message: `Você resgatou: "${reward.name}"\nCusto: ${reward.price} Moedas de Ouro.\n\nAproveite sua recompensa sem culpa!`,
                            buttonText: "Aproveitar!",
                            icon: "gift"
                        });
                    });
                }
            }

            listEl.appendChild(card);
        });

        App.ui.refreshIcons();
    }

    function renderPurchaseHistory() {
        const listEl = document.getElementById("shop-history-list");
        if (!listEl) return;

        if (!App.state.purchaseHistory || App.state.purchaseHistory.length === 0) {
            listEl.innerHTML = `<div class="empty-box-message">Nenhum resgate feito ainda. Foco nas tarefas para comprar seus prêmios!</div>`;
            return;
        }

        listEl.innerHTML = App.state.purchaseHistory
            .map((item) => `
                <div class="reward-history-item">
                    <div class="reward-history-meta">
                        <span class="reward-history-name">${App.ui.escapeHtml(item.name)}</span>
                        <span class="reward-history-date">${App.ui.escapeHtml(item.date)}</span>
                    </div>
                    <span class="reward-history-cost">-${item.price} Ouro</span>
                </div>
            `)
            .join("");
    }

    function render() {
        const goldEl = document.getElementById("shop-gold-balance");
        if (goldEl) goldEl.textContent = App.state.gold || 0;
        renderRewardsList();
        renderPurchaseHistory();
    }

    function init() {
        const btnCreate = document.getElementById("btn-create-reward");
        const nameInput = document.getElementById("reward-name-input");
        const priceInput = document.getElementById("reward-price-input");
        const iconInput = document.getElementById("reward-icon-input");

        if (btnCreate && nameInput && priceInput && iconInput) {
            btnCreate.addEventListener("click", () => {
                const name = nameInput.value.trim();
                const price = parseInt(priceInput.value, 10);
                const icon = iconInput.value;

                if (!name || isNaN(price) || price <= 0) {
                    App.ui.toast("Insira um nome válido e um preço maior que 0.", { type: "warning" });
                    return;
                }

                App.state.rewards.push({
                    id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name,
                    price,
                    icon,
                    custom: true
                });
                App.store.save();

                nameInput.value = "";
                priceInput.value = "";
                iconInput.value = "leisure";

                render();
                App.ui.toast(`Recompensa "${name}" adicionada à loja!`, { type: "success" });
            });
        }

        render();
    }

    App.shop = {
        init,
        render
    };
})(window.App);
