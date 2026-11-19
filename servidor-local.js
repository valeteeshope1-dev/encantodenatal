/* ============================================================
   SERVIDOR LOCAL DE TESTE — só para o seu computador.
   Serve o site e roda as funções de /api como a Vercel faria,
   lendo a chave do arquivo .env.

   Como usar:  node servidor-local.js
   Depois abra http://localhost:8080
   (Não vai para a Vercel: está no .vercelignore.)
   ============================================================ */
const http = require("http");
const fs = require("fs");
const path = require("path");

const RAIZ = __dirname;
const PORTA = Number(process.env.PORT) || 8080;

/* lê o .env (formato CHAVE=valor) */
try {
  fs.readFileSync(path.join(RAIZ, ".env"), "utf8").split(/\r?\n/).forEach(function(l){
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
} catch(e){ console.warn("Sem .env: as rotas /api vão falhar."); }

const TIPOS = {
  ".html":"text/html; charset=utf-8", ".css":"text/css", ".js":"application/javascript",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".gif":"image/gif",
  ".svg":"image/svg+xml", ".webp":"image/webp", ".mp4":"video/mp4", ".woff":"font/woff",
  ".woff2":"font/woff2", ".ttf":"font/ttf", ".json":"application/json", ".ico":"image/x-icon"
};

/* imita o req/res da Vercel: req.query, req.body, res.status().json() */
function rodarApi(nome, req, res, url){
  const arquivo = path.join(RAIZ, "api", nome + ".js");
  if (nome.startsWith("_") || !fs.existsSync(arquivo)){ res.writeHead(404); return res.end(); }

  let bruto = "";
  req.on("data", function(c){ bruto += c; if (bruto.length > 1e6) req.destroy(); });
  req.on("end", async function(){
    req.query = Object.fromEntries(url.searchParams);
    try { req.body = bruto ? JSON.parse(bruto) : undefined; } catch(e){ req.body = bruto; }
    res.status = function(c){ res.statusCode = c; return res; };
    res.json = function(o){
      if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(o));
    };
    try {
      delete require.cache[require.resolve(arquivo)];   /* pega edições sem reiniciar */
      await require(arquivo)(req, res);
    } catch(e){
      console.error("[api/" + nome + "]", e);
      if (!res.headersSent) res.status(500).json({ ok:false, erro:"Erro interno." });
    }
  });
}

http.createServer(function(req, res){
  const url = new URL(req.url, "http://localhost");
  const caminho = decodeURIComponent(url.pathname);

  const api = caminho.match(/^\/api\/([a-zA-Z0-9_-]+)\/?$/);
  if (api) return rodarApi(api[1], req, res, url);

  /* nunca servir segredos nem o código do servidor */
  if (/(^|\/)\./.test(caminho) || caminho.startsWith("/api/") || caminho === "/servidor-local.js"){
    res.writeHead(404); return res.end("Not found");
  }

  let f = path.join(RAIZ, caminho);
  if (!f.startsWith(RAIZ)){ res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
  /* igual ao "cleanUrls" da Vercel: /produto -> produto.html */
  else if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f = f + ".html";

  fs.stat(f, function(err, st){
    if (err){ res.writeHead(404); return res.end("Not found"); }
    const tipo = TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream";
    const faixa = req.headers.range;
    if (faixa){
      const [a, b] = faixa.replace("bytes=", "").split("-");
      const ini = +a, fim = b ? +b : st.size - 1;
      res.writeHead(206, { "Content-Type":tipo, "Content-Range":"bytes " + ini + "-" + fim + "/" + st.size,
                           "Accept-Ranges":"bytes", "Content-Length":fim - ini + 1 });
      return fs.createReadStream(f, { start:ini, end:fim }).pipe(res);
    }
    res.writeHead(200, { "Content-Type":tipo, "Content-Length":st.size, "Accept-Ranges":"bytes" });
    fs.createReadStream(f).pipe(res);
  });
}).listen(PORTA, function(){
  console.log("Site em http://localhost:" + PORTA + "  (BravoPay: " +
              (process.env.BRAVOPAY_API_KEY ? "chave carregada" : "SEM CHAVE") + ")");
});
