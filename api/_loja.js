/* ============================================================
   PREÇO NO SERVIDOR
   Roda o MESMO js/loja.js do site num ambiente isolado: a tabela
   de preços, os order bumps e o kit de Natal ficam num lugar só.
   Mudou preço no loja.js -> a cobrança muda junto.

   O navegador manda só quantidade + skus + cor. O valor que ele
   mostra é ignorado: o total da cobrança sai daqui.
   (Arquivo com "_" na frente: a Vercel não vira rota pública.)
   ============================================================ */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const CODIGO = fs.readFileSync(path.join(__dirname, "..", "js", "loja.js"), "utf8");

function novaLoja(){
  const ctx = {
    /* loja.js tenta ler/gravar no navegador; aqui não há nada */
    localStorage: { getItem: () => null, setItem: () => {} },
    console
  };
  vm.createContext(ctx);
  vm.runInContext(CODIGO, ctx, { filename: "loja.js" });
  return ctx;
}

class PedidoInvalido extends Error {}

/* Valida o que veio do navegador e devolve o resumo calculado. */
function calcularPedido(corpo){
  const loja = novaLoja();

  const itens = Array.isArray(corpo && corpo.itens) ? corpo.itens : [];
  const carrinho = itens.map(function(i){
    const qtd = Number(i && i.qtd);
    if (!i || !loja.CORES_HEX[i.cor]) throw new PedidoInvalido("Modelo inválido.");
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > loja.QTD_MAX) throw new PedidoInvalido("Quantidade inválida.");
    return { cor: i.cor, qtd: qtd };
  });
  if (!carrinho.length) throw new PedidoInvalido("Sua sacola está vazia.");

  const skus = [];
  const cores = {};
  (Array.isArray(corpo.bumps) ? corpo.bumps : []).forEach(function(b){
    const bump = b && loja.acharBump(b.sku);
    if (!bump) throw new PedidoInvalido("Oferta adicional inválida.");
    if (skus.indexOf(bump.sku) !== -1) return;
    if (bump.cores && bump.cores.length){
      const ok = bump.cores.some(function(c){ return c.nome === b.cor; });
      if (!ok) throw new PedidoInvalido("Cor inválida para " + bump.nome + ".");
      cores[bump.sku] = b.cor;
    }
    skus.push(bump.sku);
  });

  loja.carrinho = carrinho;
  loja.bumpsNaSacola = skus;
  loja.bumpCores = cores;

  const r = loja.resumoPedido();
  const total = Math.round(r.total * 100) / 100;
  if (!(total > 0)) throw new PedidoInvalido("Total inválido.");

  return {
    total: total,
    produto: loja.PRODUTO_NOME,
    unidades: r.unidades,
    itens: r.linhas.map(function(l){ return { nome: loja.PRODUTO_NOME, qtd: l.qtd, valor: l.valor }; }),
    bumps: r.bumps.map(function(b){ return { sku: b.sku, nome: b.nome, cor: b.cor, valor: b.valor }; }),
    descontoKit: r.descontoKit
  };
}

module.exports = { calcularPedido, PedidoInvalido };
