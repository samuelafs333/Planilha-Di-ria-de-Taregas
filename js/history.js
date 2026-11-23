// MÓDULO DE HISTÓRICO DE EVOLUÇÃO E GRÁFICO SVG INTERATIVO

window.App = window.App || {};

(function (App) {
    let activeChartType = "weekly"; // 'weekly' | 'monthly'

    function shortLabel(label, type) {
        if (!label) return "-";
        if (type === "weekly") {
            // "Semana de 12/07 a 18/07" -> "12/07"
            const match = label.match(/(\d{2}\/\d{2})/);
            return match ? match[1] : label.slice(0, 8);
        }
        // "Julho/2026" -> "Jul/26"
        const parts = label.split("/");
        if (parts.length === 2) {
            return `${parts[0].slice(0, 3)}/${parts[1].slice(-2)}`;
        }
        return label.slice(0, 8);
    }

    function renderChart() {
        const container = document.getElementById("evolution-chart-container");
        if (!container) return;

        const isWeekly = activeChartType === "weekly";
        const pastRecords = App.state.history
            .filter((r) => r.type === activeChartType)
            .slice(-7);

        const currentPeriodScore = isWeekly ? App.state.weeklyScore : App.state.monthlyScore;
        const pointsData = pastRecords.map((r) => ({
            label: shortLabel(r.label, activeChartType),
            fullLabel: r.label,
            score: Number(r.score || 0),
            isCurrent: false
        }));

        // Inclui o período atual no final do gráfico para acompanhar a evolução ao vivo
        pointsData.push({
            label: isWeekly ? "Atual" : "Este Mês",
            fullLabel: isWeekly ? "Semana Atual (em andamento)" : "Mês Atual (em andamento)",
            score: Number(currentPeriodScore || 0),
            isCurrent: true
        });

        const hasAnyScore = pointsData.some((d) => d.score > 0);
        if (!hasAnyScore && pastRecords.length === 0) {
            container.innerHTML = `
                <div class="chart-empty-state">
                    Complete tarefas e acumule pontos para visualizar sua curva de evolução ${isWeekly ? "semanal" : "mensal"} aqui.
                </div>
            `;
            return;
        }

        const width = 760;
        const height = 210;
        const padLeft = 44;
        const padRight = 24;
        const padTop = 28;
        const padBottom = 34;
        const chartW = width - padLeft - padRight;
        const chartH = height - padTop - padBottom;

        const maxScore = Math.max(100, ...pointsData.map((d) => d.score));
        const niceMax = Math.ceil(maxScore / 50) * 50;

        const slotW = chartW / pointsData.length;
        const barW = Math.min(54, Math.max(20, slotW * 0.48));

        const isLight = document.body.classList.contains("light-theme");
        const baseBarColor = isLight ? "#d4d1c7" : "#3f3f46";
        const currentBarColor = isLight ? "#18181b" : "#f4f4f5";
        const lineColor = isLight ? "#71717a" : "#a1a1aa";

        // Linhas horizontais de grade
        const gridSteps = 4;
        let gridSvg = "";
        for (let i = 0; i <= gridSteps; i++) {
            const val = Math.round((niceMax / gridSteps) * i);
            const y = padTop + chartH - (i / gridSteps) * chartH;
            gridSvg += `
                <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="chart-grid-line" />
                <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" class="chart-axis-text">${val}</text>
            `;
        }

        // Barras + linha discreta
        const linePoints = [];
        let barsSvg = "";

        pointsData.forEach((d, idx) => {
            const cx = padLeft + slotW * idx + slotW / 2;
            const barH = Math.max(4, (d.score / niceMax) * chartH);
            const x = cx - barW / 2;
            const y = padTop + chartH - barH;
            linePoints.push(`${cx},${y}`);

            const fillColor = d.isCurrent ? currentBarColor : baseBarColor;
            barsSvg += `
                <g>
                    <title>${App.ui.escapeHtml(d.fullLabel)}: ${d.score} pts</title>
                    <rect
                        x="${x}"
                        y="${y}"
                        width="${barW}"
                        height="${barH}"
                        rx="4"
                        fill="${fillColor}"
                        class="chart-bar-rect"
                    />
                    <text x="${cx}" y="${y - 7}" text-anchor="middle" class="chart-value-text">${d.score}</text>
                    <text x="${cx}" y="${height - 10}" text-anchor="middle" class="chart-axis-text">${App.ui.escapeHtml(d.label)}</text>
                </g>
            `;
        });

        const trendLineSvg = pointsData.length > 1
            ? `<polyline fill="none" stroke="${lineColor}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" points="${linePoints.join(" ")}" />`
            : "";

        container.innerHTML = `
            <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Gráfico de evolução ${isWeekly ? "semanal" : "mensal"}">
                ${gridSvg}
                ${trendLineSvg}
                ${barsSvg}
            </svg>
        `;
    }

    function renderTables() {
        const weeklyBody = document.getElementById("weekly-history-body");
        const monthlyBody = document.getElementById("monthly-history-body");
        if (!weeklyBody || !monthlyBody) return;

        const weeklyRecords = App.state.history.filter((r) => r.type === "weekly").slice().reverse();
        const monthlyRecords = App.state.history.filter((r) => r.type === "monthly").slice().reverse();

        if (weeklyRecords.length === 0) {
            weeklyBody.innerHTML = `<tr><td colspan="2" class="empty-table-cell">Nenhum histórico semanal registrado ainda.</td></tr>`;
        } else {
            weeklyBody.innerHTML = weeklyRecords
                .map((r) => `
                    <tr>
                        <td>${App.ui.escapeHtml(r.label)}</td>
                        <td class="history-score-cell primary">+${Number(r.score || 0)} Pts</td>
                    </tr>
                `)
                .join("");
        }

        if (monthlyRecords.length === 0) {
            monthlyBody.innerHTML = `<tr><td colspan="2" class="empty-table-cell">Nenhum histórico mensal registrado ainda.</td></tr>`;
        } else {
            monthlyBody.innerHTML = monthlyRecords
                .map((r) => `
                    <tr>
                        <td>${App.ui.escapeHtml(r.label)}</td>
                        <td class="history-score-cell success">+${Number(r.score || 0)} Pts</td>
                    </tr>
                `)
                .join("");
        }
    }

    function render() {
        renderChart();
        renderTables();
    }

    function init() {
        document.querySelectorAll(".chart-toggle-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".chart-toggle-btn").forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                activeChartType = btn.dataset.chart || "weekly";
                renderChart();
            });
        });
        render();
    }

    App.history = {
        init,
        render,
        renderChart,
        renderTables
    };
})(window.App);
