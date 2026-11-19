/* ============================================================
   GET /api/status?pedido=NATAL-XXXX — o Pix já foi pago?
   O checkout pergunta a cada 5 s; a BravoPay é consultada pelo
   nosso número de pedido (external_reference).
   Devolve: { pago, encerrado, status, pix:{emv, img, expiraEm} }
   O pix vai junto porque a BravoPay pode terminar de gerar o
   código depois que a tela do Pix já abriu.
   ============================================================ */
const { consultarPix } = require("./_bravopay");

/* só aceita números de pedido gerados por nós */
const FORMATO = /^NATAL-[A-Z0-9]{4,12}-[A-F0-9]{4}$/;
const ENCERRADOS = ["expired", "refunded", "chargeback", "failed", "canceled", "cancelled"];

module.exports = async function handler(req, res){
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET"){
    res.setHeader("Allow", "GET");
    return res.status(405).json({ pago:false, erro:"Método não permitido." });
  }

  const pedido = String((req.query && req.query.pedido) || "");
  if (!FORMATO.test(pedido)) return res.status(400).json({ pago:false, erro:"Pedido inválido." });

  try {
    const r = await consultarPix(pedido);
    if (!r.ok){
      console.error("[status] BravoPay", r.http, JSON.stringify(r.dados));
      return res.status(r.http === 404 ? 404 : 502).json({ pago:false });
    }
    const st = r.status;
    return res.status(200).json({
      pago: st === "paid",
      encerrado: ENCERRADOS.indexOf(st) !== -1 || r.pixStatus === "failed",
      status: st,
      pix: r.emv ? { emv: r.emv, img: r.img, expiraEm: r.expiraEm } : null
    });
  } catch(e){
    console.error("[status] erro:", e.message);
    return res.status(502).json({ pago:false });
  }
};
