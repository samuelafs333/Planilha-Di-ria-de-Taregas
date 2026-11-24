// MÓDULO LOJA DE RECOMPENSAS & PENALIDADES (- OURO)

window.App = window.App || {};

(function (App) {
    let activeShopView = "rewards"; // 'rewards' | 'penalties'
    let editingPenaltyId = null;
    let draggedPenaltyId = null;

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

    function updateGoldBalanceUI() {
        const goldEl = document.getElementById("shop-gold-balance");
        if (!goldEl) return;
        const gold = Number(App.state.gold || 0);
        goldEl.textContent = gold;
        goldEl.classList.toggle("negative", gold < 0);
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
                                    <option value="leisure" ${reward.icon === "leisure" ? "selected" : ""}>Lazer</option>
                                    <option value="food" ${reward.icon === "food" ? "selected" : ""}>Comida</option>
                                    <option value="game" ${reward.icon === "game" ? "selected" : ""}>Jogar</option>
                                    <option value="watch" ${reward.icon === "watch" ? "selected" : ""}>Assistir</option>
                                    <option value="penalty" ${reward.icon === "penalty" ? "selected" : ""}>Penalidade</option>
                                </select>
                            </div>
                        </div>
                        <div class="reward-edit-actions">
                            <button type="button" class="btn btn-ghost btn-xs btn-cancel-reward-edit">Cancelar</button>
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
                        App.state.purchaseHistory.unshift({
                            id: String(Date.now()),
                            name: reward.name,
                            price: reward.price,
                            type: "reward",
                            date: `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                        });
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

    // --- PENALIDADES (MESMO COMPORTAMENTO DA LISTA PRINCIPAL) ---
    function movePenalty(fromId, toId, insertAfter = false) {
        if (!fromId || !toId || fromId === toId) return;
        const list = App.state.penalties;
        const fromIdx = list.findIndex((p) => p.id === fromId);
        const toIdx = list.findIndex((p) => p.id === toId);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = list.splice(fromIdx, 1);
        const newTargetIdx = list.findIndex((p) => p.id === toId);
        list.splice(insertAfter ? newTargetIdx + 1 : newTargetIdx, 0, moved);
        App.store.save();
        renderPenaltiesList();
    }

    function movePenaltyByStep(id, delta) {
        const list = App.state.penalties;
        const idx = list.findIndex((p) => p.id === id);
        const target = idx + delta;
        if (idx === -1 || target < 0 || target >= list.length) return;
        const tmp = list[idx];
        list[idx] = list[target];
        list[target] = tmp;
        App.store.save();
        renderPenaltiesList();
    }

    function renderPenaltiesList() {
        const tbody = document.getElementById("penalty-table-body");
        if (!tbody) return;
        tbody.innerHTML = "";

        const penalties = App.state.penalties || [];
        if (penalties.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-table-cell">
                        Nenhuma penalidade cadastrada. Clique em "Nova penalidade" para adicionar compromissos.
                    </td>
                </tr>
            `;
            return;
        }

        penalties.forEach((penalty, index) => {
            const row = document.createElement("tr");
            row.dataset.id = penalty.id;
            const isEditing = penalty.id === editingPenaltyId;

            if (isEditing) {
                row.classList.add("is-editing");
                row.innerHTML = `
                    <td class="col-drag"></td>
                    <td class="col-task">
                        <input type="text" class="task-input-edit penalty-name-edit" value="${App.ui.escapeHtml(penalty.name)}" data-id="${penalty.id}" aria-label="Nome da penalidade">
                    </td>
                    <td class="col-points">
                        <div class="edit-points-wrapper">
                            <span>-</span>
                            <input type="number" class="points-input-edit penalty-cost-edit" value="${penalty.cost || 10}" data-id="${penalty.id}" min="1" max="5000" aria-label="Custo em ouro">
                        </div>
                    </td>
                    <td class="col-penalty-action"></td>
                    <td class="col-actions">
                        <div class="actions-cell-wrapper">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-success btn-save-penalty" data-id="${penalty.id}" title="Salvar">
                                <i data-lucide="check"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger btn-cancel-penalty" data-id="${penalty.id}" title="Cancelar">
                                <i data-lucide="x"></i>
                            </button>
                        </div>
                    </td>
                `;
            } else {
                row.draggable = true;
                row.innerHTML = `
                    <td class="col-drag" title="Arraste para reordenar">
                        <span class="drag-handle-cell">
                            <i data-lucide="grip-vertical"></i>
                        </span>
                    </td>
                    <td class="col-task">
                        <span class="task-name-text penalty-name-text" title="Clique duplo para editar">
                            ${App.ui.escapeHtml(penalty.name)}
                        </span>
                    </td>
                    <td class="col-points">
                        <span class="penalty-cost-tag">-${Number(penalty.cost || 0)}</span>
                    </td>
                    <td class="col-penalty-action">
                        <button type="button" class="btn btn-xs btn-penalty-apply" data-id="${penalty.id}" title="Abater ${Number(penalty.cost || 0)} moedas de ouro">
                            <i data-lucide="minus-circle"></i> Descumpri
                        </button>
                    </td>
                    <td class="col-actions">
                        <div class="actions-cell-wrapper">
                            <button type="button" class="btn btn-icon btn-icon-sm btn-penalty-up" data-id="${penalty.id}" title="Mover para cima" ${index === 0 ? "disabled" : ""}>
                                <i data-lucide="arrow-up"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-penalty-down" data-id="${penalty.id}" title="Mover para baixo" ${index === penalties.length - 1 ? "disabled" : ""}>
                                <i data-lucide="arrow-down"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-info btn-edit-penalty" data-id="${penalty.id}" title="Editar">
                                <i data-lucide="pencil"></i>
                            </button>
                            <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger btn-delete-penalty" data-id="${penalty.id}" title="Excluir">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                `;
            }

            tbody.appendChild(row);
        });

        App.ui.refreshIcons();
        attachPenaltyListeners();
    }

    function attachPenaltyListeners() {
        const tbody = document.getElementById("penalty-table-body");
        if (!tbody) return;
        const list = App.state.penalties || [];

        // Drag & Drop
        tbody.querySelectorAll("tr[draggable='true']").forEach((row) => {
            row.addEventListener("dragstart", (e) => {
                draggedPenaltyId = row.dataset.id;
                row.classList.add("dragging");
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", draggedPenaltyId);
            });

            row.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (!draggedPenaltyId || row.dataset.id === draggedPenaltyId) return;
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
                if (draggedPenaltyId && targetId && draggedPenaltyId !== targetId) {
                    movePenalty(draggedPenaltyId, targetId, insertAfter);
                }
            });

            row.addEventListener("dragend", () => {
                draggedPenaltyId = null;
                tbody.querySelectorAll("tr").forEach((r) => {
                    r.classList.remove("dragging", "drag-over-top", "drag-over-bottom");
                });
            });
        });

        // Aplicar penalidade (abater ouro)
        tbody.querySelectorAll(".btn-penalty-apply").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const item = list.find((p) => p.id === btn.dataset.id);
                if (!item) return;

                const cost = Number(item.cost || 0);
                const newBalance = Number(App.state.gold || 0) - cost;

                const ok = await App.ui.confirm({
                    title: "Registrar Penalidade",
                    message: `Confirmar descumprimento de "${item.name}"?\n\nSerão abatidas -${cost} moedas de ouro.\nNovo saldo: ${newBalance} moedas.`,
                    confirmText: `Abater -${cost} ouro`,
                    variant: "danger",
                    icon: "trending-down"
                });

                if (!ok) return;

                App.state.gold = newBalance;
                const now = new Date();
                App.state.purchaseHistory.unshift({
                    id: String(Date.now()),
                    name: item.name,
                    price: cost,
                    type: "penalty",
                    date: `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                });
                App.store.save();
                render();

                App.ui.toast(`-${cost} moedas abatidas (${item.name}). Saldo atual: ${newBalance} ouro.`, {
                    title: "Penalidade registrada",
                    type: "warning",
                    duration: 4500
                });
            });
        });

        // Mover cima/baixo
        tbody.querySelectorAll(".btn-penalty-up").forEach((btn) => {
            btn.addEventListener("click", () => movePenaltyByStep(btn.dataset.id, -1));
        });
        tbody.querySelectorAll(".btn-penalty-down").forEach((btn) => {
            btn.addEventListener("click", () => movePenaltyByStep(btn.dataset.id, 1));
        });

        // Editar
        tbody.querySelectorAll(".btn-edit-penalty").forEach((btn) => {
            btn.addEventListener("click", () => {
                editingPenaltyId = btn.dataset.id;
                renderPenaltiesList();
                const input = tbody.querySelector(`.penalty-name-edit[data-id="${btn.dataset.id}"]`);
                if (input) {
                    input.focus();
                    input.select();
                }
            });
        });

        tbody.querySelectorAll(".penalty-name-text").forEach((span) => {
            span.addEventListener("dblclick", () => {
                const row = span.closest("tr");
                const editBtn = row ? row.querySelector(".btn-edit-penalty") : null;
                if (editBtn) editBtn.click();
            });
        });

        const savePenalty = (id) => {
            const nameInput = tbody.querySelector(`.penalty-name-edit[data-id="${id}"]`);
            const costInput = tbody.querySelector(`.penalty-cost-edit[data-id="${id}"]`);
            const newName = nameInput ? nameInput.value.trim() : "";
            const newCost = costInput ? parseInt(costInput.value, 10) : NaN;

            if (!newName || isNaN(newCost) || newCost <= 0) {
                App.ui.toast("Informe um nome válido e custo maior que 0.", { type: "warning" });
                return;
            }

            const item = list.find((p) => p.id === id);
            if (!item) return;

            item.name = newName;
            item.cost = newCost;
            editingPenaltyId = null;
            App.store.save();
            renderPenaltiesList();
            App.ui.toast("Penalidade atualizada!", { type: "success", duration: 2200 });
        };

        tbody.querySelectorAll(".btn-save-penalty").forEach((btn) => {
            btn.addEventListener("click", () => savePenalty(btn.dataset.id));
        });

        tbody.querySelectorAll(".penalty-name-edit, .penalty-cost-edit").forEach((input) => {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    savePenalty(input.dataset.id);
                } else if (e.key === "Escape") {
                    editingPenaltyId = null;
                    renderPenaltiesList();
                }
            });
        });

        tbody.querySelectorAll(".btn-cancel-penalty").forEach((btn) => {
            btn.addEventListener("click", () => {
                editingPenaltyId = null;
                renderPenaltiesList();
            });
        });

        // Excluir
        tbody.querySelectorAll(".btn-delete-penalty").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const idx = list.findIndex((p) => p.id === btn.dataset.id);
                if (idx === -1) return;
                const item = list[idx];

                const ok = await App.ui.confirm({
                    title: "Excluir Penalidade",
                    message: `Deseja remover "${item.name}" da lista de penalidades?`,
                    confirmText: "Excluir",
                    variant: "danger",
                    icon: "trash-2"
                });
                if (!ok) return;

                list.splice(idx, 1);
                App.store.save();
                renderPenaltiesList();
                App.ui.toast("Penalidade excluída.", { type: "info", duration: 2200 });
            });
        });
    }

    function renderPurchaseHistory() {
        const listEl = document.getElementById("shop-history-list");
        if (!listEl) return;

        if (!App.state.purchaseHistory || App.state.purchaseHistory.length === 0) {
            listEl.innerHTML = `<div class="empty-box-message">Nenhuma movimentação ainda. Foco nas tarefas para acumular ouro!</div>`;
            return;
        }

        listEl.innerHTML = App.state.purchaseHistory
            .map((item) => `
                <div class="reward-history-item">
                    <div class="reward-history-meta">
                        <span class="reward-history-name">
                            ${App.ui.escapeHtml(item.name)}
                            ${item.type === "penalty" ? `<span class="history-penalty-tag">Penalidade</span>` : ""}
                        </span>
                        <span class="reward-history-date">${App.ui.escapeHtml(item.date)}</span>
                    </div>
                    <span class="reward-history-cost">-${item.price} Ouro</span>
                </div>
            `)
            .join("");
    }

    function switchShopView(view) {
        activeShopView = view === "penalties" ? "penalties" : "rewards";
        const rewardsEl = document.getElementById("shop-view-rewards");
        const penaltiesEl = document.getElementById("shop-view-penalties");

        document.querySelectorAll(".shop-mode-tab").forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.shopView === activeShopView);
        });

        if (rewardsEl) rewardsEl.classList.toggle("hidden", activeShopView !== "rewards");
        if (penaltiesEl) penaltiesEl.classList.toggle("hidden", activeShopView !== "penalties");

        if (activeShopView === "penalties") {
            renderPenaltiesList();
        } else {
            renderRewardsList();
            renderPurchaseHistory();
        }
    }

    function render() {
        updateGoldBalanceUI();
        renderRewardsList();
        renderPenaltiesList();
        renderPurchaseHistory();
    }

    function init() {
        // Sub-abas da loja (Recompensas vs Penalidades)
        document.querySelectorAll(".shop-mode-tab").forEach((btn) => {
            btn.addEventListener("click", () => {
                editingPenaltyId = null;
                App.editingRewardId = null;
                switchShopView(btn.dataset.shopView);
            });
        });

        // Adicionar nova penalidade (abre direto em edição inline, igual à aba principal)
        const btnAddPenalty = document.getElementById("btn-add-penalty");
        if (btnAddPenalty) {
            btnAddPenalty.addEventListener("click", () => {
                const list = App.state.penalties;
                const newItem = {
                    id: `p_${Date.now()}`,
                    name: `Nova penalidade ${list.length + 1}`,
                    cost: 20
                };
                list.push(newItem);
                editingPenaltyId = newItem.id;
                App.store.save();
                renderPenaltiesList();

                const input = document.querySelector(`.penalty-name-edit[data-id="${newItem.id}"]`);
                if (input) {
                    input.focus();
                    input.select();
                }
            });
        }

        // Criar nova recompensa
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
