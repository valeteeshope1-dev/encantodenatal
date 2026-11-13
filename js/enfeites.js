/* ============================================================
   ENCANTO DE NATAL — enfeites do topo
   Compartilhado entre a landing e a pagina do produto:
   contagem real ate o Natal e o pisca-pisca da barra verde.
   Roda sozinho ao carregar a pagina.
   ============================================================ */

/* Contagem real até o Natal (não é contador falso: usa a data de hoje). */
function diasParaNatal(){
  var el = document.getElementById("faltam");
  if (!el) return;
  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var natal = new Date(hoje.getFullYear(), 11, 25);
  var dias = Math.round((natal - hoje) / 86400000);
  if (dias > 1) el.innerHTML = "<b>Faltam " + dias + " dias para o Natal</b> · ";
  else if (dias === 1) el.innerHTML = "<b>Amanhã é Natal!</b> · ";
}

/* Pisca-pisca: uma lâmpada no ponto baixo de cada curva do fio.
   Espaçamento 56px no celular e 64px no desktop; refaz só quando
   a largura cruza esse limite. */
var CORES_PISCA = [
  { c:"#ff2a45", hot:"#ffd9de", deep:"#9e0019", glow:"rgba(255,42,69,.55)"  }, /* vermelho */
  { c:"#ffc22e", hot:"#fff6d1", deep:"#b06e00", glow:"rgba(255,194,46,.5)"  }, /* dourado */
  { c:"#27e27a", hot:"#dcffe9", deep:"#087a3a", glow:"rgba(39,226,122,.45)" }, /* verde */
  { c:"#4cc3ff", hot:"#e6f7ff", deep:"#0861a3", glow:"rgba(76,195,255,.5)"  }, /* azul-gelo */
  { c:"#ffe9b8", hot:"#ffffff", deep:"#c99a3d", glow:"rgba(255,233,184,.55)"}  /* branco quente */
];
var piscaPasso = 0;

function fioSvg(p){
  var m = p / 2;
  var svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='" + p + "' height='18'>" +
    "<defs><radialGradient id='o' cx='35%' cy='35%' r='70%'>" +
    "<stop offset='0' stop-color='#fff3c4'/><stop offset='.5' stop-color='#d6a645'/><stop offset='1' stop-color='#8a6420'/>" +
    "</radialGradient></defs>" +
    /* dois fios enrolados = fio trançado */
    "<path d='M0 3 Q" + m + " 19 " + p + " 3' fill='none' stroke='#0a2618' stroke-width='2.2'/>" +
    "<path d='M0 3 Q" + m + " 19 " + p + " 3' fill='none' stroke='#2f6446' stroke-width='1.1' stroke-dasharray='2.2 2.2'/>" +
    /* presilhas douradas presas na linha */
    "<circle cx='0' cy='3' r='2.8' fill='url(#o)'/><circle cx='" + p + "' cy='3' r='2.8' fill='url(#o)'/>" +
    "</svg>";
  return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
}

function montarPiscas(){
  var fio = document.querySelector(".piscas");
  if (!fio) return;
  var p = window.innerWidth >= 1000 ? 64 : 56;
  if (p === piscaPasso) return;
  piscaPasso = p;

  fio.style.backgroundImage = fioSvg(p);
  fio.style.backgroundSize = p + "px 18px";

  var qtd = Math.ceil(Math.max(window.innerWidth, 1920) / p) + 2;
  var html = "";
  for (var i = 0; i < qtd; i++){
    var cor = CORES_PISCA[i % CORES_PISCA.length];
    var dur = (1.8 + Math.random() * 1.8).toFixed(2);         /* 1,8s a 3,6s */
    var atraso = (-Math.random() * 3.6).toFixed(2);
    var giro = (Math.random() * 10 - 5).toFixed(1);            /* -5° a 5° */
    html += "<span class=\"lamp\" style=\"left:" + (i * p + p / 2 - 6) + "px;" +
      "--c:" + cor.c + ";--hot:" + cor.hot + ";--deep:" + cor.deep + ";--glow:" + cor.glow + ";" +
      "--d:" + dur + "s;--atraso:" + atraso + "s;--r:" + giro + "deg\"><i class=\"vidro\"></i></span>";
  }
  fio.innerHTML = html;
}
window.addEventListener("resize", montarPiscas);

document.addEventListener("DOMContentLoaded", function(){
  diasParaNatal();
  montarPiscas();
});
