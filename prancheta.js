// ======================================================
// CONEXÃO COM SUPABASE
// ======================================================

const SUPABASE_URL = "https://qkrfmtykejpqtwtgrwbk.supabase.co";

const SUPABASE_KEY = "SUA_CHAVE_ANON_AQUI";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ======================================================
// VARIÁVEIS GLOBAIS
// ======================================================

let baseDeDados = [];
let idEditando = null;


// ======================================================
// INICIALIZAÇÃO
// ======================================================

document.addEventListener("DOMContentLoaded", async () => {

    configurarServicoExtra();

    configurarFormularioRota();
    configurarFormularioKm();
    configurarFormularioAbastecimento();
    configurarFormularioManutencao();

    await carregarRegistros();

});


// ======================================================
// SERVIÇO EXTRA - SIM / NÃO
// ======================================================

function configurarServicoExtra() {

    const select =
        document.getElementById("manut-tem-extra");

    const campos =
        document.getElementById("manut-extra-campos");

    const descricao =
        document.getElementById("manut-extra-desc");

    const valor =
        document.getElementById("manut-extra-valor");


    if (!select || !campos) {
        return;
    }


    function atualizarCamposExtra() {

        if (select.value === "sim") {

            campos.style.display = "block";

            if (descricao) {
                descricao.required = true;
            }

            if (valor) {
                valor.required = true;
            }

        } else {

            campos.style.display = "none";

            if (descricao) {
                descricao.required = false;
                descricao.value = "";
            }

            if (valor) {
                valor.required = false;
                valor.value = "";
            }

        }

    }


    select.addEventListener(
        "change",
        atualizarCamposExtra
    );


    atualizarCamposExtra();

}


// ======================================================
// NOTIFICAÇÕES
// ======================================================

function showToast(title, message, type = "success") {

    const container =
        document.getElementById("toast-container");

    if (!container) return;


    const toast =
        document.createElement("div");


    toast.className = `toast ${type}`;


    let icon = "ph-check-circle";

    if (type === "warning") {
        icon = "ph-warning-circle";
    }


    toast.innerHTML = `
        <i class="ph ${icon}"></i>

        <div>
            <strong>${title}</strong>

            <p style="
                font-size:12px;
                color:var(--text-muted);
                margin-top:2px;
            ">
                ${message}
            </p>
        </div>
    `;


    container.appendChild(toast);


    setTimeout(() => {

        toast.style.animation =
            "slideOut 0.3s ease forwards";


        setTimeout(() => {

            if (toast.parentNode) {
                toast.remove();
            }

        }, 300);

    }, 3000);

}


// ======================================================
// CARREGAR REGISTROS
// ======================================================

async function carregarRegistros() {

    const { data, error } =
        await supabaseClient
            .from("prancheta_registros")
            .select("*")
            .order(
                "data",
                { ascending: false }
            )
            .order(
                "id",
                { ascending: false }
            );


    if (error) {

        console.error(
            "Erro ao buscar registros:",
            error
        );

        showToast(
            "Erro",
            error.message,
            "warning"
        );

        return;
    }


    baseDeDados =
        (data || []).map(converterRegistro);


    atualizarTabela();

    atualizarResumoFinanceiro();

}


// ======================================================
// CONVERTER REGISTRO DO SUPABASE
// ======================================================

function converterRegistro(item) {

    return {

        id: item.id,

        tipoRegistro:
            item.tipo_registro,

        data:
            item.data,


        // ROTA

        rotaNumero:
            item.rota_numero || "",

        rotaTipo:
            item.rota_tipo || "",

        valor:
            Number(item.valor || 0),

        pacotes:
            Number(item.pacotes || 0),

        devolucoes:
            Number(item.devolucoes || 0),

        valorKm:
            Number(item.valor_km || 0),

        valorPedagio:
            Number(item.valor_pedagio || 0),


        // QUILOMETRAGEM

        kmRodado:
            Number(item.km_rodado || 0),


        // ABASTECIMENTO

        tipoCombustivel:
            item.tipo_combustivel || "",

        valorAbastecido:
            Number(
                item.valor_abastecido || 0
            ),


        // MANUTENÇÃO

        manutCategoria:
            item.manut_categoria || "",

        manutValor:
            Number(
                item.manut_valor || 0
            ),

        manutFeito:
            item.manut_feito || "",

        manutTemExtra:
            Boolean(
                item.manut_tem_extra
            ),

        manutExtraDesc:
            item.manut_extra_desc || "",

        manutExtraValor:
            Number(
                item.manut_extra_valor || 0
            ),


        // ALTERAÇÃO

        motivo:
            item.motivo || ""

    };

}


// ======================================================
// SALVAR ROTA
// ======================================================

function configurarFormularioRota() {

    const form =
        document.getElementById("form-rota");


    if (!form) return;


    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const registro = {

                tipo_registro: "Rota",

                data:
                    document.getElementById(
                        "rota-data"
                    ).value,

                rota_numero:
                    document.getElementById(
                        "rota-numero"
                    ).value.trim(),

                rota_tipo:
                    document.querySelector(
                        'input[name="rota-tipo"]:checked'
                    ).value,

                valor:
                    Number(
                        document.getElementById(
                            "rota-valor"
                        ).value
                    ) || 0,

                pacotes:
                    Number(
                        document.getElementById(
                            "rota-pacotes"
                        ).value
                    ) || 0,

                devolucoes:
                    Number(
                        document.getElementById(
                            "rota-devolucoes"
                        ).value
                    ) || 0,

                valor_km:
                    Number(
                        document.getElementById(
                            "rota-valorkm"
                        ).value
                    ) || 0,

                valor_pedagio:
                    Number(
                        document.getElementById(
                            "rota-pedagio"
                        ).value
                    ) || 0

            };


            const { error } =
                await supabaseClient
                    .from("prancheta_registros")
                    .insert(registro);


            if (error) {

                console.error(error);

                showToast(
                    "Erro",
                    "Não foi possível salvar a rota: " +
                    error.message,
                    "warning"
                );

                return;
            }


            form.reset();


            const flex =
                document.querySelector(
                    'input[name="rota-tipo"][value="Flex"]'
                );

            if (flex) {
                flex.checked = true;
            }


            showToast(
                "Rota salva",
                "Registro salvo no Supabase."
            );


            await carregarRegistros();

        }
    );

}


// ======================================================
// SALVAR QUILOMETRAGEM
// ======================================================

function configurarFormularioKm() {

    const form =
        document.getElementById("form-km");


    if (!form) return;


    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const registro = {

                tipo_registro:
                    "Quilometragem",

                data:
                    document.getElementById(
                        "km-data"
                    ).value,

                km_rodado:
                    Number(
                        document.getElementById(
                            "km-rodado"
                        ).value
                    ) || 0

            };


            const { error } =
                await supabaseClient
                    .from("prancheta_registros")
                    .insert(registro);


            if (error) {

                console.error(error);

                showToast(
                    "Erro",
                    "Não foi possível salvar a quilometragem: " +
                    error.message,
                    "warning"
                );

                return;
            }


            form.reset();


            showToast(
                "Quilometragem salva",
                "Registro salvo no Supabase."
            );


            await carregarRegistros();

        }
    );

}


// ======================================================
// SALVAR ABASTECIMENTO
// ======================================================

function configurarFormularioAbastecimento() {

    const form =
        document.getElementById(
            "form-abastecimento"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const registro = {

                tipo_registro:
                    "Abastecimento",

                data:
                    document.getElementById(
                        "abast-data"
                    ).value,

                tipo_combustivel:
                    document.getElementById(
                        "abast-tipo"
                    ).value,

                valor_abastecido:
                    Number(
                        document.getElementById(
                            "abast-valor"
                        ).value
                    ) || 0

            };


            const { error } =
                await supabaseClient
                    .from("prancheta_registros")
                    .insert(registro);


            if (error) {

                console.error(error);

                showToast(
                    "Erro",
                    "Não foi possível salvar o abastecimento: " +
                    error.message,
                    "warning"
                );

                return;
            }


            form.reset();


            showToast(
                "Abastecimento salvo",
                "Registro salvo no Supabase."
            );


            await carregarRegistros();

        }
    );

}


// ======================================================
// SALVAR MANUTENÇÃO
// ======================================================

function configurarFormularioManutencao() {

    const form =
        document.getElementById(
            "form-manutencao"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const temExtra =
                document.getElementById(
                    "manut-tem-extra"
                ).value === "sim";


            const descricaoExtra =
                temExtra
                    ? document.getElementById(
                        "manut-extra-desc"
                    ).value.trim()
                    : "";


            const valorExtra =
                temExtra
                    ? Number(
                        document.getElementById(
                            "manut-extra-valor"
                        ).value
                    ) || 0
                    : 0;


            if (
                temExtra &&
                !descricaoExtra
            ) {

                alert(
                    "Informe qual foi o serviço adicional."
                );

                return;
            }


            if (
                temExtra &&
                valorExtra <= 0
            ) {

                alert(
                    "Informe o valor do serviço adicional."
                );

                return;
            }


            const registro = {

                tipo_registro:
                    "Manutenção",

                data:
                    document.getElementById(
                        "manut-data"
                    ).value,

                manut_categoria:
                    document.getElementById(
                        "manut-categoria"
                    ).value,

                manut_valor:
                    Number(
                        document.getElementById(
                            "manut-valor"
                        ).value
                    ) || 0,

                manut_feito:
                    document.getElementById(
                        "manut-feito"
                    ).value.trim(),

                manut_tem_extra:
                    temExtra,

                manut_extra_desc:
                    descricaoExtra,

                manut_extra_valor:
                    valorExtra

            };


            const { error } =
                await supabaseClient
                    .from("prancheta_registros")
                    .insert(registro);


            if (error) {

                console.error(error);

                showToast(
                    "Erro",
                    "Não foi possível salvar a manutenção: " +
                    error.message,
                    "warning"
                );

                return;
            }


            form.reset();


            const selectExtra =
                document.getElementById(
                    "manut-tem-extra"
                );


            if (selectExtra) {
                selectExtra.value = "nao";
            }


            const camposExtra =
                document.getElementById(
                    "manut-extra-campos"
                );


            if (camposExtra) {
                camposExtra.style.display =
                    "none";
            }


            showToast(
                "Manutenção salva",
                "Registro salvo no Supabase."
            );


            await carregarRegistros();

        }
    );

}


// ======================================================
// RESUMO FINANCEIRO
// ======================================================

function atualizarResumoFinanceiro() {

    let recebido = 0;
    let gasto = 0;


    baseDeDados.forEach(item => {


        // ROTA = dinheiro recebido

        if (
            item.tipoRegistro === "Rota"
        ) {

            recebido +=
                Number(item.valor || 0) +
                Number(item.valorKm || 0) +
                Number(item.valorPedagio || 0);

        }


        // ABASTECIMENTO = gasto

        else if (
            item.tipoRegistro ===
            "Abastecimento"
        ) {

            gasto +=
                Number(
                    item.valorAbastecido || 0
                );

        }


        // MANUTENÇÃO = gasto

        else if (
            item.tipoRegistro ===
            "Manutenção"
        ) {

            gasto +=
                Number(item.manutValor || 0) +
                Number(
                    item.manutExtraValor || 0
                );

        }

    });


    const saldo =
        recebido - gasto;


    alterarTexto(
        "total-recebido",
        formatMoeda(recebido)
    );


    alterarTexto(
        "total-gasto",
        formatMoeda(gasto)
    );


    alterarTexto(
        "total-saldo",
        formatMoeda(saldo)
    );

}


// ======================================================
// ALTERAR TEXTO
// ======================================================

function alterarTexto(id, texto) {

    const elemento =
        document.getElementById(id);


    if (elemento) {
        elemento.textContent = texto;
    }

}


// ======================================================
// FORMATAR MOEDA
// ======================================================

function formatMoeda(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

}


// ======================================================
// FORMATAR DATA
// ======================================================

function formatData(dataStr) {

    if (!dataStr) {
        return "";
    }


    const partes =
        dataStr.split("-");


    if (partes.length !== 3) {
        return dataStr;
    }


    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


// ======================================================
// ATUALIZAR TABELA
// ======================================================

function atualizarTabela() {

    const tbody =
        document.getElementById(
            "historico-tbody"
        );


    if (!tbody) return;


    tbody.innerHTML = "";


    const filtroTipo =
        document.getElementById(
            "filter-type"
        )?.value || "Todos";


    const filtroData =
        document.getElementById(
            "filter-date"
        )?.value || "";


    let registros =
        baseDeDados.filter(item => {


            const passaTipo =
                filtroTipo === "Todos" ||
                item.tipoRegistro ===
                filtroTipo;


            const passaData =
                !filtroData ||
                item.data >= filtroData;


            return (
                passaTipo &&
                passaData
            );

        });


    registros.sort((a, b) => {

        if (a.data === b.data) {

            return (
                Number(b.id) -
                Number(a.id)
            );

        }


        return (
            new Date(b.data) -
            new Date(a.data)
        );

    });


    registros.forEach(item => {

        const tr =
            document.createElement("tr");


        let badge = "";
        let detalhes = "";
        let valorPrincipal = "-";
        let valoresDiversos = "-";
        let valorTotal = 0;


        // ==================================================
        // ROTA
        // ==================================================

        if (
            item.tipoRegistro ===
            "Rota"
        ) {

            badge = `
                <span class="type-badge type-rota">
                    Rota
                </span>
            `;


            detalhes = `
                <b>${escapeHtml(item.rotaNumero)}</b>
                (${escapeHtml(item.rotaTipo)})

                <br>

                <small>
                    ${item.pacotes} pacotes |
                    ${item.devolucoes} devoluções
                </small>
            `;


            valorPrincipal =
                formatMoeda(item.valor);


            valoresDiversos = `
                <small>
                    Km pago:
                    ${formatMoeda(item.valorKm)}
                </small>

                <br>

                <small>
                    Pedágio:
                    ${formatMoeda(item.valorPedagio)}
                </small>
            `;


            valorTotal =
                Number(item.valor || 0) +
                Number(item.valorKm || 0) +
                Number(item.valorPedagio || 0);

        }


        // ==================================================
        // QUILOMETRAGEM
        // ==================================================

        else if (
            item.tipoRegistro ===
            "Quilometragem"
        ) {

            badge = `
                <span class="type-badge type-km">
                    Km
                </span>
            `;


            detalhes = `
                <b>${item.kmRodado}</b>
                km rodados
            `;

        }


        // ==================================================
        // ABASTECIMENTO
        // ==================================================

        else if (
            item.tipoRegistro ===
            "Abastecimento"
        ) {

            badge = `
                <span class="type-badge type-abast">
                    Abastecimento
                </span>
            `;


            detalhes = `
                Combustível:
                <b>
                    ${escapeHtml(
                        item.tipoCombustivel
                    )}
                </b>
            `;


            valorPrincipal =
                formatMoeda(
                    item.valorAbastecido
                );


            valorTotal =
                -Number(
                    item.valorAbastecido || 0
                );

        }


        // ==================================================
        // MANUTENÇÃO
        // ==================================================

        else if (
            item.tipoRegistro ===
            "Manutenção"
        ) {

            badge = `
                <span class="type-badge type-manut">
                    Manutenção
                </span>
            `;


            detalhes = `
                <b>
                    ${escapeHtml(
                        item.manutCategoria
                    )}
                </b>

                <br>

                <small>
                    ${escapeHtml(
                        item.manutFeito
                    )}
                </small>
            `;


            valorPrincipal =
                formatMoeda(
                    item.manutValor
                );


            if (
                item.manutTemExtra &&
                item.manutExtraValor > 0
            ) {

                valoresDiversos = `
                    <small>
                        Serviço extra:
                        ${escapeHtml(
                            item.manutExtraDesc
                        )}
                    </small>

                    <br>

                    <small>
                        Valor extra:
                        ${formatMoeda(
                            item.manutExtraValor
                        )}
                    </small>
                `;

            } else {

                valoresDiversos = `
                    <small>
                        Sem serviço adicional
                    </small>
                `;

            }


            valorTotal =
                -(
                    Number(
                        item.manutValor || 0
                    ) +
                    Number(
                        item.manutExtraValor || 0
                    )
                );

        }


        const motivo =
            item.motivo
                ? `
                    <br>

                    <span style="
                        font-size:11px;
                        color:var(--warning);
                    ">
                        ✏️ Editado:
                        ${escapeHtml(item.motivo)}
                    </span>
                `
                : "";


        tr.innerHTML = `

            <td>
                ${formatData(item.data)}
            </td>

            <td>
                ${badge}
            </td>

            <td>
                ${detalhes}
            </td>

            <td>
                ${valorPrincipal}
            </td>

            <td>
                ${valoresDiversos}
            </td>

            <td>
                <b>
                    ${
                        valorTotal !== 0
                            ? formatMoeda(valorTotal)
                            : "-"
                    }
                </b>

                ${motivo}
            </td>

            <td>

                <button
                    type="button"
                    class="btn btn-outline"
                    style="
                        padding:6px 12px;
                        font-size:12px;
                    "
                    onclick="abrirAlteracao(${item.id})"
                >
                    ✏️ Editar
                </button>

            </td>
        `;


        tbody.appendChild(tr);

    });

}


// ======================================================
// ESCAPAR HTML
// ======================================================

function escapeHtml(valor) {

    return String(valor || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ======================================================
// ABRIR MODAL DE ALTERAÇÃO
// ======================================================

function abrirAlteracao(id) {

    idEditando = id;


    const registro =
        baseDeDados.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!registro) {

        alert(
            "Registro não encontrado."
        );

        return;
    }


    esconderGruposEdicao();


    document.getElementById(
        "edit-data"
    ).value = registro.data || "";


    document.getElementById(
        "edit-motivo"
    ).value = "";


    // ==================================================
    // ROTA
    // ==================================================

    if (
        registro.tipoRegistro === "Rota"
    ) {

        mostrarGrupo(
            "group-edit-rota"
        );


        document.getElementById(
            "edit-rota-numero"
        ).value =
            registro.rotaNumero;


        document.getElementById(
            "edit-rota-tipo"
        ).value =
            registro.rotaTipo;


        document.getElementById(
            "edit-rota-valor"
        ).value =
            registro.valor;


        document.getElementById(
            "edit-rota-pacotes"
        ).value =
            registro.pacotes;


        document.getElementById(
            "edit-rota-devolucoes"
        ).value =
            registro.devolucoes;


        document.getElementById(
            "edit-rota-valorkm"
        ).value =
            registro.valorKm;


        document.getElementById(
            "edit-rota-pedagio"
        ).value =
            registro.valorPedagio;

    }


    // ==================================================
    // QUILOMETRAGEM
    // ==================================================

    else if (
        registro.tipoRegistro ===
        "Quilometragem"
    ) {

        mostrarGrupo(
            "group-edit-km"
        );


        document.getElementById(
            "edit-km-rodado"
        ).value =
            registro.kmRodado;

    }


    // ==================================================
    // ABASTECIMENTO
    // ==================================================

    else if (
        registro.tipoRegistro ===
        "Abastecimento"
    ) {

        mostrarGrupo(
            "group-edit-abast"
        );


        document.getElementById(
            "edit-abast-tipo"
        ).value =
            registro.tipoCombustivel;


        document.getElementById(
            "edit-abast-valor"
        ).value =
            registro.valorAbastecido;

    }


    // ==================================================
    // MANUTENÇÃO
    // ==================================================

    else if (
        registro.tipoRegistro ===
        "Manutenção"
    ) {

        mostrarGrupo(
            "group-edit-manut"
        );


        document.getElementById(
            "edit-manut-categoria"
        ).value =
            registro.manutCategoria;


        document.getElementById(
            "edit-manut-valor"
        ).value =
            registro.manutValor;


        document.getElementById(
            "edit-manut-feito"
        ).value =
            registro.manutFeito;


        document.getElementById(
            "edit-manut-extra-desc"
        ).value =
            registro.manutExtraDesc;


        document.getElementById(
            "edit-manut-extra-valor"
        ).value =
            registro.manutExtraValor || "";

    }


    document.getElementById(
        "modal-alterar"
    ).style.display = "flex";

}


// ======================================================
// ESCONDER GRUPOS DO MODAL
// ======================================================

function esconderGruposEdicao() {

    [
        "group-edit-rota",
        "group-edit-km",
        "group-edit-abast",
        "group-edit-manut"
    ].forEach(id => {

        const elemento =
            document.getElementById(id);

        if (elemento) {

            elemento.classList.add(
                "hidden-group"
            );

        }

    });

}


// ======================================================
// MOSTRAR GRUPO
// ======================================================

function mostrarGrupo(id) {

    const elemento =
        document.getElementById(id);


    if (elemento) {

        elemento.classList.remove(
            "hidden-group"
        );

    }

}


// ======================================================
// FECHAR MODAL
// ======================================================

function fecharAlteracao() {

    idEditando = null;


    const modal =
        document.getElementById(
            "modal-alterar"
        );


    if (modal) {
        modal.style.display = "none";
    }


    const motivo =
        document.getElementById(
            "edit-motivo"
        );


    if (motivo) {
        motivo.value = "";
    }

}


// ======================================================
// SALVAR ALTERAÇÃO
// ======================================================

async function salvarAlteracao() {

    if (!idEditando) {

        alert(
            "Nenhum registro selecionado."
        );

        return;
    }


    const registro =
        baseDeDados.find(
            item =>
                Number(item.id) ===
                Number(idEditando)
        );


    if (!registro) {

        alert(
            "Registro não encontrado."
        );

        return;
    }


    const motivo =
        document.getElementById(
            "edit-motivo"
        ).value.trim();


    if (!motivo) {

        alert(
            "Informe o motivo da alteração."
        );

        return;
    }


    const alteracoes = {

        data:
            document.getElementById(
                "edit-data"
            ).value,

        motivo:
            motivo

    };


    // ==================================================
    // ROTA
    // ==================================================

    if (
        registro.tipoRegistro ===
        "Rota"
    ) {

        alteracoes.rota_numero =
            document.getElementById(
                "edit-rota-numero"
            ).value.trim();


        alteracoes.rota_tipo =
            document.getElementById(
                "edit-rota-tipo"
            ).value.trim();


        alteracoes.valor =
            Number(
                document.getElementById(
                    "edit-rota-valor"
                ).value
            ) || 0;


        alteracoes.pacotes =
            Number(
                document.getElementById(
                    "edit-rota-pacotes"
                ).value
            ) || 0;


        alteracoes.devolucoes =
            Number(
                document.getElementById(
                    "edit-rota-devolucoes"
                ).value
            ) || 0;


        alteracoes.valor_km =
            Number(
                document.getElementById(
                    "edit-rota-valorkm"
                ).value
            ) || 0;


        alteracoes.valor_pedagio =
            Number(
                document.getElementById(
                    "edit-rota-pedagio"
                ).value
            ) || 0;

    }


    // ==================================================
    // QUILOMETRAGEM
    // ==================================================

    else if (
        registro.tipoRegistro ===
        "Quilometragem"
    ) {

        alteracoes.km_rodado =
            Number(
                document.getElementById(
                    "edit-km-rodado"
                ).value
            ) || 0;

    }


    // ==================================================
    // ABASTECIMENTO
    // ==================================================

    else if (
        registro.tipoRegistro ===
        "Abastecimento"
    ) {

        alteracoes.tipo_combustivel =
            document.getElementById(
                "edit-abast-tipo"
            ).value;


        alteracoes.valor_abastecido =
            Number(
                document.getElementById(
                    "edit-abast-valor"
                ).value
            ) || 0;

    }


    // ==================================================
    // MANUTENÇÃO
    // ==================================================

    else if (
        registro.tipoRegistro ===
        "Manutenção"
    ) {

        alteracoes.manut_categoria =
            document.getElementById(
                "edit-manut-categoria"
            ).value;


        alteracoes.manut_valor =
            Number(
                document.getElementById(
                    "edit-manut-valor"
                ).value
            ) || 0;


        alteracoes.manut_feito =
            document.getElementById(
                "edit-manut-feito"
            ).value.trim();


        const descricaoExtra =
            document.getElementById(
                "edit-manut-extra-desc"
            ).value.trim();


        const valorExtra =
            Number(
                document.getElementById(
                    "edit-manut-extra-valor"
                ).value
            ) || 0;


        const temExtra =
            descricaoExtra !== "" ||
            valorExtra > 0;


        if (
            temExtra &&
            (
                descricaoExtra === "" ||
                valorExtra <= 0
            )
        ) {

            alert(
                "Se houver serviço adicional, informe a descrição e o valor."
            );

            return;
        }


        alteracoes.manut_tem_extra =
            temExtra;


        alteracoes.manut_extra_desc =
            temExtra
                ? descricaoExtra
                : "";


        alteracoes.manut_extra_valor =
            temExtra
                ? valorExtra
                : 0;

    }


    const { error } =
        await supabaseClient
            .from("prancheta_registros")
            .update(alteracoes)
            .eq(
                "id",
                idEditando
            );


    if (error) {

        console.error(error);

        showToast(
            "Erro",
            "Não foi possível alterar: " +
            error.message,
            "warning"
        );

        return;
    }


    fecharAlteracao();


    showToast(
        "Registro atualizado",
        "Alteração salva com sucesso."
    );


    await carregarRegistros();

}