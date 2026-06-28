/* ===========================================================
   APLICAÇÃO 7 FERRAMENTAS DA QUALIDADE
   Persistência via localStorage, gráficos via Chart.js
   =========================================================== */

/* ---------- Chaves de armazenamento ---------- */
const CHAVES = {
  fluxograma: 'qualityTools_fluxograma',
  folhaVerificacao: 'qualityTools_folhaVerificacao',
  histograma: 'qualityTools_histograma',
  pareto: 'qualityTools_pareto',
  dispersao: 'qualityTools_dispersao',
  ishikawa: 'qualityTools_ishikawa',
  cincoPorques: 'qualityTools_cincoPorques',
  graficoControle: 'qualityTools_graficoControle'
};

/* ---------- Funções genéricas de persistência ---------- */
function saveData(toolName, data) {
  localStorage.setItem(CHAVES[toolName], JSON.stringify(data));
}

function loadData(toolName) {
  const raw = localStorage.getItem(CHAVES[toolName]);
  return raw ? JSON.parse(raw) : null;
}

function clearData(toolName) {
  localStorage.removeItem(CHAVES[toolName]);
}

/* ---------- Abertura premium (splash screen) — só no carregamento inicial ---------- */
window.addEventListener('load', () => {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  setTimeout(() => {
    splash.classList.add('splash-hide');
  }, 2600);

  setTimeout(() => {
    splash.remove();
  }, 3300);
});

/* ---------- Navegação entre seções ---------- */
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');
  window.scrollTo(0, 0);
}

function imprimirTela() {
  window.print();
}

/* Mantém referências aos gráficos Chart.js para poder destruir/atualizar */
const graficos = {
  histograma: null,
  pareto: null,
  dispersao: null,
  graficoControle: null
};

/* ===========================================================
   INICIALIZAÇÃO GERAL
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Navegação do menu
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => showSection(card.dataset.target));
  });

  // Botões "Abrir ferramenta" do guia visual "Qual ferramenta usar?"
  document.querySelectorAll('.guia-botao').forEach(botao => {
    botao.addEventListener('click', () => showSection(botao.dataset.target));
  });

  // Botões "Voltar ao menu"
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => showSection('menu'));
  });

  initToolGifIcons();
  initGuiaPreviewImages();
  initHeroMenu();

  initFluxograma();
  initFolhaVerificacao();
  initHistograma();
  initPareto();
  initDispersao();
  initIshikawa();
  initCincoPorques();
  initGraficoControle();
});

/* ===========================================================
   ÍCONES ANIMADOS (GIF) — cards principais e composição do hero
   Se o arquivo do GIF não existir/carregar, mantém o emoji de fallback.
   =========================================================== */
function initToolGifIcons() {
  document.querySelectorAll('.tool-gif-icon').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback && fallback.classList.contains('tool-gif-icon-fallback')) {
        fallback.style.display = 'flex';
      }
    });
  });
}

/* ===========================================================
   IMAGENS DE PREVIEW — guia visual "Qual ferramenta usar?"
   Se o arquivo de preview não existir/carregar, mantém o placeholder elegante.
   =========================================================== */
function initGuiaPreviewImages() {
  document.querySelectorAll('.guia-imagem').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const fallback = img.nextElementSibling;
      if (fallback && fallback.classList.contains('guia-imagem-fallback')) {
        fallback.style.display = 'flex';
      }
    });
  });
}

/* ===========================================================
   MENU — hero premium (botões de ação + leve parallax do visual)
   =========================================================== */
function initHeroMenu() {
  const grid = document.getElementById('ferramentas-grid');
  const btnStart = document.getElementById('hero-btn-start');
  const btnView = document.getElementById('hero-btn-view');

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // "Qual ferramenta usar?" abre a tela própria, usando a mesma navegação das ferramentas
  if (btnView) {
    btnView.addEventListener('click', () => showSection('qualFerramentaUsar'));
  }

  // Ícones/módulos da composição visual também navegam direto para a ferramenta,
  // usando a mesma função showSection() dos cards principais do menu.
  document.querySelectorAll('.hero-node').forEach(node => {
    node.addEventListener('click', () => showSection(node.dataset.target));
  });

  const visual = document.getElementById('hero-visual');
  if (!visual) return;

  // Deslocamento leve das camadas ao mover o mouse sobre a composição visual
  visual.addEventListener('mousemove', e => {
    const rect = visual.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    visual.style.transform = `rotateX(${relY * -6}deg) rotateY(${relX * 6}deg)`;
  });

  visual.addEventListener('mouseleave', () => {
    visual.style.transform = 'rotateX(0deg) rotateY(0deg)';
  });
}

/* ===========================================================
   FERRAMENTA 2 — FLUXOGRAMA
   Editor visual em SVG com apenas 4 símbolos:
   Início ou Fim, Decisão, Operação/Ação, Documento.
   =========================================================== */
const SVG_NS = 'http://www.w3.org/2000/svg';

const ROTULOS_FLUXO = {
  inicioFim: 'Início',
  decisao: 'Decisão',
  operacao: 'Operação',
  documento: 'Documento'
};

/* Tamanho padrão de cada tipo de símbolo */
const TAMANHO_PADRAO_FLUXO = {
  inicioFim: { w: 150, h: 64 },
  decisao: { w: 150, h: 100 },
  operacao: { w: 150, h: 70 },
  documento: { w: 150, h: 80 }
};

let fluxNodes = [];
let fluxConnections = [];
let fluxIdCounter = 1;
let fluxModoConexao = false;
let fluxOrigemConexao = null;
let fluxSelecionado = null; // { tipo: 'node'|'connection', id }
let fluxArrastando = null; // { id, offsetX, offsetY }

function initFluxograma() {
  const dados = loadData('fluxograma');
  fluxNodes = (dados && dados.nodes) || [];
  fluxConnections = (dados && dados.connections) || [];
  fluxIdCounter = [...fluxNodes.map(n => n.id), ...fluxConnections.map(c => c.id), 0]
    .reduce((max, id) => Math.max(max, id), 0) + 1;

  renderFluxograma();

  // Paleta: clique insere no centro do canvas, drag and drop insere na posição do cursor
  document.querySelectorAll('.flux-palette-item').forEach(item => {
    item.addEventListener('click', () => {
      adicionarNoFluxograma(item.dataset.tipo, 100, 60);
    });
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/flux-tipo', item.dataset.tipo);
    });
  });

  const wrapper = document.querySelector('.flux-canvas-wrapper');
  wrapper.addEventListener('dragover', e => e.preventDefault());
  wrapper.addEventListener('drop', e => {
    e.preventDefault();
    const tipo = e.dataTransfer.getData('text/flux-tipo');
    if (!tipo) return;
    const svg = document.getElementById('flux-svg');
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    adicionarNoFluxograma(tipo, x, y);
  });

  document.getElementById('flux-connect').addEventListener('click', () => {
    fluxModoConexao = !fluxModoConexao;
    fluxOrigemConexao = null;
    document.getElementById('flux-connect').classList.toggle('ativo', fluxModoConexao);
    document.getElementById('flux-connect').textContent = fluxModoConexao
      ? 'Cancelar conexão'
      : 'Conectar blocos';
    renderFluxograma();
  });

  document.getElementById('flux-save').addEventListener('click', () => {
    salvarFluxograma();
    alert('Fluxograma salvo com sucesso.');
  });

  document.getElementById('flux-clear').addEventListener('click', () => {
    if (!confirm('Limpar todos os blocos e conexões do fluxograma?')) return;
    fluxNodes = [];
    fluxConnections = [];
    fluxSelecionado = null;
    clearData('fluxograma');
    renderFluxograma();
    fecharPainelEdicaoFluxo();
  });

  document.getElementById('flux-print').addEventListener('click', imprimirTela);

  document.getElementById('flux-edit-delete').addEventListener('click', excluirSelecionadoFluxo);
  document.getElementById('flux-edit-close').addEventListener('click', () => {
    fluxSelecionado = null;
    fecharPainelEdicaoFluxo();
    renderFluxograma();
  });

  ['texto', 'fill', 'stroke', 'strokeWidth', 'w', 'h'].forEach(campo => {
    document.getElementById(`flux-edit-${campo}`).addEventListener('input', aplicarEdicaoFluxo);
  });

  document.getElementById('flux-edit-rotulo').addEventListener('input', aplicarEdicaoFluxo);
  document.getElementById('flux-rotulo-sim').addEventListener('click', () => definirRotuloConexaoSelecionada('Sim'));
  document.getElementById('flux-rotulo-nao').addEventListener('click', () => definirRotuloConexaoSelecionada('Não'));
  document.getElementById('flux-rotulo-limpar').addEventListener('click', () => definirRotuloConexaoSelecionada(''));

  // Move/seleciona ao arrastar no canvas
  const svg = document.getElementById('flux-svg');
  svg.addEventListener('mousemove', onFluxMouseMove);
  svg.addEventListener('mouseup', onFluxMouseUp);
  svg.addEventListener('mouseleave', onFluxMouseUp);
  svg.addEventListener('click', e => {
    if (e.target.id === 'flux-svg' || e.target.classList.contains('flux-grid-bg')) {
      fluxSelecionado = null;
      fecharPainelEdicaoFluxo();
      renderFluxograma();
    }
  });
}

function salvarFluxograma() {
  saveData('fluxograma', { nodes: fluxNodes, connections: fluxConnections });
}

function adicionarNoFluxograma(tipo, x, y) {
  const tamanho = TAMANHO_PADRAO_FLUXO[tipo] || { w: 150, h: 70 };
  fluxNodes.push({
    id: fluxIdCounter++,
    tipo,
    x: Math.max(0, x - tamanho.w / 2),
    y: Math.max(0, y - tamanho.h / 2),
    w: tamanho.w,
    h: tamanho.h,
    texto: ROTULOS_FLUXO[tipo] || '',
    fill: '#cfe3f7',
    stroke: '#0070C0',
    strokeWidth: 2
  });
  renderFluxograma();
}

/* Gera o markup SVG (sem texto) de cada um dos 4 símbolos permitidos */
function gerarFormaSvg(tipo, w, h, fill, stroke, strokeWidth) {
  const estilo = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"`;
  switch (tipo) {
    case 'inicioFim':
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${h / 2}" ry="${h / 2}" ${estilo}/>`;
    case 'decisao':
      return `<polygon points="${w / 2},1 ${w - 1},${h / 2} ${w / 2},${h - 1} 1,${h / 2}" ${estilo}/>`;
    case 'documento':
      return `<path d="M1,1 H${w - 1} V${h * 0.75} Q${w * 0.75},${h - 1} ${w / 2},${h * 0.75} Q${w * 0.25},${h * 0.55} 1,${h * 0.75} Z" ${estilo}/>`;
    case 'operacao':
    default:
      return `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" ${estilo}/>`;
  }
}

function renderFluxograma() {
  const layerConexoes = document.getElementById('flux-connections-layer');
  const layerNodes = document.getElementById('flux-nodes-layer');
  layerConexoes.innerHTML = '';
  layerNodes.innerHTML = '';

  // Desenha conexões (atrás dos blocos)
  fluxConnections.forEach(conn => {
    const origem = fluxNodes.find(n => n.id === conn.fromId);
    const destino = fluxNodes.find(n => n.id === conn.toId);
    if (!origem || !destino) return;

    const p1 = centroNo(origem);
    const p2 = centroNo(destino);
    const linha = document.createElementNS(SVG_NS, 'line');
    linha.setAttribute('x1', p1.x);
    linha.setAttribute('y1', p1.y);
    linha.setAttribute('x2', p2.x);
    linha.setAttribute('y2', p2.y);
    linha.setAttribute('marker-end', 'url(#flux-arrow)');
    linha.classList.add('flux-connection');
    if (fluxSelecionado && fluxSelecionado.tipo === 'connection' && fluxSelecionado.id === conn.id) {
      linha.classList.add('selected');
    }
    linha.dataset.id = conn.id;
    linha.addEventListener('click', e => {
      e.stopPropagation();
      fluxSelecionado = { tipo: 'connection', id: conn.id };
      abrirPainelEdicaoConexao(conn);
      renderFluxograma();
    });
    layerConexoes.appendChild(linha);

    // Rótulo da conexão (ex.: "Sim"/"Não"), centrado na linha com fundo branco
    if (conn.rotulo) {
      const meioX = (p1.x + p2.x) / 2;
      const meioY = (p1.y + p2.y) / 2;
      const larguraFundo = Math.max(28, conn.rotulo.length * 7 + 10);

      const fundo = document.createElementNS(SVG_NS, 'rect');
      fundo.classList.add('flux-connection-label-bg');
      fundo.setAttribute('x', meioX - larguraFundo / 2);
      fundo.setAttribute('y', meioY - 10);
      fundo.setAttribute('width', larguraFundo);
      fundo.setAttribute('height', 18);
      fundo.setAttribute('rx', 4);
      layerConexoes.appendChild(fundo);

      const texto = document.createElementNS(SVG_NS, 'text');
      texto.classList.add('flux-connection-label-text');
      texto.setAttribute('x', meioX);
      texto.setAttribute('y', meioY - 1);
      texto.textContent = conn.rotulo;
      layerConexoes.appendChild(texto);
    }
  });

  // Desenha blocos
  fluxNodes.forEach(node => {
    const g = document.createElementNS(SVG_NS, 'g');
    g.classList.add('flux-node');
    g.dataset.id = node.id;
    if (fluxSelecionado && fluxSelecionado.tipo === 'node' && fluxSelecionado.id === node.id) {
      g.classList.add('selected');
    }
    if (fluxModoConexao && fluxOrigemConexao === node.id) {
      g.classList.add('connect-pending');
    }
    g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    const formaWrapper = document.createElementNS(SVG_NS, 'g');
    formaWrapper.classList.add('flux-node-shape');
    formaWrapper.innerHTML = gerarFormaSvg(node.tipo, node.w, node.h, node.fill, node.stroke, node.strokeWidth);
    g.appendChild(formaWrapper);

    const fo = document.createElementNS(SVG_NS, 'foreignObject');
    fo.setAttribute('x', 0);
    fo.setAttribute('y', 0);
    fo.setAttribute('width', node.w);
    fo.setAttribute('height', node.h);
    const div = document.createElement('div');
    div.className = 'flux-node-text';
    div.textContent = node.texto;
    fo.appendChild(div);
    g.appendChild(fo);

    g.addEventListener('mousedown', e => onFluxNodeMouseDown(e, node));
    g.addEventListener('click', e => onFluxNodeClick(e, node));
    g.addEventListener('dblclick', e => onFluxNodeDblClick(e, node, div));

    layerNodes.appendChild(g);
  });
}

function centroNo(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function onFluxNodeMouseDown(e, node) {
  if (fluxModoConexao) return;
  if (e.target.closest('.flux-node-text.editing')) return;
  e.preventDefault();
  const svg = document.getElementById('flux-svg');
  const rect = svg.getBoundingClientRect();
  fluxArrastando = {
    id: node.id,
    offsetX: e.clientX - rect.left - node.x,
    offsetY: e.clientY - rect.top - node.y
  };
}

function onFluxMouseMove(e) {
  if (!fluxArrastando) return;
  const node = fluxNodes.find(n => n.id === fluxArrastando.id);
  if (!node) return;
  const svg = document.getElementById('flux-svg');
  const rect = svg.getBoundingClientRect();
  node.x = Math.max(0, e.clientX - rect.left - fluxArrastando.offsetX);
  node.y = Math.max(0, e.clientY - rect.top - fluxArrastando.offsetY);
  renderFluxograma();
}

function onFluxMouseUp() {
  fluxArrastando = null;
}

function onFluxNodeClick(e, node) {
  e.stopPropagation();

  if (fluxModoConexao) {
    if (fluxOrigemConexao === null) {
      fluxOrigemConexao = node.id;
      renderFluxograma();
    } else if (fluxOrigemConexao !== node.id) {
      const origem = fluxNodes.find(n => n.id === fluxOrigemConexao);
      const novaConexao = { id: fluxIdCounter++, fromId: fluxOrigemConexao, toId: node.id, rotulo: '' };
      fluxConnections.push(novaConexao);
      fluxOrigemConexao = null;

      // Conexões saindo de um bloco de Decisão já abrem o painel para escolher Sim/Não
      if (origem && origem.tipo === 'decisao') {
        fluxSelecionado = { tipo: 'connection', id: novaConexao.id };
        abrirPainelEdicaoConexao(novaConexao);
      }
      renderFluxograma();
    }
    return;
  }

  fluxSelecionado = { tipo: 'node', id: node.id };
  abrirPainelEdicaoNode(node);
  renderFluxograma();
}

function onFluxNodeDblClick(e, node, div) {
  e.stopPropagation();
  if (fluxModoConexao) return;

  div.classList.add('editing');
  div.contentEditable = 'true';
  div.focus();

  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const finalizarEdicao = () => {
    node.texto = div.textContent;
    div.classList.remove('editing');
    div.contentEditable = 'false';
    div.removeEventListener('blur', finalizarEdicao);
    atualizarPainelTextoSeSelecionado(node);
  };
  div.addEventListener('blur', finalizarEdicao);
}

function atualizarPainelTextoSeSelecionado(node) {
  if (fluxSelecionado && fluxSelecionado.tipo === 'node' && fluxSelecionado.id === node.id) {
    document.getElementById('flux-edit-texto').value = node.texto;
  }
}

function abrirPainelEdicaoNode(node) {
  const painel = document.getElementById('flux-editPanel');
  painel.hidden = false;
  document.querySelectorAll('[data-campo-no]').forEach(el => el.hidden = false);
  document.getElementById('flux-edit-rotulo-group').hidden = true;

  document.getElementById('flux-edit-texto').value = node.texto;
  document.getElementById('flux-edit-fill').value = node.fill;
  document.getElementById('flux-edit-stroke').value = node.stroke;
  document.getElementById('flux-edit-strokeWidth').value = node.strokeWidth;
  document.getElementById('flux-edit-w').value = node.w;
  document.getElementById('flux-edit-h').value = node.h;
}

function abrirPainelEdicaoConexao(conn) {
  const painel = document.getElementById('flux-editPanel');
  painel.hidden = false;
  document.querySelectorAll('[data-campo-no]').forEach(el => el.hidden = true);
  document.getElementById('flux-edit-rotulo-group').hidden = false;

  document.getElementById('flux-edit-rotulo').value = conn.rotulo || '';
}

function fecharPainelEdicaoFluxo() {
  document.getElementById('flux-editPanel').hidden = true;
}

function aplicarEdicaoFluxo() {
  if (!fluxSelecionado) return;

  if (fluxSelecionado.tipo === 'node') {
    const node = fluxNodes.find(n => n.id === fluxSelecionado.id);
    if (!node) return;
    node.texto = document.getElementById('flux-edit-texto').value;
    node.fill = document.getElementById('flux-edit-fill').value;
    node.stroke = document.getElementById('flux-edit-stroke').value;
    node.strokeWidth = parseFloat(document.getElementById('flux-edit-strokeWidth').value) || 2;
    node.w = parseFloat(document.getElementById('flux-edit-w').value) || node.w;
    node.h = parseFloat(document.getElementById('flux-edit-h').value) || node.h;
    renderFluxograma();
  } else if (fluxSelecionado.tipo === 'connection') {
    const conn = fluxConnections.find(c => c.id === fluxSelecionado.id);
    if (!conn) return;
    conn.rotulo = document.getElementById('flux-edit-rotulo').value;
    renderFluxograma();
  }
}

function definirRotuloConexaoSelecionada(rotulo) {
  if (!fluxSelecionado || fluxSelecionado.tipo !== 'connection') return;
  const conn = fluxConnections.find(c => c.id === fluxSelecionado.id);
  if (!conn) return;
  conn.rotulo = rotulo;
  document.getElementById('flux-edit-rotulo').value = rotulo;
  renderFluxograma();
}

function excluirSelecionadoFluxo() {
  if (!fluxSelecionado) return;

  if (fluxSelecionado.tipo === 'node') {
    fluxNodes = fluxNodes.filter(n => n.id !== fluxSelecionado.id);
    fluxConnections = fluxConnections.filter(c => c.fromId !== fluxSelecionado.id && c.toId !== fluxSelecionado.id);
  } else if (fluxSelecionado.tipo === 'connection') {
    fluxConnections = fluxConnections.filter(c => c.id !== fluxSelecionado.id);
  }

  fluxSelecionado = null;
  fecharPainelEdicaoFluxo();
  renderFluxograma();
}

/* ===========================================================
   FERRAMENTA 3 — FOLHA DE VERIFICAÇÃO
   =========================================================== */
const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

function linhasPadraoFolhaVerificacao() {
  const combinacoes = [
    { turno: 1, maquina: 'X', operador: 'A' },
    { turno: 1, maquina: 'Y', operador: 'B' },
    { turno: 2, maquina: 'X', operador: 'A' },
    { turno: 2, maquina: 'Y', operador: 'B' },
    { turno: 3, maquina: 'X', operador: 'A' },
    { turno: 3, maquina: 'Y', operador: 'B' },
    { turno: 4, maquina: 'X', operador: 'A' },
    { turno: 4, maquina: 'Y', operador: 'B' }
  ];

  return combinacoes.map(c => {
    const linha = { turno: c.turno, maquina: c.maquina, operador: c.operador };
    DIAS_SEMANA.forEach(dia => linha[dia] = '');
    return linha;
  });
}

let fvLinhas = [];

function initFolhaVerificacao() {
  const dados = loadData('folhaVerificacao');

  if (dados) {
    document.getElementById('fv-problema').value = dados.problema || '';
    document.getElementById('fv-estagio').value = dados.estagio || '';
    document.getElementById('fv-produto').value = dados.produto || '';
    document.getElementById('fv-totalInspecionado').value = dados.totalInspecionado || '';
    fvLinhas = dados.linhas && dados.linhas.length ? dados.linhas : linhasPadraoFolhaVerificacao();
  } else {
    fvLinhas = linhasPadraoFolhaVerificacao();
  }

  renderFolhaVerificacao();

  document.getElementById('fv-addRow').addEventListener('click', () => {
    const linha = { turno: '', maquina: '', operador: '' };
    DIAS_SEMANA.forEach(dia => linha[dia] = '');
    fvLinhas.push(linha);
    renderFolhaVerificacao();
  });

  document.getElementById('fv-calcTotal').addEventListener('click', () => {
    let total = 0;
    fvLinhas.forEach(linha => {
      DIAS_SEMANA.forEach(dia => {
        const valor = parseFloat(linha[dia]);
        if (!isNaN(valor)) total += valor;
      });
    });
    document.getElementById('fv-totalResultado').textContent = `Total somado: ${total}`;
  });

  document.getElementById('fv-save').addEventListener('click', () => {
    salvarFolhaVerificacao();
    alert('Folha de verificação salva com sucesso.');
  });

  document.getElementById('fv-clear').addEventListener('click', () => {
    if (!confirm('Limpar toda a folha de verificação?')) return;
    fvLinhas = linhasPadraoFolhaVerificacao();
    document.getElementById('fv-problema').value = '';
    document.getElementById('fv-estagio').value = '';
    document.getElementById('fv-produto').value = '';
    document.getElementById('fv-totalInspecionado').value = '';
    document.getElementById('fv-totalResultado').textContent = '';
    clearData('folhaVerificacao');
    renderFolhaVerificacao();
  });

  document.getElementById('fv-print').addEventListener('click', imprimirTela);
}

function salvarFolhaVerificacao() {
  const dados = {
    problema: document.getElementById('fv-problema').value,
    estagio: document.getElementById('fv-estagio').value,
    produto: document.getElementById('fv-produto').value,
    totalInspecionado: document.getElementById('fv-totalInspecionado').value,
    linhas: fvLinhas
  };
  saveData('folhaVerificacao', dados);
}

function renderFolhaVerificacao() {
  const tbody = document.getElementById('fv-tbody');
  tbody.innerHTML = '';

  fvLinhas.forEach((linha, index) => {
    const tr = document.createElement('tr');

    tr.appendChild(criarCelulaInput(linha, 'turno', index));
    tr.appendChild(criarCelulaInput(linha, 'maquina', index));
    tr.appendChild(criarCelulaInput(linha, 'operador', index));
    DIAS_SEMANA.forEach(dia => {
      tr.appendChild(criarCelulaInput(linha, dia, index, 'number'));
    });

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'no-print';
    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Excluir';
    btnRemover.className = 'btn-danger';
    btnRemover.addEventListener('click', () => {
      fvLinhas.splice(index, 1);
      renderFolhaVerificacao();
    });
    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function criarCelulaInput(linha, campo, index, tipo = 'text') {
  const td = document.createElement('td');
  const input = document.createElement('input');
  input.type = tipo;
  input.value = linha[campo];
  input.addEventListener('input', () => {
    linha[campo] = input.value;
  });
  td.appendChild(input);
  return td;
}

/* ===========================================================
   FERRAMENTA 4 — HISTOGRAMA
   =========================================================== */
let histValores = [];

function initHistograma() {
  const dados = loadData('histograma');

  if (dados) {
    document.getElementById('hist-titulo').value = dados.titulo || '';
    document.getElementById('hist-classes').value = dados.classes || '';
    histValores = dados.valores && dados.valores.length ? dados.valores : [''];
  } else {
    histValores = [''];
  }

  renderHistogramaTabela();
  renderHistograma();

  document.getElementById('hist-addValor').addEventListener('click', () => {
    histValores.push('');
    renderHistogramaTabela();
  });

  document.getElementById('hist-titulo').addEventListener('input', renderHistograma);
  document.getElementById('hist-classes').addEventListener('input', renderHistograma);

  document.getElementById('hist-save').addEventListener('click', () => {
    salvarHistograma();
    alert('Histograma salvo com sucesso.');
  });

  document.getElementById('hist-clear').addEventListener('click', () => {
    if (!confirm('Limpar todos os dados do histograma?')) return;
    histValores = [''];
    document.getElementById('hist-titulo').value = '';
    document.getElementById('hist-classes').value = '';
    clearData('histograma');
    renderHistogramaTabela();
    renderHistograma();
  });

  document.getElementById('hist-print').addEventListener('click', imprimirTela);
}

function salvarHistograma() {
  saveData('histograma', {
    titulo: document.getElementById('hist-titulo').value,
    classes: document.getElementById('hist-classes').value,
    valores: histValores
  });
}

function renderHistogramaTabela() {
  const tbody = document.getElementById('hist-tbodyValores');
  tbody.innerHTML = '';

  histValores.forEach((valor, index) => {
    const tr = document.createElement('tr');

    const tdValor = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.value = valor;
    input.addEventListener('input', () => {
      histValores[index] = input.value;
      renderHistograma();
    });
    tdValor.appendChild(input);
    tr.appendChild(tdValor);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'no-print';
    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Excluir';
    btnRemover.className = 'btn-danger';
    btnRemover.addEventListener('click', () => {
      histValores.splice(index, 1);
      renderHistogramaTabela();
      renderHistograma();
    });
    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function renderHistograma() {
  const valoresNumericos = histValores
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));

  const mensagemEl = document.getElementById('hist-mensagem');
  const resumoEl = document.getElementById('hist-resumo');
  const tbodyClasses = document.getElementById('hist-tbodyClasses');

  if (valoresNumericos.length < 2) {
    mensagemEl.textContent = 'Insira valores para gerar o histograma.';
    resumoEl.innerHTML = '';
    tbodyClasses.innerHTML = '';
    if (graficos.histograma) {
      graficos.histograma.destroy();
      graficos.histograma = null;
    }
    return;
  }

  mensagemEl.textContent = '';

  const amostra = valoresNumericos.length;
  const minimo = Math.min(...valoresNumericos);
  const maximo = Math.max(...valoresNumericos);

  const campoClasses = document.getElementById('hist-classes');
  let classes = parseInt(campoClasses.value, 10);
  if (!classes || classes < 1) {
    classes = Math.max(1, Math.round(Math.sqrt(amostra)));
    campoClasses.value = classes;
  }

  const incremento = (maximo - minimo) / classes || 1;

  resumoEl.innerHTML = `
    <strong>Amostra:</strong> ${amostra} &nbsp;|&nbsp;
    <strong>Mínimo:</strong> ${minimo} &nbsp;|&nbsp;
    <strong>Máximo:</strong> ${maximo} &nbsp;|&nbsp;
    <strong>Classes:</strong> ${classes} &nbsp;|&nbsp;
    <strong>Incremento:</strong> ${incremento.toFixed(2)}
  `;

  // Monta as classes e calcula frequência
  const limites = [];
  for (let i = 0; i <= classes; i++) {
    limites.push(minimo + i * incremento);
  }

  const frequencias = new Array(classes).fill(0);
  valoresNumericos.forEach(valor => {
    let indiceClasse = Math.floor((valor - minimo) / incremento);
    if (indiceClasse >= classes) indiceClasse = classes - 1;
    if (indiceClasse < 0) indiceClasse = 0;
    frequencias[indiceClasse]++;
  });

  tbodyClasses.innerHTML = '';
  const rotulos = [];
  for (let i = 0; i < classes; i++) {
    const inicio = limites[i].toFixed(2);
    const fim = limites[i + 1].toFixed(2);
    const rotulo = `${inicio} - ${fim}`;
    rotulos.push(rotulo);

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i + 1}</td><td>${rotulo}</td><td>${frequencias[i]}</td>`;
    tbodyClasses.appendChild(tr);
  }

  const titulo = document.getElementById('hist-titulo').value || 'Histograma';

  if (graficos.histograma) graficos.histograma.destroy();
  graficos.histograma = new Chart(document.getElementById('hist-canvas'), {
    type: 'bar',
    data: {
      labels: rotulos,
      datasets: [{
        label: titulo,
        data: frequencias,
        backgroundColor: '#0070C0'
      }]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Frequência' } } }
    }
  });
}

/* ===========================================================
   FERRAMENTA 5 — PARETO
   =========================================================== */
let paretoLinhas = [];

function initPareto() {
  const dados = loadData('pareto');

  if (dados) {
    document.getElementById('pareto-titulo').value = dados.titulo || '';
    paretoLinhas = dados.linhas && dados.linhas.length ? dados.linhas : [{ fator: '', ocorrencias: '' }];
  } else {
    paretoLinhas = [{ fator: '', ocorrencias: '' }];
  }

  renderParetoEntrada();
  renderPareto();

  document.getElementById('pareto-titulo').addEventListener('input', renderPareto);

  document.getElementById('pareto-addRow').addEventListener('click', () => {
    paretoLinhas.push({ fator: '', ocorrencias: '' });
    renderParetoEntrada();
  });

  document.getElementById('pareto-save').addEventListener('click', () => {
    salvarPareto();
    alert('Dados de Pareto salvos com sucesso.');
  });

  document.getElementById('pareto-clear').addEventListener('click', () => {
    if (!confirm('Limpar todos os dados de Pareto?')) return;
    paretoLinhas = [{ fator: '', ocorrencias: '' }];
    document.getElementById('pareto-titulo').value = '';
    clearData('pareto');
    renderParetoEntrada();
    renderPareto();
  });

  document.getElementById('pareto-print').addEventListener('click', imprimirTela);
}

function salvarPareto() {
  saveData('pareto', {
    titulo: document.getElementById('pareto-titulo').value,
    linhas: paretoLinhas
  });
}

function renderParetoEntrada() {
  const tbody = document.getElementById('pareto-tbodyEntrada');
  tbody.innerHTML = '';

  paretoLinhas.forEach((linha, index) => {
    const tr = document.createElement('tr');

    const tdFator = document.createElement('td');
    const inputFator = document.createElement('input');
    inputFator.type = 'text';
    inputFator.value = linha.fator;
    inputFator.addEventListener('input', () => {
      linha.fator = inputFator.value;
      renderPareto();
    });
    tdFator.appendChild(inputFator);
    tr.appendChild(tdFator);

    const tdOcorrencias = document.createElement('td');
    const inputOcorrencias = document.createElement('input');
    inputOcorrencias.type = 'number';
    inputOcorrencias.value = linha.ocorrencias;
    inputOcorrencias.addEventListener('input', () => {
      linha.ocorrencias = inputOcorrencias.value;
      renderPareto();
    });
    tdOcorrencias.appendChild(inputOcorrencias);
    tr.appendChild(tdOcorrencias);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'no-print';
    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Excluir';
    btnRemover.className = 'btn-danger';
    btnRemover.addEventListener('click', () => {
      paretoLinhas.splice(index, 1);
      renderParetoEntrada();
      renderPareto();
    });
    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function renderPareto() {
  const linhasValidas = paretoLinhas
    .filter(l => l.fator && !isNaN(parseFloat(l.ocorrencias)))
    .map(l => ({ fator: l.fator, ocorrencias: parseFloat(l.ocorrencias) }))
    .sort((a, b) => b.ocorrencias - a.ocorrencias);

  const tbodyCalculada = document.getElementById('pareto-tbodyCalculada');
  tbodyCalculada.innerHTML = '';

  if (linhasValidas.length === 0) {
    if (graficos.pareto) {
      graficos.pareto.destroy();
      graficos.pareto = null;
    }
    return;
  }

  const total = linhasValidas.reduce((soma, l) => soma + l.ocorrencias, 0);
  let acumulado = 0;
  const percentuais = [];
  const percentuaisAcumulados = [];

  linhasValidas.forEach(l => {
    const percentual = (l.ocorrencias / total) * 100;
    acumulado += percentual;
    percentuais.push(percentual);
    percentuaisAcumulados.push(acumulado);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${l.fator}</td>
      <td>${l.ocorrencias}</td>
      <td>${percentual.toFixed(1)}%</td>
      <td>${acumulado.toFixed(1)}%</td>
    `;
    tbodyCalculada.appendChild(tr);
  });

  const titulo = document.getElementById('pareto-titulo').value || 'Diagrama de Pareto';

  if (graficos.pareto) graficos.pareto.destroy();
  graficos.pareto = new Chart(document.getElementById('pareto-canvas'), {
    data: {
      labels: linhasValidas.map(l => l.fator),
      datasets: [
        {
          type: 'bar',
          label: 'Ocorrências',
          data: linhasValidas.map(l => l.ocorrencias),
          backgroundColor: '#0070C0',
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: '% acumulado',
          data: percentuaisAcumulados,
          borderColor: '#C00000',
          backgroundColor: '#C00000',
          yAxisID: 'y1',
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } },
      scales: {
        y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Ocorrências' } },
        y1: {
          beginAtZero: true,
          min: 0,
          max: 100,
          position: 'right',
          grid: { drawOnChartArea: false },
          title: { display: true, text: '% acumulado' }
        }
      }
    }
  });
}

/* ===========================================================
   FERRAMENTA 6 — DISPERSÃO
   =========================================================== */
let dispLinhas = [];

function initDispersao() {
  const dados = loadData('dispersao');

  if (dados) {
    document.getElementById('disp-titulo').value = dados.titulo || '';
    document.getElementById('disp-tendencia').value = dados.tendencia || 'nenhuma';
    dispLinhas = dados.linhas && dados.linhas.length ? dados.linhas : [{ x: '', y: '' }];
  } else {
    dispLinhas = [{ x: '', y: '' }];
  }

  renderDispersaoEntrada();
  renderDispersao();

  document.getElementById('disp-titulo').addEventListener('input', renderDispersao);
  document.getElementById('disp-tendencia').addEventListener('change', renderDispersao);

  document.getElementById('disp-addRow').addEventListener('click', () => {
    dispLinhas.push({ x: '', y: '' });
    renderDispersaoEntrada();
  });

  document.getElementById('disp-save').addEventListener('click', () => {
    salvarDispersao();
    alert('Dados de dispersão salvos com sucesso.');
  });

  document.getElementById('disp-clear').addEventListener('click', () => {
    if (!confirm('Limpar todos os dados de dispersão?')) return;
    dispLinhas = [{ x: '', y: '' }];
    document.getElementById('disp-titulo').value = '';
    document.getElementById('disp-tendencia').value = 'nenhuma';
    clearData('dispersao');
    renderDispersaoEntrada();
    renderDispersao();
  });

  document.getElementById('disp-print').addEventListener('click', imprimirTela);
}

function salvarDispersao() {
  saveData('dispersao', {
    titulo: document.getElementById('disp-titulo').value,
    tendencia: document.getElementById('disp-tendencia').value,
    linhas: dispLinhas
  });
}

function renderDispersaoEntrada() {
  const tbody = document.getElementById('disp-tbody');
  tbody.innerHTML = '';

  dispLinhas.forEach((linha, index) => {
    const tr = document.createElement('tr');

    ['x', 'y'].forEach(campo => {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.value = linha[campo];
      input.addEventListener('input', () => {
        linha[campo] = input.value;
        renderDispersao();
      });
      td.appendChild(input);
      tr.appendChild(td);
    });

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'no-print';
    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Excluir';
    btnRemover.className = 'btn-danger';
    btnRemover.addEventListener('click', () => {
      dispLinhas.splice(index, 1);
      renderDispersaoEntrada();
      renderDispersao();
    });
    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function regressaoLinear(pontos) {
  const n = pontos.length;
  const somaX = pontos.reduce((s, p) => s + p.x, 0);
  const somaY = pontos.reduce((s, p) => s + p.y, 0);
  const somaXY = pontos.reduce((s, p) => s + p.x * p.y, 0);
  const somaX2 = pontos.reduce((s, p) => s + p.x * p.x, 0);

  const a = (n * somaXY - somaX * somaY) / (n * somaX2 - somaX * somaX);
  const b = (somaY - a * somaX) / n;

  const mediaY = somaY / n;
  const ssTot = pontos.reduce((s, p) => s + Math.pow(p.y - mediaY, 2), 0);
  const ssRes = pontos.reduce((s, p) => s + Math.pow(p.y - (a * p.x + b), 2), 0);
  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return { a, b, r2 };
}

function renderDispersao() {
  const pontos = dispLinhas
    .filter(l => l.x !== '' && l.y !== '' && !isNaN(parseFloat(l.x)) && !isNaN(parseFloat(l.y)))
    .map(l => ({ x: parseFloat(l.x), y: parseFloat(l.y) }));

  const equacaoEl = document.getElementById('disp-equacao');

  if (pontos.length < 2) {
    equacaoEl.textContent = 'Insira ao menos dois pares X/Y para gerar o gráfico.';
    if (graficos.dispersao) {
      graficos.dispersao.destroy();
      graficos.dispersao = null;
    }
    return;
  }

  const titulo = document.getElementById('disp-titulo').value || 'Gráfico de dispersão';
  const tendencia = document.getElementById('disp-tendencia').value;

  const datasets = [{
    type: 'scatter',
    label: titulo,
    data: pontos,
    backgroundColor: '#0070C0'
  }];

  equacaoEl.textContent = '';

  if (tendencia === 'linear') {
    const { a, b, r2 } = regressaoLinear(pontos);
    const xs = pontos.map(p => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    datasets.push({
      type: 'line',
      label: 'Linha de tendência (linear)',
      data: [{ x: xMin, y: a * xMin + b }, { x: xMax, y: a * xMax + b }],
      borderColor: '#C00000',
      backgroundColor: '#C00000',
      pointRadius: 0
    });
    equacaoEl.textContent = `Equação: y = ${a.toFixed(3)}x + ${b.toFixed(3)} | R² = ${r2.toFixed(3)}`;
  } else if (tendencia !== 'nenhuma') {
    equacaoEl.textContent = 'Linha de tendência em desenvolvimento para este tipo. Disponível apenas a opção Linear nesta versão.';
  }

  if (graficos.dispersao) graficos.dispersao.destroy();
  graficos.dispersao = new Chart(document.getElementById('disp-canvas'), {
    data: { datasets },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } },
      scales: {
        x: { type: 'linear', position: 'bottom', title: { display: true, text: 'X' } },
        y: { title: { display: true, text: 'Y' } }
      }
    }
  });
}

/* ===========================================================
   FERRAMENTA 7 — ISHIKAWA
   Diagrama construído dinamicamente em SVG a partir das categorias (Ms)
   selecionadas pelo usuário e das causas preenchidas em tempo real.
   =========================================================== */
const CATEGORIAS_ISHIKAWA = [
  { chave: 'medicao', nome: 'Medição' },
  { chave: 'maoDeObra', nome: 'Mão de obra' },
  { chave: 'metodo', nome: 'Método' },
  { chave: 'meioAmbiente', nome: 'Meio ambiente' },
  { chave: 'material', nome: 'Material' },
  { chave: 'maquina', nome: 'Máquina' }
];

const CAUSAS_POR_CATEGORIA_PADRAO = 4;

let ishikawaDados = {
  problema: '',
  categoriasSelecionadas: CATEGORIAS_ISHIKAWA.map(c => c.chave),
  causas: {}
};

function initIshikawa() {
  const dados = loadData('ishikawa');

  CATEGORIAS_ISHIKAWA.forEach(cat => {
    ishikawaDados.causas[cat.chave] = new Array(CAUSAS_POR_CATEGORIA_PADRAO).fill('');
  });
  ishikawaDados.categoriasSelecionadas = CATEGORIAS_ISHIKAWA.map(c => c.chave);

  if (dados) {
    ishikawaDados.problema = dados.problema || '';
    if (Array.isArray(dados.categoriasSelecionadas) && dados.categoriasSelecionadas.length) {
      ishikawaDados.categoriasSelecionadas = dados.categoriasSelecionadas;
    }
    CATEGORIAS_ISHIKAWA.forEach(cat => {
      if (dados.causas && Array.isArray(dados.causas[cat.chave]) && dados.causas[cat.chave].length) {
        ishikawaDados.causas[cat.chave] = dados.causas[cat.chave];
      }
    });
  }

  document.getElementById('ishi-problema').value = ishikawaDados.problema;

  renderIshikawaCheckboxes();
  renderIshikawaCampos();
  renderIshikawaDiagrama();

  document.getElementById('ishi-problema').addEventListener('input', e => {
    ishikawaDados.problema = e.target.value;
    renderIshikawaDiagrama();
  });

  document.getElementById('ishi-save').addEventListener('click', () => {
    saveData('ishikawa', ishikawaDados);
    alert('Análise de Ishikawa salva com sucesso.');
  });

  document.getElementById('ishi-clear').addEventListener('click', () => {
    if (!confirm('Limpar toda a análise de Ishikawa?')) return;
    ishikawaDados.problema = '';
    ishikawaDados.categoriasSelecionadas = CATEGORIAS_ISHIKAWA.map(c => c.chave);
    CATEGORIAS_ISHIKAWA.forEach(cat => {
      ishikawaDados.causas[cat.chave] = new Array(CAUSAS_POR_CATEGORIA_PADRAO).fill('');
    });
    document.getElementById('ishi-problema').value = '';
    clearData('ishikawa');
    renderIshikawaCheckboxes();
    renderIshikawaCampos();
    renderIshikawaDiagrama();
  });

  document.getElementById('ishi-print').addEventListener('click', imprimirTela);

  document.getElementById('ishi-enviar5p').addEventListener('click', () => {
    importarCausasParaCincoPorques(true);
    showSection('cincoPorques');
  });
}

/* Paleta de checkboxes para ativar/desativar cada categoria (M) no diagrama */
function renderIshikawaCheckboxes() {
  const container = document.getElementById('ishi-categoriasCheckboxes');
  container.innerHTML = '';

  CATEGORIAS_ISHIKAWA.forEach(cat => {
    const label = document.createElement('label');
    label.className = 'ishi-categoria-toggle';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = ishikawaDados.categoriasSelecionadas.includes(cat.chave);
    input.addEventListener('change', () => {
      if (input.checked) {
        if (!ishikawaDados.categoriasSelecionadas.includes(cat.chave)) {
          ishikawaDados.categoriasSelecionadas.push(cat.chave);
        }
      } else {
        ishikawaDados.categoriasSelecionadas = ishikawaDados.categoriasSelecionadas.filter(c => c !== cat.chave);
      }
      renderIshikawaCampos();
      renderIshikawaDiagrama();
    });

    const texto = document.createElement('span');
    texto.textContent = cat.nome;

    label.appendChild(input);
    label.appendChild(texto);
    container.appendChild(label);
  });
}

/* Cards auxiliares de preenchimento — apenas das categorias selecionadas */
function renderIshikawaCampos() {
  const container = document.getElementById('ishi-camposContainer');
  container.innerHTML = '';

  const categoriasAtivas = CATEGORIAS_ISHIKAWA.filter(cat => ishikawaDados.categoriasSelecionadas.includes(cat.chave));

  categoriasAtivas.forEach(cat => {
    const grupo = document.createElement('div');
    grupo.className = 'ishikawa-grupo';

    const titulo = document.createElement('h4');
    titulo.textContent = cat.nome;
    grupo.appendChild(titulo);

    ishikawaDados.causas[cat.chave].forEach((causa, i) => {
      const linha = document.createElement('div');
      linha.className = 'ishikawa-causa-linha';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Causa ${i + 1}`;
      input.value = causa;
      input.addEventListener('input', () => {
        ishikawaDados.causas[cat.chave][i] = input.value;
        renderIshikawaDiagrama();
      });
      linha.appendChild(input);

      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'ishikawa-causa-remover';
      remover.textContent = '×';
      remover.title = 'Remover causa';
      remover.addEventListener('click', () => {
        ishikawaDados.causas[cat.chave].splice(i, 1);
        renderIshikawaCampos();
        renderIshikawaDiagrama();
      });
      linha.appendChild(remover);

      grupo.appendChild(linha);
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'ishikawa-causa-adicionar';
    addBtn.textContent = '+ Adicionar causa';
    addBtn.addEventListener('click', () => {
      ishikawaDados.causas[cat.chave].push('');
      renderIshikawaCampos();
    });
    grupo.appendChild(addBtn);

    container.appendChild(grupo);
  });
}

/* Calcula um ponto entre (x1,y1) e (x2,y2), com t entre 0 e 1 */
function pontoEntre(x1, y1, x2, y2, t) {
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
}

/* Monta o diagrama Ishikawa em SVG, em tempo real, a partir do estado atual */
function renderIshikawaDiagrama() {
  const svg = document.getElementById('ishi-diagrama-svg');
  const categoriasAtivas = CATEGORIAS_ISHIKAWA.filter(cat => ishikawaDados.categoriasSelecionadas.includes(cat.chave));

  const largura = 980;
  const alturaBase = 420;
  const spineY = alturaBase / 2;
  const spineXIni = 60;
  const spineXFim = largura - 150;

  if (categoriasAtivas.length === 0) {
    svg.setAttribute('viewBox', `0 0 ${largura} ${alturaBase}`);
    svg.innerHTML = `
      <line x1="${spineXIni}" y1="${spineY}" x2="${spineXFim}" y2="${spineY}" class="ishi-spine" marker-end="url(#ishi-arrow)"/>
      <rect x="${spineXFim}" y="${spineY - 26}" width="130" height="52" rx="10" class="ishi-problema-box"/>
      <text x="${spineXFim + 65}" y="${spineY + 5}" text-anchor="middle" class="ishi-problema-text">${escapeSvgTexto(ishikawaDados.problema || 'Problema')}</text>
      <text x="${largura / 2}" y="${alturaBase - 30}" text-anchor="middle" class="ishi-diagrama-vazio">Selecione ao menos uma categoria (M) para montar o diagrama.</text>
      <defs>
        <marker id="ishi-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 Z" fill="#0f172a"/>
        </marker>
      </defs>`;
    return;
  }

  const topoQtd = Math.ceil(categoriasAtivas.length / 2);
  const categoriasTopo = categoriasAtivas.slice(0, topoQtd);
  const categoriasBase = categoriasAtivas.slice(topoQtd);

  const ramoComprimento = 130;
  const alturaPorLinhaCausa = 14;

  // Calcula quantas linhas de causa cada ramo terá, para dimensionar a altura do SVG
  const maxCausasTopo = Math.max(0, ...categoriasTopo.map(c => contarCausasPreenchidas(c.chave)));
  const maxCausasBase = Math.max(0, ...categoriasBase.map(c => contarCausasPreenchidas(c.chave)));
  const folgaTopo = 170 + maxCausasTopo * alturaPorLinhaCausa;
  const folgaBase = 170 + maxCausasBase * alturaPorLinhaCausa;
  const altura = folgaTopo + folgaBase + 40;
  const spineYFinal = folgaTopo + 20;

  let svgPartes = [];

  svgPartes.push(`
    <defs>
      <marker id="ishi-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 Z" fill="#0f172a"/>
      </marker>
    </defs>
    <line x1="${spineXIni}" y1="${spineYFinal}" x2="${spineXFim}" y2="${spineYFinal}" class="ishi-spine" marker-end="url(#ishi-arrow)"/>
    <rect x="${spineXFim}" y="${spineYFinal - 26}" width="140" height="52" rx="10" class="ishi-problema-box"/>
    <text x="${spineXFim + 70}" y="${spineYFinal + 5}" text-anchor="middle" class="ishi-problema-text">${escapeSvgTexto(quebrarTexto(ishikawaDados.problema || 'Problema', 16)[0] || 'Problema')}</text>
  `);

  function desenharGrupoRamos(categorias, ehTopo) {
    const qtd = categorias.length;
    if (qtd === 0) return;

    const margemEsq = spineXIni + 70;
    const margemDir = spineXFim - 50;
    const passo = qtd > 1 ? (margemDir - margemEsq) / (qtd - 1) : 0;

    categorias.forEach((cat, idx) => {
      const ancoraX = qtd === 1 ? (margemEsq + margemDir) / 2 : margemEsq + passo * idx;
      const ancoraY = spineYFinal;
      const pontaX = ancoraX - ramoComprimento * 0.7;
      const pontaY = ehTopo ? spineYFinal - ramoComprimento : spineYFinal + ramoComprimento;

      svgPartes.push(`<line x1="${ancoraX}" y1="${ancoraY}" x2="${pontaX}" y2="${pontaY}" class="ishi-branch"/>`);

      const rotuloY = ehTopo ? pontaY - 10 : pontaY + 18;
      svgPartes.push(`<text x="${pontaX}" y="${rotuloY}" text-anchor="middle" class="ishi-categoria-label">${escapeSvgTexto(cat.nome)}</text>`);

      const causas = (ishikawaDados.causas[cat.chave] || []).filter(c => c && c.trim() !== '');
      causas.forEach((causa, i) => {
        const t = (i + 1) / (causas.length + 1);
        const pt = pontoEntre(ancoraX, ancoraY, pontaX, pontaY, t);

        // pequena marca perpendicular ao ramo, representando a causa
        const dx = pontaX - ancoraX;
        const dy = pontaY - ancoraY;
        const comprimentoRamo = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = (-dy / comprimentoRamo) * 8;
        const perpY = (dx / comprimentoRamo) * 8;

        svgPartes.push(`<line x1="${pt.x - perpX}" y1="${pt.y - perpY}" x2="${pt.x + perpX}" y2="${pt.y + perpY}" class="ishi-tick"/>`);

        const textoX = pt.x + (ehTopo ? -12 : 12);
        const textoAlign = ehTopo ? 'end' : 'start';
        svgPartes.push(`<text x="${textoX}" y="${pt.y + 3}" text-anchor="${textoAlign}" class="ishi-causa-label">${escapeSvgTexto(truncarTexto(causa, 28))}</text>`);
      });
    });
  }

  desenharGrupoRamos(categoriasTopo, true);
  desenharGrupoRamos(categoriasBase, false);

  svg.setAttribute('viewBox', `0 0 ${largura} ${altura}`);
  svg.innerHTML = svgPartes.join('\n');
}

function contarCausasPreenchidas(chave) {
  return (ishikawaDados.causas[chave] || []).filter(c => c && c.trim() !== '').length;
}

function truncarTexto(texto, max) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
}

function quebrarTexto(texto, max) {
  return [truncarTexto(texto, max)];
}

function escapeSvgTexto(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ===========================================================
   FERRAMENTA 8 — 5 PORQUÊS
   =========================================================== */
let cincoPorquesDados = [];

function initCincoPorques() {
  const dados = loadData('cincoPorques');
  cincoPorquesDados = dados && dados.length ? dados : [];

  renderCincoPorques();

  document.getElementById('cp-importar').addEventListener('click', () => {
    importarCausasParaCincoPorques(false);
  });

  document.getElementById('cp-addManual').addEventListener('click', () => {
    cincoPorquesDados.push(criarBlocoCincoPorques(''));
    renderCincoPorques();
  });

  document.getElementById('cp-save').addEventListener('click', () => {
    saveData('cincoPorques', cincoPorquesDados);
    alert('5 Porquês salvo com sucesso.');
  });

  document.getElementById('cp-clear').addEventListener('click', () => {
    if (!confirm('Limpar todos os blocos de 5 Porquês?')) return;
    cincoPorquesDados = [];
    clearData('cincoPorques');
    renderCincoPorques();
  });

  document.getElementById('cp-print').addEventListener('click', imprimirTela);
}

function criarBlocoCincoPorques(causa) {
  return {
    causa,
    porque1: '',
    porque2: '',
    porque3: '',
    porque4: '',
    porque5: '',
    motivoRaiz: '',
    acao: ''
  };
}

/* Importa as causas preenchidas no Ishikawa para dentro do 5 Porquês.
   substituir = true sobrescreve a lista atual (usado pelo botão do Ishikawa);
   substituir = false acrescenta apenas causas novas (usado pelo botão "Importar"). */
function importarCausasParaCincoPorques(substituir) {
  const dadosIshikawa = loadData('ishikawa') || ishikawaDados;
  const categoriasAtivas = Array.isArray(dadosIshikawa.categoriasSelecionadas)
    ? dadosIshikawa.categoriasSelecionadas
    : CATEGORIAS_ISHIKAWA.map(c => c.chave);
  const todasCausas = [];

  CATEGORIAS_ISHIKAWA.filter(cat => categoriasAtivas.includes(cat.chave)).forEach(cat => {
    const lista = (dadosIshikawa.causas && dadosIshikawa.causas[cat.chave]) || [];
    lista.forEach(causa => {
      if (causa && causa.trim() !== '') todasCausas.push(causa.trim());
    });
  });

  if (todasCausas.length === 0) {
    alert('Nenhuma causa preenchida no Ishikawa. Preencha o diagrama ou adicione uma causa manual.');
    return;
  }

  if (substituir) {
    cincoPorquesDados = todasCausas.map(c => criarBlocoCincoPorques(c));
  } else {
    const causasExistentes = cincoPorquesDados.map(b => b.causa);
    todasCausas.forEach(causa => {
      if (!causasExistentes.includes(causa)) {
        cincoPorquesDados.push(criarBlocoCincoPorques(causa));
      }
    });
  }

  saveData('cincoPorques', cincoPorquesDados);
  renderCincoPorques();
}

function renderCincoPorques() {
  const container = document.getElementById('cp-container');
  container.innerHTML = '';

  if (cincoPorquesDados.length === 0) {
    const aviso = document.createElement('p');
    aviso.className = 'resultado';
    aviso.textContent = 'Nenhuma causa cadastrada. Importe causas do Ishikawa ou adicione uma causa manual.';
    container.appendChild(aviso);
    return;
  }

  cincoPorquesDados.forEach((bloco, index) => {
    const div = document.createElement('div');
    div.className = 'cp-bloco';

    const btnRemover = document.createElement('button');
    btnRemover.className = 'cp-remove no-print';
    btnRemover.textContent = 'Excluir';
    btnRemover.addEventListener('click', () => {
      cincoPorquesDados.splice(index, 1);
      renderCincoPorques();
    });
    div.appendChild(btnRemover);

    const titulo = document.createElement('h4');
    titulo.textContent = `Causa: ${bloco.causa || '(não informada)'}`;
    div.appendChild(titulo);

    const grid = document.createElement('div');
    grid.className = 'form-grid';

    const campos = [
      { chave: 'causa', label: 'Causa' },
      { chave: 'porque1', label: '1º Por quê?' },
      { chave: 'porque2', label: '2º Por quê?' },
      { chave: 'porque3', label: '3º Por quê?' },
      { chave: 'porque4', label: '4º Por quê?' },
      { chave: 'porque5', label: '5º Por quê?' },
      { chave: 'motivoRaiz', label: 'Motivo raiz' },
      { chave: 'acao', label: 'Ação: o que fazer para prevenir e/ou nunca mais ocorrer?' }
    ];

    campos.forEach(campo => {
      const label = document.createElement('label');
      if (campo.chave === 'acao') label.className = 'full-width';
      label.textContent = campo.label;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = bloco[campo.chave] || '';
      input.addEventListener('input', () => {
        bloco[campo.chave] = input.value;
        if (campo.chave === 'causa') titulo.textContent = `Causa: ${bloco.causa || '(não informada)'}`;
      });

      label.appendChild(input);
      grid.appendChild(label);
    });

    div.appendChild(grid);
    container.appendChild(div);
  });
}

/* ===========================================================
   FERRAMENTA 9 — GRÁFICO DE CONTROLE
   =========================================================== */
let gcValores = [];

function initGraficoControle() {
  const dados = loadData('graficoControle');

  if (dados) {
    document.getElementById('gc-titulo').value = dados.titulo || '';
    document.getElementById('gc-modo').value = dados.modo || 'automatico';
    document.getElementById('gc-lscManual').value = dados.lscManual || '';
    document.getElementById('gc-licManual').value = dados.licManual || '';
    gcValores = dados.valores && dados.valores.length ? dados.valores : [''];
  } else {
    gcValores = [''];
  }

  renderGraficoControleTabela();
  renderGraficoControle();

  document.getElementById('gc-titulo').addEventListener('input', renderGraficoControle);
  document.getElementById('gc-modo').addEventListener('change', renderGraficoControle);
  document.getElementById('gc-lscManual').addEventListener('input', renderGraficoControle);
  document.getElementById('gc-licManual').addEventListener('input', renderGraficoControle);

  document.getElementById('gc-addValor').addEventListener('click', () => {
    gcValores.push('');
    renderGraficoControleTabela();
  });

  document.getElementById('gc-save').addEventListener('click', () => {
    salvarGraficoControle();
    alert('Gráfico de controle salvo com sucesso.');
  });

  document.getElementById('gc-clear').addEventListener('click', () => {
    if (!confirm('Limpar todos os dados do gráfico de controle?')) return;
    gcValores = [''];
    document.getElementById('gc-titulo').value = '';
    document.getElementById('gc-lscManual').value = '';
    document.getElementById('gc-licManual').value = '';
    document.getElementById('gc-modo').value = 'automatico';
    clearData('graficoControle');
    renderGraficoControleTabela();
    renderGraficoControle();
  });

  document.getElementById('gc-print').addEventListener('click', imprimirTela);
}

function salvarGraficoControle() {
  saveData('graficoControle', {
    titulo: document.getElementById('gc-titulo').value,
    modo: document.getElementById('gc-modo').value,
    lscManual: document.getElementById('gc-lscManual').value,
    licManual: document.getElementById('gc-licManual').value,
    valores: gcValores
  });
}

function renderGraficoControleTabela() {
  const tbody = document.getElementById('gc-tbody');
  tbody.innerHTML = '';

  gcValores.forEach((valor, index) => {
    const tr = document.createElement('tr');

    const tdValor = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'number';
    input.step = 'any';
    input.value = valor;
    input.addEventListener('input', () => {
      gcValores[index] = input.value;
      renderGraficoControle();
    });
    tdValor.appendChild(input);
    tr.appendChild(tdValor);

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'no-print';
    const btnRemover = document.createElement('button');
    btnRemover.textContent = 'Excluir';
    btnRemover.className = 'btn-danger';
    btnRemover.addEventListener('click', () => {
      gcValores.splice(index, 1);
      renderGraficoControleTabela();
      renderGraficoControle();
    });
    tdAcoes.appendChild(btnRemover);
    tr.appendChild(tdAcoes);

    tbody.appendChild(tr);
  });
}

function renderGraficoControle() {
  const valoresNumericos = gcValores
    .map(v => parseFloat(v))
    .filter(v => !isNaN(v));

  const resumoEl = document.getElementById('gc-resumo');

  if (valoresNumericos.length === 0) {
    resumoEl.innerHTML = 'Insira valores para gerar o gráfico de controle.';
    if (graficos.graficoControle) {
      graficos.graficoControle.destroy();
      graficos.graficoControle = null;
    }
    return;
  }

  const amostra = valoresNumericos.length;
  const media = valoresNumericos.reduce((s, v) => s + v, 0) / amostra;
  const variancia = valoresNumericos.reduce((s, v) => s + Math.pow(v - media, 2), 0) / amostra;
  const desvioPadrao = Math.sqrt(variancia);

  const modo = document.getElementById('gc-modo').value;
  let lsc, lic;

  if (modo === 'manual') {
    const lscManual = parseFloat(document.getElementById('gc-lscManual').value);
    const licManual = parseFloat(document.getElementById('gc-licManual').value);
    lsc = isNaN(lscManual) ? media + 3 * desvioPadrao : lscManual;
    lic = isNaN(licManual) ? media - 3 * desvioPadrao : licManual;
  } else {
    lsc = media + 3 * desvioPadrao;
    lic = media - 3 * desvioPadrao;
  }

  const foraDoLSC = valoresNumericos.filter(v => v > lsc).length;
  const foraDoLIC = valoresNumericos.filter(v => v < lic).length;

  resumoEl.innerHTML = `
    <strong>Amostra:</strong> ${amostra} &nbsp;|&nbsp;
    <strong>Média:</strong> ${media.toFixed(3)} &nbsp;|&nbsp;
    <strong>Desvio-padrão:</strong> ${desvioPadrao.toFixed(3)}<br>
    <strong>LSC:</strong> ${lsc.toFixed(3)} &nbsp;|&nbsp;
    <strong>LIC:</strong> ${lic.toFixed(3)}<br>
    <strong>Pontos fora do LSC:</strong> ${foraDoLSC} &nbsp;|&nbsp;
    <strong>Pontos fora do LIC:</strong> ${foraDoLIC}
  `;

  const titulo = document.getElementById('gc-titulo').value || 'Gráfico de Controle';
  const rotulos = valoresNumericos.map((_, i) => `Amostra ${i + 1}`);

  const coresPontos = valoresNumericos.map(v => (v > lsc || v < lic) ? '#C00000' : '#0070C0');

  if (graficos.graficoControle) graficos.graficoControle.destroy();
  graficos.graficoControle = new Chart(document.getElementById('gc-canvas'), {
    type: 'line',
    data: {
      labels: rotulos,
      datasets: [
        {
          label: 'Valores',
          data: valoresNumericos,
          borderColor: '#0070C0',
          backgroundColor: coresPontos,
          pointBackgroundColor: coresPontos,
          pointRadius: 5,
          tension: 0.1
        },
        {
          label: 'Média',
          data: rotulos.map(() => media),
          borderColor: '#00B050',
          borderDash: [4, 4],
          pointRadius: 0
        },
        {
          label: 'LSC',
          data: rotulos.map(() => lsc),
          borderColor: '#C00000',
          borderDash: [6, 3],
          pointRadius: 0
        },
        {
          label: 'LIC',
          data: rotulos.map(() => lic),
          borderColor: '#C00000',
          borderDash: [6, 3],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: titulo } }
    }
  });
}
