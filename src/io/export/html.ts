/**
 * Self-contained HTML export: every page as inline SVG (fonts and icons
 * embedded as data URIs) plus a tiny vanilla-JS viewer — page tabs, wheel
 * zoom around the cursor, drag to pan, fit, layer toggles, tooltips and link
 * navigation (`page:<id>` links switch pages). No network access needed.
 */
import type { DiagramElement, Page } from '@/model/types';
import { base64Encode, utf8Encode } from '@/io/import/_shared';
import { docLayers, fontFaceCss, inlineIcons, loadExportFonts, renderSvg, type Appearance, type SvgExportOptions } from './svg';

export interface HtmlPageInput {
  page: Page;
  /** Render options for this page (background, padding, area, grid…). */
  svg: SvgExportOptions;
}

export interface HtmlExportOptions {
  title: string;
  appearance?: Appearance;
  embedFonts?: boolean;
  /** Index into `pages` shown first. */
  initialPage?: number;
  /** `.opendraw` JSON embedded so the file can be reopened for editing (src/io/import/html.ts). */
  diagramJson?: string;
}

const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** JSON safe to embed in a <script> element. */
const scriptJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'));

export async function exportHtml(pages: HtmlPageInput[], opts: HtmlExportOptions): Promise<string> {
  if (!pages.length) throw new Error('Nothing to export.');
  const allEls: DiagramElement[] = pages.flatMap((p) => p.page.doc.order.map((id) => p.page.doc.elements[id]).filter(Boolean));
  const [resolver] = await Promise.all([inlineIcons(allEls), opts.embedFonts !== false ? loadExportFonts(allEls) : Promise.resolve()]);

  const meta: Array<{ id: string; name: string; w: number; h: number; layers: Array<{ id: string; name: string; visible: boolean }> }> = [];
  const sections: string[] = [];
  pages.forEach(({ page, svg: svgOpts }, i) => {
    const r = renderSvg(
      page.doc,
      {
        ...svgOpts,
        inline: true,
        embedFont: false,
        appearance: opts.appearance ?? svgOpts.appearance,
        idPrefix: `p${i}-`,
        layerGroups: true,
        hiddenLayers: 'hide',
        links: 'data',
      },
      resolver,
    );
    const layers = docLayers(page.doc).map((l) => ({ id: l.id, name: l.name, visible: l.visible }));
    meta.push({ id: page.id, name: page.name, w: r.width, h: r.height, layers });
    sections.push(`<section class="page" data-index="${i}"${i === (opts.initialPage ?? 0) ? '' : ' hidden'}><div class="stage">${r.svg}</div></section>`);
  });

  const fonts = opts.embedFonts !== false ? fontFaceCss(allEls) : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="ArkDraw">
<title>${escHtml(opts.title)}</title>
<style>${fonts}${VIEWER_CSS}</style>
</head>
<body>
<header class="bar">
  <div class="title"><span class="logo" aria-hidden="true"></span><span class="name">${escHtml(opts.title)}</span><span class="pageName" id="pageName"></span></div>
  <div class="tools">
    <button class="btn" id="layersBtn" title="Layers" aria-haspopup="true" hidden><svg viewBox="0 0 24 24"><path d="M12 3 2 8l10 5 10-5-10-5Z"/><path d="m2 13 10 5 10-5"/></svg></button>
    <div class="zoom">
      <button class="btn" id="zoomOut" title="Zoom out (−)"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
      <button class="pct" id="zoomPct" title="Actual size (1)">100%</button>
      <button class="btn" id="zoomIn" title="Zoom in (+)"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
    </div>
    <button class="btn" id="fitBtn" title="Fit (0)"><svg viewBox="0 0 24 24"><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/></svg></button>
  </div>
</header>
<div class="layersPop" id="layersPop" hidden></div>
<main id="viewport" tabindex="0" aria-label="Diagram">
${sections.join('\n')}
</main>
<nav class="tabs" id="tabs"${pages.length > 1 ? '' : ' hidden'}></nav>
<div class="tip" id="tip" role="tooltip" hidden></div>
<script type="application/json" id="od-pages">${scriptJson(meta)}</script>
<script>${VIEWER_JS}</script>
${opts.diagramJson ? `<script type="application/vnd.opendraw+json" id="opendraw-diagram">${base64Encode(utf8Encode(opts.diagramJson))}</script>
` : ''}</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Viewer (kept free of external references: works from file:// offline)
// ---------------------------------------------------------------------------

const VIEWER_CSS = `
:root{--bg:#f4f4f6;--panel:rgba(255,255,255,.86);--fg:#18181b;--muted:#6b6b76;--line:rgba(20,20,40,.1);--hover:rgba(20,20,40,.06);--accent:#5b5bf6;--dot:rgba(20,20,40,.13);--shadow:0 0 0 1px var(--line),0 8px 30px -12px rgba(20,20,40,.25);color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0e;--panel:rgba(24,24,29,.86);--fg:#ececf1;--muted:#9b9ba7;--line:rgba(255,255,255,.09);--hover:rgba(255,255,255,.07);--accent:#7c7cff;--dot:rgba(255,255,255,.08);--shadow:0 0 0 1px var(--line),0 10px 34px -12px rgba(0,0,0,.7);color-scheme:dark}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0;height:100%;overflow:hidden;background:var(--bg);color:var(--fg);font:13px/1.4 "Inter Variable",Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
body{display:flex;flex-direction:column}
.bar{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:12px;height:48px;padding:0 10px 0 14px;background:var(--panel);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.title{display:flex;align-items:center;gap:9px;min-width:0}
.logo{width:18px;height:18px;border-radius:6px;background:linear-gradient(135deg,var(--accent),#a855f7);box-shadow:inset 0 1px 0 rgba(255,255,255,.3);flex:none}
.name{font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pageName{color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pageName:not(:empty)::before{content:"/";margin-right:9px;opacity:.5}
.tools{display:flex;align-items:center;gap:4px}
.zoom{display:flex;align-items:center;border-radius:9px;box-shadow:0 0 0 1px var(--line);margin:0 2px}
.btn,.pct{display:inline-flex;align-items:center;justify-content:center;height:30px;min-width:30px;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer;font:inherit;transition:background .15s,color .15s}
.btn:hover,.pct:hover,.btn[aria-pressed=true]{background:var(--hover);color:var(--fg)}
.btn svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.pct{min-width:52px;font-variant-numeric:tabular-nums;font-size:12px}
main{position:relative;flex:1;overflow:hidden;outline:none;cursor:grab;touch-action:none;background-image:radial-gradient(var(--dot) 1px,transparent 1px);background-size:22px 22px}
main.panning{cursor:grabbing}
.page{position:absolute;inset:0}
.page[hidden]{display:none}
.stage{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
.stage>svg{display:block;border-radius:6px;box-shadow:var(--shadow);background:transparent}
.stage svg [data-link]{cursor:pointer}
.stage svg [data-link]:hover{filter:brightness(1.06) drop-shadow(0 0 3px rgba(91,91,246,.55))}
.tabs{position:absolute;left:50%;bottom:14px;z-index:3;transform:translateX(-50%);display:flex;gap:2px;max-width:calc(100% - 28px);overflow-x:auto;padding:4px;border-radius:12px;background:var(--panel);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:var(--shadow);scrollbar-width:none}
.tabs[hidden]{display:none}
.tab{flex:none;height:28px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:12.5px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.tab:hover{background:var(--hover);color:var(--fg)}
.tab[aria-selected=true]{background:var(--accent);color:#fff;box-shadow:0 1px 2px rgba(0,0,0,.2)}
.layersPop{position:absolute;right:10px;top:54px;z-index:4;min-width:200px;padding:6px;border-radius:12px;background:var(--panel);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:var(--shadow)}
.layersPop[hidden]{display:none}
.layersPop h4{margin:4px 8px 6px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
.layer{display:flex;align-items:center;gap:9px;width:100%;height:30px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--fg);font:inherit;text-align:left;cursor:pointer}
.layer:hover{background:var(--hover)}
.check{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:5px;box-shadow:inset 0 0 0 1.5px var(--line);transition:background .15s}
.layer[aria-checked=true] .check{background:var(--accent);box-shadow:none}
.check svg{width:11px;height:11px;fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.layer[aria-checked=true] .check svg{opacity:1}
.tip{position:fixed;z-index:5;max-width:280px;padding:6px 9px;border-radius:8px;background:#18181b;color:#fff;font-size:12px;line-height:1.35;pointer-events:none;box-shadow:0 6px 20px -6px rgba(0,0,0,.45);white-space:pre-wrap}
.tip[hidden]{display:none}
@media (prefers-color-scheme:dark){.tip{background:#f4f4f6;color:#18181b}}
@media print{.bar,.tabs,.tip,.layersPop{display:none!important}main{background:none}.stage{transform:none!important;position:static}.stage>svg{box-shadow:none;max-width:100%;height:auto}}
`;

const VIEWER_JS = `(function(){
"use strict";
var pages=JSON.parse(document.getElementById("od-pages").textContent);
var vp=document.getElementById("viewport"),tabs=document.getElementById("tabs"),pct=document.getElementById("zoomPct");
var tip=document.getElementById("tip"),layersBtn=document.getElementById("layersBtn"),pop=document.getElementById("layersPop");
var sections=[].slice.call(document.querySelectorAll(".page"));
var cur=0,views=pages.map(function(){return null});
var MIN=0.05,MAX=8;

/* Tooltips: lift <title> into data-tip so we can show a styled tooltip. */
[].forEach.call(document.querySelectorAll(".stage title"),function(t){
  var p=t.parentNode;if(p&&p.setAttribute){p.setAttribute("data-tip",t.textContent);p.removeChild(t);}
});

function stage(){return sections[cur].querySelector(".stage")}
function apply(){
  var v=views[cur];stage().style.transform="translate("+v.x+"px,"+v.y+"px) scale("+v.k+")";
  pct.textContent=Math.round(v.k*100)+"%";
}
function fit(){
  var p=pages[cur],r=vp.getBoundingClientRect(),pad=48,bottom=tabs.hidden?0:56;
  var k=Math.min((r.width-pad*2)/p.w,(r.height-pad*2-bottom)/p.h,1);
  if(!(k>0))k=1;
  views[cur]={k:k,x:(r.width-p.w*k)/2,y:(r.height-bottom-p.h*k)/2,fitted:true};apply();
}
function zoomAt(f,cx,cy){
  var v=views[cur],k=Math.min(MAX,Math.max(MIN,v.k*f));f=k/v.k;
  v.x=cx-(cx-v.x)*f;v.y=cy-(cy-v.y)*f;v.k=k;v.fitted=false;apply();
}
function center(){var r=vp.getBoundingClientRect();return [r.width/2,r.height/2]}
function show(i,push){
  if(i<0||i>=pages.length)return;
  sections[cur].hidden=true;cur=i;sections[cur].hidden=false;
  [].forEach.call(tabs.children,function(t,j){t.setAttribute("aria-selected",j===i?"true":"false");if(j===i&&t.scrollIntoView)t.scrollIntoView({block:"nearest",inline:"nearest"})});
  document.getElementById("pageName").textContent=pages.length>1?pages[i].name:"";
  if(views[i])apply();else fit();
  renderLayers();
  if(push!==false&&pages.length>1){try{history.replaceState(null,"","#page="+(i+1))}catch(e){}}
}

/* Page tabs */
pages.forEach(function(p,i){
  var b=document.createElement("button");b.className="tab";b.textContent=p.name;b.setAttribute("role","tab");
  b.onclick=function(){show(i)};tabs.appendChild(b);
});

/* Layers */
function renderLayers(){
  var ls=pages[cur].layers;layersBtn.hidden=ls.length<2;
  if(ls.length<2){pop.hidden=true;layersBtn.setAttribute("aria-pressed","false");return}
  pop.innerHTML="<h4>Layers</h4>";
  ls.slice().reverse().forEach(function(l){
    var g=stage().querySelector('[data-layer="'+(window.CSS&&CSS.escape?CSS.escape(l.id):l.id)+'"]');
    var on=g?g.style.display!=="none":l.visible;
    var b=document.createElement("button");b.className="layer";b.setAttribute("role","menuitemcheckbox");b.setAttribute("aria-checked",on?"true":"false");
    b.innerHTML='<span class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span></span>';
    b.lastChild.textContent=l.name;
    b.onclick=function(){on=!on;if(g)g.style.display=on?"":"none";b.setAttribute("aria-checked",on?"true":"false")};
    pop.appendChild(b);
  });
}
layersBtn.onclick=function(e){e.stopPropagation();pop.hidden=!pop.hidden;layersBtn.setAttribute("aria-pressed",pop.hidden?"false":"true")};
document.addEventListener("pointerdown",function(e){if(!pop.hidden&&!pop.contains(e.target)&&e.target!==layersBtn&&!layersBtn.contains(e.target)){pop.hidden=true;layersBtn.setAttribute("aria-pressed","false")}});

/* Toolbar */
document.getElementById("zoomIn").onclick=function(){var c=center();zoomAt(1.25,c[0],c[1])};
document.getElementById("zoomOut").onclick=function(){var c=center();zoomAt(0.8,c[0],c[1])};
document.getElementById("fitBtn").onclick=fit;
pct.onclick=function(){var c=center();zoomAt(1/views[cur].k,c[0],c[1])};

/* Wheel zoom around the cursor; drag to pan */
vp.addEventListener("wheel",function(e){
  e.preventDefault();var r=vp.getBoundingClientRect();
  var d=e.deltaMode===1?e.deltaY*16:e.deltaY;
  zoomAt(Math.exp(-d*(e.ctrlKey?0.01:0.0015)),e.clientX-r.left,e.clientY-r.top);
},{passive:false});
var drag=null,moved=false;
vp.addEventListener("pointerdown",function(e){
  if(e.button!==0&&e.button!==1)return;
  drag={x:e.clientX,y:e.clientY,vx:views[cur].x,vy:views[cur].y,id:e.pointerId};moved=false;
});
vp.addEventListener("pointermove",function(e){
  if(drag){
    var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!moved&&Math.abs(dx)+Math.abs(dy)>3){moved=true;vp.classList.add("panning");try{vp.setPointerCapture(drag.id)}catch(err){}tip.hidden=true}
    if(moved){views[cur].x=drag.vx+dx;views[cur].y=drag.vy+dy;views[cur].fitted=false;apply()}
    return;
  }
  var t=e.target.closest&&e.target.closest("[data-tip]");
  if(t){tip.textContent=t.getAttribute("data-tip");tip.hidden=false;
    var w=tip.offsetWidth,h=tip.offsetHeight,x=e.clientX+14,y=e.clientY+16;
    if(x+w>innerWidth-8)x=e.clientX-w-10;if(y+h>innerHeight-8)y=e.clientY-h-12;
    tip.style.left=x+"px";tip.style.top=y+"px";}
  else tip.hidden=true;
});
function endDrag(){drag=null;vp.classList.remove("panning")}
vp.addEventListener("pointerup",endDrag);vp.addEventListener("pointercancel",endDrag);
vp.addEventListener("pointerleave",function(){if(!drag)tip.hidden=true});
vp.addEventListener("dblclick",function(e){if(!(e.target.closest&&e.target.closest("[data-link]")))fit()});

/* Links: page:<id> switches pages, anything else opens in a new tab */
vp.addEventListener("click",function(e){
  if(moved)return;var a=e.target.closest&&e.target.closest("[data-link]");if(!a)return;
  var href=a.getAttribute("data-link");
  if(href.indexOf("page:")===0){var id=href.slice(5);for(var i=0;i<pages.length;i++)if(pages[i].id===id){show(i);return}return}
  if(/^(javascript|data|vbscript):/i.test(href))return;
  window.open(href,"_blank","noopener");
});

/* Keyboard */
document.addEventListener("keydown",function(e){
  if(e.metaKey||e.altKey)return;var c=center();
  if(e.key==="+"||e.key==="="){zoomAt(1.25,c[0],c[1]);e.preventDefault()}
  else if(e.key==="-"||e.key==="_"){zoomAt(0.8,c[0],c[1]);e.preventDefault()}
  else if(e.key==="0"){fit();e.preventDefault()}
  else if(e.key==="1"){zoomAt(1/views[cur].k,c[0],c[1]);e.preventDefault()}
  else if(e.key==="ArrowRight"||e.key==="PageDown"){show(Math.min(pages.length-1,cur+1));e.preventDefault()}
  else if(e.key==="ArrowLeft"||e.key==="PageUp"){show(Math.max(0,cur-1));e.preventDefault()}
  else if(e.key==="Escape"){pop.hidden=true;layersBtn.setAttribute("aria-pressed","false")}
});
addEventListener("resize",function(){views=views.map(function(v,i){return i===cur?v:null});if(views[cur]&&views[cur].fitted)fit()});

var m=/page=(\\d+)/.exec(location.hash),start=m?Math.max(0,Math.min(pages.length-1,parseInt(m[1],10)-1)):sections.findIndex(function(s){return !s.hidden});
sections.forEach(function(s,i){s.hidden=i!==Math.max(0,start)});cur=Math.max(0,start);
show(cur,false);
})();`;
