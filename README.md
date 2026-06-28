# As 7 Ferramentas da Qualidade — Aplicação Web

Aplicação web em HTML, CSS e JavaScript puro que reproduz, em formato de site, as funcionalidades da planilha "Planilha 7 ferramentas - versão final 2.xlsm". Permite registrar e visualizar dados das 7 ferramentas clássicas da qualidade (mais o menu inicial), com persistência local no navegador.

## Como abrir a aplicação

1. Baixe ou copie a pasta `7-ferramentas-qualidade-web` para o seu computador.
2. Dê duplo clique no arquivo `index.html` para abrir no navegador (Chrome, Edge, Firefox ou similar).
   - Alternativamente, use uma extensão de servidor local (ex.: "Live Server" no VS Code) para evitar eventuais bloqueios de navegador a arquivos locais.
3. Não é necessário instalar nada nem configurar servidor/backend.
4. É necessário conexão com a internet apenas no primeiro carregamento, para baixar as bibliotecas via CDN (Chart.js, html2canvas, jsPDF). Depois de carregada uma vez (com cache do navegador), a aplicação tende a funcionar mesmo offline, exceto se o cache for limpo.

## Estrutura dos arquivos

```
7-ferramentas-qualidade-web/
├── index.html        → estrutura de todas as telas (menu + 8 seções de ferramentas)
├── style.css         → identidade visual, layout responsivo e estilos de impressão
├── script.js         → toda a lógica: navegação, cálculos, gráficos e persistência
├── README.md         → este arquivo
└── assets/
    ├── icons/        → GIFs animados usados nos ícones das ferramentas:
    │   ├── fluxograma.gif
    │   ├── folha-verificacao.gif
    │   ├── histograma.gif
    │   ├── pareto.gif
    │   ├── dispersao.gif
    │   ├── ishikawa.gif
    │   ├── cinco-porques.gif
    │   └── grafico-controle.gif
    └── previews/     → imagens de pré-visualização usadas no guia "Qual ferramenta usar?":
        ├── fluxograma.png
        ├── folha-verificacao.png
        ├── histograma.png
        ├── pareto.png
        ├── dispersao.png
        ├── ishikawa.png
        ├── cinco-porques.png
        └── grafico-controle.png
```

O `index.html` contém uma seção (`<section>`) para cada ferramenta. O JavaScript alterna a visibilidade das seções (função `showSection`), sem recarregar a página.

Os ícones das ferramentas (nos cards do menu e nos módulos da composição visual do hero) usam GIFs animados de `assets/icons/`. Se algum arquivo de GIF não existir ou não carregar, o ícone cai automaticamente em um fallback de emoji estático (tratado pelo evento `error` da `<img>` em `initToolGifIcons()`), então a aplicação nunca fica com um ícone quebrado.

A tela "Qual ferramenta usar?" (acessível pelo botão de mesmo nome no hero) é um guia visual completo: para cada ferramenta há um bloco grande com explicação, passo a passo de uso, uma imagem de pré-visualização de `assets/previews/` e um botão que abre a ferramenta correspondente. Se a imagem de preview não existir/carregar, é exibido um placeholder ilustrado com o ícone e o nome da ferramenta (tratado por `initGuiaPreviewImages()`), sem quebrar o layout.

## Bibliotecas usadas (via CDN)

- **[Chart.js](https://www.chartjs.org/)** — geração dos gráficos de Histograma, Pareto, Dispersão e Gráfico de Controle.
- **[html2canvas](https://html2canvas.hertzen.com/)** e **[jsPDF](https://github.com/parallax/jsPDF)** — incluídas no projeto para uma futura função de exportação direta em PDF. Na versão atual, a exportação/impressão é feita via `window.print()` com folha de estilos de impressão dedicada (classes `.no-print` ocultam botões e elementos de navegação ao imprimir).

Nenhum framework pesado (React, Vue, Angular) foi utilizado, conforme solicitado.

## Como os dados são salvos

Os dados de cada ferramenta são salvos no `localStorage` do navegador, em chaves próprias:

- `qualityTools_fluxograma`
- `qualityTools_folhaVerificacao`
- `qualityTools_histograma`
- `qualityTools_pareto`
- `qualityTools_dispersao`
- `qualityTools_ishikawa`
- `qualityTools_cincoPorques`
- `qualityTools_graficoControle`

Cada tela possui um botão **"Salvar dados"**, que grava o conteúdo preenchido. Ao recarregar a página, os dados salvos são lidos automaticamente e os campos/tabelas/gráficos são repreenchidos. O botão **"Limpar dados"** remove os dados salvos daquela ferramenta específica.

> Importante: como o armazenamento é local (no navegador do computador usado), os dados não são compartilhados entre dispositivos ou usuários diferentes, e podem ser perdidos se o usuário limpar o cache/dados do navegador.

## Funcionalidades por ferramenta

1. **Menu** — tela inicial com cards de navegação para as 8 ferramentas.
2. **Fluxograma** — editor visual em SVG com paleta lateral de apenas 4 símbolos (Início ou Fim, Decisão, Operação/Ação, Documento). Os blocos são inseridos por clique ou drag-and-drop na área de desenho com grade, podem ser arrastados livremente, têm texto editável por duplo clique e um painel lateral para alterar texto, cor de fundo, cor da borda, espessura e tamanho. Para ligar dois blocos, usa-se o botão "Conectar blocos": clica-se no bloco de origem e depois no de destino, criando uma seta que acompanha os blocos ao serem movidos. Ao criar uma conexão saindo de um bloco "Decisão", o painel de edição da conexão abre automaticamente para que o usuário defina o rótulo "Sim", "Não" ou um texto personalizado (com fundo branco sobre a linha, para não se confundir com a grade). Conexões e blocos podem ser selecionados e excluídos (excluir um bloco remove também suas conexões).
3. **Folha de verificação** — campos de cabeçalho (problema, estágio, produto, total inspecionado) e tabela com turnos/máquinas/operadores x dias da semana, com cálculo de total.
4. **Histograma** — lista de valores, cálculo automático de amostra, mínimo, máximo, classes (sugestão pela raiz quadrada da amostra) e incremento, com tabela de frequências e gráfico de barras.
5. **Pareto** — tabela de fatores x ocorrências, ordenação decrescente, cálculo de percentual e percentual acumulado, gráfico combinado de barras + linha com eixo secundário.
6. **Dispersão** — tabela de pares X/Y, gráfico de dispersão e linha de tendência linear (com equação `y = ax + b` e R²). As demais tendências (exponencial, logarítmica, polinomial, potência) exibem aviso de "Em desenvolvimento".
7. **Ishikawa (6Ms)** — diagrama visual de espinha de peixe com as 6 categorias (Medição, Mão de obra, Método, Meio ambiente, Material, Máquina), 4 campos de causa por categoria (24 no total) e botão para enviar as causas preenchidas diretamente para a ferramenta "5 Porquês".
8. **5 Porquês** — blocos gerados a partir das causas do Ishikawa (ou adicionados manualmente), cada um com os 5 "por quês", motivo raiz e ação preventiva.
9. **Gráfico de Controle** — lista de valores, cálculo de amostra/média/desvio-padrão, LSC/LIC (automático por média ± 3 desvios-padrão ou manual), identificação de pontos fora dos limites e gráfico de linha com destaque dos pontos fora de controle.

Cada ferramenta possui botão **"Voltar ao menu"**, e a maioria possui **"Exportar/Imprimir"**, que aciona a impressão do navegador já formatada (sem botões/menus).

## Limitações da versão inicial

- A linha de tendência no gráfico de dispersão está implementada apenas para o tipo **Linear**. As demais (exponencial, logarítmica, polinomial, potência) exibem aviso de funcionalidade futura.
- A exportação direta para PDF (via html2canvas/jsPDF) ainda não está conectada a um botão específico; a exportação/impressão atual usa `window.print()`. As bibliotecas já estão incluídas no projeto para facilitar essa implementação futura.
- O fluxograma trabalha apenas com 4 símbolos (Início ou Fim, Decisão, Operação/Ação, Documento). As conexões são sempre retas (sem roteamento ortogonal) e ligam o centro de um bloco ao centro do outro.
- Os dados ficam restritos ao navegador/computador em que foram preenchidos (sem sincronização em nuvem ou múltiplos usuários).
- Não há validação avançada de dados (ex.: impedir texto em campos numéricos além do `type="number"` do navegador).

## Melhorias futuras

- Implementar exportação real em PDF (usando html2canvas + jsPDF) para cada ferramenta, incluindo gráficos.
- Implementar as demais linhas de tendência no gráfico de dispersão (exponencial, logarítmica, polinomial, potência).
- Adicionar conexões com roteamento ortogonal (ângulos retos) e pontos de conexão fixos nas bordas dos blocos, em vez de uma linha reta entre os centros.
- Permitir múltiplos fluxogramas, folhas de verificação, etc. salvos com nomes diferentes (não apenas um conjunto único por ferramenta).
- Adicionar exportação/importação dos dados em JSON ou Excel, para backup e compartilhamento entre dispositivos.
- Adicionar autenticação e armazenamento em backend/banco de dados para uso multiusuário.
