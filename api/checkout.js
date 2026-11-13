/* ============================================================
   POST /api/checkout — cria o pedido e o Pix na Shopix
   Recebe do checkout.html: itens, bumps, cliente, endereco, meta, utm.
   Devolve: { ok, pedido:{numero}, total (centavos), pix:{emv, img, expiraEm} }
   ============================================================ */
const crypto = require("crypto");
const { calcularPedido, PedidoInvalido } = require("./_loja");
const { criarPix } = require("./_shopix");

const EXPIRA_SEGUNDOS = 30 * 60;   /* 30 min para pagar */

const soNumeros = (s) => String(s || "").replace(/\D/g, "");
const texto = (s, max) => String(s || "").trim().slice(0, max || 120);

function cpfValido(cpf){
  cpf = soNumeros(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0, resto, i;
  for (i = 1; i <= 9; i++) soma += parseInt(cpf[i-1], 10) * (11 - i);
  resto = (soma * 10) % 11; if (resto >= 10) resto = 0;
  if (resto !== parseInt(cpf[9], 10)) return false;
  soma = 0;
  for (i = 1; i <= 10; i++) soma += parseInt(cpf[i-1], 10) * (12 - i);
  resto = (soma * 10) % 11; if (resto >= 10) resto = 0;
  return resto === parseInt(cpf[10], 10);
}

function validarCliente(c, e){
  c = c || {}; e = e || {};
  const cliente = {
    nome:  texto(c.nome, 100),
    email: texto(c.email, 120).toLowerCase(),
    cpf:   soNumeros(c.cpf),
    tel:   soNumeros(c.tel)
  };
  const endereco = {
    cep: soNumeros(e.cep), rua: texto(e.rua), numero: texto(e.numero, 20), compl: texto(e.compl, 80),
    bairro: texto(e.bairro), cidade: texto(e.cidade), uf: texto(e.uf, 2).toUpperCase()
  };
  if (cliente.nome.split(/\s+/).length < 2) throw new PedidoInvalido("Informe nome e sobrenome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cliente.email)) throw new PedidoInvalido("E-mail inválido.");
  if (!cpfValido(cliente.cpf)) throw new PedidoInvalido("CPF inválido.");
  if (cliente.tel.length < 10 || cliente.tel.length > 11) throw new PedidoInvalido("Celular inválido.");
  if (endereco.cep.length !== 8 || !endereco.rua || !endereco.numero || !endereco.bairro ||
      !endereco.cidade || endereco.uf.length !== 2) throw new PedidoInvalido("Endereço incompleto.");
  return { cliente, endereco };
}

/* Número curto e único: vira o externalId na Shopix e é o que o
   cliente vê. Ex.: NATAL-MH3K9Q-4F2A */
function novoNumero(){
  return "NATAL-" + Date.now().toString(36).toUpperCase() + "-" +
         crypto.randomBytes(2).toString("hex").toUpperCase();
}

/* A Shopix não guarda endereço. Sem isto, você não sabe para onde
   enviar. Manda o pedido completo para PEDIDOS_WEBHOOK_URL (planilha,
   Make, Zapier...) e sempre deixa uma cópia no log do servidor. */
async function registrarPedido(pedido){
  console.log("[pedido]", JSON.stringify(pedido));
  const url = process.env.PEDIDOS_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
  } catch(e){
    console.error("[pedido] falha ao enviar para PEDIDOS_WEBHOOK_URL:", e.message);
  }
}

module.exports = async function handler(req, res){
  if (req.method !== "POST"){
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok:false, erro:"Método não permitido." });
  }

  let corpo = req.body;
  if (typeof corpo === "string"){
    try { corpo = JSON.parse(corpo); } catch(e){ corpo = null; }
  }
  if (!corpo || typeof corpo !== "object"){
    return res.status(400).json({ ok:false, erro:"Pedido inválido." });
  }

  let calc, dados;
  try {
    calc  = calcularPedido(corpo);
    dados = validarCliente(corpo.cliente, corpo.endereco);
  } catch(e){
    if (e instanceof PedidoInvalido) return res.status(400).json({ ok:false, erro:e.message });
    console.error("[checkout] erro ao calcular:", e);
    return res.status(500).json({ ok:false, erro:"Não foi possível calcular o pedido." });
  }

  const numero = novoNumero();

  let r;
  try {
    r = await criarPix({
      valor: calc.total,
      descricao: "Encanto de Natal · Pedido " + numero,
      externalId: numero,
      expiraEmSegundos: EXPIRA_SEGUNDOS,
      cliente: dados.cliente
    });
  } catch(e){
    console.error("[checkout] falha ao falar com a Shopix:", e.message);
    return res.status(502).json({ ok:false, erro:"Não foi possível gerar o Pix agora. Tente novamente em instantes." });
  }

  const d = r.dados || {};
  if (!r.ok || !d.pixCode){
    console.error("[checkout] Shopix recusou:", r.http, JSON.stringify(d));
    return res.status(502).json({ ok:false, erro:"Não foi possível gerar o Pix agora. Tente novamente em instantes." });
  }

  await registrarPedido({
    numero: numero,
    shopixId: d.id || d.transactionId || null,
    criadoEm: new Date().toISOString(),
    status: "aguardando_pagamento",
    total: calc.total,
    itens: calc.itens,
    bumps: calc.bumps,
    descontoKit: calc.descontoKit,
    cliente: dados.cliente,
    endereco: dados.endereco,
    utm: corpo.utm || null
  });

  return res.status(200).json({
    ok: true,
    pedido: { numero: numero },
    total: Math.round(calc.total * 100),          /* centavos, como o checkout espera */
    pix: {
      emv: d.pixCode,
      img: d.pixQrCode || null,                   /* data:image/png;base64,... */
      expiraEm: d.expiresAt || null               /* ISO, ex.: 2026-11-05T23:00:00.000Z */
    }
  });
};
