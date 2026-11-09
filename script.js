// ===============================
// CONEXÃO SUPABASE
// ===============================

const SUPABASE_URL = "https://qkrfmtykejpqtwtgrwbk.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrcmZtdHlrZWpwcXR3dGdyd2JrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTI3MTgsImV4cCI6MjEwNDEyODcxOH0.F6ICzGGd4luhsGOcaMkXd_6nQGQSYzd4nRIhrQpTG0w";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ===============================
// VARIÁVEIS GLOBAIS
// ===============================

let movimentosCache = [];
let idAlterando = null;
let ordemCrescente = false;

// ===============================
// NOTIFICAÇÕES (TOASTS)
// ===============================

function showNotification(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconClass = 'ph-info';
    if (type === 'success') iconClass = 'ph-check-circle';
    if (type === 'warning') iconClass = 'ph-warning-circle';
    if (type === 'primary') iconClass = 'ph-moped';

    toast.innerHTML = `
        <i class="ph ${iconClass}"></i>
        <div>
            <strong>${title}</strong>
            <p style="font-size:12px;color:var(--text-muted);margin-top:2px;">
                ${message}
            </p>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "slideOut 0.3s ease forwards";
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3500);
}

// ===============================
// INICIALIZAÇÃO
// ===============================

document.addEventListener("DOMContentLoaded", async () => {
    // Definir data padrão de hoje nos formulários
    const hoje = new Date().toISOString().split("T")[0];
    const inputDataTrabalho = document.getElementById("data-trabalho");
    if (inputDataTrabalho && !inputDataTrabalho.value) {
        inputDataTrabalho.value = hoje;
    }
    const inputDataPagamento = document.getElementById("data-pagamento");
    if (inputDataPagamento && !inputDataPagamento.value) {
        inputDataPagamento.value = hoje;
    }

    // Carregar dados iniciais
    await carregarDados();
    await carregarHistorico();
    await carregarPendencias();

    // Filtros e busca do Histórico
    const buscaInput = document.getElementById("busca-historico");
    if (buscaInput) {
        buscaInput.addEventListener("input", renderizarTabelaHistorico);
    }

    const filtroPessoa = document.getElementById("filtro-pessoa");
    if (filtroPessoa) {
        filtroPessoa.addEventListener("change", renderizarTabelaHistorico);
    }

    const filtroData = document.getElementById("filtro-data");
    if (filtroData) {
        filtroData.addEventListener("change", renderizarTabelaHistorico);
    }

    const btnOrdenar = document.querySelector(".filters .btn-outline");
    if (btnOrdenar) {
        btnOrdenar.addEventListener("click", () => {
            ordemCrescente = !ordemCrescente;
            btnOrdenar.innerHTML = `<i class="ph ph-sort-${ordemCrescente ? 'descending' : 'ascending'}"></i> Ordenar`;
            renderizarTabelaHistorico();
        });
    }

    // ===============================
    // FORMULÁRIO: REGISTRAR TRABALHO
    // ===============================

    const formTrabalho = document.getElementById("form-trabalho");
    if (formTrabalho) {
        formTrabalho.addEventListener("submit", async (e) => {
            e.preventDefault();

            const pessoa = document.getElementById("pessoa-trabalho")?.value;
            const data = document.getElementById("data-trabalho")?.value;
            const valorRaw = document.getElementById("valor-trabalho")?.value;

            if (!pessoa) {
                showNotification("warning", "Atenção", "Por favor, selecione a pessoa.");
                return;
            }

            if (!data) {
                showNotification("warning", "Atenção", "Por favor, informe a data do trabalho.");
                return;
            }

            const valorNum = parseFloat(String(valorRaw).replace(',', '.'));
            if (isNaN(valorNum) || valorNum <= 0) {
                showNotification("warning", "Atenção", "Informe um valor numérico válido maior que zero.");
                return;
            }

            // Inserir registro no Supabase
            const { data: inserido, error } = await supabaseClient
                .from("movimentos")
                .insert({
                    pessoa: pessoa,
                    data: data,
                    tipo: "trabalho",
                    valor: valorNum,
                    status: "pendente"
                })
                .select();

            if (error || !inserido || inserido.length === 0) {
                console.error("Erro ao salvar trabalho:", error);
                showNotification("warning", "Erro", "Não foi possível salvar o trabalho: " + (error?.message || "Tente novamente"));
                return;
            }

            // Exibir mensagem de sucesso após confirmação do salvamento
            showNotification("success", "Trabalho salvo", "Registro adicionado com sucesso");

            // Limpar valor e redefinir data de hoje
            document.getElementById("valor-trabalho").value = "";
            document.getElementById("data-trabalho").value = hoje;

            // Atualizar automaticamente indicadores e histórico
            await carregarDados();
            await carregarHistorico();
            await carregarPendencias();
        });
    }

    // ===============================
    // FORMULÁRIO: REGISTRAR PAGAMENTO
    // ===============================

    const formPagamento = document.getElementById("form-pagamento");
    if (formPagamento) {
        formPagamento.addEventListener("submit", async (e) => {
            e.preventDefault();

            const pessoa = document.getElementById("pessoa-pagamento")?.value;
            const data = document.getElementById("data-pagamento")?.value;
            const valorRaw = document.getElementById("valor-pagamento")?.value;

            if (!pessoa) {
                showNotification("warning", "Atenção", "Por favor, selecione a pessoa.");
                return;
            }

            if (!data) {
                showNotification("warning", "Atenção", "Por favor, informe a data de referência.");
                return;
            }

            const valorNum = parseFloat(String(valorRaw).replace(',', '.'));
            if (isNaN(valorNum) || valorNum <= 0) {
                showNotification("warning", "Atenção", "Informe um valor numérico válido maior que zero.");
                return;
            }

            const { data: inserido, error } = await supabaseClient
                .from("movimentos")
                .insert({
                    pessoa: pessoa,
                    data: data,
                    tipo: "pagamento",
                    valor: valorNum,
                    status: "pago"
                })
                .select();

            if (error || !inserido || inserido.length === 0) {
                console.error("Erro ao salvar pagamento:", error);
                showNotification("warning", "Erro", "Não foi possível salvar o pagamento: " + (error?.message || "Tente novamente"));
                return;
            }

            showNotification("primary", "Pagamento salvo", "Registro adicionado com sucesso");

            document.getElementById("valor-pagamento").value = "";
            document.getElementById("data-pagamento").value = hoje;

            await carregarDados();
            await carregarHistorico();
            await carregarPendencias();
        });
    }
});

// ===============================
// BUSCAR DADOS & ATUALIZAR INDICADORES
// ===============================

async function carregarDados() {
    const { data, error } = await supabaseClient
        .from("movimentos")
        .select("*");

    if (error) {
        console.error("Erro ao carregar dados:", error);
        return;
    }

    const todos = data || [];

    // Atualizar Isabella e Pietro
    const saldoIsabella = atualizarPessoa("isabella", todos);
    const saldoPietro = atualizarPessoa("pietro", todos);

    // Total Geral — Total em aberto: soma dos saldos individuais de Isabella e Pietro, considerando também saldos negativos
    const totalGeralAberto = saldoIsabella + saldoPietro;

    const elTotalGeral = document.getElementById("total-geral-aberto");
    if (elTotalGeral) {
        elTotalGeral.innerText = formatarValor(totalGeralAberto);
    }
}

// ===============================
// ATUALIZAR PESSOA (ISABELLA / PIETRO)
// ===============================

function atualizarPessoa(nome, todosRegistros) {
    const registros = todosRegistros.filter(item => item.pessoa === nome);

    const trabalhos = registros.filter(item => item.tipo === "trabalho");
    const pagamentos = registros.filter(item => item.tipo === "pagamento");

    // 1. Total trabalhado: soma dos valores dos trabalhos cadastrados
    const totalTrabalhado = trabalhos.reduce(
        (s, item) => s + Number(item.valor || 0),
        0
    );

    // 2. Total pago: soma dos pagamentos avulsos + vinculados
    let totalPago = pagamentos.reduce(
        (s, item) => s + Number(item.valor || 0),
        0
    );

    // Se houver algum trabalho marcado como pago que não tenha um pagamento avulso vinculado, soma também
    const trabalhosPagosSemVinculo = trabalhos.filter(t => 
        t.status === "pago" && 
        !pagamentos.some(p => p.motivo_alteracao && p.motivo_alteracao.includes(`[Ref. Trabalho #${t.id}]`))
    );
    const totalSemVinculo = trabalhosPagosSemVinculo.reduce(
        (s, t) => s + Number(t.valor || 0),
        0
    );
    totalPago += totalSemVinculo;

    // 3. Saldo pendente: total trabalhado menos total pago (pode ser negativo se total pago for maior!)
    const saldoPendente = totalTrabalhado - totalPago;

    // 4. Dias trabalhados: quantidade de dias distintos com trabalho registrado
    const datasDistintas = new Set(
        trabalhos.map(item => item.data).filter(Boolean)
    );
    const diasTrabalhados = datasDistintas.size;

    // Atualizar Card da Pessoa
    alterarTexto(`${nome}-total-trabalhado`, formatarValor(totalTrabalhado));
    alterarTexto(`${nome}-total-pago`, formatarValor(totalPago));
    
    const elSaldo = document.getElementById(`${nome}-saldo-pendente`);
    if (elSaldo) {
        elSaldo.innerText = formatarValor(saldoPendente);
        // Se saldo > 0: aviso (amarelo). Se <= 0: sucesso (verde).
        elSaldo.className = "value " + (saldoPendente > 0 ? "warning" : "success");
    }

    alterarTexto(`${nome}-dias-trabalhados`, `${diasTrabalhados} dias`);

    // Atualizar Resumo Financeiro
    alterarTexto(`resumo-${nome}-dias`, diasTrabalhados);
    alterarTexto(`resumo-${nome}-total`, formatarValor(totalTrabalhado));
    alterarTexto(`resumo-${nome}-recebido`, formatarValor(totalPago));

    const elFalta = document.getElementById(`resumo-${nome}-falta`);
    if (elFalta) {
        elFalta.innerText = formatarValor(saldoPendente);
        elFalta.className = saldoPendente > 0 ? "warning" : "success";
    }

    return saldoPendente;
}

function alterarTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.innerText = valor;
    }
}

// ===============================
// HISTÓRICO & FILTROS
// ===============================

async function carregarHistorico() {
    const { data, error } = await supabaseClient
        .from("movimentos")
        .select("*")
        .order("data", { ascending: false })
        .order("id", { ascending: false });

    if (error) {
        console.error("Erro ao carregar histórico:", error);
        return;
    }

    movimentosCache = data || [];
    renderizarTabelaHistorico();
}

function renderizarTabelaHistorico() {
    const tabela = document.getElementById("historico-tabela");
    if (!tabela) return;

    tabela.innerHTML = "";

    const termoBusca = (document.getElementById("busca-historico")?.value || "").toLowerCase().trim();
    const filtroPessoa = document.getElementById("filtro-pessoa")?.value || "";
    const filtroData = document.getElementById("filtro-data")?.value || "";

    const hoje = new Date();

    let filtrados = movimentosCache.filter(item => {
        // Filtro Pessoa
        if (filtroPessoa && item.pessoa !== filtroPessoa) {
            return false;
        }

        // Filtro Data
        if (filtroData === "7") {
            const limite = new Date();
            limite.setDate(hoje.getDate() - 7);
            const dataItem = new Date(item.data + "T00:00:00");
            if (dataItem < limite) return false;
        } else if (filtroData === "30") {
            const limite = new Date();
            limite.setDate(hoje.getDate() - 30);
            const dataItem = new Date(item.data + "T00:00:00");
            if (dataItem < limite) return false;
        }
        // "all" ou vazio passa tudo

        // Busca texto
        if (termoBusca) {
            const strItem = `${item.pessoa} ${item.data} ${item.tipo} ${item.status} ${item.valor} ${item.motivo_alteracao || ''}`.toLowerCase();
            if (!strItem.includes(termoBusca)) return false;
        }

        return true;
    });

    filtrados.sort((a, b) => {
        const da = new Date(a.data);
        const db = new Date(b.data);
        if (da.getTime() === db.getTime()) {
            return ordemCrescente ? (a.id - b.id) : (b.id - a.id);
        }
        return ordemCrescente ? (da - db) : (db - da);
    });

    if (filtrados.length === 0) {
        const trVazia = document.createElement("tr");
        trVazia.innerHTML = `<td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">Nenhum registro encontrado</td>`;
        tabela.appendChild(trVazia);
        return;
    }

    filtrados.forEach(item => {
        const linha = document.createElement("tr");

        let nomePessoa = item.pessoa === "isabella" ? "Isabella" : (item.pessoa === "pietro" ? "Pietro" : item.pessoa);

        linha.innerHTML = `
        <td>${nomePessoa}</td>
        <td>${formatarData(item.data)}</td>
        <td>
            ${
                item.tipo === "trabalho"
                ? `<span class="type-tag work">🛵 Trabalho</span>`
                : `<span class="type-tag pay">💰 Pagamento</span>`
            }
        </td>
        <td>${formatarValor(Number(item.valor))}</td>
        <td>
            ${
                item.status === "pago"
                ? `<span class="badge success-badge">Pago</span>`
                : `<span class="badge warning-badge">Pendente</span>`
            }
        </td>
        <td>
            ${
                item.motivo_alteracao
                ? `<span class="alteracao-info">✏️ ${escapeHtml(formatarMotivoAlteracao(item, movimentosCache))}</span>`
                : `<span class="sem-alteracao">-</span>`
            }
        </td>
        <td>
            <div style="display:flex; gap:6px;">
                <button 
                    class="btn btn-outline"
                    style="padding:6px 10px; font-size:12px;"
                    title="Editar registro"
                    onclick="abrirAlteracao(${item.id})">
                    ✏️ Alterar
                </button>
                <button 
                    class="btn btn-outline"
                    style="padding:6px 10px; font-size:12px; color:var(--danger); border-color:var(--danger);"
                    title="Excluir registro"
                    onclick="confirmarExclusao(${item.id})">
                    🗑️ Excluir
                </button>
            </div>
        </td>
        `;

        tabela.appendChild(linha);
    });
}

// ===============================
// PAGAMENTOS PENDENTES
// ===============================

async function carregarPendencias() {
    const { data, error } = await supabaseClient
        .from("movimentos")
        .select("*");

    if (error) {
        console.error("Erro ao carregar pendências:", error);
        return;
    }

    const container = document.getElementById("pagamentos-pendentes");
    if (!container) return;

    container.innerHTML = "";

    const todos = data || [];
    const pessoas = ["isabella", "pietro"];
    let temPendencia = false;

    pessoas.forEach(pessoa => {
        const registros = todos.filter(item => item.pessoa === pessoa);
        const trabalhos = registros.filter(item => item.tipo === "trabalho");
        const pagamentos = registros.filter(item => item.tipo === "pagamento");

        const totalTrabalhado = trabalhos.reduce((s, r) => s + Number(r.valor || 0), 0);
        let totalPago = pagamentos.reduce((s, r) => s + Number(r.valor || 0), 0);
        const trabalhosPagosSemVinculo = trabalhos.filter(t => 
            t.status === "pago" && 
            !pagamentos.some(p => p.motivo_alteracao && p.motivo_alteracao.includes(`[Ref. Trabalho #${t.id}]`))
        );
        totalPago += trabalhosPagosSemVinculo.reduce((s, t) => s + Number(t.valor || 0), 0);

        const falta = totalTrabalhado - totalPago;

        if (falta > 0) {
            temPendencia = true;

            const trabalhosPendentes = trabalhos
                .filter(item => item.status === "pendente")
                .sort((a, b) => new Date(b.data) - new Date(a.data));

            const ultimoTrabalho = trabalhosPendentes[0] || trabalhos[0];
            const dataFormatada = ultimoTrabalho ? formatarData(ultimoTrabalho.data) : "";
            const nomeFormatado = pessoa === "isabella" ? "Isabella" : "Pietro";

            container.innerHTML += `
            <div class="pending-item">
                <div class="pending-info">
                    <span class="dot red"></span>
                    <strong>${nomeFormatado}</strong>
                    <span class="date">${dataFormatada}</span>
                </div>
                <div class="pending-details">
                    <span class="value">${formatarValor(falta)}</span>
                    <span class="badge warning-badge">Aguardando</span>
                </div>
            </div>
            `;
        }
    });

    if (!temPendencia) {
        container.innerHTML = `
            <div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">
                <i class="ph ph-check-circle" style="color: var(--success); font-size: 20px; vertical-align: middle; margin-right: 4px;"></i>
                Nenhum pagamento pendente no momento.
            </div>
        `;
    }
}

// ===============================
// MODAL DE ALTERAÇÃO
// ===============================

function abrirAlteracao(id) {
    idAlterando = id;

    const item = movimentosCache.find(m => Number(m.id) === Number(id));
    if (!item) {
        console.error("Registro não encontrado em cache:", id);
        return;
    }

    const modal = document.getElementById("modal-alterar");
    if (!modal) return;

    // Preencher campos
    document.getElementById("edit-pessoa").value = item.pessoa || "isabella";
    document.getElementById("edit-data").value = item.data || "";
    document.getElementById("edit-tipo").value = item.tipo || "trabalho";
    document.getElementById("edit-status").value = item.status || "pendente";

    const labelValor = document.getElementById("label-valor-registro");
    const editValorAtual = document.getElementById("edit-valor-atual");
    const inputNovoValor = document.getElementById("novo-valor");
    const inputValorPago = document.getElementById("edit-valor-pago-input");
    const txtMotivo = document.getElementById("motivo-alteracao");

    if (item.tipo === "trabalho") {
        if (labelValor) labelValor.innerText = "Valor Original do Trabalho (R$)";
        if (editValorAtual) editValorAtual.innerText = `Valor original cadastrado: ${formatarValor(item.valor)}`;
        if (inputNovoValor) {
            inputNovoValor.value = "";
            inputNovoValor.placeholder = "Deixe em branco para manter o valor original";
        }

        // Buscar se já existia algum pagamento vinculado a este trabalho
        const pgtoVinculado = movimentosCache.find(p => 
            p.tipo === "pagamento" && 
            p.motivo_alteracao && 
            p.motivo_alteracao.includes(`[Ref. Trabalho #${item.id}]`)
        );

        if (inputValorPago) {
            if (pgtoVinculado) {
                inputValorPago.value = pgtoVinculado.valor;
            } else if (item.status === "pago") {
                inputValorPago.value = item.valor;
            } else {
                inputValorPago.value = "";
            }
        }
    } else {
        if (labelValor) labelValor.innerText = "Valor do Pagamento (R$)";
        if (editValorAtual) editValorAtual.innerText = `Valor pago cadastrado: ${formatarValor(item.valor)}`;
        if (inputNovoValor) {
            inputNovoValor.value = "";
            inputNovoValor.placeholder = "Deixe em branco para manter o valor original";
        }
        if (inputValorPago) inputValorPago.value = "";
    }

    if (txtMotivo) txtMotivo.value = item.motivo_alteracao || "";

    atualizarCamposModal();
    modal.style.display = "flex";
}

function atualizarCamposModal() {
    const tipo = document.getElementById("edit-tipo")?.value;
    const status = document.getElementById("edit-status")?.value;
    const groupValorPago = document.getElementById("group-valor-pago");

    if (!groupValorPago) return;

    // O campo de valor efetivamente recebido é exibido se for trabalho e estiver como Pago (ou se usuário quiser registrar pagamento)
    if (tipo === "trabalho" && status === "pago") {
        groupValorPago.style.display = "block";
    } else {
        groupValorPago.style.display = "none";
    }
}

function fecharAlteracao() {
    idAlterando = null;
    const modal = document.getElementById("modal-alterar");
    if (modal) modal.style.display = "none";

    const inputNovoValor = document.getElementById("novo-valor");
    if (inputNovoValor) inputNovoValor.value = "";

    const inputValorPago = document.getElementById("edit-valor-pago-input");
    if (inputValorPago) inputValorPago.value = "";

    const txtMotivo = document.getElementById("motivo-alteracao");
    if (txtMotivo) txtMotivo.value = "";
}

// ===============================
// SALVAR ALTERAÇÃO
// ===============================

async function salvarAlteracao() {
    if (!idAlterando) {
        showNotification("warning", "Erro", "Nenhum registro selecionado");
        return;
    }

    const itemOriginal = movimentosCache.find(m => Number(m.id) === Number(idAlterando));
    if (!itemOriginal) {
        showNotification("warning", "Erro", "Registro original não encontrado.");
        return;
    }

    const pessoa = document.getElementById("edit-pessoa")?.value || itemOriginal.pessoa;
    const data = document.getElementById("edit-data")?.value || itemOriginal.data;
    const tipo = document.getElementById("edit-tipo")?.value || itemOriginal.tipo;
    const status = document.getElementById("edit-status")?.value || itemOriginal.status;
    const novoValorInput = (document.getElementById("novo-valor")?.value || "").trim();
    const valorPagoInput = (document.getElementById("edit-valor-pago-input")?.value || "").trim();
    const motivo = (document.getElementById("motivo-alteracao")?.value || "").trim();

    // Determinar o valor do registro
    // Regra: vazio = mantém valor original. Se informado número = atualiza (inclusive 0).
    let valorFinal = Number(itemOriginal.valor);
    if (novoValorInput !== "") {
        const num = parseFloat(novoValorInput.replace(',', '.'));
        if (!isNaN(num)) {
            valorFinal = num;
        } else {
            showNotification("warning", "Valor inválido", "Informe um valor numérico válido.");
            return;
        }
    }

    // Se o registro editado for TRABALHO
    if (itemOriginal.tipo === "trabalho" || tipo === "trabalho") {

        // 1. Atualizar o trabalho: O valor original do trabalho permanece registrado
        const dadosTrabalho = {
            pessoa: pessoa,
            data: data,
            tipo: "trabalho",
            status: status,
            valor: valorFinal,
            motivo_alteracao: motivo || itemOriginal.motivo_alteracao || null,
            alterado_em: new Date().toISOString()
        };

        const { error: erroTrabalho } = await supabaseClient
            .from("movimentos")
            .update(dadosTrabalho)
            .eq("id", idAlterando);

        if (erroTrabalho) {
            console.error("Erro ao atualizar trabalho:", erroTrabalho);
            showNotification("warning", "Erro", "Não foi possível atualizar o trabalho: " + erroTrabalho.message);
            return;
        }

        // 2. Gerenciar o pagamento vinculado (evitar duplicidades!)
        // Procurar se já existe um pagamento vinculado a este trabalho
        const pgtoExistente = movimentosCache.find(p => 
            p.tipo === "pagamento" && 
            p.motivo_alteracao && 
            p.motivo_alteracao.includes(`[Ref. Trabalho #${idAlterando}]`)
        );

        if (status === "pago") {
            // Valor efetivamente recebido:
            // Se o campo estiver vazio, considera pagamento total (valorFinal do trabalho).
            // Se estiver preenchido (parcial ou maior), considera o valor digitado.
            let valorEfetivoPago = valorFinal;
            if (valorPagoInput !== "") {
                const numPago = parseFloat(valorPagoInput.replace(',', '.'));
                if (!isNaN(numPago)) {
                    valorEfetivoPago = numPago;
                }
            }

            const textoMotivo = `Pagamento ref. ao dia trabalhado: ${formatarData(data)} [Ref. Trabalho #${idAlterando}]`;

            if (pgtoExistente) {
                // Atualizar o pagamento já existente para evitar duplicidade
                await supabaseClient
                    .from("movimentos")
                    .update({
                        pessoa: pessoa,
                        data: data,
                        valor: valorEfetivoPago,
                        status: "pago",
                        motivo_alteracao: textoMotivo
                    })
                    .eq("id", pgtoExistente.id);
            } else {
                // Criar o registro de pagamento correspondente
                await supabaseClient
                    .from("movimentos")
                    .insert({
                        pessoa: pessoa,
                        data: data,
                        tipo: "pagamento",
                        valor: valorEfetivoPago,
                        status: "pago",
                        motivo_alteracao: textoMotivo
                    });
            }
        } else if (status === "pendente") {
            // Se foi alterado de volta para Pendente:
            // Se o usuário informou um pagamento parcial no campo:
            if (valorPagoInput !== "" && parseFloat(valorPagoInput.replace(',', '.')) > 0) {
                const valorParcial = parseFloat(valorPagoInput.replace(',', '.'));
                const textoParcial = `Pagamento parcial ref. ao dia trabalhado: ${formatarData(data)} [Ref. Trabalho #${idAlterando}]`;
                if (pgtoExistente) {
                    await supabaseClient
                        .from("movimentos")
                        .update({
                            pessoa: pessoa,
                            data: data,
                            valor: valorParcial,
                            status: "pago",
                            motivo_alteracao: textoParcial
                        })
                        .eq("id", pgtoExistente.id);
                } else {
                    await supabaseClient
                        .from("movimentos")
                        .insert({
                            pessoa: pessoa,
                            data: data,
                            tipo: "pagamento",
                            valor: valorParcial,
                            status: "pago",
                            motivo_alteracao: textoParcial
                        });
                }
            } else {
                // Se está pendente e não tem pagamento, remove o pagamento vinculado caso existisse
                if (pgtoExistente) {
                    await supabaseClient
                        .from("movimentos")
                        .delete()
                        .eq("id", pgtoExistente.id);
                }
            }
        }

    } else {
        // Se o registro editado for diretamente um PAGAMENTO
        const dadosPagamento = {
            pessoa: pessoa,
            data: data,
            tipo: "pagamento",
            status: status,
            valor: valorFinal,
            motivo_alteracao: motivo || itemOriginal.motivo_alteracao || null,
            alterado_em: new Date().toISOString()
        };

        const { error: erroPgto } = await supabaseClient
            .from("movimentos")
            .update(dadosPagamento)
            .eq("id", idAlterando);

        if (erroPgto) {
            console.error("Erro ao atualizar pagamento:", erroPgto);
            showNotification("warning", "Erro", "Não foi possível atualizar o pagamento: " + erroPgto.message);
            return;
        }
    }

    showNotification("success", "Alterado", "Registro atualizado com sucesso");
    fecharAlteracao();

    // Atualizar automaticamente indicadores, histórico e pendências
    await carregarDados();
    await carregarHistorico();
    await carregarPendencias();
}

// ===============================
// EXCLUIR REGISTRO
// ===============================

async function confirmarExclusao(id) {
    if (!id) return;

    const item = movimentosCache.find(m => Number(m.id) === Number(id));
    const desc = item ? `${item.pessoa === "isabella" ? "Isabella" : "Pietro"} - ${formatarData(item.data)} (${formatarValor(Number(item.valor))})` : `ID ${id}`;

    const confirmado = confirm(`Deseja realmente excluir este registro?\n\n${desc}\n\nEsta ação não poderá ser desfeita e removerá o item de todos os totais.`);
    if (!confirmado) return;

    // Se for trabalho, também excluir qualquer pagamento vinculado
    if (item && item.tipo === "trabalho") {
        const pgtoVinculado = movimentosCache.find(p => 
            p.tipo === "pagamento" && 
            p.motivo_alteracao && 
            p.motivo_alteracao.includes(`[Ref. Trabalho #${id}]`)
        );
        if (pgtoVinculado) {
            await supabaseClient
                .from("movimentos")
                .delete()
                .eq("id", pgtoVinculado.id);
        }
    }

    const { data: deletados, error } = await supabaseClient
        .from("movimentos")
        .delete()
        .eq("id", id)
        .select();

    if (error) {
        console.error("Erro ao excluir:", error);
        showNotification("warning", "Erro", "Não foi possível excluir o registro: " + error.message);
        return;
    }

    if (!deletados || deletados.length === 0) {
        showNotification("warning", "Atenção", "O Supabase bloqueou a exclusão por falta de permissão de DELETE no banco.");
        return;
    }

    showNotification("success", "Excluído", "Registro removido com sucesso");

    // Recalcular e atualizar tudo imediatamente
    await carregarDados();
    await carregarHistorico();
    await carregarPendencias();
}

// ===============================
// FORMATADORES
// ===============================

function formatarMotivoAlteracao(item, todosMovimentos) {
    if (!item || !item.motivo_alteracao) return "";
    const str = String(item.motivo_alteracao);
    const match = str.match(/\[Ref\.\s*Trabalho\s*#(\d+)\]/i);
    if (match) {
        const idTrabalho = Number(match[1]);
        const trabalhoRef = (todosMovimentos || []).find(t => Number(t.id) === idTrabalho);
        const dataTrabalhada = trabalhoRef ? formatarData(trabalhoRef.data) : (item.data ? formatarData(item.data) : "");
        const isParcial = str.toLowerCase().includes("parcial");
        if (dataTrabalhada) {
            return isParcial 
                ? `Pagamento parcial ref. ao dia trabalhado: ${dataTrabalhada}`
                : `Pagamento ref. ao dia trabalhado: ${dataTrabalhada}`;
        }
    }
    // Remove qualquer tag técnica interna como [Ref. Trabalho #...] caso já exista texto explicativo
    return str.replace(/\s*\[Ref\.\s*Trabalho\s*#\d+\]/gi, "").trim();
}

function formatarValor(valor) {
    const v = Number(valor || 0);
    return v.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarData(data) {
    if (!data) return "";
    const partes = data.split("-");
    if (partes.length !== 3) return data;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
