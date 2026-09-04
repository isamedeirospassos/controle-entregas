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
// HISTÓRICO
// ===============================

async function carregarHistorico(){


    const {data,error} =
    await supabaseClient
    .from("movimentos")
    .select("*")
    .order("data",{ascending:false})
    .order("id",{ascending:false});



    if(error){

        console.log(error);
        return;

    }



    const tabela =
    document.getElementById(
        "historico-tabela"
    );



    if(!tabela){

        return;

    }



    tabela.innerHTML="";



    data.forEach(item=>{


        const linha =
        document.createElement("tr");



        let nomePessoa = item.pessoa;

        const nomes = {
            isabella: "Isabella",
            pietro: "Pietro"
        };

        if(nomes[item.pessoa]){
            nomePessoa = nomes[item.pessoa];
        }

        linha.innerHTML=`

        <td>${nomePessoa}</td>

        <td>${formatarData(item.data)}</td>


        <td>

        ${
            item.tipo==="trabalho"

            ?

            `<span class="type-tag work">
            🛵 Trabalho
            </span>`

            :

            `<span class="type-tag pay">
            💰 Pagamento
            </span>`
        }

        </td>


        <td>
        ${formatarValor(Number(item.valor))}
        </td>


        <td>

        ${
            item.status==="pago"

            ?

            `<span class="badge success-badge">
            Pago
            </span>`

            :

            `<span class="badge warning-badge">
            Pendente
            </span>`
        }

        </td>

        <td>

        ${
            item.motivo_alteracao

            ?

            `
            <span class="alteracao-info">
                ✏️ ${item.motivo_alteracao}
            </span>
            `

            :

            `
            <span class="sem-alteracao">
                -
            </span>
            `
        }

        <td>

        <button 
        class="btn btn-outline"
        onclick="abrirAlteracao(${item.id})">

        ✏️ Alterar

        </button>

        </td>

        `;



        tabela.appendChild(linha);


    });


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
// ALTERAR REGISTRO
// ===============================

let idAlterando = null;


// abrir modal

function abrirAlteracao(id){

    console.log("Abrindo alteração ID:", id);

    idAlterando = id;


    const modal = document.getElementById(
        "modal-alterar"
    );


    if(modal){

        modal.style.display = "flex";

    }else{

        console.log("Modal não encontrado");

    }

}



// fechar modal

function fecharAlteracao(){

    idAlterando = null;


    document.getElementById(
        "modal-alterar"
    ).style.display = "none";


    document.getElementById(
        "novo-valor"
    ).value="";


    document.getElementById(
        "motivo-alteracao"
    ).value="";

}



// salvar alteração

async function salvarAlteracao(){

    const novoValor =
    document.getElementById("novo-valor").value;


    const motivo =
    document.getElementById("motivo-alteracao").value;

    const teste = await supabaseClient
    .from("movimentos")
    .select("id, pessoa, data, valor")
    .order("data", {ascending:false});


    console.log("TODOS OS IDS:", teste.data);


    console.log({
        idAlterando,
        novoValor,
        motivo
    });


    const {data,error} =
    await supabaseClient
    .from("movimentos")
    .update({

        valor: Number(novoValor),
        motivo_alteracao: motivo

    })
    .eq(
        "id",
        idAlterando
    )
    .select();


    console.log("UPDATE:", data);
    console.log("ERRO:", error);



    if(error){

        alert(
            "Erro: " + error.message
        );

        return;

    }



    showNotification(
        "success",
        "Alterado",
        "Registro atualizado"
    );


    fecharAlteracao();


    carregarDados();
    carregarHistorico();
    carregarPendencias();


}

