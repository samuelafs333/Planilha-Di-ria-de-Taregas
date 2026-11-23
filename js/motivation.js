// MÓDULO MOTIVOS PARA MANTER O FOGO

window.App = window.App || {};

(function (App) {
    function render() {
        const listEl = document.getElementById("motivation-list");
        if (!listEl) return;
        listEl.innerHTML = "";

        if (!App.state.motivationList || App.state.motivationList.length === 0) {
            listEl.innerHTML = `<li class="empty-box-message">Sua lista de motivações está vazia. Adicione o seu primeiro motivo acima!</li>`;
            return;
        }

        App.state.motivationList.forEach((motive) => {
            const li = document.createElement("li");
            li.className = "motivation-item";
            li.innerHTML = `
                <div class="motivation-item-content">
                    <div class="motivation-bullet">
                        <i data-lucide="flame"></i>
                    </div>
                    <span class="motivation-item-text">${App.ui.escapeHtml(motive.text)}</span>
                </div>
                <button type="button" class="btn btn-icon btn-icon-sm btn-icon-danger btn-delete-motive" title="Excluir Motivo">
                    <i data-lucide="trash-2"></i>
                </button>
            `;

            li.querySelector(".btn-delete-motive").addEventListener("click", () => {
                App.state.motivationList = App.state.motivationList.filter((m) => m.id !== motive.id);
                App.store.save();
                render();
                App.ui.toast("Motivo removido.", { type: "info", duration: 2200 });
            });

            listEl.appendChild(li);
        });

        App.ui.refreshIcons();
    }

    function init() {
        const input = document.getElementById("motivation-item-input");
        const btnAdd = document.getElementById("btn-add-motivation");

        if (input && btnAdd) {
            const addMotive = () => {
                const text = input.value.trim();
                if (!text) {
                    App.ui.toast("Digite um motivo antes de adicionar.", { type: "warning" });
                    return;
                }
                App.state.motivationList.push({
                    id: String(Date.now()),
                    text
                });
                App.store.save();
                input.value = "";
                render();
                App.ui.toast("Novo motivo adicionado!", { type: "success", duration: 2400 });
            };

            btnAdd.addEventListener("click", addMotive);
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") addMotive();
            });
        }

        render();
    }

    App.motivation = {
        init,
        render
    };
})(window.App);
