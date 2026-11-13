/* ============================================================
   ENCANTO DE NATAL — nucleo da loja
   Fonte unica de precos e da sacola. Usado pela landing
   (index.html), pelo produto (produto.html) e pelo checkout,
   para os tres nunca divergirem.

   ATENCAO: isto roda no navegador, entao serve para MOSTRAR
   valores. O servidor do pagamento precisa recalcular o total
   por conta propria — nunca confiar no numero que o navegador
   mandar. Mexeu nos precos aqui, mexa tambem no servidor.
   ============================================================ */

/* --- Tabela de precos: mexa so aqui -------------------------
   Venda: de R$ 139,90 por R$ 89,90 por unidade, sem desconto por
   quantidade. As paginas se ajustam sozinhas: se PRECO_CHEIO for
   igual ao preco, somem o riscado, o selo de % OFF e a linha de
   desconto; sem faixas por quantidade, some o aviso de "leve mais
   e pague menos".
   Para voltar a ter desconto, por exemplo:
     PRECO_CHEIO = 129.90 (riscado)
     TOTAIS = { 1: 89.90, 2: 159.90, 3: 219.90 }
     UNIT_ACIMA = 69.90 (a partir de 4 unidades) */
var PRECO_CHEIO = 139.90;                         /* riscado, por unidade (igual ao preco = sem riscado) */
var TOTAIS      = { 1: 89.90 };
var UNIT_ACIMA  = 89.90;                          /* a partir da proxima faixa */
var QTD_MAX     = 99;
var PARCELAS    = 3;

/* --- Modelos do produto -------------------------------------
   A arvore tem um modelo so. A estrutura continua a mesma da
   loja da escova (nome do modelo + cor de amostra) para o
   checkout funcionar igual. Com um modelo so, a pagina do
   produto esconde o seletor sozinha. */
var CORES_HEX  = { "Árvore com guirlanda": "#165c3d" };
var COR_PADRAO = "Árvore com guirlanda";
var FOTO_ITEM  = "./img/produto-detalhe.webp";

var PRODUTO_NOME = "Luminária Encanto de Natal Premium";

/* --- Order bumps: ofertas que so aparecem dentro da sacola ----
   Aparecem na ordem desta lista (o primeiro e o mais forte).
   Cadastre os MESMOS valores no servidor do pagamento — se
   divergirem, o cliente ve um valor e paga outro.
   ativo: false  -> some da sacola sem apagar o cadastro.

   kitNatal: "Oferta especial de Natal". Com o bump na sacola,
   1 arvore + ele saem por este valor fechado; a diferenca entra
   como desconto proprio na sacola (uma vez por pedido).
   Para desligar: kitNatal: 0 */
var BUMPS = [
  {
    ativo: true,
    sku:  "NATAL-POWERBANK-PINENG",
    nome: "Carregador Portátil Pineng",
    kit:  "+ adaptadores",
    desc: "Deixe a luminária acesa longe da tomada: na ceia, na varanda, na festa",
    de:   119.90,
    por:  69.90,
    kitNatal: 139.90,
    foto: "./img/bump-powerbank.webp"
  },
  {
    ativo: true,
    sku:  "NATAL-ARVORE-60CM",
    nome: "Árvore de Natal Desmontável",
    kit:  "60 cm",
    desc: "Monta em minutos e guarda fácil. Ideal para mesa, aparador ou cantinho da sala",
    de:   189.90,
    por:  119.90,
    kitNatal: 0,
    foto: "./img/bump-arvore-60.webp"
  },
  {
    ativo: true,
    sku:  "NATAL-PISCA-600LED",
    nome: "Pisca-Pisca 600 LEDs",
    kit:  "100 m",
    desc: "Ilumina a árvore inteira, a janela ou a varanda com um fio só",
    de:   149.90,
    por:  74.90,
    kitNatal: 0,
    foto: "./img/bump-pisca-quente.webp",
    /* cores: o cliente escolhe uma; a 1ª já vem marcada.
       amostra = cor da bolinha; foto = troca a foto do cartão */
    cores: [
      { nome:"Branco quente", amostra:"#ffd27a", foto:"./img/bump-pisca-quente.webp" },
      { nome:"Colorido",      amostra:"conic-gradient(#ff4d6d,#ffd23f,#3ddc84,#4d9fff,#c15cff,#ff4d6d)", foto:"./img/bump-pisca-colorido.webp" },
      { nome:"Branco frio",   amostra:"#eef5ff", foto:"./img/bump-pisca-frio.webp" },
      { nome:"Azul",          amostra:"#3b82f6", foto:"./img/bump-pisca-azul.webp" }
    ]
  }
].filter(function(b){ return b.ativo; });

function acharBump(sku){
  for (var i = 0; i < BUMPS.length; i++) if (BUMPS[i].sku === sku) return BUMPS[i];
  return null;
}

/* --- Cor escolhida de cada bump (só para bumps com "cores") --- */
var CHAVE_BUMP_COR = "natal_bump_cores";
var bumpCores = {};
try { bumpCores = JSON.parse(localStorage.getItem(CHAVE_BUMP_COR) || "{}") || {}; } catch(e){ bumpCores = {}; }

/* devolve o objeto da cor escolhida (ou a 1ª), ou null se o bump não tem cores */
function corDoBump(b){
  if (!b.cores || !b.cores.length) return null;
  for (var i = 0; i < b.cores.length; i++) if (b.cores[i].nome === bumpCores[b.sku]) return b.cores[i];
  return b.cores[0];
}

function escolherCorBump(sku, nomeCor){
  bumpCores[sku] = nomeCor;
  try { localStorage.setItem(CHAVE_BUMP_COR, JSON.stringify(bumpCores)); } catch(e){}
}

/* Desconto dos kits de Natal (arvore + bump por kitNatal).
   Zero quando nenhum bump com kit esta na sacola. */
function descontoKitNatal(unidades){
  if (unidades < 1) return 0;
  return BUMPS.reduce(function(soma, b){
    if (!b.kitNatal || !bumpAtivo(b.sku)) return soma;
    var separado = precoTotal(1) + b.por;
    return soma + Math.max(0, Math.round((separado - b.kitNatal) * 100) / 100);
  }, 0);
}

/* --- Calculo ------------------------------------------------ */
function precoTotal(q){
  return TOTAIS[q] !== undefined ? TOTAIS[q] : UNIT_ACIMA * q;
}

/* Ha desconto real para esta quantidade? (preco abaixo do riscado) */
function temDesconto(q){
  return precoTotal(q) < PRECO_CHEIO * q - 0.005;
}

/* Ha faixa mais barata por unidade ao levar mais? */
function temDescontoPorQuantidade(){
  return UNIT_ACIMA < precoTotal(1) - 0.005 ||
    Object.keys(TOTAIS).some(function(q){ return TOTAIS[q] / q < precoTotal(1) - 0.005; });
}

function brl(v){
  var p = v.toFixed(2).split(".");
  return "R$ " + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1];
}

/* --- Sacola (guardada no navegador) -------------------------
   Chaves proprias desta oferta: se ela rodar no mesmo dominio da
   loja da escova, as duas sacolas nao se misturam. */
var CHAVE = "natal_pedido";
var carrinho = [];

var CHAVE_BUMP = "natal_bumps";
var bumpsNaSacola = [];               /* skus dos bumps escolhidos */

function salvarBump(){
  try { localStorage.setItem(CHAVE_BUMP, JSON.stringify(bumpsNaSacola)); } catch(e){}
}

function bumpAtivo(sku){ return bumpsNaSacola.indexOf(sku) !== -1; }

/* liga/desliga um bump; devolve true se ele entrou na sacola */
function alternarBump(sku){
  if (!acharBump(sku)) return false;
  var i = bumpsNaSacola.indexOf(sku);
  if (i === -1) bumpsNaSacola.push(sku); else bumpsNaSacola.splice(i, 1);
  salvarBump();
  return i === -1;
}

function limparBumps(){
  if (!bumpsNaSacola.length) return;
  bumpsNaSacola = [];
  salvarBump();
}

function salvarCarrinho(){
  /* aba anonima / cookies bloqueados fazem isto lancar erro */
  try { localStorage.setItem(CHAVE, JSON.stringify(carrinho)); } catch(e){}
}

function carregarCarrinho(){
  try {
    var bruto = localStorage.getItem(CHAVE);
    if (!bruto) return;
    var dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return;
    /* descarta modelo que nao existe mais */
    carrinho = dados.filter(function(i){
      return i && CORES_HEX[i.cor] && typeof i.qtd === "number" && i.qtd > 0;
    });
  } catch(e){ carrinho = []; }

  /* Bump sozinho nao e pedido: sem arvore na sacola, ele cai fora.
     Bump que saiu da lista (ou foi desligado) tambem cai fora. */
  try {
    var salvos = JSON.parse(localStorage.getItem(CHAVE_BUMP) || "[]");
    bumpsNaSacola = Array.isArray(salvos) ? salvos.filter(acharBump) : [];
  } catch(e){ bumpsNaSacola = []; }
  if (carrinho.length === 0) limparBumps();
}

function limparCarrinho(){
  carrinho = [];
  salvarCarrinho();
  limparBumps();
}

function totalUnidades(){
  return carrinho.reduce(function(s, i){ return s + i.qtd; }, 0);
}

/* Resumo completo do pedido.
   O desconto vale pelo TOTAL de unidades.
   As linhas sao arredondadas uma a uma e a ultima recebe a
   diferenca, para a soma bater exatamente com o total. */
function resumoPedido(){
  var unidades = totalUnidades();
  if (unidades === 0){
    return { unidades:0, total:0, cheio:0, economia:0, descontoKit:0, unit:0, off:0, parcela:0, linhas:[], bumps:[] };
  }

  var arvores = precoTotal(unidades);
  var unit    = arvores / unidades;
  var cheioArvores = PRECO_CHEIO * unidades;

  var bumps = BUMPS.filter(function(b){ return bumpAtivo(b.sku); })
                   .map(function(b){
                     var c = corDoBump(b);
                     return { sku:b.sku, nome:b.nome + (c ? " · " + c.nome : ""), cor:c ? c.nome : null, de:b.de, valor:b.por };
                   });
  var somaBumps  = bumps.reduce(function(t, b){ return t + b.valor; }, 0);
  var cheioBumps = bumps.reduce(function(t, b){ return t + b.de; }, 0);
  var descontoKit = descontoKitNatal(unidades);
  var total = arvores + somaBumps - descontoKit;
  var cheio = cheioArvores + cheioBumps;

  var soma = 0;
  var linhas = carrinho.map(function(item, i){
    var valor;
    if (i === carrinho.length - 1){
      valor = arvores - soma;
    } else {
      valor = Math.round(unit * item.qtd * 100) / 100;
      soma += valor;
    }
    return { cor:item.cor, qtd:item.qtd, valor:valor };
  });

  return {
    unidades: unidades,
    total: total,
    cheio: cheio,
    economia: cheio - total,          /* inclui o desconto do kit */
    descontoKit: descontoKit,
    unit: unit,
    off: Math.round((1 - arvores / cheioArvores) * 100),
    parcela: total / PARCELAS,
    linhas: linhas,
    bumps: bumps
  };
}
