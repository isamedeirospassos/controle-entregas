// ========================================================
// CONTROLE DE ACESSO E ISOLAMENTO DE DADOS (ADMIN vs TESTE)
// ========================================================

const AUTH_STORAGE_KEY = "entrega_user_role";
const ADMIN_PASSWORD_HASH = "506346b7fe7786456aacd09b060918b04fdf0613e3dbd519bfd2c6fd1894a217"; // SHA-256 de 'Snoopy2010@'
const ADMIN_PLAIN_PASSWORD = "Snoopy2010@";

// Chave para simulação local do modo teste no navegador do visitante
const DEMO_MOVIMENTOS_KEY = "demo_local_movimentos";
const DEMO_PRANCHETA_KEY = "demo_local_prancheta";

// Função utilitária para hash SHA-256
async function sha256(str) {
    const buffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Obter papel atual do usuário
function getUserRole() {
    return sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY);
}

// Verificar se é administrador
function isAdmin() {
    return getUserRole() === "admin";
}

// Verificar se é modo teste (convidado)
function isGuest() {
    return getUserRole() === "guest";
}

// Definir papel do usuário
function setUserRole(role, persist = true) {
    if (persist) {
        localStorage.setItem(AUTH_STORAGE_KEY, role);
    }
    sessionStorage.setItem(AUTH_STORAGE_KEY, role);
}

// Logout
function logoutUser() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    window.location.href = "login.html";
}

// Proteger páginas privadas: redirecionar para login.html se não houver papel
function enforceAuth() {
    const role = getUserRole();
    if (!role) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

// Banner / indicador de perfil na barra superior
function renderAuthHeaderBadge() {
    const role = getUserRole();
    if (!role) return;

    const topbar = document.querySelector(".topbar");
    if (!topbar) return;

    const isAdminUser = role === "admin";

    const badgeContainer = document.createElement("div");
    badgeContainer.className = "auth-badge-container";
    badgeContainer.style.display = "inline-flex";
    badgeContainer.style.alignItems = "center";
    badgeContainer.style.gap = "8px";
    badgeContainer.style.marginLeft = "12px";

    badgeContainer.innerHTML = `
        <span style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 600;
            padding: 5px 12px;
            border-radius: 20px;
            background-color: ${isAdminUser ? '#e6f4ea' : '#fff3e0'};
            color: ${isAdminUser ? '#1e8e3e' : '#e65100'};
            border: 1px solid ${isAdminUser ? '#ceead6' : '#ffe0b2'};
        ">
            <i class="ph ${isAdminUser ? 'ph-shield-check' : 'ph-flask'}"></i>
            ${isAdminUser ? 'Administrador (Dados Reais)' : 'Ambiente de Teste (Isolado)'}
        </span>
        <button onclick="logoutUser()" title="Sair da sessão" style="
            background: none;
            border: 1px solid #ebebeb;
            padding: 5px 9px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            color: #757575;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        ">
            <i class="ph ph-sign-out"></i> Sair
        </button>
    `;

    const headerActions = topbar.querySelector(".header-actions") || topbar.lastElementChild;
    if (headerActions && headerActions.parentElement === topbar) {
        headerActions.prepend(badgeContainer);
    } else {
        topbar.appendChild(badgeContainer);
    }
}

// ========================================================
// REPOSITÓRIO SIMULADO PARA O MODO TESTE (DADOS ZERADOS)
// Nenhum visitante vê ou toca no banco Supabase do Administrador!
// ========================================================

const DemoStore = {
    getMovimentos() {
        const raw = sessionStorage.getItem(DEMO_MOVIMENTOS_KEY);
        return raw ? JSON.parse(raw) : [];
    },
    saveMovimentos(lista) {
        sessionStorage.setItem(DEMO_MOVIMENTOS_KEY, JSON.stringify(lista));
    },
    getPrancheta() {
        const raw = sessionStorage.getItem(DEMO_PRANCHETA_KEY);
        return raw ? JSON.parse(raw) : [];
    },
    savePrancheta(lista) {
        sessionStorage.setItem(DEMO_PRANCHETA_KEY, JSON.stringify(lista));
    }
};

// Inicializar na carga da página
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        if (window.location.pathname.endsWith("login.html")) return;
        if (enforceAuth()) {
            renderAuthHeaderBadge();
        }
    });
}
