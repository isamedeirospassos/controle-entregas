// ======================================================
// CONEXÃO COM SUPABASE
// ======================================================

const SUPABASE_URL = "https://qkrfmtykejpqtwtgrwbk.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcmZtdHlrZWpwcXR3dGdyd2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTI3MTgsImV4cCI6MjEwNDEyODcxOH0.F6ICzGGd4luhsGOcaMkXd_6nQGQSYzd4nRIhrQpTG0w";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ======================================================
// VARIÁVEIS GLOBAIS
// ======================================================

let baseDeDados = [];

// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Definir data padrão como a data atual
    const inputData = document.getElementById("prancheta-data");
    if (inputData && !inputData.value) {
        const hoje = new Date().toISOString().split("T")[0];
        inputData.value = hoje;
    }

    configurarCalculoPacotes();
    configurarCalculoKm();
    configurarServicoExtra();
    configurarFormularioUnificado();

    await carregarRegistros();
});

// ======================================================
// CÁLCULO AUTOMÁTICO DE PACOTES E DEVOLUÇÕES
// ======================================================
// Cada pacote entregue vale R$ 4,00.
// Pacotes entregues = Pacotes iniciais - Devoluções.
// Valor principal = Pacotes entregues * R$ 4,00.
// Não permitir que devoluções ultrapassem os pacotes iniciais.

function configurarCalculoPacotes() {
    const inputPacotes = document.getElementById("rota-pacotes");
    const inputDevolucoes = document.getElementById("rota-devolucoes");
    const inputEntregues = document.getElementById("rota-pacotes-entregues");
    const inputValor = document.getElementById("rota-valor");

    if (!inputPacotes || !inputDevolucoes) return;

    function recalcular() {
        let pacotes = Math.max(0, parseInt(inputPacotes.value, 10) || 0);
        let devolucoes = Math.max(0, parseInt(inputDevolucoes.value, 10) || 0);

        if (pacotes > 0 && devolucoes > pacotes) {
            devolucoes = pacotes;
            inputDevolucoes.value = pacotes;
            showToast("Aviso", "As devoluções não podem ultrapassar a quantidade inicial de pacotes.", "warning");
        }

        const entregues = Math.max(0, pacotes - devolucoes);

        if (inputEntregues) {
            inputEntregues.value = (inputPacotes.value !== "" || inputDevolucoes.value !== "") ? entregues : "";
        }

        if (inputValor) {
            if (inputPacotes.value !== "" || inputDevolucoes.value !== "") {
                const valorCalculado = entregues * 4.0;
                inputValor.value = valorCalculado.toFixed(2);
            }
        }
    }

    inputPacotes.addEventListener("input", recalcular);
    inputDevolucoes.addEventListener("input", recalcular);
}

// ======================================================
// CÁLCULO AUTOMÁTICO DE QUILOMETRAGEM
// ======================================================
// Km rodado no dia = Km final - Km inicial

function configurarCalculoKm() {
    const inputInicial = document.getElementById("km-inicial");
    const inputFinal = document.getElementById("km-final");
    const inputRodado = document.getElementById("km-rodado");

    if (!inputInicial || !inputFinal || !inputRodado) return;

    function recalcularKm() {
        const valInicial = inputInicial.value.trim();
        const valFinal = inputFinal.value.trim();

        if (valInicial === "" || valFinal === "") {
            inputRodado.value = "";
            return;
        }

        const inicial = parseFloat(valInicial.replace(',', '.'));
        const final = parseFloat(valFinal.replace(',', '.'));

        if (!isNaN(inicial) && !isNaN(final)) {
            if (final >= inicial) {
                const diferenca = Math.round((final - inicial) * 100) / 100;
                inputRodado.value = diferenca;
            } else {
                inputRodado.value = "";
            }
        }
    }

    inputInicial.addEventListener("input", recalcularKm);
    inputFinal.addEventListener("input", recalcularKm);
}

// ======================================================
// SERVIÇO EXTRA - SIM / NÃO
// ======================================================

function configurarServicoExtra() {
    const select = document.getElementById("manut-tem-extra");
    const campos = document.getElementById("manut-extra-campos");
    const descricao = document.getElementById("manut-extra-desc");
    const valor = document.getElementById("manut-extra-valor");

    if (!select || !campos) return;

    function atualizarCamposExtra() {
        if (select.value === "sim") {
            campos.style.display = "block";
        } else {
            campos.style.display = "none";
            if (descricao) descricao.value = "";
            if (valor) valor.value = "";
        }
    }

    select.addEventListener("change", atualizarCamposExtra);
    atualizarCamposExtra();
}

// ======================================================
// NOTIFICAÇÕES (TOAST)
// ======================================================

function showToast(title, message, type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "ph-check-circle";
    if (type === "warning") icon = "ph-warning-circle";

    toast.innerHTML = `
        <i class="ph ${icon}"></i>
        <div>
            <strong>${title}</strong>
            <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                ${message}
            </p>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 300);
    }, 3500);
}

// ======================================================
// CARREGAR REGISTROS DO SUPABASE
// ======================================================

async function carregarRegistros() {
    if (isGuest()) {
        // MODO TESTE: dados 100% isolados, NÃO carrega nada do Supabase do Admin!
        const raw = DemoStore.getPrancheta();
        baseDeDados = raw.map(converterRegistro);
        atualizarTabela();
        atualizarResumoFinanceiro();
        return;
    }

    const { data, error } = await supabaseClient
        .from("prancheta_registros")
        .select("*")
        .order("data", { ascending: false })
        .order("id", { ascending: false });

    if (error) {
        console.error("Erro ao buscar registros:", error);
        showToast("Erro", "Não foi possível carregar os registros: " + error.message, "warning");
        return;
    }

    baseDeDados = (data || []).map(converterRegistro);

    atualizarTabela();
    atualizarResumoFinanceiro();
}

// ======================================================
// CONVERTER REGISTRO DO SUPABASE
// ======================================================

function converterRegistro(item) {
    return {
        id: item.id,
        tipoRegistro: item.tipo_registro,
        data: item.data,

        // ROTA
        rotaNumero: item.rota_numero || "",
        rotaTipo: item.rota_tipo || "",
        valor: Number(item.valor || 0),
        pacotes: Number(item.pacotes || 0),
        devolucoes: Number(item.devolucoes || 0),
        valorKm: Number(item.valor_km || 0),
        valorPedagio: Number(item.valor_pedagio || 0),

        // QUILOMETRAGEM
        kmInicial: item.km_inicial !== null && item.km_inicial !== undefined ? Number(item.km_inicial) : null,
        kmFinal: item.km_final !== null && item.km_final !== undefined ? Number(item.km_final) : null,
        kmRodado: Number(item.km_rodado || 0),

        // ABASTECIMENTO
        tipoCombustivel: item.tipo_combustivel || "",
        valorAbastecido: Number(item.valor_abastecido || 0),

        // MANUTENÇÃO
        manutCategoria: item.manut_categoria || "",
        manutValor: Number(item.manut_valor || 0),
        manutFeito: item.manut_feito || "",
        manutTemExtra: Boolean(item.manut_tem_extra),
        manutExtraDesc: item.manut_extra_desc || "",
        manutExtraValor: Number(item.manut_extra_valor || 0),

        // OUTRAS DESPESAS
        alimentacao: Number(item.alimentacao || 0),
        perfumaria: Number(item.perfumaria || 0),
        outrosGastos: Number(item.outros_gastos || 0),

        // ALTERAÇÃO
        motivo: item.motivo || ""
    };
}

// ======================================================
// SALVAR TUDO (UNIFICADO)
// ======================================================

function configurarFormularioUnificado() {
    const form = document.getElementById("form-prancheta-unificado");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const dataStr = document.getElementById("prancheta-data")?.value;
        if (!dataStr) {
            showToast("Aviso", "Por favor, selecione uma data para o registro.", "warning");
            return;
        }

        // Ler dados da Rota
        const rotaNumero = (document.getElementById("rota-numero")?.value || "").trim();
        const rotaTipo = document.querySelector('input[name="rota-tipo"]:checked')?.value || "Flex";
        const pacotes = parseInt(document.getElementById("rota-pacotes")?.value, 10) || 0;
        let devolucoes = parseInt(document.getElementById("rota-devolucoes")?.value, 10) || 0;

        if (devolucoes > pacotes) {
            devolucoes = pacotes;
            const inputDev = document.getElementById("rota-devolucoes");
            if (inputDev) inputDev.value = devolucoes;
        }

        const entregues = Math.max(0, pacotes - devolucoes);
        let valorPrincipal = parseFloat(document.getElementById("rota-valor")?.value);
        if (isNaN(valorPrincipal) || valorPrincipal <= 0) {
            valorPrincipal = entregues * 4.0;
        }

        const valorKm = parseFloat(document.getElementById("rota-valorkm")?.value) || 0;
        const valorPedagio = parseFloat(document.getElementById("rota-pedagio")?.value) || 0;

        // Ler Quilometragem
        const kmInicial = document.getElementById("km-inicial")?.value ? parseFloat(document.getElementById("km-inicial").value.replace(',', '.')) : null;
        const kmFinal = document.getElementById("km-final")?.value ? parseFloat(document.getElementById("km-final").value.replace(',', '.')) : null;
        let kmRodado = parseFloat(document.getElementById("km-rodado")?.value) || 0;
        if (kmRodado <= 0 && kmInicial !== null && kmFinal !== null && kmFinal >= kmInicial) {
            kmRodado = Math.round((kmFinal - kmInicial) * 100) / 100;
        }

        // Ler Abastecimento
        const tipoCombustivel = document.getElementById("abast-tipo")?.value || "";
        const valorAbastecido = parseFloat(document.getElementById("abast-valor")?.value) || 0;

        // Ler Manutenção
        const manutCategoria = document.getElementById("manut-categoria")?.value || "";
        const manutValor = parseFloat(document.getElementById("manut-valor")?.value) || 0;
        const manutFeito = (document.getElementById("manut-feito")?.value || "").trim();
        const manutTemExtra = document.getElementById("manut-tem-extra")?.value === "sim";
        const manutExtraDesc = manutTemExtra ? (document.getElementById("manut-extra-desc")?.value || "").trim() : "";
        const manutExtraValor = manutTemExtra ? (parseFloat(document.getElementById("manut-extra-valor")?.value) || 0) : 0;

        // Ler Outras Despesas
        const alimentacao = parseFloat(document.getElementById("despesa-alimentacao")?.value) || 0;
        const perfumaria = parseFloat(document.getElementById("despesa-perfumaria")?.value) || 0;
        const outrosGastos = parseFloat(document.getElementById("despesa-outros")?.value) || 0;

        // Montar registro completo para o dia
        const registroCompleto = {
            data: dataStr,
            tipo_registro: "Geral",
            rota_numero: rotaNumero || null,
            rota_tipo: rotaTipo,
            pacotes: pacotes,
            devolucoes: devolucoes,
            valor: valorPrincipal,
            valor_km: valorKm,
            valor_pedagio: valorPedagio,
            km_inicial: kmInicial,
            km_final: kmFinal,
            km_rodado: kmRodado,
            tipo_combustivel: tipoCombustivel || null,
            valor_abastecido: valorAbastecido,
            manut_categoria: manutCategoria || null,
            manut_valor: manutValor,
            manut_feito: manutFeito || null,
            manut_tem_extra: manutTemExtra,
            manut_extra_desc: manutExtraDesc || null,
            manut_extra_valor: manutExtraValor,
            alimentacao: alimentacao,
            perfumaria: perfumaria,
            outros_gastos: outrosGastos
        };

        if (isGuest()) {
            // MODO TESTE: salva localmente sem encostar no banco do administrador
            let lista = DemoStore.getPrancheta();
            const index = lista.findIndex(r => r.data === dataStr);
            const dados = { ...registroCompleto, id: index !== -1 ? lista[index].id : Date.now() };
            if (index !== -1) {
                lista[index] = dados;
            } else {
                lista.unshift(dados);
            }
            DemoStore.savePrancheta(lista);
            showToast("Teste Salvo", "Registro do dia salvo no ambiente de teste!");
            limparFormularioParcial();
            await carregarRegistros();
            return;
        }

        // Verificar se já existe algum registro nesta data (Administrador)
        const { data: registrosExistentes, error: erroBusca } = await supabaseClient
            .from("prancheta_registros")
            .select("id, tipo_registro")
            .eq("data", dataStr);

        if (erroBusca) {
            console.error("Erro ao verificar data existente:", erroBusca);
        }

        let salvarResultado = null;
        let avisoSQLNecessario = false;

        async function persistir(objeto, idExistente = null) {
            if (idExistente) {
                // Atualizar registro existente sem criar duplicatas
                return await supabaseClient
                    .from("prancheta_registros")
                    .update(objeto)
                    .eq("id", idExistente)
                    .select();
            } else {
                // Inserir novo registro unificado
                return await supabaseClient
                    .from("prancheta_registros")
                    .insert(objeto)
                    .select();
            }
        }

        const idAlvo = (registrosExistentes && registrosExistentes.length > 0) ? registrosExistentes[0].id : null;

        // Tentar salvar com todas as colunas
        salvarResultado = await persistir(registroCompleto, idAlvo);

        // Se houver erro de coluna inexistente (ex: alimentacao, perfumaria, outros_gastos, km_inicial ainda não criadas via SQL)
        if (salvarResultado.error && (salvarResultado.error.code === "42703" || salvarResultado.error.message?.includes("does not exist"))) {
            console.warn("Colunas opcionais não encontradas no Supabase. Tentando salvar sem elas...", salvarResultado.error);
            const dadosSeguros = { ...registroCompleto };
            delete dadosSeguros.alimentacao;
            delete dadosSeguros.perfumaria;
            delete dadosSeguros.outros_gastos;
            delete dadosSeguros.km_inicial;
            delete dadosSeguros.km_final;

            salvarResultado = await persistir(dadosSeguros, idAlvo);
            avisoSQLNecessario = true;
        }

        if (salvarResultado.error) {
            console.error("Erro ao salvar:", salvarResultado.error);
            showToast("Erro ao Salvar", "Não foi possível salvar os dados: " + salvarResultado.error.message, "warning");
            return;
        }

        // Sucesso!
        if (avisoSQLNecessario) {
            showToast(
                "Salvo com Aviso",
                "Dados salvos! Para salvar Alimentação, Perfumaria e Outros, execute o script SQL 'supabase_updates.sql' no Supabase.",
                "warning"
            );
        } else {
            showToast(
                "Salvo com Sucesso",
                idAlvo ? "Registro do dia atualizado no Supabase." : "Novo registro do dia cadastrado no Supabase."
            );
        }

        // Limpar campos exceto a data
        limparFormularioParcial();

        await carregarRegistros();
    });
}

function limparFormularioParcial() {
    const ids = [
        "rota-numero", "rota-pacotes", "rota-devolucoes", "rota-pacotes-entregues",
        "rota-valor", "rota-valorkm", "rota-pedagio",
        "km-inicial", "km-final", "km-rodado",
        "abast-valor", "manut-valor", "manut-feito", "manut-extra-desc", "manut-extra-valor",
        "despesa-alimentacao", "despesa-perfumaria", "despesa-outros"
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    const abastTipo = document.getElementById("abast-tipo");
    if (abastTipo) abastTipo.value = "";

    const manutCat = document.getElementById("manut-categoria");
    if (manutCat) manutCat.value = "";

    const manutExtra = document.getElementById("manut-tem-extra");
    if (manutExtra) {
        manutExtra.value = "nao";
        const extraCampos = document.getElementById("manut-extra-campos");
        if (extraCampos) extraCampos.style.display = "none";
    }

    const flex = document.querySelector('input[name="rota-tipo"][value="Flex"]');
    if (flex) flex.checked = true;
}

// ======================================================
// RESUMO FINANCEIRO
// ======================================================

function atualizarResumoFinanceiro() {
    let recebido = 0;
    let gasto = 0;

    baseDeDados.forEach(item => {
        // Recebido da Rota (valor principal + km pago + pedágio)
        recebido += Number(item.valor || 0) + Number(item.valorKm || 0) + Number(item.valorPedagio || 0);

        // Gastos (abastecimento, manutenção, serviço extra, alimentação, perfumaria, outros)
        gasto += Number(item.valorAbastecido || 0)
            + Number(item.manutValor || 0)
            + Number(item.manutExtraValor || 0)
            + Number(item.alimentacao || 0)
            + Number(item.perfumaria || 0)
            + Number(item.outrosGastos || 0);
    });

    const saldo = recebido - gasto;

    alterarTexto("total-recebido", formatMoeda(recebido));
    alterarTexto("total-gasto", formatMoeda(gasto));
    alterarTexto("total-saldo", formatMoeda(saldo));
}

function alterarTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// ======================================================
// ATUALIZAR TABELA DO HISTÓRICO (UMA LINHA POR DATA)
// ======================================================

function atualizarTabela() {
    const tbody = document.getElementById("historico-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filtroData = document.getElementById("filter-date")?.value || "";

    // Agrupar registros por data
    const diasMap = new Map();

    baseDeDados.forEach(item => {
        if (!item.data) return;

        if (filtroData && item.data < filtroData) {
            return;
        }

        if (!diasMap.has(item.data)) {
            diasMap.set(item.data, {
                data: item.data,
                ids: [item.id],
                valorPrincipal: 0,
                kmPedagio: 0,
                gastos: 0,
                temEdicao: false
            });
        }

        const dia = diasMap.get(item.data);
        if (!dia.ids.includes(item.id)) dia.ids.push(item.id);

        dia.valorPrincipal += Number(item.valor || 0);
        dia.kmPedagio += Number(item.valorKm || 0) + Number(item.valorPedagio || 0);
        dia.gastos += Number(item.valorAbastecido || 0)
            + Number(item.manutValor || 0)
            + Number(item.manutExtraValor || 0)
            + Number(item.alimentacao || 0)
            + Number(item.perfumaria || 0)
            + Number(item.outrosGastos || 0);

        if (item.motivo) dia.temEdicao = true;
    });

    // Ordenar datas em ordem decrescente
    const diasOrdenados = Array.from(diasMap.values()).sort((a, b) => new Date(b.data) - new Date(a.data));

    if (diasOrdenados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">
                    Nenhum registro encontrado no histórico.
                </td>
            </tr>
        `;
        return;
    }

    diasOrdenados.forEach(dia => {
        const tr = document.createElement("tr");

        const totalRecebido = dia.valorPrincipal + dia.kmPedagio;
        const totalGastos = dia.gastos;
        const saldoDia = totalRecebido - totalGastos;
        const urlDetalhes = `detalhes-dia.html?data=${encodeURIComponent(dia.data)}`;

        tr.innerHTML = `
            <td>
                <a href="${urlDetalhes}" style="font-weight:600; color:var(--primary); text-decoration:none;" title="Abrir Detalhes do Dia">
                    ${formatData(dia.data)}
                </a>
            </td>
            <td>
                <a href="${urlDetalhes}" style="font-weight:600; color:var(--text-dark); text-decoration:none;" title="Abrir Detalhes do Dia">
                    ${formatMoeda(dia.valorPrincipal)}
                </a>
                ${dia.temEdicao ? `<span style="font-size:11px; color:var(--warning); margin-left:4px;" title="Registro com edição">✏️</span>` : ''}
            </td>
            <td>
                <span class="text-danger" style="font-weight:600;">
                    ${formatMoeda(totalGastos)}
                </span>
            </td>
            <td>
                <span class="${saldoDia >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:600;">
                    ${formatMoeda(saldoDia)}
                </span>
            </td>
            <td>
                <div style="display:flex; gap:8px;">
                    <a href="${urlDetalhes}" class="btn btn-outline" style="padding:6px 12px; font-size:12px; width:auto; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        👁️ Detalhes
                    </a>
                    <button type="button" class="btn btn-outline" style="padding:6px 12px; font-size:12px; width:auto; color:var(--danger); border-color:var(--danger);" onclick="excluirDia('${dia.data}')">
                        🗑️ Excluir
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// ======================================================
// EXCLUIR DIA DA PRANCHETA
// ======================================================

async function excluirDia(dataStr) {
    if (!dataStr) return;

    const dataFormatada = formatData(dataStr);
    const confirmado = confirm(`Deseja realmente excluir todos os registros do dia ${dataFormatada}?\n\nEsta ação removerá o dia do histórico e atualizará os totais financeiros.`);
    if (!confirmado) return;

    if (isGuest()) {
        let lista = DemoStore.getPrancheta();
        lista = lista.filter(r => r.data !== dataStr);
        DemoStore.savePrancheta(lista);
        showToast("Excluído", `Registros do dia ${dataFormatada} excluídos no ambiente de teste.`);
        await carregarRegistros();
        return;
    }

    const { data: deletados, error } = await supabaseClient
        .from("prancheta_registros")
        .delete()
        .eq("data", dataStr)
        .select();

    if (error) {
        console.error("Erro ao excluir dia:", error);
        showToast("Erro", "Não foi possível excluir o dia: " + error.message, "warning");
        return;
    }

    if (!deletados || deletados.length === 0) {
        showToast("Aviso do Supabase", "O banco bloqueou a exclusão (falta de política de DELETE). Execute o comando SQL no Supabase para liberar.", "warning");
        return;
    }

    showToast("Excluído", `Registros do dia ${dataFormatada} excluídos com sucesso.`);
    await carregarRegistros();
}

function limparFiltroData() {
    const input = document.getElementById("filter-date");
    if (input) {
        input.value = "";
        atualizarTabela();
    }
}

// ======================================================
// FORMATADORES
// ======================================================

function formatMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatData(dataStr) {
    if (!dataStr) return "";
    const partes = dataStr.split("-");
    if (partes.length !== 3) return dataStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}
