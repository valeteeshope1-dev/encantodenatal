/* ============================================================
   ENCANTO DE NATAL — sacola lateral (compartilhada)
   Usada pela landing (index.html) e pela pagina do produto.
   Precos, armazenamento e totais vem do js/loja.js; aqui fica so
   a tela da sacola: criar o painel, montar os itens e reagir a
   clique. Estilo em css/sacola.css.

   Precisa vir DEPOIS de js/loja.js (e de js/pixel.js, para os
   eventos do Meta).
   ============================================================ */

var URL_CHECKOUT = "./checkout.html";
var URL_PRODUTO  = "/produto";

var ICONE_SACOLA =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
       'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M4.2 8h15.6l-1.25 11.6a2.2 2.2 0 0 1-2.19 1.9H7.64a2.2 2.2 0 0 1-2.19-1.9z"/>' +
    '<path d="M8.6 8V6.4a3.4 3.4 0 0 1 6.8 0V8"/>' +
  '</svg>';

/* Cria o painel da sacola no fim da pagina. */
function criarSacola(){
  if (document.getElementById("cart")) return;
  var html =
    '<div class="cart-fundo" id="cartFundo" onclick="fecharCarrinho()"></div>' +
    '<aside class="cart" id="cart" role="dialog" aria-modal="true" aria-label="Sacola de compras">' +
      '<div class="cart-topo">' +
        '<div><h2>Sua sacola</h2><small id="cartResumoTopo">Nenhum item</small></div>' +
        '<button type="button" class="cart-fechar" onclick="fecharCarrinho()" aria-label="Fechar sacola">✕</button>' +
      '</div>' +
      '<div class="cart-corpo" id="cartCorpo"></div>' +
      '<div class="cart-pe" id="cartPe" hidden>' +
        '<div class="cart-linha"><span id="cartQtdLabel">Subtotal</span><span id="cartSubtotal">R$ 0,00</span></div>' +
        '<div class="cart-linha economia" id="cartLinhaDesconto"><span>Desconto</span><span id="cartEconomia">− R$ 0,00</span></div>' +
        '<div class="cart-linha kit-natal" id="cartLinhaKit" hidden><span>🎄 Oferta especial de Natal</span><span id="cartKit">− R$ 0,00</span></div>' +
        '<div class="cart-linha"><span>Frete</span><span style="color:var(--ink);font-weight:800">Grátis</span></div>' +
        '<div class="cart-linha total"><span>Total</span><span id="cartTotal">R$ 0,00</span></div>' +
        '<div class="cart-natal">🎄 Peça com antecedência para receber antes do Natal</div>' +
        '<button type="button" class="cta" onclick="irParaPagamento()">IR PARA O PAGAMENTO <span class="cta-seta" aria-hidden="true">→</span></button>' +
        '<button type="button" class="cart-continuar" onclick="fecharCarrinho()">Continuar comprando</button>' +
      '</div>' +
    '</aside>';
  document.body.insertAdjacentHTML("beforeend", html);
}

/* Coloca na sacola e abre o painel. Chamado pelos botoes de compra
   da landing (1 unidade) e da pagina do produto (quantidade escolhida). */
function adicionarNaSacola(cor, qtd){
  cor = cor || COR_PADRAO;
  qtd = Math.max(1, Math.min(qtd || 1, QTD_MAX));

  var existente = null;
  for (var i = 0; i < carrinho.length; i++){
    if (carrinho[i].cor === cor){ existente = carrinho[i]; break; }
  }
  if (existente){
    existente.qtd = Math.min(existente.qtd + qtd, QTD_MAX);
  } else {
    carrinho.push({ cor: cor, qtd: qtd });
  }
  salvarCarrinho();
  renderCarrinho();
  abrirCarrinho();

  /* O valor enviado e o do item que acabou de entrar, nao o da
     sacola inteira: AddToCart repetido somaria errado no relatorio. */
  if (typeof pixelAdicionarCarrinho === "function"){
    pixelAdicionarCarrinho(PRODUTO_NOME, precoTotal(qtd), qtd);
  }
}

function mudarItem(indice, passo){
  var item = carrinho[indice];
  if (!item) return;
  item.qtd += passo;
  if (item.qtd < 1) { carrinho.splice(indice, 1); }
  else if (item.qtd > QTD_MAX) { item.qtd = QTD_MAX; }
  salvarCarrinho();
  renderCarrinho();
}

function removerItem(indice){
  carrinho.splice(indice, 1);
  salvarCarrinho();
  renderCarrinho();
}

function renderCarrinho(){
  var corpo = document.getElementById("cartCorpo");
  if (!corpo) return;
  var pe         = document.getElementById("cartPe");
  var contador   = document.getElementById("cartContador");   /* icone do topo (se a pagina tiver) */
  var resumoTopo = document.getElementById("cartResumoTopo");

  var unidades = totalUnidades();
  if (contador){
    contador.textContent = unidades;
    contador.hidden = unidades === 0;
  }

  if (unidades === 0){
    corpo.innerHTML =
      '<div class="cart-vazio">' +
        '<div class="sacola-vazia">' + ICONE_SACOLA + '</div>' +
        '<b>Sua sacola está vazia</b>' +
        '<p>Adicione sua Luminária Encanto de Natal Premium para continuar.</p>' +
      '</div>';
    pe.hidden = true;
    resumoTopo.textContent = "Nenhum item";
    limparBumps();
    return;
  }

  var r = resumoPedido();
  var temModelos = Object.keys(CORES_HEX).length > 1;

  resumoTopo.textContent = unidades + (unidades > 1 ? " itens" : " item");

  var html = "";

  /* incentivo para a faixa de preco mais barata */
  var faixaMaior = Math.max.apply(null, Object.keys(TOTAIS).map(Number)) + 1;
  if (temDescontoPorQuantidade() && unidades < faixaMaior){
    var faltam = faixaMaior - unidades;
    html +=
      '<div class="cart-aviso">🎄 Adicione mais <b>' + faltam +
      (faltam > 1 ? " unidades" : " unidade") +
      '</b> e cada uma sai por apenas <b>' + brl(UNIT_ACIMA) + '</b></div>';
  }

  r.linhas.forEach(function(linha, i){
    html +=
      '<div class="ci">' +
        '<a href="' + URL_PRODUTO + '"><img class="ci-img" src="' + FOTO_ITEM + '" alt="' + PRODUTO_NOME + '"></a>' +
        '<div class="ci-info">' +
          '<a class="ci-nome" href="' + URL_PRODUTO + '">' + PRODUTO_NOME + '</a>' +
          (temModelos
            ? '<span class="ci-cor"><i class="ci-bola" style="background:' + CORES_HEX[linha.cor] + '"></i>' + linha.cor + '</span>'
            : '') +
          '<span class="ci-stepper">' +
            '<button type="button" class="ci-step" onclick="mudarItem(' + i + ',-1)" aria-label="Diminuir">−</button>' +
            '<span class="ci-qtd">' + linha.qtd + '</span>' +
            '<button type="button" class="ci-step" onclick="mudarItem(' + i + ',1)" aria-label="Aumentar">+</button>' +
          '</span>' +
        '</div>' +
        '<div class="ci-lado">' +
          '<span class="ci-total">' + brl(linha.valor) + '</span>' +
          '<button type="button" class="ci-remover" onclick="removerItem(' + i + ')">Remover</button>' +
        '</div>' +
      '</div>';
  });

  if (BUMPS.length){
    html += '<span class="bump-tag">Leve também, só aqui na sacola</span>';
  }
  BUMPS.forEach(function(BUMP){
    var noCarrinho = bumpAtivo(BUMP.sku);
    var cor = corDoBump(BUMP);
    html +=
      '<div class="bump-bloco' + (cor ? " com-cor" : "") + (noCarrinho ? " ativo" : "") + '">' +
      '<span class="bump-bf" aria-hidden="true">BLACK <b>FRIDAY</b></span>' +
      '<button type="button" class="bump" ' +
              'onclick="alternarBumpUI(\'' + BUMP.sku + '\')" aria-pressed="' + (noCarrinho ? "true" : "false") + '">' +
        '<span class="bump-check" aria-hidden="true">✓</span>' +
        '<span class="bump-img"><img src="' + (cor ? cor.foto : BUMP.foto) + '" alt="" loading="lazy" onerror="this.remove()"></span>' +
        '<span class="bump-txt">' +
          '<b>' + BUMP.nome + (BUMP.kit ? ' <span class="bump-kit">' + BUMP.kit + '</span>' : '') + '</b>' +
          '<small>' + BUMP.desc + '</small>' +
          '<span class="bump-preco"><s>' + brl(BUMP.de) + '</s><b>' + brl(BUMP.por) + '</b></span>' +
          (BUMP.kitNatal
            ? '<span class="bump-natal' + (noCarrinho ? " ativo" : "") + '">' +
                (noCarrinho
                  ? '🎄 Oferta especial de Natal ativada: <b>kit por ' + brl(BUMP.kitNatal) + '</b>'
                  : '🎄 Com a luminária: <b>kit por ' + brl(BUMP.kitNatal) + '</b>') +
              '</span>'
            : '') +
        '</span>' +
      '</button>' +
      /* cor: pílula [● Cor ▾] na linha do preço; abre um balão com as
         bolinhas. Fecha ao escolher (a sacola é redesenhada), ao tocar
         fora ou com Esc. A bolinha da pílula mostra a cor escolhida. */
      (cor
        ? '<details class="bump-cor-sel">' +
            '<summary aria-label="Escolher cor. Escolhida: ' + cor.nome + '">' +
              '<i class="bump-bola-mini" style="background:' + cor.amostra + '"></i>Cor' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
            '</summary>' +
            '<div class="bump-pop">' +
              '<span class="bump-pop-tit">Cor: <b>' + cor.nome + '</b></span>' +
              '<div class="bump-bolas" role="radiogroup" aria-label="Cor do ' + BUMP.nome + '">' +
                BUMP.cores.map(function(c){
                  var sel = c.nome === cor.nome;
                  return '<button type="button" class="bump-bola' + (sel ? " sel" : "") + '" role="radio" aria-checked="' + sel + '" ' +
                           'aria-label="' + c.nome + '" title="' + c.nome + '" ' +
                           'style="background:' + c.amostra + '" ' +
                           'onclick="escolherCorBumpUI(\'' + BUMP.sku + '\',\'' + c.nome + '\')"></button>';
                }).join("") +
              '</div>' +
            '</div>' +
          '</details>'
        : '') +
      '</div>';
  });

  corpo.innerHTML = html;

  var itens = unidades + r.bumps.length;   /* conta os bumps também */
  document.getElementById("cartQtdLabel").textContent =
    "Subtotal (" + itens + (itens > 1 ? " itens)" : " item)");
  document.getElementById("cartSubtotal").textContent = brl(r.cheio);
  /* "Desconto" = preço riscado; o kit de Natal tem linha própria */
  var descontoPreco = r.economia - r.descontoKit;
  document.getElementById("cartEconomia").textContent = "− " + brl(descontoPreco);
  document.getElementById("cartLinhaDesconto").hidden = descontoPreco < 0.005;
  document.getElementById("cartKit").textContent = "− " + brl(r.descontoKit);
  document.getElementById("cartLinhaKit").hidden = r.descontoKit < 0.005;
  document.getElementById("cartTotal").textContent    = brl(r.total);
  pe.hidden = false;
}

function alternarBumpUI(sku){
  var b = acharBump(sku);
  var kitAntes = descontoKitNatal(totalUnidades());
  var entrou = alternarBump(sku);
  renderCarrinho();
  /* valor real que o bump acrescenta ao pedido (já com o kit de Natal) */
  if (b && entrou && typeof pixelAdicionarCarrinho === "function"){
    pixelAdicionarCarrinho(b.nome, b.por - (descontoKitNatal(totalUnidades()) - kitAntes), 1);
  }
}

/* troca a cor do bump (não adiciona sozinho: o cliente marca o quadradinho) */
function escolherCorBumpUI(sku, nomeCor){
  escolherCorBump(sku, nomeCor);
  renderCarrinho();
}

var focoAntesDaSacola = null;

function abrirCarrinho(){
  criarSacola();
  renderCarrinho();
  focoAntesDaSacola = document.activeElement;
  document.getElementById("cart").classList.add("aberto");
  document.getElementById("cartFundo").classList.add("aberto");
  document.body.style.overflow = "hidden";
  /* teclado/leitor de tela: o foco vai para dentro da sacola */
  setTimeout(function(){ document.querySelector(".cart-fechar").focus(); }, 50);
}

function fecharCarrinho(){
  var cart = document.getElementById("cart");
  if (!cart || !cart.classList.contains("aberto")) return;
  cart.classList.remove("aberto");
  document.getElementById("cartFundo").classList.remove("aberto");
  document.body.style.overflow = "";
  if (focoAntesDaSacola && focoAntesDaSacola.focus) focoAntesDaSacola.focus();
}

function irParaPagamento(){
  if (totalUnidades() === 0) return;
  if (typeof pixelIniciarCheckout === "function"){
    pixelIniciarCheckout(resumoPedido().total, totalUnidades());
  }
  /* a sacola ja esta salva no navegador; o checkout le de la */
  window.location.href = URL_CHECKOUT;
}

/* Esc fecha primeiro o balão de cores; se nenhum estiver aberto, a sacola */
document.addEventListener("keydown", function(e){
  if (e.key !== "Escape") return;
  var aberto = document.querySelector(".bump-cor-sel[open]");
  if (aberto){ aberto.removeAttribute("open"); aberto.querySelector("summary").focus(); return; }
  fecharCarrinho();
});

/* tocar fora do balão de cores fecha ele */
document.addEventListener("click", function(e){
  document.querySelectorAll(".bump-cor-sel[open]").forEach(function(d){
    if (!d.contains(e.target)) d.removeAttribute("open");
  });
});

document.addEventListener("DOMContentLoaded", function(){
  carregarCarrinho();
  criarSacola();
  renderCarrinho();
});
