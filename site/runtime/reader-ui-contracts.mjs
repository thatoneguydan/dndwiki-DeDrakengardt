const STYLE_ID='dndwiki-reader-ui-contracts-v54';
const SENTINEL='__dndwiki_outline_sentinel__';
export const OBSIDIAN_ACCENT='rgb(57, 46, 87)';
const CSS=`:root{--text-accent:${OBSIDIAN_ACCENT}!important;--interactive-accent:${OBSIDIAN_ACCENT}!important;--text-accent-hover:color-mix(in srgb,${OBSIDIAN_ACCENT} 82%,white)!important;--interactive-accent-hover:color-mix(in srgb,${OBSIDIAN_ACCENT} 82%,white)!important;--link-color:${OBSIDIAN_ACCENT}!important;--link-color-hover:color-mix(in srgb,${OBSIDIAN_ACCENT} 82%,white)!important}#dndwiki-app .dndwiki-outline-contract-anchor{position:absolute!important;width:1px!important;height:1px!important;min-height:1px!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important;clip-path:inset(50%)!important;color:transparent!important;font-size:0!important;line-height:0!important;opacity:0!important;pointer-events:none!important}#dndwiki-app .dndwiki-outline-contract-sentinel-item{display:none!important}#dndwiki-app .dndwiki-search-tag-match>[data-dndwiki-search-result]{padding-bottom:.18rem!important}#dndwiki-app .dndwiki-search-tag-link{display:block;margin:0;padding:.05rem 1rem .72rem;color:var(--text-muted);font-size:.78rem;line-height:1.3;text-decoration:none}#dndwiki-app .dndwiki-search-tag-link:hover{color:var(--text-accent);background:var(--background-modifier-hover);text-decoration:none}#dndwiki-app .dndwiki-search-tag-link mark{background:var(--text-highlight-bg);color:inherit;padding:0 .08em}#dndwiki-app .dndwiki-search-filter-tag-link{min-width:0;display:inline-flex;align-items:baseline;gap:.35rem;color:var(--text-normal);text-decoration:none}#dndwiki-app .dndwiki-search-filter-tag-link:hover{color:var(--text-accent);text-decoration:none}`;
const txt=node=>String(node?.textContent??'').trim();
const tagName=value=>String(value??'').trim().replace(/^#+/,'');
export const tagRoute=value=>{const name=tagName(value);return name?`#/tag/${encodeURIComponent(name)}`:'#/'};
const articleHeadings=article=>[...(article?.querySelectorAll?.('h1,h2,h3,h4,h5,h6')??[])];
const isSentinel=node=>node?.hasAttribute?.('data-dndwiki-outline-contract-sentinel')===true;
function escapeHtml(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')}
function pageRoute(hash){return /^(#\/page\/[a-z0-9][a-z0-9._-]{0,63})/i.exec(String(hash??''))?.[1]??null}
export function ensureUiContractStyles(document){if(!document)return false;let changed=false;let style=document.getElementById?.(STYLE_ID);if(!style){style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS;document.head?.append(style);return true}if(style.textContent!==CSS){style.textContent=CSS;changed=true}if(document.head&&document.head.lastElementChild!==style){document.head.append(style);changed=true}return changed}
export function ensureOutlineSentinels(root){const article=root?.querySelector?.('[data-dndwiki-page]'),document=article?.ownerDocument;if(!article||!document)return false;let changed=false;for(const legacy of article.querySelectorAll('[data-dndwiki-outline-contract-anchor="title"],[data-dndwiki-outline-contract-anchor="sentinel"]')){legacy.remove();changed=true}const real=articleHeadings(article).filter(node=>!isSentinel(node));const wanted=Math.max(0,2-real.length);const current=[...article.querySelectorAll('[data-dndwiki-outline-contract-sentinel]')];while(current.length>wanted){current.pop().remove();changed=true}while(current.length<wanted){const node=document.createElement('h6');node.className='dndwiki-outline-contract-anchor';node.setAttribute('data-dndwiki-outline-contract-sentinel',String(current.length));node.setAttribute('aria-hidden','true');node.textContent=SENTINEL+current.length;article.append(node);current.push(node);changed=true}return changed}
export function stripOutlineSentinelLinks(root){const article=root?.querySelector?.('[data-dndwiki-page]');if(!article)return false;let changed=false;articleHeadings(article).forEach((node,index)=>{if(!isSentinel(node))return;for(const link of root.querySelectorAll(`[data-dndwiki-toc-index="${index}"]`)){const item=link.closest('li');if(item&&!item.classList.contains('dndwiki-outline-contract-sentinel-item')){item.classList.add('dndwiki-outline-contract-sentinel-item');changed=true}}});return changed}
function firstRealHeading(root){return articleHeadings(root?.querySelector?.('[data-dndwiki-page]')).find(node=>!isSentinel(node))??null}
export function ensureTitleOutlineLink(root, browserWindow = globalThis.window) {
  const list = root?.querySelector?.('[data-dndwiki-page-outline] .dndwiki-toc-list');
  const document = list?.ownerDocument;
  const title = txt(root?.querySelector?.('[data-dndwiki-page-header] h1'));
  const route = pageRoute(browserWindow?.location?.hash);
  if (!list || !document || !title || !route) return false;
  let link = list.querySelector('[data-dndwiki-title-link]');
  let changed = false;
  const first = firstRealHeading(root);
  const authoredTitle = first && txt(first).toLocaleLowerCase('en-US') === title.toLocaleLowerCase('en-US');
  if (authoredTitle) {
    const headings = articleHeadings(root.querySelector('[data-dndwiki-page]'));
    const existing = list.querySelector(`[data-dndwiki-toc-index="${headings.indexOf(first)}"]`);
    if (!existing) return false;
    if (link && link !== existing) { link.closest('li')?.remove(); changed = true; }
    link = existing;
  } else if (!link) {
    const item = document.createElement('li');
    item.className = 'dndwiki-title-outline-item';
    link = document.createElement('a');
    link.className = 'dndwiki-toc-link dndwiki-title-outline-link';
    link.setAttribute('data-level', '1');
    item.append(link);
    list.insertBefore(item, list.firstChild);
    changed = true;
  }
  if (!link.hasAttribute('data-dndwiki-title-link')) { link.setAttribute('data-dndwiki-title-link', ''); changed = true; }
  if (link.getAttribute('href') !== route) { link.setAttribute('href', route); changed = true; }
  if (txt(link.querySelector('.dndwiki-toc-label')) !== title) {
    link.innerHTML = `<span class="dndwiki-outline-dot" aria-hidden="true"></span><span class="dndwiki-toc-label">${escapeHtml(title)}</span>`;
    changed = true;
  }
  const item = link.closest('li');
  if (item && list.firstElementChild !== item) { list.insertBefore(item, list.firstChild); changed = true; }
  return changed;
}
export function enhanceTagSearchResult(link){if(!link||link.getAttribute('data-dndwiki-search-match')!=='tag'||link.hasAttribute('data-dndwiki-tag-result-enhanced'))return false;const strong=link.querySelector('strong'),meta=[...link.children].find(node=>node.tagName?.toLowerCase()==='span'),name=tagName(strong?.textContent),title=String(meta?.textContent??'').replace(/^\s*Tag\s*·\s*/i,'').trim(),document=link.ownerDocument;if(!strong||!name||!title||!document)return false;const tagContent=strong.cloneNode(true),titleNode=document.createElement('strong');titleNode.textContent=title;link.replaceChildren(titleNode);link.setAttribute('data-dndwiki-tag-result-enhanced','true');link.parentElement?.classList.add('dndwiki-search-tag-match');const tagLink=document.createElement('a');tagLink.className='dndwiki-search-tag-link';tagLink.href=tagRoute(name);tagLink.setAttribute('data-dndwiki-tag-navigation',name);tagLink.setAttribute('aria-label',`Show all pages tagged ${name}`);while(tagContent.firstChild)tagLink.append(tagContent.firstChild);link.insertAdjacentElement('afterend',tagLink);return true}
function filterName(label){const full=txt(label),count=txt(label?.querySelector('small'));return tagName(count&&full.endsWith(count)?full.slice(0,-count.length).trim():full)}
export function linkFilterTagLabels(root){let changed=false;for(const row of root?.querySelectorAll?.('[data-dndwiki-filter-tag]')??[]){const panel=row.closest?.('[data-dndwiki-search-filters]');if(panel?.hidden===true)continue;if(row.querySelector(':scope>.dndwiki-search-filter-tag-link'))continue;const label=[...row.children].find(node=>node.tagName?.toLowerCase()==='span'),name=filterName(label),document=row.ownerDocument;if(!label||!name||!document)continue;const link=document.createElement('a');link.className='dndwiki-search-filter-tag-link';link.href=tagRoute(name);link.setAttribute('aria-label',`Show all pages tagged ${name}`);while(label.firstChild)link.append(label.firstChild);label.replaceWith(link);changed=true}return changed}
export function linkVisibleTagPills(root){let changed=false;for(const pill of root?.querySelectorAll?.('.dndwiki-tag')??[]){if(pill.tagName?.toLowerCase()==='a')continue;const name=tagName(pill.textContent),document=pill.ownerDocument;if(!name||!document)continue;const link=document.createElement('a');for(const attribute of pill.attributes)link.setAttribute(attribute.name,attribute.value);link.href=tagRoute(name);while(pill.firstChild)link.append(pill.firstChild);pill.replaceWith(link);changed=true}return changed}
export function applyReaderUiContracts(root,browserWindow=globalThis.window){if(!root)return false;let changed=ensureOutlineSentinels(root);changed=linkVisibleTagPills(root)||changed;changed=linkFilterTagLabels(root)||changed;for(const link of root.querySelectorAll('[data-dndwiki-search-result][data-dndwiki-search-match="tag"]'))changed=enhanceTagSearchResult(link)||changed;changed=stripOutlineSentinelLinks(root)||changed;changed=ensureTitleOutlineLink(root,browserWindow)||changed;return changed}
export function mountReaderUiContracts({document=globalThis.document,window:browserWindow=globalThis.window}={}){if(!document||!browserWindow)return{destroy(){}};ensureUiContractStyles(document);const root=document.getElementById('dndwiki-app');if(!root)return{destroy(){}};let queued=false,observer=null;const observe=()=>observer?.observe(root,{childList:true,subtree:true});const schedule=browserWindow.requestAnimationFrame??((callback)=>setTimeout(callback,0));const apply=()=>{observer?.disconnect();try{ensureUiContractStyles(document);applyReaderUiContracts(root,browserWindow)}finally{observe()}};const refresh=()=>{if(queued)return;queued=true;schedule(()=>{apply();schedule(()=>{apply();queued=false})})};const click=event=>{const titleLink=event.target?.closest?.('[data-dndwiki-title-link]');if(titleLink){event.preventDefault();event.stopPropagation();const route=pageRoute(browserWindow.location?.hash);if(route&&browserWindow.location.hash!==route)browserWindow.history?.replaceState?.(null,'',route);browserWindow.scrollTo?.({top:0,left:0,behavior:'auto'});return}if(event.target?.closest?.('[data-dndwiki-search-filter-toggle],[data-dndwiki-search-more],[data-dndwiki-tag-include],[data-dndwiki-tag-exclude]'))refresh()};const input=event=>{if(event.target?.matches?.('input[name="query"],[data-dndwiki-search-tag-query]'))refresh()};observer=typeof browserWindow.MutationObserver==='function'?new browserWindow.MutationObserver(refresh):null;observe();document.addEventListener('click',click);document.addEventListener('input',input);browserWindow.addEventListener('hashchange',refresh,true);refresh();return{destroy(){observer?.disconnect();document.removeEventListener('click',click);document.removeEventListener('input',input);browserWindow.removeEventListener('hashchange',refresh,true)}}}
if(typeof document!=='undefined'&&typeof window!=='undefined')mountReaderUiContracts({document,window});
