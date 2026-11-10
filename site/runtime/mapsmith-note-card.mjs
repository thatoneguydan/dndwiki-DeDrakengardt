const STYLE_ID='dndwiki-mapsmith-note-card-style';
const owners=new WeakMap();
const CSS=`
/* Content and title retain the wiki's own classes and typography. Shared
   Mapsmith card CSS and controls own all layout, resize and palette behavior. */
.mapsmith[data-dndwiki-mapsmith-viewer-page] { font-family:inherit; }
.mapsmith .mapsmith-note-content.dndwiki-mapsmith-note-document {
  display:block; min-height:0; width:auto; max-width:none; font-family:inherit;
}
.mapsmith .dndwiki-mapsmith-note-document > .dndwiki-page { width:100%; max-width:100%; margin:0; padding:0; }
`;

export function mountMapNoteCard(element,{title,html}={}){
  const document=element.ownerDocument,rail=element.closest('.mapsmith-rail'),header=rail?.querySelector('.mapsmith-note-header');
  if(!rail||!header)return()=>{};
  if(!document.getElementById(STYLE_ID)){const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head.append(style);}
  const previous=header.querySelector('.inline-title'),heading=document.createElement('h1');heading.className='mapsmith-note-title';heading.textContent=title;
  if(previous)previous.replaceWith(heading);else header.prepend(heading);
  header.classList.add('dndwiki-page-header');
  element.classList.add('dndwiki-shell','dndwiki-mapsmith-note-document');
  const article=document.createElement('article');article.className='dndwiki-page markdown-rendered';article.innerHTML=html;element.replaceChildren(article);
  const owner={};owners.set(rail,owner);rail.setAttribute('data-dndwiki-note-card','');
  return()=>{if(owners.get(rail)===owner){rail.removeAttribute('data-dndwiki-note-card');owners.delete(rail);}};
}
