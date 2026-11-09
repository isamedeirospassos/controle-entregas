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

let dataOriginal = "";
let registrosOriginais = [];

// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    dataOriginal = urlParams.get("data") || "";

    if (!dataOriginal) {
        showToast("Aviso", "Nenhuma data informada na URL.", "warning");
        const hoje = new Date().toISOString().split("T")[0];
        document.getElementById("detalhe-data").value = hoje;
        dataOriginal = hoje;
    } else {
        document.getElementById("detalhe-data").value = dataOriginal;
        atualizarTituloPagina(dataOriginal);
    }

    configurarCalculoPacotes();
    configurarCalculoKm();
    configurarServicoExtra();
    configurarFormulario();

    await carregarDadosDia(dataOriginal);
});

function atualizarTituloPagina(dataStr) {
    const formatada = formatData(dataStr);
    const title = document.getElementById("page-title");
    const sub = document.getElementById("page-subtitle");
    if (title) title.innerText = `Detalhes do Dia: ${formatada}`;
    if (sub) sub.innerText = `Edição completa dos registros de ${formatada}`;
}

// ======================================================
// CARREGAR DADOS DO DIA SELECIONADO
// ======================================================

async function carregarDadosDia(dataStr) {
    const { data, error } = await supabaseClient
        .from("prancheta_registros")
        .select("*")
        .eq("data", dataStr)
        .order("id", { ascending: true });

    if (error) {
        console.error("Erro ao buscar dados do dia:", error);
        showToast("Erro", "Não foi possível carregar os dados: " + error.message, "warning");
        return;
    }

    registrosOriginais = data || [];

    if (registrosOriginais.length === 0) {
        showToast("Informação", "Nenhum registro encontrado para esta data. Você pode cadastrar agora.", "warning");
        recalcularTotais();
        return;
    }

    // Consolidar dados de múltiplos registros antigos na mesma data
    const consolidado = {
        rota_numero: "",
        rota_tipo: "Flex",
        pacotes: 0,
        devolucoes: 0,
        valor: 0,
        valor_km: 0,
        valor_pedagio: 0,
        km_inicial: null,
        km_final: null,
        km_rodado: 0,
        tipo_combustivel: "",
        valor_abastecido: 0,
        manut_categoria: "",
        manut_valor: 0,
        manut_feito: "",
        manut_tem_extra: false,
        manut_extra_desc: "",
        manut_extra_valor: 0,
        alimentacao: 0,
        perfumaria: 0,
        outros_gastos: 0,
        motivo: ""
    };

    registrosOriginais.forEach(r => {
        if (r.rota_numero) consolidado.rota_numero = r.rota_numero;
        if (r.rota_tipo) consolidado.rota_tipo = r.rota_tipo;
        if (r.pacotes) consolidado.pacotes = Math.max(consolidado.pacotes, Number(r.pacotes));
        if (r.devolucoes) consolidado.devolucoes = Math.max(consolidado.devolucoes, Number(r.devolucoes));
        if (r.valor) consolidado.valor = Math.max(consolidado.valor, Number(r.valor));
        if (r.valor_km) consolidado.valor_km = Math.max(consolidado.valor_km, Number(r.valor_km));
        if (r.valor_pedagio) consolidado.valor_pedagio = Math.max(consolidado.valor_pedagio, Number(r.valor_pedagio));
        if (r.km_inicial !== undefined && r.km_inicial !== null) consolidado.km_inicial = Number(r.km_inicial);
        if (r.km_final !== undefined && r.km_final !== null) consolidado.km_final = Number(r.km_final);
        if (r.km_rodado) consolidado.km_rodado = Math.max(consolidado.km_rodado, Number(r.km_rodado));
        if (r.tipo_combustivel) consolidado.tipo_combustivel = r.tipo_combustivel;
        if (r.valor_abastecido) consolidado.valor_abastecido = Math.max(consolidado.valor_abastecido, Number(r.valor_abastecido));
        if (r.manut_categoria) consolidado.manut_categoria = r.manut_categoria;
        if (r.manut_valor) consolidado.manut_valor = Math.max(consolidado.manut_valor, Number(r.manut_valor));
        if (r.manut_feito) consolidado.manut_feito = r.manut_feito;
        if (r.manut_tem_extra) consolidado.manut_tem_extra = true;
        if (r.manut_extra_desc) consolidado.manut_extra_desc = r.manut_extra_desc;
        if (r.manut_extra_valor) consolidado.manut_extra_valor = Math.max(consolidado.manut_extra_valor, Number(r.manut_extra_valor));
        if (r.alimentacao) consolidado.alimentacao = Math.max(consolidado.alimentacao, Number(r.alimentacao));
        if (r.perfumaria) consolidado.perfumaria = Math.max(consolidado.perfumaria, Number(r.perfumaria));
        if (r.outros_gastos) consolidado.outros_gastos = Math.max(consolidado.outros_gastos, Number(r.outros_gastos));
        if (r.motivo) consolidado.motivo = r.motivo;
    });

    // Preencher campos no formulário
    document.getElementById("detalhe-data").value = dataStr;
    document.getElementById("detalhe-rota-numero").value = consolidado.rota_numero || "";
    
    const radioTipo = document.querySelector(`input[name="detalhe-rota-tipo"][value="${consolidado.rota_tipo}"]`);
    if (radioTipo) radioTipo.checked = true;

    document.getElementById("detalhe-rota-pacotes").value = consolidado.pacotes > 0 ? consolidado.pacotes : "";
    document.getElementById("detalhe-rota-devolucoes").value = consolidado.devolucoes > 0 ? consolidado.devolucoes : "";

    // Cálculo de pacotes entregues e valor principal
    const pacotes = consolidado.pacotes;
    const devolucoes = consolidado.devolucoes;
    const entregues = Math.max(0, pacotes - devolucoes);
    document.getElementById("detalhe-rota-entregues").value = pacotes > 0 ? entregues : "";

    // Se houver valor cadastrado ou cálculo
    let valorPrincipal = consolidado.valor;
    if (valorPrincipal <= 0 && pacotes > 0) {
        valorPrincipal = entregues * 4.0;
    }
    document.getElementById("detalhe-rota-valor").value = valorPrincipal > 0 ? valorPrincipal.toFixed(2) : "";

    document.getElementById("detalhe-rota-valorkm").value = consolidado.valor_km > 0 ? consolidado.valor_km.toFixed(2) : "";
    document.getElementById("detalhe-rota-pedagio").value = consolidado.valor_pedagio > 0 ? consolidado.valor_pedagio.toFixed(2) : "";

    document.getElementById("detalhe-km-inicial").value = consolidado.km_inicial !== null ? consolidado.km_inicial : "";
    document.getElementById("detalhe-km-final").value = consolidado.km_final !== null ? consolidado.km_final : "";
    document.getElementById("detalhe-km-rodado").value = consolidado.km_rodado > 0 ? consolidado.km_rodado : "";
    document.getElementById("detalhe-abast-tipo").value = consolidado.tipo_combustivel || "";
    document.getElementById("detalhe-abast-valor").value = consolidado.valor_abastecido > 0 ? consolidado.valor_abastecido.toFixed(2) : "";

    document.getElementById("detalhe-manut-categoria").value = consolidado.manut_categoria || "";
    document.getElementById("detalhe-manut-valor").value = consolidado.manut_valor > 0 ? consolidado.manut_valor.toFixed(2) : "";
    document.getElementById("detalhe-manut-feito").value = consolidado.manut_feito || "";
    
    document.getElementById("detalhe-manut-tem-extra").value = consolidado.manut_tem_extra ? "sim" : "nao";
    const camposExtra = document.getElementById("detalhe-manut-extra-campos");
    if (camposExtra) {
        camposExtra.style.display = consolidado.manut_tem_extra ? "block" : "none";
    }
    document.getElementById("detalhe-manut-extra-desc").value = consolidado.manut_extra_desc || "";
    document.getElementById("detalhe-manut-extra-valor").value = consolidado.manut_extra_valor > 0 ? consolidado.manut_extra_valor.toFixed(2) : "";

    document.getElementById("detalhe-alimentacao").value = consolidado.alimentacao > 0 ? consolidado.alimentacao.toFixed(2) : "";
    document.getElementById("detalhe-perfumaria").value = consolidado.perfumaria > 0 ? consolidado.perfumaria.toFixed(2) : "";
    document.getElementById("detalhe-outros").value = consolidado.outros_gastos > 0 ? consolidado.outros_gastos.toFixed(2) : "";

    document.getElementById("detalhe-motivo").value = consolidado.motivo || "";

    recalcularTotais();
}

// ======================================================
// CÁLCULO AUTOMÁTICO DE PACOTES E DEVOLUÇÕES
// ======================================================

function configurarCalculoPacotes() {
    const inputPacotes = document.getElementById("detalhe-rota-pacotes");
    const inputDevolucoes = document.getElementById("detalhe-rota-devolucoes");
    const inputEntregues = document.getElementById("detalhe-rota-entregues");
    const inputValor = document.getElementById("detalhe-rota-valor");

    function recalcular() {
        let pacotes = Math.max(0, parseInt(inputPacotes.value, 10) || 0);
        let devolucoes = Math.max(0, parseInt(inputDevolucoes.value, 10) || 0);

        if (pacotes > 0 && devolucoes > pacotes) {
            devolucoes = pacotes;
            inputDevolucoes.value = pacotes;
            showToast("Aviso", "As devoluções não podem ultrapassar os pacotes iniciais.", "warning");
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

        recalcularTotais();
    }

    inputPacotes.addEventListener("input", recalcular);
    inputDevolucoes.addEventListener("input", recalcular);

    // Escutar alterações nos demais valores para atualizar o resumo financeiro em tempo real
    [
        "detalhe-rota-valor", "detalhe-rota-valorkm", "detalhe-rota-pedagio",
        "detalhe-abast-valor", "detalhe-manut-valor", "detalhe-manut-extra-valor",
        "detalhe-alimentacao", "detalhe-perfumaria", "detalhe-outros"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", recalcularTotais);
    });
}

// ======================================================
// CÁLCULO AUTOMÁTICO DE QUILOMETRAGEM
// ======================================================
// Km rodado no dia = Km final - Km inicial

function configurarCalculoKm() {
    const inputInicial = document.getElementById("detalhe-km-inicial");
    const inputFinal = document.getElementById("detalhe-km-final");
    const inputRodado = document.getElementById("detalhe-km-rodado");

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
// RECALCULAR TOTAIS DO DIA (RESUMO NO TOPO)
// ======================================================

function recalcularTotais() {
    const valorPrincipal = parseFloat(document.getElementById("detalhe-rota-valor")?.value) || 0;
    const valorKm = parseFloat(document.getElementById("detalhe-rota-valorkm")?.value) || 0;
    const valorPedagio = parseFloat(document.getElementById("detalhe-rota-pedagio")?.value) || 0;

    const totalRecebido = valorPrincipal + valorKm + valorPedagio;

    const valorAbast = parseFloat(document.getElementById("detalhe-abast-valor")?.value) || 0;
    const valorManut = parseFloat(document.getElementById("detalhe-manut-valor")?.value) || 0;
    const temExtra = document.getElementById("detalhe-manut-tem-extra")?.value === "sim";
    const valorExtra = temExtra ? (parseFloat(document.getElementById("detalhe-manut-extra-valor")?.value) || 0) : 0;
    const alimentacao = parseFloat(document.getElementById("detalhe-alimentacao")?.value) || 0;
    const perfumaria = parseFloat(document.getElementById("detalhe-perfumaria")?.value) || 0;
    const outros = parseFloat(document.getElementById("detalhe-outros")?.value) || 0;

    const totalGastos = valorAbast + valorManut + valorExtra + alimentacao + perfumaria + outros;
    const saldo = totalRecebido - totalGastos;

    const elRecebido = document.getElementById("resumo-recebido");
    const elGastos = document.getElementById("resumo-gastos");
    const elSaldo = document.getElementById("resumo-saldo");

    if (elRecebido) elRecebido.innerText = formatMoeda(totalRecebido);
    if (elGastos) elGastos.innerText = formatMoeda(totalGastos);
    if (elSaldo) {
        elSaldo.innerText = formatMoeda(saldo);
        elSaldo.style.color = saldo >= 0 ? "var(--success)" : "var(--danger)";
    }
}

// ======================================================
// SERVIÇO EXTRA - TOGGLE
// ======================================================

function configurarServicoExtra() {
    const select = document.getElementById("detalhe-manut-tem-extra");
    const campos = document.getElementById("detalhe-manut-extra-campos");
    const desc = document.getElementById("detalhe-manut-extra-desc");
    const val = document.getElementById("detalhe-manut-extra-valor");

    if (!select || !campos) return;

    select.addEventListener("change", () => {
        if (select.value === "sim") {
            campos.style.display = "block";
        } else {
            campos.style.display = "none";
            if (desc) desc.value = "";
            if (val) val.value = "";
        }
        recalcularTotais();
    });
}

// ======================================================
// SALVAR ALTERAÇÕES
// ======================================================

function configurarFormulario() {
    const form = document.getElementById("form-detalhes");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const novaData = document.getElementById("detalhe-data")?.value;
        if (!novaData) {
            showToast("Aviso", "Por favor, selecione uma data.", "warning");
            return;
        }

        const rotaNumero = (document.getElementById("detalhe-rota-numero")?.value || "").trim();
        const rotaTipo = document.querySelector('input[name="detalhe-rota-tipo"]:checked')?.value || "Flex";
        const pacotes = parseInt(document.getElementById("detalhe-rota-pacotes")?.value, 10) || 0;
        let devolucoes = parseInt(document.getElementById("detalhe-rota-devolucoes")?.value, 10) || 0;

        if (devolucoes > pacotes) {
            devolucoes = pacotes;
            document.getElementById("detalhe-rota-devolucoes").value = devolucoes;
        }

        const entregues = Math.max(0, pacotes - devolucoes);
        let valorPrincipal = parseFloat(document.getElementById("detalhe-rota-valor")?.value);
        if (isNaN(valorPrincipal) || valorPrincipal < 0) {
            valorPrincipal = entregues * 4.0;
        }

        const valorKm = parseFloat(document.getElementById("detalhe-rota-valorkm")?.value) || 0;
        const valorPedagio = parseFloat(document.getElementById("detalhe-rota-pedagio")?.value) || 0;

        const kmInicial = document.getElementById("detalhe-km-inicial")?.value ? parseFloat(document.getElementById("detalhe-km-inicial").value.replace(',', '.')) : null;
        const kmFinal = document.getElementById("detalhe-km-final")?.value ? parseFloat(document.getElementById("detalhe-km-final").value.replace(',', '.')) : null;
        let kmRodado = parseFloat(document.getElementById("detalhe-km-rodado")?.value) || 0;
        if (kmRodado <= 0 && kmInicial !== null && kmFinal !== null && kmFinal >= kmInicial) {
            kmRodado = Math.round((kmFinal - kmInicial) * 100) / 100;
        }

        const tipoCombustivel = document.getElementById("detalhe-abast-tipo")?.value || "";
        const valorAbastecido = parseFloat(document.getElementById("detalhe-abast-valor")?.value) || 0;

        const manutCategoria = document.getElementById("detalhe-manut-categoria")?.value || "";
        const manutValor = parseFloat(document.getElementById("detalhe-manut-valor")?.value) || 0;
        const manutFeito = (document.getElementById("detalhe-manut-feito")?.value || "").trim();
        const manutTemExtra = document.getElementById("detalhe-manut-tem-extra")?.value === "sim";
        const manutExtraDesc = manutTemExtra ? (document.getElementById("detalhe-manut-extra-desc")?.value || "").trim() : "";
        const manutExtraValor = manutTemExtra ? (parseFloat(document.getElementById("detalhe-manut-extra-valor")?.value) || 0) : 0;

        const alimentacao = parseFloat(document.getElementById("detalhe-alimentacao")?.value) || 0;
        const perfumaria = parseFloat(document.getElementById("detalhe-perfumaria")?.value) || 0;
        const outrosGastos = parseFloat(document.getElementById("detalhe-outros")?.value) || 0;

        const motivo = (document.getElementById("detalhe-motivo")?.value || "").trim();

        // Objeto unificado com todos os dados atualizados
        const dadosAtualizacao = {
            data: novaData,
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
            outros_gastos: outrosGastos,
            motivo: motivo || null
        };

        let erroOcorrido = null;
        let avisoSQLNecessario = false;

        // Se tínhamos registros originais na data antiga
        if (registrosOriginais.length > 0) {
            // Atualizar o primeiro registro com todos os dados consolidados
            const idPrincipal = registrosOriginais[0].id;

            async function updateRecord(objeto, id) {
                return await supabaseClient
                    .from("prancheta_registros")
                    .update(objeto)
                    .eq("id", id)
                    .select();
            }

            let resp = await updateRecord(dadosAtualizacao, idPrincipal);

            // Tratamento se colunas opcionais ainda não existirem no Supabase
            if (resp.error && (resp.error.code === "42703" || resp.error.message?.includes("does not exist"))) {
                console.warn("Colunas opcionais ausentes no Supabase. Atualizando sem elas...");
                const dadosSeguros = { ...dadosAtualizacao };
                delete dadosSeguros.alimentacao;
                delete dadosSeguros.perfumaria;
                delete dadosSeguros.outros_gastos;
                delete dadosSeguros.km_inicial;
                delete dadosSeguros.km_final;

                resp = await updateRecord(dadosSeguros, idPrincipal);
                avisoSQLNecessario = true;
            }

            if (resp.error) {
                erroOcorrido = resp.error;
            } else {
                // Se existiam registros adicionais antigos na mesma data, atualizar a data deles também para manter sincronizado sem duplicar valores
                if (registrosOriginais.length > 1) {
                    for (let i = 1; i < registrosOriginais.length; i++) {
                        const idSecundario = registrosOriginais[i].id;
                        // Zerar valores numéricos no registro auxiliar para evitar contagem dupla, preservando o histórico do id
                        await supabaseClient
                            .from("prancheta_registros")
                            .update({
                                data: novaData,
                                valor: 0,
                                valor_km: 0,
                                valor_pedagio: 0,
                                km_rodado: 0,
                                valor_abastecido: 0,
                                manut_valor: 0,
                                manut_extra_valor: 0,
                                motivo: motivo ? `Consolidado no ID ${idPrincipal}: ${motivo}` : `Consolidado no ID ${idPrincipal}`
                            })
                            .eq("id", idSecundario);
                    }
                }
            }
        } else {
            // Não existia registro nesta data: inserir novo
            async function insertRecord(objeto) {
                return await supabaseClient
                    .from("prancheta_registros")
                    .insert(objeto)
                    .select();
            }

            let resp = await insertRecord(dadosAtualizacao);

            if (resp.error && (resp.error.code === "42703" || resp.error.message?.includes("does not exist"))) {
                const dadosSeguros = { ...dadosAtualizacao };
                delete dadosSeguros.alimentacao;
                delete dadosSeguros.perfumaria;
                delete dadosSeguros.outros_gastos;
                delete dadosSeguros.km_inicial;
                delete dadosSeguros.km_final;

                resp = await insertRecord(dadosSeguros);
                avisoSQLNecessario = true;
            }

            if (resp.error) {
                erroOcorrido = resp.error;
            }
        }

        if (erroOcorrido) {
            console.error("Erro ao salvar alterações:", erroOcorrido);
            showToast("Erro", "Não foi possível salvar as alterações: " + erroOcorrido.message, "warning");
            return;
        }

        // Sucesso
        dataOriginal = novaData;
        history.replaceState(null, "", `detalhes-dia.html?data=${encodeURIComponent(novaData)}`);
        atualizarTituloPagina(novaData);

        if (avisoSQLNecessario) {
            showToast(
                "Salvo com Aviso",
                "Alterações salvas! Lembre-se de rodar supabase_updates.sql no Supabase para persistir Alimentação, Perfumaria e Outros.",
                "warning"
            );
        } else {
            showToast("Sucesso", "Alterações salvas com sucesso no Supabase.");
        }

        // Recarregar dados para refletir o estado atualizado
        await carregarDadosDia(novaData);
    });
}

// ======================================================
// EXCLUIR ESTE DIA
// ======================================================

async function excluirEsteDia() {
    const dataStr = document.getElementById("detalhe-data")?.value || dataOriginal;
    if (!dataStr) return;

    const dataFormatada = formatData(dataStr);
    const confirmado = confirm(`Deseja realmente excluir todos os registros do dia ${dataFormatada}?\n\nEsta ação removerá o dia do histórico e atualizará todos os resumos financeiros.`);
    if (!confirmado) return;

    const { error } = await supabaseClient
        .from("prancheta_registros")
        .delete()
        .eq("data", dataStr);

    if (error) {
        console.error("Erro ao excluir dia:", error);
        showToast("Erro", "Não foi possível excluir: " + error.message, "warning");
        return;
    }

    alert(`Registros do dia ${dataFormatada} foram excluídos com sucesso.`);
    window.location.href = "prancheta.html";
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
