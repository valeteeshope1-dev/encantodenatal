/* ============================================================
   BRAVOPAY — chamadas à API
   Docs: https://bravopay.club/docs
   Spec: https://bravopay.club/api/v1/openapi.json
   Valores sempre em CENTAVOS. A chave fica só no servidor
   (variável BRAVOPAY_API_KEY, formato bp_live_...).
   Consulta pelo NOSSO número de pedido (external_reference) — sem banco.

   O Pix é gerado em segundo plano: o POST devolve 202 com
   pix_status "generating" e o código aparece depois (~5-30 s).
   Por isso esperamos alguns segundos aqui e, se ainda não veio,
   o /api/status entrega o código assim que ficar pronto.
   ============================================================ */
const BASE = "https://bravopay.club/api/v1";
const ESPERA_MAX_MS = 7000;   /* quanto o checkout segura esperando o código */

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));

function chave(){
  const k = process.env.BRAVOPAY_API_KEY;
  if (!k) throw new Error("BRAVOPAY_API_KEY não configurada");
  return k;
}

async function chamar(metodo, caminho, corpo, extras){
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: Object.assign({
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": "Bearer " + chave()
    }, extras || {}),
    body: corpo ? JSON.stringify(corpo) : undefined
  });
  const texto = await r.text();
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch(e){ dados = { bruto: texto }; }
  return { http: r.status, ok: r.ok, dados: dados };
}

/* O campo pix.qr_code pode vir como imagem pronta (data URI ou URL)
   ou só como base64 do PNG. Se não for imagem, o checkout desenha
   o QR a partir do copia-e-cola. */
function imagemQr(q){
  q = String(q || "");
  if (/^data:image\//.test(q) || /^https?:\/\//.test(q)) return q;
  if (/^iVBOR/.test(q)) return "data:image/png;base64," + q;
  return null;
}

/* Transação da BravoPay -> formato que o resto do site usa. */
function normalizar(t){
  t = t || {};
  const pix = t.pix || {};
  return {
    id: t.id || null,
    status: String(t.status || "").toLowerCase(),        /* pending, paid, expired, refunded, chargeback */
    pixStatus: String(t.pix_status || "").toLowerCase(), /* generating, ... */
    emv: pix.copy_paste || null,
    img: imagemQr(pix.qr_code),
    expiraEm: pix.expires_at || null
  };
}

async function buscarPorId(id){
  const r = await chamar("GET", "/transactions/" + encodeURIComponent(id));
  return r.ok ? r.dados : null;
}

async function buscarPorReferencia(externalId){
  const r = await chamar("GET", "/transactions?limit=5&external_reference=" + encodeURIComponent(externalId));
  if (!r.ok) return { erro: r };
  const d = r.dados;
  const lista = Array.isArray(d) ? d : (d && (d.data || d.items || d.transactions)) || [];
  /* confere a referência: nunca confiar só no filtro */
  return { t: lista.find(function(x){ return x && x.external_reference === externalId; }) || null };
}

/* Cria a cobrança Pix. Valor em REAIS (convertido aqui para centavos).
   ok = a cobrança existe; emv pode vir null se o Pix ainda está sendo gerado. */
async function criarPix(p){
  let r = null, t = null;
  try {
    r = await chamar("POST", "/transactions", {
      amount_cents: Math.round(p.valor * 100),
      method: "pix",
      description: p.descricao.slice(0, 300),
      external_reference: p.externalId,
      expires_in: p.expiraEmSegundos,
      customer: {
        name: p.cliente.nome,
        email: p.cliente.email,
        cpf: p.cliente.cpf,
        phone: p.cliente.tel
      },
      utm: p.utm || undefined
    }, { "Idempotency-Key": p.externalId });   /* evita cobrar duas vezes */
    if (r.ok) t = r.dados;
  } catch(e){ /* queda de rede: confere abaixo se a cobrança nasceu */ }

  /* A BravoPay já devolveu 504 tendo criado a cobrança. Antes de
     dizer "erro" ao cliente, procura pelo nosso número de pedido. */
  if (!t && (!r || r.http >= 500)){
    await dormir(1500);
    const b = await buscarPorReferencia(p.externalId);
    t = b.t || null;
  }
  if (!t || !t.id) return { ok: false, http: r ? r.http : 0, dados: r ? r.dados : null };

  let n = normalizar(t);
  const limite = Date.now() + ESPERA_MAX_MS;
  while (!n.emv && Date.now() < limite){
    await dormir(1200);
    const novo = await buscarPorId(n.id);
    if (novo) n = normalizar(novo);
  }
  return Object.assign({ ok: true, http: r ? r.http : 200 }, n);
}

/* Consulta pelo nosso número de pedido (external_reference). */
async function consultarPix(externalId){
  const b = await buscarPorReferencia(externalId);
  if (b.erro) return { ok: false, http: b.erro.http, dados: b.erro.dados };
  if (!b.t) return { ok: false, http: 404, dados: null };
  return Object.assign({ ok: true, http: 200 }, normalizar(b.t));
}

module.exports = { criarPix, consultarPix };
