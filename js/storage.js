/* V16: preserva a chave da V15 e migra booleanos para quantidade 1. */
const KEY='dexvault-cartas-v1';
let fallback={};
function ler(){try{const v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'?v:{}}catch{return fallback}}
function gravar(data){fallback=data;try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
export function quantidade(id){const v=ler()[id];return v===true?1:Math.max(0,Math.floor(Number(v)||0))}
export function possui(id){return quantidade(id)>0}
export function definirQuantidade(id,n){const d=ler();const q=Math.max(0,Math.min(999,Math.floor(Number(n)||0)));if(q)d[id]=q;else delete d[id];gravar(d);return q}
export function alternar(id){return definirQuantidade(id,possui(id)?0:1)>0}
export function contar(cartas){return cartas.filter(c=>possui(c.id)).length}
export function repetidas(cartas){return cartas.reduce((n,c)=>n+Math.max(0,quantidade(c.id)-1),0)}
