/* TCGdex + fonte alternativa pública: dados PokemonTCG no GitHub.
   A segunda fonte é um catálogo JSON, NÃO uma API de mercado.
   Nunca colocar chaves privadas no JavaScript do navegador. */
import { imagensLocais } from './imagens-locais.js';
const TCG='https://api.tcgdex.net/v2';
const DATA='https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en';
const TIMEOUT=11000;
async function json(url){const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),TIMEOUT);try{const r=await fetch(url,{signal:ctrl.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
async function optional(url){try{return await json(url)}catch{return null}}
function normalizarTCG(set){return {...set,fonte:'tcgdex',cards:(set.cards||[]).map(c=>({...c,fonte:'tcgdex'}))}}
function normalizarGitHub(cards,id){return {id,name:id==='me55c'?'30th Celebration Classic Collection':'30th Celebration',fonte:'pokemon-tcg-data',cards:cards.map(c=>({id:c.id,name:c.name,localId:String(c.number??c.id.split('-').pop()),image:c.images?.large||c.images?.small||'',imageHigh:c.images?.large||c.images?.small||'',rarity:c.rarity,types:c.types,hp:c.hp,illustrator:c.artist,fonte:'pokemon-tcg-data'})),cardCount:{official:id==='me55c'?30:128,total:cards.length}}}
function identificacaoCorreta(set,id){const n=(set?.name||'').toLowerCase();return id==='me55c'?n.includes('classic')&&n.includes('celebration'):n.includes('30th')&&n.includes('celebration')&&!n.includes('classic')}
async function carregarSet(id){
 const [en,pt]=await Promise.all([optional(`${TCG}/en/sets/${id}`),optional(`${TCG}/pt-br/sets/${id}`)]);
 const found=[en,pt].find(s=>identificacaoCorreta(s,id)&&Array.isArray(s.cards)&&s.cards.length);
 if(found){const nomes=new Map((pt?.cards||[]).map(c=>[c.id,c.name]));return normalizarTCG({...found,cards:found.cards.map(c=>({...c,name:nomes.get(c.id)||c.name}))})}
 // Fallback: arquivo JSON aberto do projeto PokemonTCG/pokemon-tcg-data.
 const cards=await optional(`${DATA}/${id}.json`);
 if(Array.isArray(cards)&&cards.length&&cards.every(c=>String(c.id||'').startsWith(id+'-')))return normalizarGitHub(cards,id);
 throw new Error('Esta coleção ainda não foi encontrada nas duas fontes de dados. Verifique a conexão e tente novamente.');
}
async function carregarLocal(){
 const arquivo=await optional('dados/30th-celebration.json');
 if(!arquivo||arquivo.id!=='me55'||!Array.isArray(arquivo.cards)||!arquivo.cards.length)return null;
 const cards=arquivo.cards.filter(c=>c&&typeof c.id==='string'&&c.id.startsWith('me55-')&&c.name&&c.localId)
  .map(c=>({...c,fonte:'local',imagemLocal:c.imagemLocal||`assets/img/cartas/30th-celebration/${String(c.localId).padStart(3,'0')}.webp`}));
 if(!cards.length)return null;
 return {...arquivo,cards,fonte:'local',cardCount:arquivo.cardCount||{official:cards.length,total:cards.length}};
}
export async function carregarExpansao(ids,tipo='principal'){
 const id=tipo==='classica'?'me55c':'me55';
 // Primeira coleção: catálogo local se estiver preenchido; API enquanto estiver vazio.
 const local=tipo==='principal'?await carregarLocal():null;
 const set=local||await carregarSet(id);
 if(tipo!=='pikachu')return set;
 // Subconjunto verificável: 30 Pikachu ilustrados, números 23 a 52 da expansão principal.
 const cards=set.cards.filter(c=>{const n=Number(c.localId);return n>=23&&n<=52&&/^pikachu$/i.test(c.name||'')});
 if(cards.length!==30)throw new Error(`A fonte retornou ${cards.length} das 30 cartas de Pikachu esperadas. O álbum não será exibido parcialmente.`);
 return {...set,name:'30th Celebration Pikachu Collection',cards,cardCount:{official:30,total:30}};
}
export async function carregarDetalhes(id,local){
 if(local?.fonte==='pokemon-tcg-data'||local?.fonte==='local')return local;
 const [pt,en]=await Promise.all([optional(`${TCG}/pt-br/cards/${encodeURIComponent(id)}`),optional(`${TCG}/en/cards/${encodeURIComponent(id)}`)]);
 if(!pt&&!en){if(local)return local;throw new Error('Detalhes indisponíveis.')}
 return {...(en||pt),...(pt||{}),image:pt?.image||en?.image,fonte:'tcgdex'};
}
/* URLs de imagem de TCGdex: a API costuma retornar o caminho SEM extensão.
   PokémonTCG Data retorna URLs completas; nunca acrescentar /low.webp nelas. */
/* V13: URLs da API são priorizadas. Fallback local apenas quando necessário. */
/* Não adicionar /high.png a endereços Scrydex.
   Usar URL de imagem completa, alternativas oficiais quando conhecidas,
   e arquivos locais fornecidos pelo usuário. URLs não confirmadas não são
   apresentadas como imagens disponíveis. */
export function candidatosImagem(carta, qualidade='low') {
 const urls=[], add=u=>{if(u&&!urls.includes(u))urls.push(u)};
 const id=String(carta?.id||'');
 const raw=String(qualidade==='high'?(carta?.imageHigh||carta?.image||''):(carta?.image||carta?.imageHigh||'')).trim();
 // O arquivo local tem prioridade se o colecionador o adicionar.
 if((imagensLocais[id]||carta?.imagemLocal) && /^[a-z0-9_-]+$/i.test(id)){
   add(imagensLocais[id]||carta.imagemLocal);
 }
 if(raw) {
   // Scrydex retorna /large ou /small como URL final, sem extensão.
   if(/^https:\/\/images\.scrydex\.com\//i.test(raw)){
     add(raw);
     if(/\/large\/?$/i.test(raw))add(raw.replace(/\/large\/?$/i,'/small'));
     if(/\/small\/?$/i.test(raw))add(raw.replace(/\/small\/?$/i,'/large'));
   } else if(/\.(png|jpe?g|webp)(\?.*)?$/i.test(raw)){
     add(raw);
   } else if(/^https:\/\/assets\.tcgdex\.net\//i.test(raw)){
     const clean=raw.replace(/\/(low|high)\.(webp|png|jpg)$/i,'').replace(/\/$/,'');
     for(const q of (qualidade==='high'?['high','low']:['low','high']))add(`${clean}/${q}.webp`);
   } else {
     // Endereços desconhecidos são usados exatamente como a API os retornou.
     add(raw);
   }
 }
 // CDN TCGdex: somente para registros da própria TCGdex.
 if((carta?.fonte==='tcgdex'||carta?.fonte==='pokemon-tcg-data') && id.includes('-')){
   const i=id.lastIndexOf('-'),set=id.slice(0,i),number=id.slice(i+1);
   for(const lang of ['en','pt'])for(const q of (qualidade==='high'?['high','low']:['low','high']))
     add(`https://assets.tcgdex.net/${lang}/${set}/${number}/${q}.webp`);
 }
 return urls;
}
export function imagemCarta(carta, qualidade='low'){
 return candidatosImagem(typeof carta==='string'?{image:carta}:carta,qualidade)[0]||'';
}
