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
// NOTIFICAÇÕES
// ===============================

function showNotification(type, title, message) {

    const container = document.getElementById('toast-container');

    if(!container) return;


    const toast = document.createElement('div');

    toast.className = `toast ${type}`;


    let iconClass = 'ph-info';

    if(type === 'success') iconClass = 'ph-check-circle';
    if(type === 'warning') iconClass = 'ph-warning-circle';
    if(type === 'primary') iconClass = 'ph-moped';


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


    setTimeout(()=>{

        toast.style.animation =
        "slideOut 0.3s ease forwards";


        setTimeout(()=>{

            if(container.contains(toast)){
                container.removeChild(toast);
            }

        },300);


    },3500);

}





// ===============================
// INICIALIZAÇÃO
// ===============================

document.addEventListener("DOMContentLoaded",()=>{


    carregarDados();
    carregarHistorico();
    carregarPendencias();

    // Filtros e busca do Histórico
    const buscaInput = document.getElementById("busca-historico");
    if(buscaInput){
        buscaInput.addEventListener("input", renderizarTabelaHistorico);
    }

    const filtroPessoa = document.getElementById("filtro-pessoa");
    if(filtroPessoa){
        filtroPessoa.addEventListener("change", renderizarTabelaHistorico);
    }

    const filtroData = document.getElementById("filtro-data");
    if(filtroData){
        filtroData.addEventListener("change", renderizarTabelaHistorico);
    }

    const btnOrdenar = document.querySelector(".filters .btn-outline");
    if(btnOrdenar){
        btnOrdenar.addEventListener("click", ()=>{
            ordemCrescente = !ordemCrescente;
            btnOrdenar.innerHTML = `<i class="ph ph-sort-${ordemCrescente ? 'descending' : 'ascending'}"></i> Ordenar`;
            renderizarTabelaHistorico();
        });
    }



    // ===============================
    // TRABALHO
    // ===============================


    const formTrabalho =
    document.getElementById("form-trabalho");


    if(formTrabalho){


        formTrabalho.addEventListener("submit", async(e)=>{


            e.preventDefault();



            const pessoa =
            document.getElementById("pessoa-trabalho").value;


            const data =
            document.getElementById("data-trabalho").value;


            const valor =
            document.getElementById("valor-trabalho").value;



            const {error} =
            await supabaseClient
            .from("movimentos")
            .insert({

                pessoa:pessoa,
                data:data,
                tipo:"trabalho",
                valor:Number(valor),
                status:"pendente"

            });



            if(error){

                console.log(error);

                showNotification(
                    "warning",
                    "Erro",
                    "Não salvou trabalho"
                );


            }else{


                showNotification(
                    "success",
                    "Trabalho salvo",
                    "Registro adicionado"
                );


                formTrabalho.reset();


                carregarDados();
                carregarHistorico();
                carregarPendencias();


            }


        });

    }





    // ===============================
    // PAGAMENTO
    // ===============================


    const formPagamento =
    document.getElementById("form-pagamento");



    if(formPagamento){


        formPagamento.addEventListener("submit", async(e)=>{


            e.preventDefault();



            const pessoa =
            document.getElementById("pessoa-pagamento").value;


            const data =
            document.getElementById("data-pagamento").value;


            const valor =
            document.getElementById("valor-pagamento").value;




            const {error} =
            await supabaseClient
            .from("movimentos")
            .insert({

                pessoa:pessoa,
                data:data,
                tipo:"pagamento",
                valor:Number(valor),
                status:"pago"

            });



            if(error){


                console.log(error);


                showNotification(
                    "warning",
                    "Erro",
                    "Não salvou pagamento"
                );



            }else{


                showNotification(
                    "primary",
                    "Pagamento salvo",
                    "Registro adicionado"
                );


                formPagamento.reset();


                carregarDados();

                carregarHistorico();
                


            }


        });


    }


});






// ===============================
// BUSCAR DADOS
// ===============================

async function carregarDados(){


    const {data,error} =
    await supabaseClient
    .from("movimentos")
    .select("*");



    if(error){

        console.log(error);
        return;

    }



    const isabella =
    data.filter(item=>item.pessoa==="isabella");


    const pietro =
    data.filter(item=>item.pessoa==="pietro");



    atualizarPessoa(
        "isabella",
        isabella
    );


    atualizarPessoa(
        "pietro",
        pietro
    );



    const totalGeral =
    calcularSaldo(isabella)
    +
    calcularSaldo(pietro);



    const total =
    document.getElementById(
        "total-geral-aberto"
    );


    if(total){

        total.innerText =
        formatarValor(totalGeral);

    }


}






// ===============================
// ATUALIZAR PESSOA
// ===============================

function atualizarPessoa(nome, registros){


    const trabalhos =
    registros.filter(
        item=>item.tipo==="trabalho"
    );


    const pagamentos =
    registros.filter(
        item=>item.tipo==="pagamento"
    );



    const totalTrabalhado =
    trabalhos.reduce(
        (s,item)=>s+Number(item.valor),
        0
    );



    const totalPago =
    pagamentos.reduce(
        (s,item)=>s+Number(item.valor),
        0
    );



    const saldo =
    totalTrabalhado-totalPago;



    const dias =
    trabalhos.length;



    alterarTexto(
        `${nome}-total-trabalhado`,
        formatarValor(totalTrabalhado)
    );


    alterarTexto(
        `${nome}-total-pago`,
        formatarValor(totalPago)
    );


    alterarTexto(
        `${nome}-saldo-pendente`,
        formatarValor(saldo)
    );


    alterarTexto(
        `${nome}-dias-trabalhados`,
        `${dias} dias`
    );



    alterarTexto(
        `resumo-${nome}-dias`,
        dias
    );


    alterarTexto(
        `resumo-${nome}-total`,
        formatarValor(totalTrabalhado)
    );


    alterarTexto(
        `resumo-${nome}-recebido`,
        formatarValor(totalPago)
    );


    alterarTexto(
        `resumo-${nome}-falta`,
        formatarValor(saldo)
    );


}





function alterarTexto(id,valor){

    const elemento =
    document.getElementById(id);


    if(elemento){

        elemento.innerText = valor;

    }

}





// ===============================
// CALCULAR SALDO
// ===============================

function calcularSaldo(registros){


    const trabalho =
    registros
    .filter(item=>item.tipo==="trabalho")
    .reduce(
        (s,item)=>s+Number(item.valor),
        0
    );


    const pagamento =
    registros
    .filter(item=>item.tipo==="pagamento")
    .reduce(
        (s,item)=>s+Number(item.valor),
        0
    );


    return trabalho-pagamento;

}





// ===============================
// HISTÓRICO & FILTROS
// ===============================

let movimentosCache = [];
let ordemCrescente = false;

async function carregarHistorico(){

    const {data,error} =
    await supabaseClient
    .from("movimentos")
    .select("*")
    .order("data",{ascending:false})
    .order("id",{ascending:false});

    if(error){
        console.error("Erro ao carregar histórico:", error);
        showNotification("warning", "Erro", "Não foi possível carregar histórico");
        return;
    }

    movimentosCache = data || [];
    renderizarTabelaHistorico();
}

function renderizarTabelaHistorico(){
    const tabela = document.getElementById("historico-tabela");
    if(!tabela) return;

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
        } else if (filtroData === "30" || filtroData === "") {
            // Últimos 30 dias por padrão se vazio ou 30
            const limite = new Date();
            limite.setDate(hoje.getDate() - 30);
            const dataItem = new Date(item.data + "T00:00:00");
            if (dataItem < limite) return false;
        }
        // "all" passa direto

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

        let nomePessoa = item.pessoa;
        const nomes = {
            isabella: "Isabella",
            pietro: "Pietro"
        };
        if(nomes[item.pessoa]){
            nomePessoa = nomes[item.pessoa];
        }

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
                ? `<span class="alteracao-info">✏️ ${escapeHtml(item.motivo_alteracao)}</span>`
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

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}





// ===============================
// FORMATADORES
// ===============================

function formatarValor(valor){

    return valor.toLocaleString(
        "pt-BR",
        {
            style:"currency",
            currency:"BRL"
        }
    );

}



function formatarData(data){

    if(!data) return "";


    const partes=data.split("-");


    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}



// ===============================
// CARREGAR PAGAMENTOS PENDENTES
// ===============================

async function carregarPendencias(){


    const { data, error } =
    await supabaseClient
    .from("movimentos")
    .select("*");



    if(error){

        console.log(
            "Erro ao carregar pendências:",
            error
        );

        return;

    }



    const pessoas = [
        "isabella",
        "pietro"
    ];



    const container =
    document.getElementById(
        "pagamentos-pendentes"
    );



    if(!container){

        return;

    }



    container.innerHTML = "";



    pessoas.forEach(pessoa=>{


        const registros =
        data.filter(item =>
            item.pessoa === pessoa
        );



        const totalTrabalho =
        registros
        .filter(item=>item.tipo==="trabalho")
        .reduce(
            (total,item)=>
            total + Number(item.valor),
            0
        );



        const totalPago =
        registros
        .filter(item=>item.tipo==="pagamento")
        .reduce(
            (total,item)=>
            total + Number(item.valor),
            0
        );



        const falta =
        totalTrabalho-totalPago;



        if(falta > 0){


            const ultimoTrabalho =
            registros
            .filter(item=>item.tipo==="trabalho")
            .sort(
                (a,b)=>
                new Date(b.data)-new Date(a.data)
            )[0];



            const data =
            ultimoTrabalho
            ? formatarData(ultimoTrabalho.data)
            : "";



            container.innerHTML += `

            <div class="pending-item">

                <div class="pending-info">

                    <span class="dot red"></span>

                    <strong>
                        ${pessoa}
                    </strong>

                    <span class="date">
                        ${data}
                    </span>

                </div>


                <div class="pending-details">

                    <span class="value">
                        ${formatarValor(falta)}
                    </span>


                    <span class="badge warning-badge">
                        Aguardando
                    </span>

                </div>

            </div>

            `;


        }


    });


}

// ===============================
// MENU
// ===============================

function toggleMenu(){

    showNotification(
        "primary",
        "Menu",
        "Menu lateral"
    );

}

// ===============================
// MENU
// ===============================

function toggleMenu(){

    showNotification(
        "primary",
        "Menu",
        "Menu lateral"
    );

}



// ===============================
// ALTERAR / EXCLUIR REGISTRO
// ===============================

let idAlterando = null;

// abrir modal
function abrirAlteracao(id){
    console.log("Abrindo alteração ID:", id);
    idAlterando = id;

    const item = movimentosCache.find(m => Number(m.id) === Number(id));
    if(!item){
        console.error("Registro não encontrado em cache:", id);
        return;
    }

    const modal = document.getElementById("modal-alterar");
    if(!modal) return;

    // Preencher campos com dados atuais
    const selPessoa = document.getElementById("edit-pessoa");
    if(selPessoa) selPessoa.value = item.pessoa || "isabella";

    const inputData = document.getElementById("edit-data");
    if(inputData) inputData.value = item.data || "";

    const selTipo = document.getElementById("edit-tipo");
    if(selTipo) selTipo.value = item.tipo || "trabalho";

    const selStatus = document.getElementById("edit-status");
    if(selStatus) selStatus.value = item.status || "pendente";

    const valorAtualEl = document.getElementById("edit-valor-atual");
    if(valorAtualEl) {
        valorAtualEl.innerText = `Valor cadastrado: ${formatarValor(Number(item.valor || 0))}`;
    }

    const inputNovoValor = document.getElementById("novo-valor");
    if(inputNovoValor) {
        inputNovoValor.value = "";
    }

    const txtMotivo = document.getElementById("motivo-alteracao");
    if(txtMotivo) {
        txtMotivo.value = item.motivo_alteracao || "";
    }

    modal.style.display = "flex";
}

// fechar modal
function fecharAlteracao(){
    idAlterando = null;
    const modal = document.getElementById("modal-alterar");
    if(modal) modal.style.display = "none";

    const inputNovoValor = document.getElementById("novo-valor");
    if(inputNovoValor) inputNovoValor.value = "";

    const txtMotivo = document.getElementById("motivo-alteracao");
    if(txtMotivo) txtMotivo.value = "";
}

// salvar alteração
async function salvarAlteracao(){
    if(!idAlterando){
        showNotification("warning", "Erro", "Nenhum registro selecionado");
        return;
    }

    const itemOriginal = movimentosCache.find(m => Number(m.id) === Number(idAlterando));
    if(!itemOriginal){
        showNotification("warning", "Erro", "Registro original não encontrado.");
        return;
    }

    const pessoa = document.getElementById("edit-pessoa")?.value || itemOriginal.pessoa;
    const data = document.getElementById("edit-data")?.value || itemOriginal.data;
    const tipo = document.getElementById("edit-tipo")?.value || itemOriginal.tipo;
    const status = document.getElementById("edit-status")?.value || itemOriginal.status;
    const novoValorInput = document.getElementById("novo-valor")?.value ?? "";
    const motivo = (document.getElementById("motivo-alteracao")?.value || "").trim();

    // Objeto de atualização
    const dadosAtualizacao = {
        pessoa: pessoa,
        data: data,
        tipo: tipo,
        status: status,
        motivo_alteracao: motivo || null,
        alterado_em: new Date().toISOString()
    };

    // Regras de negócio solicitadas:
    // - Campo "Valor alterado" vazio = manter valor original.
    // - Campo com novo número = atualizar valor.
    // - Valor 0 informado explicitamente = permitir zerar.
    // - Alterar somente os campos modificados.
    if(novoValorInput.trim() !== ""){
        const num = Number(novoValorInput);
        if(!isNaN(num)){
            dadosAtualizacao.valor = num;
        } else {
            showNotification("warning", "Valor inválido", "Informe um número válido para o valor.");
            return;
        }
    } else {
        // Manter o valor original garantindo que não será zerado
        dadosAtualizacao.valor = Number(itemOriginal.valor);
    }

    const { data: respData, error } = await supabaseClient
        .from("movimentos")
        .update(dadosAtualizacao)
        .eq("id", idAlterando)
        .select();

    if(error){
        console.error("Erro no update:", error);
        showNotification("warning", "Erro", "Não foi possível atualizar: " + error.message);
        return;
    }

    showNotification("success", "Alterado", "Registro atualizado com sucesso");
    fecharAlteracao();

    await carregarDados();
    await carregarHistorico();
    await carregarPendencias();
}

// excluir registro
async function confirmarExclusao(id){
    if(!id) return;

    const item = movimentosCache.find(m => Number(m.id) === Number(id));
    const desc = item ? `${item.pessoa} - ${formatarData(item.data)} (${formatarValor(Number(item.valor))})` : `ID ${id}`;

    const confirmado = confirm(`Deseja realmente excluir este registro?\n\n${desc}\n\nEsta ação não poderá ser desfeita.`);
    if(!confirmado) return;

    const { error } = await supabaseClient
        .from("movimentos")
        .delete()
        .eq("id", id);

    if(error){
        console.error("Erro ao excluir:", error);
        showNotification("warning", "Erro", "Não foi possível excluir o registro: " + error.message);
        return;
    }

    showNotification("success", "Excluído", "Registro removido com sucesso");

    await carregarDados();
    await carregarHistorico();
    await carregarPendencias();
}

