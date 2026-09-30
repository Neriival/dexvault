/* Navegação: Início → Série → Expansão → Cartas. */
import { series } from './catalogo.js';
import { carregarExpansao, carregarDetalhes, candidatosImagem } from './api.js';
import { possui, alternar, contar, quantidade, definirQuantidade, repetidas } from './storage.js';

const app = document.querySelector('#app');
const modal = document.querySelector('#modal');
const modalContent = document.querySelector('#modal-content');
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const cache = new Map();
let erroConsulta = ''; 
let aba = 'principal';
let filtro = 'todas';
let busca = '';
let cartaAberta = null;
let rotaAtual = '';

function serieCard(serie) {
  return `<a class="catalog-card series-card" href="#serie/${serie.id}">
    <div class="catalog-art"><img src="${escapeHTML(serie.imagem)}" alt="Logo da série ${escapeHTML(serie.nome)}" loading="lazy"></div>
    <div class="catalog-info"><span class="eyebrow">SÉRIE</span><h3>${escapeHTML(serie.nome)}</h3>
    <p>${serie.colecoes.length} álbuns disponíveis</p></div><span class="arrow">↗</span></a>`;
}
function expansaoCard(colecao, serieId) {
  return `<a class="catalog-card expansion-card" href="#colecao/${serieId}/${colecao.id}">
    <div class="catalog-art"><img src="${escapeHTML(colecao.logo)}" alt="Logotipo da coleção ${escapeHTML(colecao.nome)}" loading="lazy"></div>
    <div class="catalog-info"><span class="eyebrow">${escapeHTML(colecao.ano)}</span><h3>${escapeHTML(colecao.nome)}</h3>
    <p>${escapeHTML(colecao.subtitulo)}</p></div><span class="arrow">↗</span></a>`;
}
function inicio() {
  const total = series.reduce((s, serie) => s + serie.colecoes.length, 0);
  app.innerHTML = `<section class="welcome"><div class="welcome-text"><span class="eyebrow">SEU ESPAÇO DE COLECIONADOR</span>
    <h1>Seu álbum.<br><em>Suas conquistas.</em></h1><p>Explore as séries e organize suas cartas, uma expansão de cada vez.</p>
    <a href="#series" class="btn primary">Explorar séries →</a></div>
    <div class="welcome-stats"><div class="metric"><span>Séries disponíveis</span><strong>${series.length.toString().padStart(2,'0')}</strong></div>
    <div class="metric"><span>Coleções disponíveis</span><strong>${total.toString().padStart(2,'0')}</strong></div>
    <div class="welcome-mark" aria-hidden="true"><img src="assets/img/dexvault-logo.svg" alt=""></div></div></section>
    <div class="section-title"><h2>Séries</h2><a href="#series">Ver todas ↗</a></div>
    <div class="catalog-grid">${series.map(serieCard).join('')}</div>`;
}
function listaSeries() {
  app.innerHTML = `<a class="back" href="#inicio">← Voltar ao início</a><div class="page-title"><span class="eyebrow">CATÁLOGO</span><h1>Explore as séries</h1>
    <p>Selecione uma série para ver suas coleções.</p></div><div class="catalog-grid">${series.map(serieCard).join('')}</div>`;
}
function paginaSerie(serie) {
  app.innerHTML = `<a class="back" href="#series">← Todas as séries</a><div class="page-title"><span class="eyebrow">SÉRIE</span>
    <h1>${escapeHTML(serie.nome)}</h1><p>Escolha uma coleção para abrir seu álbum.</p></div>
    <div class="catalog-grid">${serie.colecoes.map(c => expansaoCard(c, serie.id)).join('')}</div>`;
}
function cardCarta(carta) {
 const tem=possui(carta.id),q=quantidade(carta.id),urls=candidatosImagem(carta);
 return `<article class="pokemon-card ${tem?'adquirida':'nao-adquirida'}"><button class="card-art" data-detalhe="${escapeHTML(carta.id)}" aria-label="Ampliar ${escapeHTML(carta.name)}">
 ${urls.length?`<img src="${escapeHTML(urls[0])}" data-candidates="${escapeHTML(JSON.stringify(urls))}" data-index="0" alt="${escapeHTML(carta.name)}" loading="lazy">`:'<span class="sem-foto">Imagem indisponível</span>'}
 </button><h3>${escapeHTML(carta.name)}</h3><small>Nº ${escapeHTML(carta.localId||'—')}</small>
 <div class="owned-control"><button class="have ${tem?'selected':''}" data-tenho="${escapeHTML(carta.id)}">${tem?'✓ Tenho':'+ Tenho'}</button>
 <div class="copies" aria-label="Quantidade de cópias"><button data-minus="${escapeHTML(carta.id)}" aria-label="Remover uma cópia" ${q===0?'disabled':''}>−</button><span title="Quantidade total">${q}</span><button data-plus="${escapeHTML(carta.id)}" aria-label="Adicionar uma cópia" ${q>=999?'disabled':''}>+</button></div></div>
 ${q>1?`<div class="repeat-tag">↔ ${q-1} repetida${q-1===1?'':'s'}</div>`:''}</article>`;
}
function csvExportar(cartas,tipo,nomeColecao){
 const selecionadas=cartas.filter(c=>tipo==='faltam'?!possui(c.id):tipo==='repetidas'?quantidade(c.id)>1:possui(c.id));
 const linhas=[['Coleção','Número','Carta','Quantidade total','Repetidas'],...selecionadas.map(c=>[nomeColecao,c.localId,c.name,quantidade(c.id),Math.max(0,quantidade(c.id)-1)])];
 const texto='\ufeff'+linhas.map(l=>l.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([texto],{type:'text/csv;charset=utf-8;'}));
 const a=document.createElement('a');a.href=url;a.download=`dexvault-${tipo}-${nomeColecao.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function exportarTrocas(cartas,serie,colecao){
 const repetidasCartas=cartas.filter(c=>quantidade(c.id)>1).map(c=>({
  id:c.id,name:c.name,localId:c.localId,quantidade:quantidade(c.id),repetidas:Math.max(0,quantidade(c.id)-1)
 }));
 if(!repetidasCartas.length){alert('Você ainda não possui cartas repetidas nesta coleção.');return;}
 const dados={dexvaultTrocas:1,app:'DexVault',exportadoEm:new Date().toISOString(),serieId:serie.id,serieNome:serie.nome,colecaoId:colecao.id,colecaoNome:colecao.nome,cartas:repetidasCartas};
 const url=URL.createObjectURL(new Blob([JSON.stringify(dados,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`dexvault-trocas-${colecao.id}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function gerarRelatorioPDF(cartas,serie,colecao){
 const adquiridas=cartas.filter(c=>possui(c.id));
 const faltantes=cartas.filter(c=>!possui(c.id));
 const repetidasLista=cartas.filter(c=>quantidade(c.id)>1);
 const extras=repetidasLista.reduce((total,c)=>total+Math.max(0,quantidade(c.id)-1),0);
 const janela=window.open('','_blank');
 if(!janela){alert('O navegador bloqueou a janela do relatório. Permita pop-ups para o DexVault e tente novamente.');return;}
 const linha=c=>`<tr><td>${escapeHTML(c.localId||'—')}</td><td>${escapeHTML(c.name)}</td><td>${quantidade(c.id)}</td><td>${Math.max(0,quantidade(c.id)-1)}</td></tr>`;
 const tabela=(titulo,lista,vazia)=>`<section><h2>${titulo} <span>${lista.length}</span></h2>${lista.length?`<table><thead><tr><th>Nº</th><th>Carta</th><th>Cópias</th><th>Repetidas</th></tr></thead><tbody>${lista.map(linha).join('')}</tbody></table>`:`<p class="empty">${vazia}</p>`}</section>`;
 const data=new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date());
 janela.document.open();
 janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DexVault - ${escapeHTML(colecao.nome)}</title><style>
  *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#171717;margin:28px}header{border-bottom:3px solid #d8a900;padding-bottom:16px;margin-bottom:20px}h1{margin:0 0 6px;font-size:28px}header p{margin:4px 0;color:#555}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.stat{border:1px solid #ddd;border-radius:8px;padding:10px}.stat small{display:block;color:#666}.stat strong{font-size:20px}section{break-inside:avoid;margin-top:24px}h2{font-size:18px;margin:0 0 8px}h2 span{font-size:12px;background:#eee;border-radius:999px;padding:3px 7px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #ddd;padding:6px 7px;text-align:left}th{background:#f4f4f4}.empty{color:#777;font-style:italic}.note{margin-top:20px;color:#666;font-size:10px}@page{size:A4;margin:12mm}@media print{body{margin:0}.no-print{display:none!important}section{break-inside:auto}thead{display:table-header-group}}
 </style></head><body><header><h1>DexVault · ${escapeHTML(colecao.nome)}</h1><p>${escapeHTML(serie.nome)} · Relatório da coleção</p><p>Gerado em ${escapeHTML(data)}</p></header>
 <div class="stats"><div class="stat"><small>Total</small><strong>${cartas.length}</strong></div><div class="stat"><small>Tenho</small><strong>${adquiridas.length}</strong></div><div class="stat"><small>Faltam</small><strong>${faltantes.length}</strong></div><div class="stat"><small>Repetidas extras</small><strong>${extras}</strong></div></div>
 ${tabela('Cartas repetidas',repetidasLista,'Nenhuma carta repetida nesta coleção.')}
 ${tabela('Cartas faltantes',faltantes,'Coleção completa!')}
 ${tabela('Cartas adquiridas',adquiridas,'Nenhuma carta marcada como adquirida.')}
 <p class="note">Para salvar: na janela de impressão escolha “Salvar como PDF”. O arquivo de comparação do DexVault continua sendo usado para a comparação automática entre colecionadores.</p>
 <script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
 janela.document.close();
}
function abrirComparacaoTrocas(dados,cartas,serie,colecao){
 const lista=Array.isArray(dados?.cartas)?dados.cartas:[];
 if(dados?.dexvaultTrocas!==1||!lista.length)throw new Error('Este arquivo não é uma lista de trocas válida do DexVault ou não possui cartas repetidas.');
 if(dados.colecaoId&&dados.colecaoId!==colecao.id)throw new Error(`Este arquivo pertence à coleção “${dados.colecaoNome||dados.colecaoId}”. Abra essa coleção antes de comparar.`);
 const porId=new Map(cartas.map(c=>[c.id,c]));
 const porNumero=new Map(cartas.map(c=>[String(c.localId),c]));
 const faltam=[];
 for(const item of lista){
  const carta=porId.get(item.id)||porNumero.get(String(item.localId));
  if(!carta||possui(carta.id))continue;
  faltam.push({carta,repetidas:Math.max(1,Math.floor(Number(item.repetidas)||1))});
 }
 cartaAberta=null;modal.classList.remove('hidden');document.body.classList.add('modal-open');
 modalContent.innerHTML=`<div class="trade-modal"><span class="eyebrow">COMPARAR TROCAS</span><h2>${escapeHTML(dados.colecaoNome||colecao.nome)}</h2><p class="trade-summary">O arquivo possui <strong>${lista.length}</strong> cartas repetidas diferentes. Destas, <strong>${faltam.length}</strong> ainda faltam na sua coleção.</p>${faltam.length?`<div class="trade-grid">${faltam.map(({carta,repetidas})=>{const urls=candidatosImagem(carta);return `<article class="trade-card">${urls.length?`<img src="${escapeHTML(urls[0])}" data-candidates="${escapeHTML(JSON.stringify(urls))}" data-index="0" alt="${escapeHTML(carta.name)}">`:'<div class="sem-foto">Imagem indisponível</div>'}<div><h3>${escapeHTML(carta.name)}</h3><small>Nº ${escapeHTML(carta.localId||'—')}</small><span>${repetidas} repetida${repetidas===1?'':'s'} ${repetidas===1?'disponível':'disponíveis'}</span></div></article>`}).join('')}</div>`:'<div class="notice"><strong>Você já possui todas as cartas repetidas deste arquivo.</strong></div>'}<p class="trade-note">A comparação é feita somente no seu navegador; o arquivo não é enviado para servidor.</p></div>`;
}
function importarTrocas(file,cartas,serie,colecao){
 if(!file)return;
 if(file.size>5*1024*1024){alert('O arquivo é grande demais para uma lista de trocas.');return;}
 const reader=new FileReader();
 reader.onload=()=>{try{abrirComparacaoTrocas(JSON.parse(String(reader.result||'')),cartas,serie,colecao)}catch(error){alert(error.message||'Não foi possível ler o arquivo de trocas.')}};
 reader.onerror=()=>alert('Não foi possível abrir o arquivo selecionado.');
 reader.readAsText(file,'utf-8');
}

function estatistica(titulo, valor) { return `<div class="stat"><span>${titulo}</span><strong>${valor}</strong></div>`; }
function paginaColecao(serie, colecao, set) {
  const cartas = set?.cards || [];
  const total = cartas.length;
  const tenho = contar(cartas);
  const porcentagem = total ? Math.round(tenho / total * 100) : 0;
  const secretas = set?.cardCount?.official != null && set?.cardCount?.total != null ? Math.max(0, set.cardCount.total - set.cardCount.official) : 'A confirmar';
  const visiveis = cartas.filter(c => filtro === 'tenho' ? possui(c.id) : filtro === 'faltam' ? !possui(c.id) : filtro === 'repetidas' ? quantidade(c.id)>1 : true)
    .filter(c => `${c.name} ${c.localId}`.toLowerCase().includes(busca.toLowerCase()));
  app.innerHTML = `<a class="back" href="#serie/${serie.id}">← Voltar às coleções</a>
    <div class="collection-heading"><img src="${escapeHTML(colecao.logo)}" alt="${escapeHTML(colecao.nome)}"><div>
    <span class="eyebrow">${escapeHTML(serie.nome)} · ${escapeHTML(colecao.ano)}</span><h1>${escapeHTML(colecao.nome)}</h1>
    <p>Marque as cartas que você possui e acompanhe seu progresso.</p></div></div>
    ${set ? `<div class="stats">${estatistica('Total de cartas',total)}${estatistica('Tenho',tenho)}${estatistica('Faltam',total-tenho)}${estatistica('Secretas',secretas)}${estatistica('Concluído',porcentagem+'%')}${estatistica('Repetidas',repetidas(cartas))}</div>
    <div class="progress"><div class="progress-top"><strong>Progresso da coleção</strong><span>${tenho} / ${total}</span></div><div class="track"><div style="width:${porcentagem}%"></div></div></div>
    <div class="toolbar"><input id="busca" type="search" placeholder="Buscar carta ou número..." value="${escapeHTML(busca)}" aria-label="Buscar cartas">
    <div class="filters"><button data-filtro="todas" class="${filtro==='todas'?'active':''}">Todas</button><button data-filtro="tenho" class="${filtro==='tenho'?'active':''}">Tenho</button><button data-filtro="faltam" class="${filtro==='faltam'?'active':''}">Faltam</button><button data-filtro="repetidas" class="${filtro==='repetidas'?'active':''}">Repetidas</button></div></div>
    <div class="export-bar"><strong>Ferramentas da coleção:</strong><div class="export-main"><button id="gerar-pdf" title="Gera um relatório pronto para salvar como PDF">▤ Gerar PDF</button><button id="exportar-trocas" title="Cria o arquivo usado pelo DexVault para comparar suas cartas repetidas">⇄ Exportar para comparação</button><button id="comparar-trocas" title="Importe o arquivo de outro colecionador e veja quais repetidas dele faltam para você">⇄ Comparar coleção</button></div><input id="arquivo-trocas" type="file" accept=".json,application/json" hidden><details class="export-more"><summary>Mais opções</summary><div class="export-extra"><span>Planilhas CSV:</span><button data-export="tenho">✓ Adquiridas</button><button data-export="faltam">○ Faltantes</button><button data-export="repetidas">↔ Repetidas</button></div></details></div>
    <p class="results">${visiveis.length} cartas encontradas</p><div class="card-grid">${visiveis.map(cardCarta).join('') || '<div class="notice">Nenhuma carta corresponde ao filtro.</div>'}</div>` :
    `<div class="notice"><strong>Cartas indisponíveis no momento.</strong><p>${escapeHTML(erroConsulta || 'Ainda não encontramos esta coleção nas fontes disponíveis. Não serão exibidas cartas de outras expansões.')}</p><button class="btn secondary" id="recarregar">Tentar novamente</button></div>`}
    <p class="disclaimer">Suas marcações ficam salvas neste navegador. Valores de mercado e contas de usuário serão adicionados futuramente.</p>`;
  app.querySelectorAll('[data-aba]').forEach(button => button.addEventListener('click', () => { aba=button.dataset.aba; filtro='todas'; busca=''; abrirColecao(serie,colecao); }));
  app.querySelectorAll('[data-filtro]').forEach(button => button.addEventListener('click', () => { filtro=button.dataset.filtro; paginaColecao(serie,colecao,set); }));
  app.querySelectorAll('[data-tenho]').forEach(button => button.addEventListener('click', () => { alternar(button.dataset.tenho); paginaColecao(serie,colecao,set); }));
  app.querySelectorAll('[data-plus]').forEach(b=>b.addEventListener('click',()=>{definirQuantidade(b.dataset.plus,quantidade(b.dataset.plus)+1);paginaColecao(serie,colecao,set)}));
  app.querySelectorAll('[data-minus]').forEach(b=>b.addEventListener('click',()=>{definirQuantidade(b.dataset.minus,quantidade(b.dataset.minus)-1);paginaColecao(serie,colecao,set)}));
  app.querySelectorAll('[data-export]').forEach(b=>b.addEventListener('click',()=>csvExportar(cartas,b.dataset.export,colecao.nome)));
  app.querySelector('#gerar-pdf')?.addEventListener('click',()=>gerarRelatorioPDF(cartas,serie,colecao));
  app.querySelector('#exportar-trocas')?.addEventListener('click',()=>exportarTrocas(cartas,serie,colecao));
  app.querySelector('#comparar-trocas')?.addEventListener('click',()=>app.querySelector('#arquivo-trocas')?.click());
  app.querySelector('#arquivo-trocas')?.addEventListener('change',e=>{importarTrocas(e.target.files?.[0],cartas,serie,colecao);e.target.value='';});
  app.querySelectorAll('[data-detalhe]').forEach(button => button.addEventListener('click', () => abrirCarta(button.dataset.detalhe,serie,colecao,set)));
  app.querySelector('#busca')?.addEventListener('input', event => { const pos=event.target.selectionStart; busca=event.target.value; paginaColecao(serie,colecao,set); const campo=app.querySelector('#busca'); campo.focus(); campo.setSelectionRange(pos,pos); });
  app.querySelector('#recarregar')?.addEventListener('click', () => { cache.delete(`${colecao.id}-${aba}`); abrirColecao(serie,colecao); });
}
async function abrirColecao(serie, colecao) {
  const key = `${colecao.id}-${aba}`;
  if (cache.has(key)) { paginaColecao(serie,colecao,cache.get(key)); return; }
  app.innerHTML = `<a class="back" href="#serie/${serie.id}">← Voltar</a><div class="loading">Consultando o catálogo de cartas...</div>`;
  try {
    const set = await carregarExpansao(colecao.apiIds, colecao.tipo);
    if (rotaAtual !== location.hash) return;
    erroConsulta='';
    if(set?.cards?.length)cache.set(key,set);
    paginaColecao(serie,colecao,set);
  } catch(error) {
    if (rotaAtual !== location.hash) return;
    erroConsulta=error.message || 'Não foi possível consultar a API.';
    paginaColecao(serie,colecao,null);
  }
}
function linha(titulo, valor) { return valor == null || valor === '' ? '' : `<div class="detail-row"><span>${titulo}</span><strong>${escapeHTML(valor)}</strong></div>`; }
async function abrirCarta(id,serie,colecao,set) {
  cartaAberta=id;
  modal.classList.remove('hidden'); document.body.classList.add('modal-open');
  modalContent.innerHTML='<p class="loading">Carregando detalhes da carta...</p>';
  try {
    const local=set?.cards?.find(c=>c.id===id);
    const carta=await carregarDetalhes(id,local);
    if (cartaAberta!==id) return;
    const nome=carta.name || set?.cards?.find(c=>c.id===id)?.name || 'Carta';
    modalContent.innerHTML=`<div class="modal-body"><div class="modal-image">${candidatosImagem(carta,'high').length?`<img src="${escapeHTML(candidatosImagem(carta,'high')[0])}" data-candidates="${escapeHTML(JSON.stringify(candidatosImagem(carta,'high')))}" data-index="0" alt="${escapeHTML(nome)}">`:'<span>Imagem indisponível</span>'}</div>
      <div class="modal-info"><span class="eyebrow">DETALHES DA CARTA</span><h2>${escapeHTML(nome)}</h2><p>${escapeHTML(colecao.nome)}</p>
      ${linha('Número',carta.localId)}${linha('Raridade',carta.rarity)}${linha('Tipo',carta.types?.join(', '))}${linha('HP',carta.hp)}${linha('Ilustrador',carta.illustrator)}
      <button class="btn primary" id="modal-have">${possui(id)?'✓ Tenho esta carta':'+ Marcar como tenho'}</button><div class="modal-copies">Cópias: <button id="modal-minus">−</button> <strong id="modal-quantity">${quantidade(id)}</strong> <button id="modal-plus">+</button></div>
      <small>Fonte: ${carta.fonte==='local'?'Catálogo local':carta.fonte==='pokemon-tcg-data'?'catálogo aberto PokemonTCG':'TCGdex'}. Alguns nomes podem estar em inglês.</small></div></div>`;
    const atualizarModal=()=>{modalContent.querySelector('#modal-have').textContent=possui(id)?'✓ Tenho esta carta':'+ Marcar como tenho';modalContent.querySelector('#modal-quantity').textContent=quantidade(id);paginaColecao(serie,colecao,set)};
    modalContent.querySelector('#modal-have').onclick=()=>{alternar(id);atualizarModal()};
    modalContent.querySelector('#modal-minus').onclick=()=>{definirQuantidade(id,quantidade(id)-1);atualizarModal()};
    modalContent.querySelector('#modal-plus').onclick=()=>{definirQuantidade(id,quantidade(id)+1);atualizarModal()};
  } catch(error) { if(cartaAberta===id)modalContent.innerHTML=`<div class="notice">${escapeHTML(error.message)}</div>`; }
}
function fecharModal(){cartaAberta=null;modal.classList.add('hidden');document.body.classList.remove('modal-open');}
modal.querySelector('#modal-close').addEventListener('click',fecharModal);
modal.addEventListener('click',e=>{if(e.target===modal)fecharModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')fecharModal();});

/* Quando uma URL falha, testa a próxima opção (local, API, CDN).
   Se todas falharem, exibe mensagem sem quebrar o restante da página. */
document.addEventListener('error', event => {
 const img=event.target;
 if(!(img instanceof HTMLImageElement)||!img.dataset.candidates)return;
 let urls=[];
 try{urls=JSON.parse(img.dataset.candidates)}catch{return}
 const next=Number(img.dataset.index||0)+1;
 if(next<urls.length){img.dataset.index=String(next);img.src=urls[next];return}
 console.warn('Imagem não encontrada para:', img.alt, 'URLs tentadas:', urls);
 img.replaceWith(Object.assign(document.createElement('span'),{className:'sem-foto',textContent:'Imagem não disponível na fonte'}));
},true);

/* Prévia de autenticação: a integração real será feita posteriormente com Supabase Auth.
   Não armazene senhas no localStorage nem habilite login fictício. */
function paginaAutenticacao(tela) {
  const cadastro = tela === 'cadastro';
  const recuperar = tela === 'recuperar';
  const titulo = recuperar ? 'Recuperar senha' : cadastro ? 'Criar conta' : 'Entrar no DexVault';
  const descricao = recuperar ? 'A recuperação de senha será disponibilizada quando a autenticação estiver conectada.'
    : cadastro ? 'O cadastro será disponibilizado quando conectarmos o banco de dados.'
    : 'Em breve você poderá acessar sua coleção em qualquer dispositivo.';
  app.innerHTML = `<a class="back" href="#inicio">← Voltar ao início</a>
    <section class="auth-shell"><div class="auth-card"><span class="eyebrow">ÁREA DO COLECIONADOR</span>
    <h1>${titulo}</h1><p>${descricao}</p>
    <form id="auth-preview" autocomplete="off">
      ${cadastro ? '<label for="auth-name">Nome</label><input id="auth-name" type="text" autocomplete="off" placeholder="Seu nome" disabled>' : ''}
      <label for="auth-email">E-mail</label><input id="auth-email" type="email" autocomplete="off" placeholder="seu@email.com" disabled>
      ${recuperar ? '' : '<label for="auth-password">Senha</label><input id="auth-password" type="password" autocomplete="off" placeholder="••••••••" disabled>'}
      <button class="btn primary auth-submit" type="button" disabled>${recuperar ? 'Enviar recuperação' : cadastro ? 'Criar conta' : 'Entrar'} · Em breve</button>
    </form><div class="auth-links">
      ${cadastro || recuperar ? '<a href="#entrar">Voltar ao login</a>' : '<a href="#cadastro">Criar conta</a><a href="#recuperar">Esqueci minha senha</a>'}
    </div><div class="auth-info">🔒 Formulário ilustrativo. Nenhuma senha é coletada ou armazenada nesta versão.</div>
    </div></section>`;
}

async function rota() {
  fecharModal();rotaAtual=location.hash;
  const partes=decodeURIComponent(location.hash.slice(1)||'inicio').split('/');
  document.querySelectorAll('[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav===(partes[0]==='inicio'?'inicio':(['entrar','cadastro','recuperar'].includes(partes[0])?'entrar':'series'))));
  if(partes[0]==='inicio'){inicio();return;}
  if(partes[0]==='series'){listaSeries();return;}
  if(partes[0]==='entrar' || partes[0]==='cadastro' || partes[0]==='recuperar'){paginaAutenticacao(partes[0]);return;}
  const serie=series.find(s=>s.id===partes[1]);
  if(!serie){listaSeries();return;}
  if(partes[0]==='serie'){paginaSerie(serie);return;}
  const colecao=serie.colecoes.find(c=>c.id===partes[2]);
  if(!colecao){paginaSerie(serie);return;}
  aba=colecao.tipo;filtro='todas';busca='';await abrirColecao(serie,colecao);
}
window.addEventListener('hashchange',rota);
rota();
