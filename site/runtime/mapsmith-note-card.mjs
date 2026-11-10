const STYLE_ID = 'dndwiki-mapsmith-note-card-style';
const CSS = `
/* Keep note typography on the same .dndwiki-shell/.dndwiki-page/header rules
   as ordinary wiki notes. These overrides describe the card geometry only. */
.mapsmith[data-dndwiki-mapsmith-viewer-page] { font-family:inherit; }
.mapsmith[data-dndwiki-mapsmith-viewer-page] .mapsmith-rail[data-dndwiki-note-card] {
  --dndwiki-note-card-inset:clamp(12px,var(--map-bar-height,64px),20%);
  top:var(--dndwiki-note-card-inset)!important; right:0!important; bottom:auto!important; height:auto;
  width:min(var(--dndwiki-note-card-width,440px),calc(100% - 24px)); max-width:none;
  max-height:calc(100% - var(--dndwiki-note-card-inset) - var(--dndwiki-note-card-inset)); min-height:0; overflow:hidden;
  z-index:60;
  border:1px solid var(--background-modifier-border); border-right:0;
  border-radius:14px 0 0 14px; background:var(--background-primary); color:var(--text-normal);
  box-shadow:0 10px 32px rgb(0 0 0 / .14);
}
.mapsmith-rail[data-dndwiki-note-card] > .mapsmith-note-header {
  justify-content:flex-end; flex-wrap:nowrap; gap:5px; padding:8px 12px;
  border-bottom:0;
}
.mapsmith-rail[data-dndwiki-note-card] > .mapsmith-note-content.dndwiki-mapsmith-note-document {
  display:block; flex:0 1 auto; min-height:0; width:auto; max-width:none;
  margin:0; padding:0 24px 24px; overflow-x:hidden; overflow-y:auto;
  overscroll-behavior:contain; scrollbar-width:thin; scrollbar-gutter:stable;
  background:transparent; font-family:inherit;
}
.dndwiki-mapsmith-note-document > .dndwiki-page-header { margin-top:0; }
.mapsmith .dndwiki-mapsmith-note-document > .dndwiki-page {
  width:100%; max-width:100%; margin:0; padding:0;
}
.mapsmith .dndwiki-note-card-resize {
  position:absolute; z-index:2; top:0; bottom:0; left:0;
  width:10px; height:auto; min-width:0; min-height:0; margin:0; padding:0;
  border:0; border-radius:0; box-shadow:none; background:transparent;
  cursor:ew-resize; touch-action:none;
}
.mapsmith .dndwiki-note-card-resize:hover,
.mapsmith .dndwiki-note-card-resize:active { background:color-mix(in srgb,var(--text-muted) 15%,transparent); }
.mapsmith .dndwiki-note-card-grabber { display:none; }
@container (max-width:700px) {
  .mapsmith[data-dndwiki-mapsmith-viewer-page] .mapsmith-rail[data-dndwiki-note-card] {
    --rail-exit:translateY(calc(100% + 12px));
    top:auto!important; right:12px!important; bottom:var(--dndwiki-note-card-inset)!important; left:12px;
    width:auto; max-width:none; height:var(--dndwiki-note-card-height,auto);
    max-height:calc(100% - var(--dndwiki-note-card-inset) - var(--dndwiki-note-card-inset)); border-right:1px solid var(--background-modifier-border);
    border-radius:14px 14px 0 0;
  }
  .mapsmith-rail[data-dndwiki-note-card] > .mapsmith-note-header { padding-top:4px; }
  .mapsmith-rail[data-dndwiki-note-card] > .mapsmith-note-content.dndwiki-mapsmith-note-document { padding:0 18px 18px; }
  .mapsmith .dndwiki-note-card-resize { display:none; }
  .mapsmith .dndwiki-note-card-grabber {
    display:block; position:relative; flex:0 0 26px; width:100%; height:26px;
    min-width:0; min-height:26px; margin:0; padding:0; border:0; border-radius:0;
    box-shadow:none; background:transparent; cursor:ns-resize; touch-action:none;
  }
  .mapsmith .dndwiki-note-card-grabber::after {
    content:''; position:absolute; width:38px; height:4px; left:calc(50% - 19px); top:10px;
    border-radius:99px; background:var(--text-faint);
  }
  .mapsmith .dndwiki-note-card-grabber:hover::after,
  .mapsmith .dndwiki-note-card-grabber:active::after { background:var(--text-muted); }
}
`;

/** A transient reader card: dimensions never enter the authored map or settings. */
export function mountMapNoteCard(element, { title, html, window: browserWindow } = {}) {
  const document = element.ownerDocument, rail = element.closest('.mapsmith-rail'), root = element.closest('.mapsmith');
  if (!rail || !root) return () => {};
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style'); style.id = STYLE_ID; style.textContent = CSS; document.head.append(style);
  }
  const abort = new AbortController(), options = { signal:abort.signal };
  const header = rail.querySelector('.mapsmith-note-header');
  header?.querySelector('.inline-title')?.remove();
  element.classList.add('dndwiki-shell', 'dndwiki-mapsmith-note-document');
  element.replaceChildren();
  const titleHeader = document.createElement('header'); titleHeader.className = 'dndwiki-page-header';
  const heading = document.createElement('h1'); heading.textContent = title; titleHeader.append(heading);
  const article = document.createElement('article'); article.className = 'dndwiki-page markdown-rendered'; article.innerHTML = html;
  element.append(titleHeader, article);
  rail.setAttribute('data-dndwiki-note-card', '');
  const resize = document.createElement('button'), grabber = document.createElement('button');
  for (const [handle, vertical] of [[resize,false],[grabber,true]]) {
    handle.type = 'button'; handle.className = vertical ? 'dndwiki-note-card-grabber' : 'dndwiki-note-card-resize';
    handle.setAttribute('role','separator'); handle.setAttribute('aria-orientation',vertical?'horizontal':'vertical');
    handle.setAttribute('aria-label',vertical?'Resize note height':'Resize note width');
  }
  rail.prepend(grabber); rail.append(resize);
  let drag;
  const limits = (vertical) => {
    const style=browserWindow.getComputedStyle(rail),inset=parseFloat(root.clientWidth<=700?style.bottom:style.top)||12;
    const maximum = vertical ? Math.max(48,root.clientHeight-2*inset) : Math.max(160,Math.min(840,root.clientWidth-24));
    return { minimum:Math.min(vertical?160:320,maximum), maximum };
  };
  const value = (vertical) => rail.getBoundingClientRect()[vertical?'height':'width'];
  const setSize = (vertical, size) => {
    const {minimum,maximum} = limits(vertical);
    root.style.setProperty(vertical?'--dndwiki-note-card-height':'--dndwiki-note-card-width',Math.min(maximum,Math.max(minimum,size))+'px');
  };
  for (const [handle, vertical] of [[resize,false],[grabber,true]]) {
    handle.addEventListener('pointerdown',event=>{
      if(event.button!==0)return;
      drag={id:event.pointerId,handle,vertical,start:vertical?event.clientY:event.clientX,size:value(vertical)};
      handle.setPointerCapture(event.pointerId); event.preventDefault(); event.stopPropagation();
    },options);
    handle.addEventListener('pointermove',event=>{
      if(!drag||drag.id!==event.pointerId||drag.handle!==handle)return;
      setSize(vertical,drag.size+drag.start-(vertical?event.clientY:event.clientX));event.preventDefault();event.stopPropagation();
    },options);
    const finish=event=>{if(drag?.id!==event.pointerId||drag.handle!==handle)return;drag=undefined;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);};
    handle.addEventListener('pointerup',finish,options); handle.addEventListener('pointercancel',finish,options);
    handle.addEventListener('keydown',event=>{
      const delta=vertical?{ArrowUp:32,ArrowDown:-32}:{ArrowLeft:24,ArrowRight:-24};
      if(event.key in delta){setSize(vertical,value(vertical)+delta[event.key]);event.preventDefault();event.stopPropagation();}
      if(event.key==='Home'){root.style.removeProperty(vertical?'--dndwiki-note-card-height':'--dndwiki-note-card-width');event.preventDefault();}
    },options);
    handle.addEventListener('dblclick',()=>root.style.removeProperty(vertical?'--dndwiki-note-card-height':'--dndwiki-note-card-width'),options);
  }
  const sync = () => {
    for(const [handle,vertical]of [[resize,false],[grabber,true]]){
      const {minimum,maximum}=limits(vertical);handle.setAttribute('aria-valuemin',String(Math.round(minimum)));handle.setAttribute('aria-valuemax',String(Math.round(maximum)));handle.setAttribute('aria-valuenow',String(Math.round(value(vertical))));
    }
  };
  const observer = new browserWindow.ResizeObserver(sync); observer.observe(rail); observer.observe(root); sync();
  return () => {abort.abort();observer.disconnect();rail.removeAttribute('data-dndwiki-note-card');resize.remove();grabber.remove();};
}
