// --- SMART SELECTOR ---
const $ = id => document.getElementById(id);

// --- DADOS INICIAIS E DBs ---
const defaultPrices = {
    moldura: 0.02, markup: 1.8038,
    materiais: {
        'papel': [ { id: 'fotomate', nome: 'PHOTO MATTE 200 GRS - Fosco', val: 0.1000 }, { id: 'photolustre', nome: 'PHOTO LUSTRE PREMIUM 310 GRS - Semi Brilho', val: 0.1556 }, { id: 'somerset', nome: 'SOMERSET ENHANCED VELVET 330 GRS - Fosco c/ textura', val: 0.2000 }, { id: 'ragphoto', nome: 'RAG PHOTOGRAPHIQUE 310 GRS - Fosco', val: 0.2369 }, { id: 'canson', nome: 'AQUARELLE RAG CANSON 310 GRS - Fosco c/ textura', val: 0.2300 }, { id: 'platine', nome: 'PLATINE FIBRE RAG 310 GRS - Semi Brilho', val: 0.2400 } ],
        'canvas': [ { id: 'policanvas', nome: 'POLICANVAS 260 GRS LEYDA', val: 0.160333 }, { id: 'photoart', nome: 'PHOTO ART PRO CANVAS 395 GRS', val: 0.2808 } ]
    }
};
const defaultQuotes = [ 
    { id: 1, text: "Mesmo a noite mais escura terminará e o sol nascerá.", author: "Victor Hugo" }, 
    { id: 2, text: "A beleza das coisas existe na mente de quem as contempla.", author: "David Hume" }, 
    { id: 3, text: "Somos feitos da mesma matéria dos sonhos.", author: "William Shakespeare" }, 
    { id: 4, text: "Onde há sombra, há também luz.", author: "Vincent van Gogh" }, 
    { id: 5, text: "A simplicidade é o último grau da sofisticação.", author: "Leonardo da Vinci" }, 
    { id: 6, text: "Tudo tem beleza, mas nem todos a veem.", author: "Confúcio" }, 
    { id: 7, text: "A vida não é sobre esperar a tempestade passar, mas aprender a dançar na chuva.", author: "Vivian Greene" }, 
    { id: 8, text: "A luz pensa que viaja mais rápido que tudo, mas está enganada — onde quer que vá, encontra a escuridão primeiro.", author: "Terry Pratchett" }, 
    { id: 9, text: "O essencial é invisível aos olhos.", author: "Antoine de Saint-Exupéry" } 
];
const defaultUsers = [ { user: 'admin', pass: '101214@Crevo' } ];
const moldurasPapel = ['Madeira branca', 'Madeira clara', 'Madeira escura', 'Madeira mel', 'Madeira preta'];
const moldurasCanvas = ['Somente chassis', 'Canaleta branca', 'Canaleta madeira clara', 'Canaleta madeira escura', 'Canaleta madeira mel', 'Canaleta madeira preta'];
const tamanhosPadrao = { 'A4': { w: 21.0, h: 29.7 }, 'A3': { w: 29.7, h: 42.0 }, 'A2': { w: 42.0, h: 59.4 }, 'A1': { w: 59.4, h: 84.1 }, 'A0': { w: 84.1, h: 118.9 } };

let itemsState = []; let itemIdCounter = 0;
let clientesDB = JSON.parse(localStorage.getItem('crevo_clientes')) || [];
let categoriasDB = JSON.parse(localStorage.getItem('crevo_categorias')) || ['Agência', 'Arquitetura', 'Audiovisual', 'Fotografia', 'Galeria', 'Marketing'];
let precosDB = JSON.parse(localStorage.getItem('crevo_prices')) || defaultPrices;
let frasesDB = JSON.parse(localStorage.getItem('crevo_quotes')) || defaultQuotes;
let cuponsDB = JSON.parse(localStorage.getItem('crevo_cupons')) || { 'CREVO10': { tipo: 'percentual', val: 10 } };
let usuariosDB = JSON.parse(localStorage.getItem('crevo_usuarios')) || defaultUsers;
let currentCategoryFilter = 'Todos';

// --- BIOMETRIA HELPERS ---
const b64uEncode = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uDecode = str => {
    const padding = '='.repeat((4 - str.length % 4) % 4);
    const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const buffer = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) buffer[i] = rawData.charCodeAt(i);
    return buffer;
};

// --- INTERFACE E CLIQUES GERAIS ---
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) { e.target.style.display = 'none'; }
    document.querySelectorAll('.frete-dropdown').forEach(el => el.style.display = 'none');
});

document.addEventListener('keydown', function(e) { 
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(modal => modal.style.display = 'none'); 
});

window.abrirDetailConfig = function(id, title) {
    $('config-list-view').style.display = 'none'; $('config-detail-view').style.display = 'flex'; $('detail-config-title').innerText = title;
    ['cfg-biometria', 'cfg-backup', 'cfg-regras', 'cfg-cupons', 'cfg-usuarios'].forEach(el => $(el).style.display = 'none');
    $('cfg-' + id).style.display = 'block';
};
window.fecharDetailConfig = function() {
    $('config-detail-view').style.display = 'none'; $('config-list-view').style.display = 'flex';
};

// --- INICIALIZAÇÃO ---
window.addEventListener('DOMContentLoaded', () => {
    if(localStorage.getItem('crevo_logged_in') === 'true') $('login-overlay').style.display = 'none';
    if(window.PublicKeyCredential && localStorage.getItem('crevo_biometria_id')) {
        $('btn-faceid-login').style.display = 'inline-flex';
        $('btn-faceid-admin').style.display = 'inline-flex';
    }
    gerarNumeroOrcamento(); setarDataHoraAtual(); carregarFrasesSelect(); renderCategoriaSelects(); adicionarItem(); 
    if(!localStorage.getItem('crevo_prices')) sincronizarDadosServidor();
});

// --- BIOMETRIA E LOGIN ---
window.fazerLogin = function() {
    const u = $('login-user').value.trim(); const p = $('login-pass').value.trim();
    const valid = usuariosDB.find(x => x.user === u && x.pass === p);
    if (valid) {
        localStorage.setItem('crevo_logged_in', 'true');
        $('login-overlay').style.display = 'none';
        
        if(window.PublicKeyCredential && !localStorage.getItem('crevo_biometria_id') && window.location.protocol === 'https:') {
            setTimeout(() => { if(confirm("Deseja habilitar o Face ID / Touch ID neste aparelho?")) registrarBiometria(); }, 1000);
        }
    } else { $('login-error').style.display = 'block'; }
};

window.registrarBiometria = async function() {
    if (!window.PublicKeyCredential) return alert("Biometria não suportada neste navegador.");
    try {
        const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
        const userId = new Uint8Array(16); window.crypto.getRandomValues(userId);
        const options = {
            challenge, rp: { name: "CREVO Studio" }, 
            user: { id: userId, name: "admin@crevo.co", displayName: "Admin CREVO" },
            pubKeyCredParams: [{alg: -7, type: "public-key"}, {alg: -257, type: "public-key"}],
            authenticatorSelection: { userVerification: "preferred" }, timeout: 60000
        };
        const credential = await navigator.credentials.create({ publicKey: options });
        localStorage.setItem('crevo_biometria_id', b64uEncode(credential.rawId));
        $('btn-faceid-login').style.display = 'inline-flex';
        $('btn-faceid-admin').style.display = 'inline-flex';
        alert("Biometria ativada com sucesso!");
    } catch(e) { 
        console.error(e); 
        alert("Configuração cancelada ou falhou. Verifique se está acessando o sistema por uma rede segura (HTTPS)."); 
    }
};

window.loginBiometria = async function(isAdmin = false) {
    let savedId = localStorage.getItem('crevo_biometria_id');
    if(!savedId) return alert("Biometria não configurada.");
    try {
        const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
        const options = {
            challenge, allowCredentials: [{ id: b64uDecode(savedId), type: 'public-key' }],
            timeout: 60000, userVerification: "preferred"
        };
        await navigator.credentials.get({ publicKey: options });
        
        if (isAdmin) {
            fecharModalPwd(); abrirModalPrecos();
        } else {
            localStorage.setItem('crevo_logged_in', 'true');
            $('login-overlay').style.display = 'none';
        }
    } catch(e) { console.error(e); alert("Autenticação falhou."); }
};

// --- SINCRONIZAÇÃO NUVEM ---
async function sincronizarDadosServidor() {
    const ts = new Date().getTime(); 
    try {
        let resPrecos = await fetch(`./backup/crevo_precos_backup.json?v=${ts}`);
        if (resPrecos.ok) {
            let data = await resPrecos.json();
            if (data.precos) precosDB = data.precos; else if (data.materiais) precosDB = data;
            if (data.cupons) cuponsDB = data.cupons; if (data.usuarios) usuariosDB = data.usuarios;
            localStorage.setItem('crevo_prices', JSON.stringify(precosDB)); localStorage.setItem('crevo_cupons', JSON.stringify(cuponsDB)); localStorage.setItem('crevo_usuarios', JSON.stringify(usuariosDB));
        }
        let resFrases = await fetch(`./backup/crevo_frases_backup.json?v=${ts}`);
        if (resFrases.ok) {
            let remoteFrases = await resFrases.json(); let idsLocais = frasesDB.map(f => f.id); let novasFrases = remoteFrases.filter(f => !idsLocais.includes(f.id));
            if (novasFrases.length > 0) { frasesDB = [...frasesDB, ...novasFrases]; localStorage.setItem('crevo_quotes', JSON.stringify(frasesDB)); carregarFrasesSelect(); }
        }
        let resClientes = await fetch(`./backup/crevo_clientes_backup.json?v=${ts}`);
        if (resClientes.ok) {
            let remoteClientes = await resClientes.json(); let idsLocais = clientesDB.map(c => c.id); let novosClientes = remoteClientes.filter(c => !idsLocais.includes(c.id));
            if (novosClientes.length > 0) {
                clientesDB = [...clientesDB, ...novosClientes];
                novosClientes.forEach(nc => { if (nc.categoria && !categoriasDB.includes(nc.categoria)) categoriasDB.push(nc.categoria); });
                categoriasDB.sort(); localStorage.setItem('crevo_categorias', JSON.stringify(categoriasDB)); localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB));
                renderCategoriaSelects(); renderCategoryFilters();
            }
        }
        updateAll();
    } catch (err) { console.log("Rodando localmente."); }
}

// --- INTERFACE UTILS ---
window.toggleFreteLinks = function(e, id) { e.preventDefault(); e.stopPropagation(); const drop = $(id); const isOpen = drop.style.display === 'block'; document.querySelectorAll('.frete-dropdown').forEach(el => el.style.display = 'none'); if (!isOpen) drop.style.display = 'block'; };

window.toggleCollapsible = function(id) {
    const el = $(id); const icon = $('icon-' + id);
    if(!el || !icon) return;
    if(el.style.display === 'none') { el.style.display = 'block'; icon.setAttribute('name', 'chevron-up-outline'); } 
    else { el.style.display = 'none'; icon.setAttribute('name', 'chevron-down-outline'); }
};

// --- FORMATADORES ---
function formatDocDisplay(v) {
    if(!v) return '-'; let x = v.replace(/\D/g, '');
    if (x.length <= 11) { if(x.length === 11) { x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } } 
    else { if(x.length === 14) { x = x.replace(/(\d{2})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1/$2'); x = x.replace(/(\d{4})(\d{1,2})$/, '$1-$2'); } }
    return x;
}
function formatDDIPhone(ddi, tel) {
    if (!tel) return '-'; let cleanDDI = ddi ? ddi.toString().replace('.0', '').trim() : '+55'; if (!cleanDDI.startsWith('+')) cleanDDI = '+' + cleanDDI.replace(/\D/g, '');
    let cleanTel = tel.toString().replace(/^55\.0\s*/, '').replace(/[^\d\+]/g, ''); let ddiDigits = cleanDDI.replace('+', '');
    if (cleanTel.startsWith('+'+ddiDigits)) cleanTel = cleanTel.substring(ddiDigits.length+1); else if (cleanTel.startsWith(ddiDigits) && cleanTel.length > 10) cleanTel = cleanTel.substring(ddiDigits.length);
    cleanTel = cleanTel.replace(/\D/g, ''); let maskedTel = cleanTel;
    if (cleanDDI === '+55') { let x = cleanTel.match(/(\d{0,2})(\d{0,5})(\d{0,4})/); if(x) maskedTel = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : ''); } 
    else if (cleanDDI === '+1') { let x = cleanTel.match(/(\d{0,3})(\d{0,3})(\d{0,4})/); if(x) maskedTel = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : ''); } 
    else if (cleanDDI === '+351') { let x = cleanTel.match(/(\d{0,3})(\d{0,3})(\d{0,3})/); if(x) maskedTel = !x[2] ? x[1] : x[1] + (x[2] ? ' ' + x[2] : '') + (x[3] ? ' ' + x[3] : ''); }
    return `${cleanDDI} ${maskedTel}`;
}

function gerarNumeroOrcamento() { $('orcamento-num-input').value = `ORC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`; }
function setarDataHoraAtual() { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); $('orcamento-data-input').value = now.toISOString().slice(0, 16); }

window.extrairInstagram = function(input) { let val = input.value.trim().split('?')[0].replace(/\/$/, ""); if(val.includes('instagram.com/')) val = val.split('instagram.com/')[1]; input.value = val.replace(/^@/, '').replace(/\//g, ''); };

// --- MÁSCARAS ---
window.handlePasteTelefone = function(e) {
    e.preventDefault(); let paste = (e.clipboardData || window.clipboardData).getData('text'); let ddiEl = $(e.target.id === 'cliente-tel' ? 'cliente-ddi' : 'modal-cliente-ddi'); if(!ddiEl) return;
    let ddi = ddiEl.value, ddiNumeric = ddi.replace(/\D/g, ''), clean = paste.replace(/\D/g, ''); 
    if (clean.startsWith(ddiNumeric)) { if (ddi === '+55' && clean.length >= 12) clean = clean.substring(2); else if (ddi === '+1' && clean.length >= 11) clean = clean.substring(1); else if (ddi !== '+55' && ddi !== '+1') clean = clean.substring(ddiNumeric.length); }
    e.target.value = clean; aplicarMascaraTelefone({target: e.target});
};
window.aplicarMascaraTelefone = function(e) {
    let input = e.target; let ddiEl = $(input.id === 'cliente-tel' ? 'cliente-ddi' : 'modal-cliente-ddi'); if(!ddiEl) return;
    let ddi = ddiEl.value, v = (input.value || '').replace(/\D/g, '');
    if (ddi === '+55') { v = v.substring(0, 11); let x = v.match(/(\d{0,2})(\d{0,5})(\d{0,4})/); if(x) input.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : ''); } 
    else if (ddi === '+1') { v = v.substring(0, 10); let x = v.match(/(\d{0,3})(\d{0,3})(\d{0,4})/); if(x) input.value = !x[2] ? x[1] : '(' + x[1] + ') ' + x[2] + (x[3] ? '-' + x[3] : ''); } 
    else if (ddi === '+351') { v = v.substring(0, 9); let x = v.match(/(\d{0,3})(\d{0,3})(\d{0,3})/); if(x) input.value = !x[2] ? x[1] : x[1] + (x[2] ? ' ' + x[2] : '') + (x[3] ? ' ' + x[3] : ''); } 
    else { v = v.substring(0, 15); input.value = v; }
    if(input.id === 'cliente-tel') syncClientData();
};
window.aplicarMascaraDocumento = function(e) {
    let x = (e.target.value || '').replace(/\D/g, '');
    if (x.length <= 11) { let m = x.match(/(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})/); if(m) e.target.value = !m[2] ? m[1] : m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '') + (m[4] ? '-' + m[4] : ''); } 
    else { let m = x.match(/(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})/); if(m) e.target.value = !m[2] ? m[1] : m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '') + (m[4] ? '/' + m[4] : '') + (m[5] ? '-' + m[5] : ''); }
    if(e.target.id === 'cliente-doc') syncClientData();
};
window.aplicarMascaraCEP = function(e, prefix) {
    let x = (e.target.value || '').replace(/\D/g, '').match(/(\d{0,5})(\d{0,3})/); if(x) e.target.value = !x[2] ? x[1] : x[1] + '-' + x[2];
    if(prefix === 'cliente') syncClientData();
    if(e.type === 'input' && e.target.value && e.target.value.length === 9) buscarCEP(e.target.value, prefix);
};

async function buscarCEP(cep, prefix) {
    let cleanCEP = cep.replace(/\D/g, '');
    if(cleanCEP.length === 8) {
        try {
            let res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`); let data = await res.json();
            if(!data.erro) {
                let endInput = $(`${prefix}-endereco`); endInput.value = `${data.logradouro},  - ${data.bairro}`; $(`${prefix}-cidade`).value = `${data.localidade} / ${data.uf}`;
                if(prefix === 'cliente') syncClientData();
                endInput.focus(); setTimeout(() => endInput.setSelectionRange(data.logradouro.length + 2, data.logradouro.length + 2), 50);
            }
        } catch(e) { console.log(e); }
    }
}

// --- ORÇAMENTO CLIENTE ---
window.syncClientData = function() {
    try {
        let nomeCli = $('cliente-nome').value.trim(), docCli = $('cliente-doc').value.trim(), endCli = $('cliente-endereco').value.trim(), cidCli = $('cliente-cidade').value.trim(), cepCli = $('cliente-cep').value.trim();
        $('print-cliente-nome').innerText = nomeCli || 'Não informado'; $('print-cliente-email').innerText = $('cliente-email').value || '-';
        let tel = $('cliente-tel').value; $('print-cliente-tel').innerText = tel ? `${$('cliente-ddi').value} ${tel}` : '-'; $('print-cliente-doc').innerText = docCli || '-';
        
        $('p-print-cep').style.display = cepCli ? 'block' : 'none'; if(cepCli) $('print-cliente-cep').innerText = cepCli;
        $('p-print-endereco').style.display = endCli ? 'block' : 'none'; if(endCli) $('print-cliente-endereco').innerText = endCli;
        $('p-print-cidade').style.display = cidCli ? 'block' : 'none'; if(cidCli) $('print-cliente-cidade').innerText = cidCli;
        
        let sigTexto = nomeCli ? `De acordo (${nomeCli.toUpperCase()})` : 'De acordo (Cliente)';
        if(docCli) sigTexto += `<br>${docCli.replace(/\D/g, '').length > 11 ? 'CNPJ: ' : 'CPF: '}${docCli}`;
        document.querySelectorAll('.sig-cliente-text').forEach(el => el.innerHTML = sigTexto);
    } catch(err) {}
};

window.limparDadosCliente = function() {
    $('cliente-nome').value = ''; $('cliente-email').value = ''; $('cliente-tel').value = ''; $('cliente-doc').value = ''; 
    $('cliente-cep').value = ''; $('cliente-endereco').value = ''; $('cliente-cidade').value = ''; $('cliente-ddi').value = '+55'; 
    syncClientData();
};

// --- CATEGORIAS ---
function renderCategoriaSelects() {
    const selModal = $('modal-cliente-cat'); let currentValModal = selModal.value;
    selModal.innerHTML = '<option value="">Sem categoria</option>'; categoriasDB.forEach(cat => selModal.innerHTML += `<option value="${cat}">${cat}</option>`); selModal.value = currentValModal;
}

let catEditOld = '';
window.abrirModalCategorias = function() { $('categorias-modal').style.display = 'flex'; cancelarEdicaoCategoria(); renderCategoriasAdmin(); };
window.fecharModalCategorias = function() { $('categorias-modal').style.display = 'none'; };
window.cancelarEdicaoCategoria = function() { $('nova-categoria-nome').value = ''; $('lbl-nova-cat').innerText = 'Nova categoria'; $('btn-cancel-edit-cat').style.display = 'none'; catEditOld = ''; };
window.editarCategoriaAdmin = function(nome) { $('nova-categoria-nome').value = nome; $('lbl-nova-cat').innerText = 'Editar categoria'; $('btn-cancel-edit-cat').style.display = 'inline-flex'; catEditOld = nome; };

window.salvarCategoriaAdmin = function() {
    let val = $('nova-categoria-nome').value.trim(); if(!val) return;
    if(catEditOld) { if(catEditOld !== val) { clientesDB.forEach(c => { if(c.categoria === catEditOld) c.categoria = val; }); localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB)); let idx = categoriasDB.indexOf(catEditOld); if(idx > -1) categoriasDB[idx] = val; } } 
    else { if(!categoriasDB.includes(val)) categoriasDB.push(val); }
    categoriasDB.sort(); localStorage.setItem('crevo_categorias', JSON.stringify(categoriasDB));
    cancelarEdicaoCategoria(); renderCategoriasAdmin(); renderCategoriaSelects(); renderCategoryFilters(); renderListClientes($('busca-cliente') ? $('busca-cliente').value : '');
};
window.salvarEUsarCategoriaAdmin = function() { let val = $('nova-categoria-nome').value.trim(); if(!val) return; salvarCategoriaAdmin(); $('modal-cliente-cat').value = val; fecharModalCategorias(); };
window.removerCategoriaAdmin = function(nome) {
    if(confirm(`Excluir a categoria "${nome}"? Clientes vinculados a ela ficarão sem categoria.`)) {
        categoriasDB = categoriasDB.filter(c => c !== nome); clientesDB.forEach(c => { if(c.categoria === nome) c.categoria = ''; });
        localStorage.setItem('crevo_categorias', JSON.stringify(categoriasDB)); localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB));
        renderCategoriasAdmin(); renderCategoriaSelects(); renderCategoryFilters(); renderListClientes($('busca-cliente') ? $('busca-cliente').value : '');
    }
};
function renderCategoriasAdmin() {
    const tb = $('lista-categorias-body'); tb.innerHTML = '';
    categoriasDB.forEach(cat => tb.innerHTML += `<tr><td><strong>${cat}</strong></td><td class="actions-cell"><div class="actions-cell-flex"><button class="btn btn-icon" onclick="editarCategoriaAdmin('${cat}')"><ion-icon name="pencil-outline"></ion-icon></button> <button class="btn btn-icon" style="color:var(--danger-color);" onclick="removerCategoriaAdmin('${cat}')"><ion-icon name="trash-outline"></ion-icon></button></div></td></tr>`);
}

window.renderCategoryFilters = function() {
    const container = $('category-filter-container'); if(!container) return;
    const pastelColors = ['#E6F2FF', '#E6FFE6', '#FFFEE6', '#FFE6FE', '#FFEBE6', '#F2E6FF', '#F2FFE6', '#E6FFFF', '#FFE6E6', '#F0F8FF', '#F5F5DC', '#FFF0F5', '#F5FFFA', '#F0FFF0'];
    let html = `<button class="cat-tag" style="background: ${currentCategoryFilter === 'Todos' ? 'var(--accent-color)' : '#fff'}; color: ${currentCategoryFilter === 'Todos' ? '#fff' : 'var(--text-main)'}; border-color: ${currentCategoryFilter === 'Todos' ? 'var(--accent-color)' : 'var(--border-color)'};" onclick="setCategoryFilter('Todos')">Todos</button>`;
    categoriasDB.forEach((cat, index) => {
        let isActive = currentCategoryFilter === cat; let bgColor = isActive ? 'var(--accent-color)' : pastelColors[index % pastelColors.length]; let color = isActive ? '#fff' : 'var(--text-main)';
        html += `<button class="cat-tag" style="background: ${bgColor}; color: ${color}; border-color: ${isActive ? 'var(--accent-color)' : '#e4e4e4'};" onclick="setCategoryFilter('${cat}')">${cat}</button>`;
    });
    if(clientesDB.some(c => !c.categoria || c.categoria.trim() === '')) {
        let isActive = currentCategoryFilter === 'Sem categoria'; let bgColor = isActive ? 'var(--accent-color)' : '#ffffff'; let color = isActive ? '#fff' : 'var(--text-main)';
        html += `<button class="cat-tag" style="background: ${bgColor}; color: ${color}; border-color: ${isActive ? 'var(--accent-color)' : 'var(--border-color)'};" onclick="setCategoryFilter('Sem categoria')">Sem categoria</button>`;
    }
    container.innerHTML = html;
};
window.setCategoryFilter = function(cat) { currentCategoryFilter = cat; renderCategoryFilters(); renderListClientes($('busca-cliente') ? $('busca-cliente').value : ''); };

// --- CRM DE CLIENTES ---
window.abrirModalClientes = function() { 
    $('client-modal').style.display = 'flex'; fecharDetalhesCliente(); 
    if($('busca-cliente')) $('busca-cliente').value = ''; 
    currentCategoryFilter = 'Todos'; renderCategoryFilters(); renderListClientes(); 
    $('form-add-cliente').style.display = 'none'; $('icon-form-add-cliente').setAttribute('name', 'chevron-down-outline');
};
window.fecharModalClientes = function() { $('client-modal').style.display = 'none'; };
window.cancelarEdicaoClienteModal = function() {
    ['modal-cliente-id','modal-cliente-nome','modal-cliente-email','modal-cliente-tel','modal-cliente-doc','modal-cliente-cep','modal-cliente-endereco','modal-cliente-cidade','modal-cliente-cat','modal-cliente-ig','modal-cliente-obs'].forEach(id => $(id).value = '');
    $('modal-cliente-ddi').value = '+55'; $('modal-cliente-fixo').checked = false;
    $('btn-cancel-edit-client').style.display = 'none'; $('form-add-cliente').style.display = 'none'; $('icon-form-add-cliente').setAttribute('name', 'chevron-down-outline');
};

window.editarClienteModal = function(id) {
    const c = clientesDB.find(x => x.id === id); if(!c) return;
    fecharDetalhesCliente();
    $('modal-cliente-id').value = c.id; $('modal-cliente-nome').value = c.nome || ''; $('modal-cliente-email').value = c.email || '';
    let ddi = c.ddi || '+55'; $('modal-cliente-ddi').value = ddi;
    let telClean = (c.tel || '').toString().replace(/[^\d\+]/g, ''), ddiNum = ddi.replace(/\D/g, ''); 
    if(telClean.startsWith('+'+ddiNum)) telClean = telClean.substring(ddiNum.length+1); else if(telClean.startsWith(ddiNum) && telClean.length > 10) telClean = telClean.substring(ddiNum.length);
    $('modal-cliente-tel').value = telClean.replace(/\D/g, ''); aplicarMascaraTelefone({target: $('modal-cliente-tel')});
    $('modal-cliente-doc').value = c.doc || ''; aplicarMascaraDocumento({target: $('modal-cliente-doc')});
    $('modal-cliente-cep').value = c.cep || ''; aplicarMascaraCEP({target: $('modal-cliente-cep'), type: 'manual'}, 'modal-cliente');
    $('modal-cliente-endereco').value = c.endereco || ''; $('modal-cliente-cidade').value = c.cidade || ''; $('modal-cliente-cat').value = c.categoria || ''; $('modal-cliente-ig').value = c.ig || ''; $('modal-cliente-obs').value = c.observacao || ''; $('modal-cliente-fixo').checked = c.fixo || false;
    $('btn-cancel-edit-client').style.display = 'inline-flex'; $('form-add-cliente').style.display = 'block'; $('icon-form-add-cliente').setAttribute('name', 'chevron-up-outline');
    document.querySelector('#client-modal .modal-content').scrollTop = 0;
};

window.salvarClienteModal = function() {
    const id_edit = $('modal-cliente-id').value, nome = $('modal-cliente-nome').value.trim();
    if (!nome) return alert("O nome é obrigatório.");
    let ig = $('modal-cliente-ig').value.trim(); if(ig.includes('instagram.com/')) ig = ig.split('instagram.com/')[1].split('/')[0].split('?')[0];
    
    const nc = { id: id_edit ? parseInt(id_edit) : Date.now(), nome, email: $('modal-cliente-email').value.trim(), tel: $('modal-cliente-tel').value.trim(), doc: $('modal-cliente-doc').value.trim(), cep: $('modal-cliente-cep').value.trim(), endereco: $('modal-cliente-endereco').value.trim(), cidade: $('modal-cliente-cidade').value.trim(), ddi: $('modal-cliente-ddi').value, categoria: $('modal-cliente-cat').value.trim(), ig: ig.replace(/^@/, ''), observacao: $('modal-cliente-obs').value.trim(), fixo: $('modal-cliente-fixo').checked };
    
    if (id_edit) { let idx = clientesDB.findIndex(c => c.id === parseInt(id_edit)); if(idx >= 0) clientesDB[idx] = nc; } else clientesDB.push(nc);
    localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB)); cancelarEdicaoClienteModal(); renderCategoryFilters(); renderListClientes($('busca-cliente') ? $('busca-cliente').value : ''); alert("Cliente salvo localmente!");
};

window.salvarClienteAtual = function() {
    const nome = $('cliente-nome').value.trim(), doc = $('cliente-doc').value.trim();
    if (!nome) return alert("O nome é obrigatório.");
    let nc = { id: Date.now(), nome, email: $('cliente-email').value.trim(), tel: $('cliente-tel').value.trim(), doc, cep: $('cliente-cep').value.trim(), endereco: $('cliente-endereco').value.trim(), cidade: $('cliente-cidade').value.trim(), ddi: $('cliente-ddi').value, categoria: '', ig: '', observacao: '', fixo: false };
    let idx = clientesDB.findIndex(c => (doc && c.doc===doc) || (!doc && c.nome.toLowerCase()===nome.toLowerCase()));
    if (idx >= 0) { let existing = clientesDB[idx]; nc.id = existing.id; nc.categoria = existing.categoria || ''; nc.ig = existing.ig || ''; nc.observacao = existing.observacao || ''; nc.fixo = existing.fixo || false; clientesDB[idx] = nc; alert("Cadastro atualizado localmente!"); } 
    else { clientesDB.push(nc); alert("Novo cliente salvo localmente!"); }
    localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB));
};

window.limparTodosClientesAdmin = function() {
    if(clientesDB.length === 0) return alert("Nenhum cliente no banco.");
    let pwd = prompt("Digite a senha administrativa para APAGAR TODOS OS CONTATOS:");
    if(pwd === '101214@Crevo') { if(confirm(`Certeza? Apagar ${clientesDB.length} clientes?`)) { clientesDB = []; localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB)); renderCategoryFilters(); renderListClientes(); alert("Apagados."); } } else if (pwd !== null) { alert("Senha incorreta."); }
};

window.renderListClientes = function(busca = '') {
    const container = $('client-list-container'); container.innerHTML = '';
    if(clientesDB.length === 0) { $('total-clientes-footer').innerText = '0'; container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum cliente cadastrado.</div>`; return; }
    
    let term = busca.toLowerCase().trim();
    let filtered = clientesDB.filter(c => {
        let matchBusca = (c.nome && c.nome.toLowerCase().includes(term)) || (c.email && c.email.toLowerCase().includes(term)) || (c.doc && c.doc.toLowerCase().includes(term));
        let matchCat = currentCategoryFilter === 'Todos' || (c.categoria === currentCategoryFilter);
        if (currentCategoryFilter === 'Sem categoria') matchCat = !c.categoria || c.categoria.trim() === '';
        return matchBusca && matchCat;
    });
    
    $('total-clientes-footer').innerText = filtered.length;
    if(filtered.length === 0) { container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhum cliente encontrado para "${busca}".</div>`; return; }
    
    let html = '';
    [...filtered].sort((a,b) => a.nome.localeCompare(b.nome)).forEach(c => {
        html += `
        <div class="ios-list-item" onclick="abrirDetalhesCliente(${c.id})">
            <div class="ios-list-title">${c.nome} ${c.fixo ? `<span title="Cliente Fixo" style="color: #FFB300; font-size: 1.1rem;">★</span>` : ''}</div>
            <div class="ios-list-actions">
                <button class="btn-icon" style="color:var(--success-color); padding: 4px;" onclick="event.stopPropagation(); usarCliente(${c.id})"><ion-icon name="checkmark-circle-outline" style="font-size: 24px;"></ion-icon></button>
                <ion-icon name="chevron-forward-outline" style="color:var(--text-muted); font-size: 20px;"></ion-icon>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

window.abrirDetalhesCliente = function(id) {
    const c = clientesDB.find(x => x.id === id); if(!c) return;
    $('crm-list-view').style.display = 'none'; $('crm-detail-view').style.display = 'flex'; $('detail-client-name').innerText = c.nome;
    $('crm-detail-content').innerHTML = `
        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; margin-bottom: 24px; font-size: 0.95rem; line-height: 1.8;">
            <p><strong style="color: var(--text-muted);">Email:</strong><br>${c.email || '-'}</p>
            <p><strong style="color: var(--text-muted);">Telefone:</strong><br>${formatDDIPhone(c.ddi, c.tel)}</p>
            <p><strong style="color: var(--text-muted);">Documento:</strong><br>${formatDocDisplay(c.doc)}</p>
            <p><strong style="color: var(--text-muted);">CEP:</strong><br>${c.cep || '-'}</p>
            <p><strong style="color: var(--text-muted);">Endereço:</strong><br>${c.endereco || '-'}</p>
            <p><strong style="color: var(--text-muted);">Cidade / UF:</strong><br>${c.cidade || '-'}</p>
            <p><strong style="color: var(--text-muted);">Categoria:</strong><br>${c.categoria || '-'}</p>
            <p><strong style="color: var(--text-muted);">Instagram:</strong><br>${c.ig ? '@'+c.ig : '-'}</p>
            <p><strong style="color: var(--text-muted);">Observação:</strong><br>${c.observacao || '-'}</p>
            <p><strong style="color: var(--text-muted);">Fixo:</strong><br>${c.fixo ? 'Sim ★' : 'Não'}</p>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn" style="flex: 1; min-width: 100%;" onclick="usarCliente(${c.id})"><ion-icon name="checkmark-outline"></ion-icon> Usar no Orçamento</button>
            <button class="btn btn-outline" style="flex: 1; min-width: 140px;" onclick="editarClienteModal(${c.id})"><ion-icon name="pencil-outline"></ion-icon> Editar Cliente</button>
            <button class="btn btn-danger" style="flex: 1; min-width: 140px;" onclick="excluirCliente(${c.id});"><ion-icon name="trash-outline"></ion-icon> Apagar Cliente</button>
        </div>
    `;
};

window.fecharDetalhesCliente = function() { $('crm-detail-view').style.display = 'none'; $('crm-list-view').style.display = 'flex'; };

window.usarCliente = function(id) {
    try {
        const c = clientesDB.find(x => x.id === id); if(!c) return;
        $('cliente-nome').value = c.nome || ''; $('cliente-email').value = c.email || '';
        let ddi = c.ddi || '+55'; $('cliente-ddi').value = ddi;
        let telClean = (c.tel || '').toString().replace(/[^\d\+]/g, ''), ddiNum = ddi.replace(/\D/g, '');
        if(telClean.startsWith('+'+ddiNum)) telClean = telClean.substring(ddiNum.length+1); else if(telClean.startsWith(ddiNum) && telClean.length > 10) telClean = telClean.substring(ddiNum.length);
        $('cliente-tel').value = telClean.replace(/\D/g, ''); aplicarMascaraTelefone({target: $('cliente-tel')});
        $('cliente-doc').value = c.doc || ''; aplicarMascaraDocumento({target: $('cliente-doc')});
        $('cliente-cep').value = c.cep || ''; aplicarMascaraCEP({target: $('cliente-cep'), type: 'manual'}, 'cliente');
        $('cliente-endereco').value = c.endereco || ''; $('cliente-cidade').value = c.cidade || '';
        syncClientData(); fecharModalClientes();
    } catch(err) { console.error(err); fecharModalClientes(); }
};

window.excluirCliente = function(id) { 
    if(confirm("Deseja excluir permanentemente este cliente do banco de dados?")) { 
        clientesDB = clientesDB.filter(x => x.id!==id); localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB)); renderCategoryFilters(); renderListClientes($('busca-cliente') ? $('busca-cliente').value : ''); fecharDetalhesCliente();
    } 
};

window.exportarClientes = function(type) { 
    if(type === 'json') baixarArquivo(JSON.stringify(clientesDB), "crevo_clientes_backup.json", "text/json;charset=utf-8;");
    else if(type === 'csv') { let csv = "\uFEFFID,Nome,Email,Telefone,Documento,CEP,Endereco,Cidade,DDI,Categoria,Instagram,Observacao,ClienteFixo\n"; clientesDB.forEach(c => { let row = [ c.id, c.nome, c.email, c.tel, c.doc, c.cep, c.endereco, c.cidade, c.ddi, c.categoria, c.ig, c.observacao, c.fixo ? 'Sim' : 'Nao' ]; csv += row.map(v => `"${(v||'').toString().replace(/"/g, '""')}"`).join(',') + "\n"; }); baixarArquivo(csv, "crevo_clientes_backup.csv", "text/csv;charset=utf-8;"); }
};
window.importarClientes = function(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(evt) { const txt = evt.target.result; if(file.name.endsWith('.json')) { try { let d = JSON.parse(txt); if(Array.isArray(d)) mesclarClientes(d); } catch(err) { alert("Erro JSON."); } } else if (file.name.endsWith('.csv')) { alert("Importação de CSV apenas pelo JSON para manter consistência de tipos."); } }; reader.readAsText(file); e.target.value = ""; };

function mesclarClientes(novos) {
    let ids = novos.map(n => n.id); clientesDB = clientesDB.filter(c => !ids.includes(c.id)).concat(novos);
    let catToUpdate = false; novos.forEach(nc => { if(nc.categoria && !categoriasDB.includes(nc.categoria)) { categoriasDB.push(nc.categoria); catToUpdate = true; } });
    if(catToUpdate) { categoriasDB.sort(); localStorage.setItem('crevo_categorias', JSON.stringify(categoriasDB)); renderCategoriaSelects(); }
    localStorage.setItem('crevo_clientes', JSON.stringify(clientesDB)); renderCategoryFilters(); renderListClientes($('busca-cliente') ? $('busca-cliente').value : ''); alert("Backup importado com sucesso!");
}

// --- ADMIN E PRECIFICAÇÃO ---
window.abrirModalPwd = function() { $('pwd-modal').style.display = 'flex'; $('admin-pwd').value = ''; };
window.fecharModalPwd = function() { $('pwd-modal').style.display = 'none'; };
window.checkPwd = function() { if($('admin-pwd').value === '101214@Crevo') { fecharModalPwd(); abrirModalPrecos(); } else alert("Senha incorreta."); };

function abrirModalPrecos() {
    $('prices-modal').style.display = 'flex';
    $('base-custo-moldura').value = precosDB.moldura; $('base-markup-moldura').value = precosDB.markup;
    const cont = $('config-materiais-lista'); cont.innerHTML = '';
    ['papel', 'canvas'].forEach(tipo => precosDB.materiais[tipo].forEach(mat => cont.innerHTML += `<div><label>${mat.nome}</label><input type="number" step="0.000001" id="mat-${mat.id}" value="${mat.val}"></div>`));
    renderCuponsAdmin(); renderUsuariosAdmin();
}
window.fecharModalPrecos = function() { $('prices-modal').style.display = 'none'; };

window.salvarPrecos = function() {
    precosDB.moldura = parseFloat($('base-custo-moldura').value) || 0; precosDB.markup = parseFloat($('base-markup-moldura').value) || 0;
    ['papel', 'canvas'].forEach(tipo => precosDB.materiais[tipo].forEach(mat => mat.val = parseFloat($(`mat-${mat.id}`).value) || 0));
    localStorage.setItem('crevo_prices', JSON.stringify(precosDB)); updateAll(); alert("Salvo localmente! Lembre-se de baixar o Backup JSON e subir no GitHub.");
};

window.exportarPrecos = function() { baixarArquivo(JSON.stringify({precos: precosDB, cupons: cuponsDB, usuarios: usuariosDB}), "crevo_precos_backup.json", "text/json;charset=utf-8;"); };
window.importarPrecos = function(e) {
    const file = e.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(evt) { 
        try { 
            let data = JSON.parse(evt.target.result); 
            if(data && (data.precos || data.materiais)) { precosDB = data.precos || data; localStorage.setItem('crevo_prices', JSON.stringify(precosDB)); if(data.cupons) { cuponsDB = data.cupons; localStorage.setItem('crevo_cupons', JSON.stringify(cuponsDB)); } if(data.usuarios) { usuariosDB = data.usuarios; localStorage.setItem('crevo_usuarios', JSON.stringify(usuariosDB)); } fecharModalPrecos(); updateAll(); alert("Sistema importado!"); } else alert("Arquivo inválido.");
        } catch(err) { alert("Erro de leitura."); } 
    }; reader.readAsText(file); e.target.value = "";
};

function renderCuponsAdmin() {
    const tb = $('lista-cupons-body'); tb.innerHTML = '';
    for (let cod in cuponsDB) {
        let c = cuponsDB[cod], display = c.tipo === 'percentual' ? `${c.val}%` : `R$ ${c.val}`;
        tb.innerHTML += `<tr><td><strong>${cod}</strong></td><td>${c.tipo === 'percentual' ? 'Percentual' : 'Fixo'}</td><td style="font-weight:600;">${display}</td><td class="actions-cell"><div class="actions-cell-flex"><button class="btn btn-icon" onclick="editarCupomAdmin('${cod}')"><ion-icon name="pencil-outline"></ion-icon></button> <button class="btn btn-icon" style="color:var(--danger-color);" onclick="removerCupomAdmin('${cod}')"><ion-icon name="trash-outline"></ion-icon></button></div></td></tr>`;
    }
}
window.editarCupomAdmin = function(cod) { const c = cuponsDB[cod]; if(!c) return; $('novo-cupom-cod').value = cod; $('novo-cupom-tipo').value = c.tipo; $('novo-cupom-val').value = c.val; $('modal-cupom-old-cod').value = cod; $('btn-cancel-edit-cupom').style.display = 'inline-flex'; };
window.cancelarEdicaoCupom = function() { $('novo-cupom-cod').value = ''; $('novo-cupom-tipo').value = 'percentual'; $('novo-cupom-val').value = ''; $('modal-cupom-old-cod').value = ''; $('btn-cancel-edit-cupom').style.display = 'none'; };
window.adicionarCupomAdmin = function() {
    const cod = $('novo-cupom-cod').value.trim().toUpperCase(), tipo = $('novo-cupom-tipo').value, val = parseFloat($('novo-cupom-val').value), oldCod = $('modal-cupom-old-cod') ? $('modal-cupom-old-cod').value : '';
    if(!cod || isNaN(val)) return alert("Preencha código e valor.");
    if(oldCod && oldCod !== cod) delete cuponsDB[oldCod];
    cuponsDB[cod] = { tipo: tipo, val: val }; localStorage.setItem('crevo_cupons', JSON.stringify(cuponsDB)); cancelarEdicaoCupom(); renderCuponsAdmin(); updateAll();
};
window.removerCupomAdmin = function(cod) { if(confirm("Excluir este cupom?")) { delete cuponsDB[cod]; localStorage.setItem('crevo_cupons', JSON.stringify(cuponsDB)); renderCuponsAdmin(); updateAll(); } };

function renderUsuariosAdmin() {
    const tb = $('lista-usuarios-body'); tb.innerHTML = '';
    usuariosDB.forEach(u => tb.innerHTML += `<tr><td><strong>${u.user}</strong></td><td>••••••••</td><td class="actions-cell"><div class="actions-cell-flex"><button class="btn btn-icon" onclick="editarUsuarioAdmin('${u.user}')"><ion-icon name="pencil-outline"></ion-icon></button> <button class="btn btn-icon" style="color:var(--danger-color);" onclick="removerUsuarioAdmin('${u.user}')"><ion-icon name="trash-outline"></ion-icon></button></div></td></tr>`);
}
window.editarUsuarioAdmin = function(username) { const u = usuariosDB.find(x => x.user === username); if(!u) return; $('novo-usuario-user').value = u.user; $('novo-usuario-pass').value = u.pass; $('modal-usuario-old-user').value = u.user; $('btn-cancel-edit-usuario').style.display = 'inline-flex'; };
window.cancelarEdicaoUsuario = function() { $('novo-usuario-user').value = ''; $('novo-usuario-pass').value = ''; $('modal-usuario-old-user').value = ''; $('btn-cancel-edit-usuario').style.display = 'none'; };
window.salvarUsuarioAdmin = function() {
    const user = $('novo-usuario-user').value.trim(), pass = $('novo-usuario-pass').value.trim(), oldUser = $('modal-usuario-old-user').value;
    if(!user || !pass) return alert("Preencha usuário e senha.");
    if(oldUser && oldUser !== user) usuariosDB = usuariosDB.filter(x => x.user !== oldUser);
    const existingIdx = usuariosDB.findIndex(x => x.user === user); if(existingIdx >= 0) usuariosDB[existingIdx].pass = pass; else usuariosDB.push({ user, pass });
    localStorage.setItem('crevo_usuarios', JSON.stringify(usuariosDB)); cancelarEdicaoUsuario(); renderUsuariosAdmin();
};
window.removerUsuarioAdmin = function(username) { if(usuariosDB.length <= 1) return alert("Não é possível excluir o último usuário."); if(confirm(`Excluir o acesso de "${username}"?`)) { usuariosDB = usuariosDB.filter(x => x.user !== username); localStorage.setItem('crevo_usuarios', JSON.stringify(usuariosDB)); renderUsuariosAdmin(); } };

// --- FRASES DE RODAPÉ (DRILL-DOWN IOS) ---
function formatarFrase(f) { return `“${f.text}” — ${f.author}`; }
function carregarFrasesSelect() { const select = $('frase-selecionada'); select.innerHTML = ''; frasesDB.forEach(f => select.innerHTML += `<option value="${f.id}">${formatarFrase(f)}</option>`); if(frasesDB.length > 0) select.value = frasesDB[Math.floor(Math.random() * frasesDB.length)].id; }

window.abrirModalFrases = function() { 
    $('quotes-modal').style.display = 'flex'; fecharDetalhesFrase(); cancelarEdicaoFrase(); renderizarFrases(); 
    $('form-add-frase').style.display = 'none'; $('icon-form-add-frase').setAttribute('name', 'chevron-down-outline');
};
window.fecharModalFrases = function() { $('quotes-modal').style.display = 'none'; carregarFrasesSelect(); };

window.cancelarEdicaoFrase = function() { 
    $('modal-frase-id').value = ''; $('nova-frase-texto').value = ''; $('nova-frase-autor').value = ''; 
    $('btn-cancel-edit-frase').style.display = 'none'; $('form-add-frase').style.display = 'none'; $('icon-form-add-frase').setAttribute('name', 'chevron-down-outline'); 
};

window.editarFrase = function(id) { 
    const fr = frasesDB.find(f => f.id === id); if(!fr) return; 
    fecharDetalhesFrase();
    $('modal-frase-id').value = fr.id; $('nova-frase-texto').value = fr.text; $('nova-frase-autor').value = fr.author; 
    $('btn-cancel-edit-frase').style.display = 'inline-flex'; $('form-add-frase').style.display = 'block'; $('icon-form-add-frase').setAttribute('name', 'chevron-up-outline'); 
};

window.salvarFraseModal = function() {
    const id_edit = $('modal-frase-id').value, txt = $('nova-frase-texto').value.trim(), aut = $('nova-frase-autor').value.trim();
    if(!txt || !aut) return alert("Preencha frase e autor.");
    const nf = { id: id_edit ? parseInt(id_edit) : Date.now(), text: txt.replace(/["“”]/g, ''), author: aut };
    if (id_edit) { let idx = frasesDB.findIndex(f => f.id === parseInt(id_edit)); if(idx >= 0) frasesDB[idx] = nf; } else frasesDB.push(nf);
    localStorage.setItem('crevo_quotes', JSON.stringify(frasesDB)); cancelarEdicaoFrase(); renderizarFrases(); carregarFrasesSelect();
};

window.renderizarFrases = function() {
    const container = $('quotes-list-container'); container.innerHTML = '';
    if(frasesDB.length === 0) { container.innerHTML = `<div style="text-align:center; padding: 20px; color: var(--text-muted);">Nenhuma frase cadastrada.</div>`; return; }
    
    let html = '';
    frasesDB.forEach(f => {
        html += `
        <div class="ios-list-item" onclick="abrirDetalhesFrase(${f.id})">
            <div class="ios-list-title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%; display: block; font-style: italic; font-weight: normal;">“${f.text}”</div>
            <div class="ios-list-actions">
                <ion-icon name="chevron-forward-outline" style="color:var(--text-muted); font-size: 20px;"></ion-icon>
            </div>
        </div>`;
    });
    container.innerHTML = html;
};

window.abrirDetalhesFrase = function(id) {
    const f = frasesDB.find(x => x.id === id); if(!f) return;
    $('frases-list-view').style.display = 'none'; $('frases-detail-view').style.display = 'flex'; $('detail-frase-title').innerText = "Detalhes da Frase";
    $('frases-detail-content').innerHTML = `
        <div style="background: var(--bg-color); padding: 20px; border-radius: 12px; margin-bottom: 24px; font-size: 1.05rem; line-height: 1.6; font-style: italic;">
            “${f.text}”<br><br>
            <strong style="color: var(--text-main); font-style: normal;">— ${f.author}</strong>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn btn-outline" style="flex: 1; min-width: 140px;" onclick="editarFrase(${f.id})"><ion-icon name="pencil-outline"></ion-icon> Editar Frase</button>
            <button class="btn btn-danger" style="flex: 1; min-width: 140px;" onclick="excluirFrase(${f.id})"><ion-icon name="trash-outline"></ion-icon> Apagar Frase</button>
        </div>
    `;
};

window.fecharDetalhesFrase = function() { $('frases-detail-view').style.display = 'none'; $('frases-list-view').style.display = 'flex'; };

window.excluirFrase = function(id) { 
    if(confirm("Deseja apagar esta frase?")) {
        frasesDB = frasesDB.filter(f => f.id !== id); localStorage.setItem('crevo_quotes', JSON.stringify(frasesDB)); renderizarFrases(); fecharDetalhesFrase();
    } 
};

window.exportarFrases = function() { baixarArquivo(JSON.stringify(frasesDB), "crevo_frases_backup.json", "text/json;charset=utf-8;"); };
window.importarFrases = function(e) { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(evt) { try { let data = JSON.parse(evt.target.result); if(Array.isArray(data)) { frasesDB = data; localStorage.setItem('crevo_quotes', JSON.stringify(frasesDB)); renderizarFrases(); alert("Frases importadas!"); } else alert("Arquivo inválido."); } catch(err) { alert("Erro de leitura."); } }; reader.readAsText(file); e.target.value = ""; };

function baixarArquivo(content, filename, type) { const blob = new Blob([content], { type: type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }

// --- ITENS DO ORÇAMENTO ---
window.adicionarItem = function() { itemIdCounter++; itemsState.push({ id: itemIdCounter, tipo: 'canvas', materialId: 'policanvas', tamanhoSelect: '', w: '', h: '', comMoldura: false, tipoMoldura: 'Somente chassis', qtd: 1 }); renderItems(); updateAll(); };
window.removerItem = function(id) { itemsState = itemsState.filter(i => i.id !== id); renderItems(); updateAll(); };
window.duplicarItem = function(id) { const ori = itemsState.find(i => i.id === id); if(ori) { itemIdCounter++; itemsState.push({...ori, id: itemIdCounter}); renderItems(); updateAll(); } };
window.limparTudo = function() { if(confirm("Limpar todo o orçamento?")) { itemsState = []; limparDadosCliente(); gerarNumeroOrcamento(); setarDataHoraAtual(); $('input-desconto').value=''; $('msg-cupom').innerText=''; $('valor-acrescimo').value='0'; $('valor-frete').value='0'; adicionarItem(); carregarFrasesSelect(); } };

function renderItems() {
    const cont = $('items-container'); cont.innerHTML = '';
    itemsState.forEach((item, index) => {
        let matOptions = precosDB.materiais[item.tipo].map(m => `<option value="${m.id}" ${item.materialId===m.id?'selected':''}>${m.nome}</option>`).join('');
        let sizeOptions = `<option value="" disabled ${item.tamanhoSelect===''?'selected':''}>Selecione...</option><option value="personalizado" ${item.tamanhoSelect==='personalizado'?'selected':''}>Personalizado</option>`;
        for (const [k, v] of Object.entries(tamanhosPadrao)) sizeOptions += `<option value="${k}" ${item.tamanhoSelect===k?'selected':''}>${k} (${v.w}x${v.h})</option>`;
        const frameOptions = (item.tipo==='papel'?moldurasPapel:moldurasCanvas).map(m => `<option value="${m}" ${item.tipoMoldura===m?'selected':''}>${m}</option>`).join('');

        cont.innerHTML += `
            <div class="item-card" id="card-${item.id}">
                <h3 style="margin-bottom: 20px; font-size: 1.25rem; display: flex; justify-content: space-between; text-transform: none;"><span>Item ${index + 1}</span></h3>
                <div class="grid-4">
                    <div><label>Tipo</label><select onchange="updateItemState(${item.id}, 'tipo', this.value)"><option value="papel" ${item.tipo==='papel'?'selected':''}>Papel Fine Art</option><option value="canvas" ${item.tipo==='canvas'?'selected':''}>Canvas</option></select></div>
                    <div style="grid-column: span 2;"><label>Material</label><select onchange="updateItemState(${item.id}, 'materialId', this.value)">${matOptions}</select></div>
                    <div><label>Quantidade</label><input type="number" min="1" value="${item.qtd}" onchange="updateItemState(${item.id}, 'qtd', this.value)"></div>
                </div>
                <div class="grid-3">
                    <div><label>Tamanhos padrão</label><select onchange="updateItemSize(${item.id}, this.value)">${sizeOptions}</select></div>
                    <div class="medidas-container" style="grid-column: span 2;">
                        <div class="medidas-input"><label>Largura (cm)</label><input type="number" step="0.1" value="${item.w}" onchange="updateItemState(${item.id}, 'w', this.value)"></div>
                        <button class="swap-btn" title="Inverter medidas" onclick="inverterMedidas(${item.id})"><ion-icon name="swap-horizontal-outline"></ion-icon></button>
                        <div class="medidas-input"><label>Altura (cm)</label><input type="number" step="0.1" value="${item.h}" onchange="updateItemState(${item.id}, 'h', this.value)"></div>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="checkbox-group"><input type="checkbox" id="frame-check-${item.id}" ${item.comMoldura?'checked':''} onchange="updateItemState(${item.id}, 'comMoldura', this.checked)"><label for="frame-check-${item.id}" style="margin:0; cursor:pointer;">${item.tipo==='papel'?'Adicionar moldura':'Adicionar chassi / moldura'}</label></div>
                    <div><select onchange="updateItemState(${item.id}, 'tipoMoldura', this.value)" style="display: ${item.comMoldura?'block':'none'}">${frameOptions}</select></div>
                </div>
                <div class="item-actions"><button class="btn btn-outline btn-small" onclick="duplicarItem(${item.id})"><ion-icon name="copy-outline"></ion-icon> Duplicar</button><button class="btn btn-outline btn-small" style="color:var(--danger-color); border-color:var(--border-color);" onclick="removerItem(${item.id})"><ion-icon name="trash-outline"></ion-icon> Remover</button></div>
            </div>`;
    });
}

window.updateItemState = function(id, f, v) {
    const i = itemsState.find(x => x.id===id); if(!i) return;
    if(f==='tipo' && i.tipo!==v) { i.tipo=v; i.materialId=precosDB.materiais[v][0].id; i.comMoldura=false; i.tipoMoldura=v==='papel'?moldurasPapel[0]:moldurasCanvas[0]; renderItems(); }
    else { if(f==='w'||f==='h'||f==='qtd') { v = v === '' ? '' : parseFloat(v) || 0; i.tamanhoSelect='personalizado'; } i[f] = v; if(f==='comMoldura'||f==='w'||f==='h') renderItems(); }
    updateAll();
};
window.updateItemSize = function(id, v) { const i = itemsState.find(x => x.id===id); i.tamanhoSelect = v; if(v && v!=='personalizado') { i.w = tamanhosPadrao[v].w; i.h = tamanhosPadrao[v].h; } renderItems(); updateAll(); };
window.inverterMedidas = function(id) { const i = itemsState.find(x => x.id===id); let t=i.w; i.w=i.h; i.h=t; i.tamanhoSelect='personalizado'; renderItems(); updateAll(); };

// --- CALCULADORA E CUPOM ---
window.updateAll = function() {
    let tImp = 0, tMol = 0; const tb = $('resume-body'); tb.innerHTML = '';
    itemsState.forEach((i, idx) => {
        let area = 0, pUnitImp = 0, pUnitMol = 0; const mat = precosDB.materiais[i.tipo].find(m => m.id===i.materialId);
        if(i.w !== '' && i.h !== '') { area = i.w * i.h; pUnitImp = area * (mat?mat.val:0); if(i.comMoldura) pUnitMol = (area * precosDB.moldura) * precosDB.markup; }
        const sub = (pUnitImp + pUnitMol) * i.qtd; tImp += (pUnitImp * i.qtd); tMol += (pUnitMol * i.qtd);
        let desc = `${mat?mat.nome:'Material'}, ${i.w===''?'?':i.w}x${i.h===''?'?':i.h} cm`; if(i.comMoldura) desc += ` — com ${i.tipoMoldura.toLowerCase()}`;
        tb.innerHTML += `<tr><td><strong>Item ${idx+1}</strong></td><td>${desc}</td><td style="text-align:center;">${i.qtd}</td><td class="money">${fBRL(pUnitImp+pUnitMol)}</td><td class="money">${fBRL(sub)}</td></tr>`;
    });
    if(itemsState.length===0) tb.innerHTML = `<tr><td colspan="5" style="text-align:center;">Nenhum item</td></tr>`;

    let inputDesc = $('input-desconto').value.trim().toUpperCase(), des = 0, msgCupom = $('msg-cupom'); msgCupom.innerText = '';
    if(inputDesc !== '') {
        if(cuponsDB[inputDesc]) {
            let c = cuponsDB[inputDesc]; if(c.tipo === 'percentual') { des = (tImp + tMol) * (c.val / 100); msgCupom.innerText = `✅ Cupom aplicado: ${c.val}% OFF`; } else { des = c.val; msgCupom.innerText = `✅ Cupom aplicado: R$ ${fBRL(c.val).replace('R$','').trim()} OFF`; }
            msgCupom.style.color = 'var(--success-color)';
        } else { msgCupom.innerText = '❌ Cupom inválido.'; msgCupom.style.color = 'var(--danger-color)'; des = 0; }
    }

    const acr = parseFloat($('valor-acrescimo').value)||0, fre = parseFloat($('valor-frete').value)||0, ger = (tImp + tMol + acr + fre) - des;
    
    ['tot-impressao','print-tot-impressao'].forEach(id=>$(id).innerText=fBRL(tImp)); ['tot-moldura','print-tot-moldura'].forEach(id=>$(id).innerText=fBRL(tMol)); 
    ['tot-geral','print-tot-geral'].forEach(id=>$(id).innerText=fBRL(Math.max(ger,0))); ['tot-desc','print-tot-desc'].forEach(id=>$(id).innerText='- '+fBRL(des)); 
    ['tot-acres','print-tot-acres'].forEach(id=>$(id).innerText='+ '+fBRL(acr)); ['tot-frete','print-tot-frete'].forEach(id=>$(id).innerText='+ '+fBRL(fre));
    
    ['row-desc','print-row-desc'].forEach(id=>$(id).style.display=des>0?'flex':'none'); 
    ['row-acres','print-row-acres'].forEach(id=>$(id).style.display=acr>0?'flex':'none'); 
    ['row-frete','print-row-frete'].forEach(id=>$(id).style.display=fre>0?'flex':'none');
};
function fBRL(v) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

window.imprimirPDF = function() {
    if(itemsState.length===0) return alert('Adicione um item.');
    let wEmpty = itemsState.some(i => i.w === '' || i.h === ''); if(wEmpty && !confirm('Existem itens sem largura/altura definidos (valor R$ 0,00). Deseja imprimir assim mesmo?')) return;
    
    $('print-orcamento-num').innerText = $('orcamento-num-input').value; const dInput = $('orcamento-data-input').value;
    if(dInput) { const [dp, tp] = dInput.split('T'); const [y, m, d] = dp.split('-'); $('print-orcamento-data').innerText = `${d}/${m}/${y} ${tp}`; } else $('print-orcamento-data').innerText = '-';
    
    const fraseId = $('frase-selecionada').value, fr = frasesDB.find(f => f.id == fraseId); $('quote-footer').innerText = fr ? formatarFrase(fr) : '';
    syncClientData(); updateAll(); 
    
    const originalTitle = document.title, nomeCliente = $('cliente-nome').value.trim(), nomeArquivo = nomeCliente ? `Orcamento-${nomeCliente.replace(/\s+/g, '-')}-CREVO` : `Orcamento-Cliente-CREVO`; document.title = nomeArquivo;
    
    setTimeout(() => {
        window.print();
        window.addEventListener('afterprint', function onAfterPrint() { document.title = originalTitle; window.removeEventListener('afterprint', onAfterPrint); });
        setTimeout(() => { document.title = originalTitle; }, 3000);
    }, 300);
};