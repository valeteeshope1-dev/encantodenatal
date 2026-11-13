/* ============================================================
   SHOPIX — chamadas à API (padrão "Nerva": /api/sales)
   Docs: https://sub.shopixpay.app/docs
   Escolhido porque devolve a imagem do QR, a validade e aceita
   consultar pelo NOSSO número de pedido (externalId) — sem banco.
   A chave fica só no servidor (variável SHOPIX_API_KEY).
   ============================================================ */
const BASE = "https://sub.shopixpay.app/api";

function chave(){
  const k = process.env.SHOPIX_API_KEY;
  if (!k) throw new Error("SHOPIX_API_KEY não configurada");
  return k;
}

async function chamar(metodo, caminho, corpo, extras){
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: Object.assign({
      "Content-Type": "application/json",
      "Accept": "application/json",
      "x-api-key": chave()
    }, extras || {}),
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch(e){ dados = { bruto: texto }; }
  return { http: r.status, ok: r.ok, dados: dados };
}

/* Cria a cobrança Pix. Valor em REAIS. */
function criarPix(p){
  return chamar("POST", "/sales", {
    amount: p.valor,
    description: p.descricao.slice(0, 100),
    externalId: p.externalId,
    expirationInSeconds: p.expiraEmSegundos,
    customer: {
      name: p.cliente.nome,
      document: p.cliente.cpf,
      email: p.cliente.email,
      phone: p.cliente.tel
    }
  }, { "idempotency-key": p.externalId });   /* evita cobrar duas vezes */
}

/* Consulta pelo id da Shopix ou pelo nosso externalId. */
function consultarPix(id){
  return chamar("GET", "/sales/" + encodeURIComponent(id));
}

module.exports = { criarPix, consultarPix };
