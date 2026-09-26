import { pageForRoute } from './navigation.mjs';
import { mountWikiShell, parseWikiRoute } from './wiki-shell.mjs';

const CHROME_STYLE_ID = 'dndwiki-modern-chrome-styles';

const CHROME_CSS = `
.dndwiki-layout.dndwiki-modern-layout {
  width: min(100%, 112rem);
  grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr) minmax(14rem, 17rem);
  gap: clamp(1.35rem, 2.6vw, 2.8rem);
  align-items: start;
}
.dndwiki-brand small { display:none; }
.dndwiki-primary-nav {
  position: sticky;
  top: 4.5rem;
  align-self: start;
  max-height: calc(100vh - 5.5rem);
  overflow: auto;
  padding: .5rem;
  border: 1px solid var(--background-modifier-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--background-secondary) 76%, transparent);
  scrollbar-width: thin;
}
.dndwiki-primary-nav-section + .dndwiki-primary-nav-section {
  margin-top: .85rem;
  padding-top: .85rem;
  border-top: 1px solid var(--background-modifier-border);
}
.dndwiki-primary-nav-heading {
  margin: 0 .45rem .4rem;
  color: var(--text-faint);
  font-size: .68rem;
  font-weight: 700;
  letter-spacing: .075em;
  text-transform: uppercase;
}
.dndwiki-primary-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: .12rem;
}
.dndwiki-primary-nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: .45rem;
  min-height: 34px;
  padding: .4rem .55rem;
  border-radius: 8px;
  color: var(--text-muted);
  text-decoration: none;
  line-height: 1.25;
}
.dndwiki-primary-nav-link:hover {
  color: var(--text-normal);
  background: var(--background-modifier-hover);
}
.dndwiki-primary-nav-link[aria-current="page"] {
  color: var(--text-normal);
  background: var(--background-primary);
  box-shadow: inset 0 0 0 1px var(--background-modifier-border);
  font-weight: 600;
}
.dndwiki-primary-nav-link[aria-current="page"]::before {
  content: '';
  position: absolute;
  left: -.5rem;
  top: .45rem;
  bottom: .45rem;
  width: 3px;
  border-radius: 999px;
  background: var(--interactive-accent);
}
.dndwiki-primary-nav-count {
  margin: .42rem .55rem 0;
  color: var(--text-faint);
  font-size: .72rem;
}
.dndwiki-mobile-browse { display:none; }
.dndwiki-shell[data-dndwiki-route-kind="home"] .dndwiki-sidebar,
.dndwiki-shell[data-dndwiki-route-kind="tag"] .dndwiki-sidebar { display:none; }
.dndwiki-shell[data-dndwiki-route-kind="home"] .dndwiki-layout.dndwiki-modern-layout,
.dndwiki-shell[data-dndwiki-route-kind="tag"] .dndwiki-layout.dndwiki-modern-layout {
  grid-template-columns: minmax(13rem, 17rem) minmax(0, 1fr);
}
.dndwiki-page-header {
  margin: 0 0 1.4rem;
  padding: 0 0 1rem;
  border-bottom: 1px solid var(--background-modifier-border);
}
.dndwiki-page-header h1 {
  margin: 0;
  color: var(--h1-color, var(--text-normal));
  font-size: var(--h1-size, 2em);
  font-weight: var(--h1-weight, 700);
  line-height: var(--h1-line-height, 1.2);
}
.dndwiki-page-tags {
  display: flex;
  flex-wrap: wrap;
  gap: .38rem;
  margin-top: .72rem;
}
.dndwiki-tag {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: .18rem .55rem;
  border: 1px solid var(--tag-border, var(--background-modifier-border));
  border-radius: 999px;
  color: var(--tag-fg, var(--tag-color, var(--text-accent)));
  background: var(--tag-bg, var(--tag-background, var(--background-secondary)));
  font-size: .78rem;
  font-weight: 550;
  line-height: 1.2;
  text-decoration: none;
}
.dndwiki-tag:hover { filter: brightness(1.05); text-decoration:none; }
.dndwiki-home, .dndwiki-tag-page {
  width: min(100%, 68rem);
  margin: 0 auto;
  padding: clamp(.25rem, 1vw, 1rem) 0 3rem;
}
.dndwiki-home-hero, .dndwiki-tag-hero {
  padding: clamp(1.3rem, 3vw, 2.2rem);
  border: 1px solid var(--background-modifier-border);
  border-radius: 14px;
  background: linear-gradient(145deg, var(--background-primary-alt), var(--background-primary));
}
.dndwiki-home-kicker, .dndwiki-tag-kicker {
  margin: 0 0 .42rem;
  color: var(--text-muted);
  font-size: .74rem;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
}
.dndwiki-home h1, .dndwiki-tag-page h1 {
  margin: 0;
  font-size: clamp(1.75rem, 4vw, 2.65rem);
  line-height: 1.08;
  letter-spacing: -.025em;
}
.dndwiki-home-intro {
  max-width: 44rem;
  margin: .78rem 0 0;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.6;
}
.dndwiki-home-actions { display:flex; flex-wrap:wrap; gap:.6rem; margin-top:1.15rem; }
.dndwiki-home-search {
  min-height: 40px;
  padding-inline: .9rem;
  background: var(--text-normal);
  color: var(--background-primary);
  border-color: var(--text-normal);
  font-weight: 600;
}
.dndwiki-home-stat {
  display:inline-flex;
  align-items:center;
  min-height:40px;
  padding:.4rem .75rem;
  border:1px solid var(--background-modifier-border);
  border-radius:var(--radius-m);
  color:var(--text-muted);
  background:var(--background-primary);
  font-size:.82rem;
}
.dndwiki-home-section, .dndwiki-tag-section { margin-top: 2rem; }
.dndwiki-home-section-head {
  display:flex;
  align-items:baseline;
  justify-content:space-between;
  gap:1rem;
  margin-bottom:.75rem;
}
.dndwiki-home-section h2 { margin:0; font-size:1rem; }
.dndwiki-home-section-head span { color:var(--text-muted); font-size:.78rem; }
.dndwiki-home-pages, .dndwiki-tag-pages {
  list-style:none;
  margin:0;
  padding:0;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:.55rem;
}
.dndwiki-home-pages a, .dndwiki-tag-pages a {
  display:flex;
  align-items:center;
  min-height:48px;
  padding:.7rem .8rem;
  border:1px solid var(--background-modifier-border);
  border-radius:10px;
  background:var(--background-primary);
  color:var(--text-normal);
  text-decoration:none;
  line-height:1.3;
}
.dndwiki-home-pages a:hover, .dndwiki-tag-pages a:hover {
  border-color:var(--background-modifier-border-hover);
  background:var(--background-modifier-hover);
}
.dndwiki-home-empty { padding:1rem; border:1px dashed var(--background-modifier-border); border-radius:var(--radius-m); color:var(--text-muted); }
.dndwiki-sidebar {
  position: sticky;
  top: 4.5rem;
  display: grid;
  gap: .25rem;
  padding-left: 1rem;
  border-left: 1px solid var(--background-modifier-border);
}
.dndwiki-sidebar .dndwiki-card {
  margin: 0;
  padding: .8rem .2rem;
  border: 0;
  border-bottom: 1px solid var(--background-modifier-border);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.dndwiki-sidebar .dndwiki-card:last-child { border-bottom:0; }
.dndwiki-sidebar .dndwiki-card h2 {
  margin: 0 0 .5rem;
  color: var(--text-muted);
  font-size: .73rem;
  font-weight: 700;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.dndwiki-sidebar .dndwiki-link-list { margin:0; padding:0; list-style:none; display:grid; gap:.18rem; }
.dndwiki-sidebar .dndwiki-link-list a {
  display:block;
  padding:.3rem .35rem;
  border-radius:6px;
  color:var(--text-muted);
  text-decoration:none;
  line-height:1.3;
}
.dndwiki-sidebar .dndwiki-link-list a:hover { color:var(--text-normal); background:var(--background-modifier-hover); }
@media (max-width:1100px) and (min-width:861px) {
  .dndwiki-layout.dndwiki-modern-layout { grid-template-columns:minmax(12rem,15rem) minmax(0,1fr); }
  .dndwiki-layout.dndwiki-modern-layout > .dndwiki-sidebar { position:static; grid-column:2; margin-top:0; border-left:0; padding-left:0; }
}
@media (max-width:860px) {
  .dndwiki-layout.dndwiki-modern-layout,
  .dndwiki-shell[data-dndwiki-route-kind="home"] .dndwiki-layout.dndwiki-modern-layout,
  .dndwiki-shell[data-dndwiki-route-kind="tag"] .dndwiki-layout.dndwiki-modern-layout { grid-template-columns:minmax(0,1fr); }
  .dndwiki-primary-nav { display:none; }
  .dndwiki-mobile-browse {
    display:block;
    margin:0 0 .85rem;
    border:1px solid var(--background-modifier-border);
    border-radius:10px;
    background:var(--background-secondary);
  }
  .dndwiki-mobile-browse summary {
    min-height:44px;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:.75rem;
    padding:.65rem .75rem;
    cursor:pointer;
    font-weight:600;
    list-style:none;
  }
  .dndwiki-mobile-browse summary::-webkit-details-marker { display:none; }
  .dndwiki-mobile-browse summary::after { content:'▾'; color:var(--text-muted); }
  .dndwiki-mobile-browse[open] summary::after { content:'▴'; }
  .dndwiki-mobile-browse-body { max-height:58vh; overflow:auto; padding:0 .45rem .55rem; }
  .dndwiki-mobile-browse .dndwiki-primary-nav-link { min-height:44px; }
  .dndwiki-sidebar { position:static; border-left:0; padding-left:0; }
  .dndwiki-home, .dndwiki-tag-page { padding-top:0; }
  .dndwiki-home-pages, .dndwiki-tag-pages { grid-template-columns:minmax(0,1fr); }
}
@media (max-width:560px) {
  .dndwiki-home-hero, .dndwiki-tag-hero { margin-inline:-.15rem; padding:1.15rem; border-radius:10px; }
  .dndwiki-home-actions { display:grid; grid-template-columns:1fr; }
  .dndwiki-home-search, .dndwiki-home-stat { width:100%; justify-content:center; }
}
`;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function safeColor(value) {
  const color = String(value ?? '').trim();
  return /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|transparent|[a-z]+)$/i.test(color) ? color : '';
}

function parseTagHash(hash) {
  const match = /^#\/tag\/(.+)$/.exec(String(hash ?? ''));
  if (!match) return null;
  try {
    const tag = decodeURIComponent(match[1]).trim().replace(/^#+/, '');
    return tag.length > 0 ? tag : null;
  } catch {
    return null;
  }
}

function tagRoute(tag) {
  return `#/tag/${encodeURIComponent(String(tag ?? '').trim().replace(/^#+/, ''))}`;
}

export function isWikiHomeHash(hash) {
  return parseTagHash(hash) === null && parseWikiRoute(String(hash ?? '')).kind === 'home';
}

export function visiblePageDirectory(snapshot, perspective) {
  if (snapshot == null || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.pages)) return [];
  const pages = [];
  for (const record of snapshot.pages) {
    if (typeof record?.pageId !== 'string') continue;
    let view;
    try { view = pageForRoute(snapshot, perspective, record.pageId); } catch { continue; }
    if (view.status !== 'visible' || typeof view.title !== 'string' || view.title.trim().length === 0 || typeof view.route !== 'string') continue;
    pages.push({ pageId:view.pageId, title:view.title.trim(), route:view.route, tags:view.tags ?? [] });
  }
  return pages.sort((a,b) => a.title.localeCompare(b.title,'en-US',{sensitivity:'base',numeric:true}));
}

function tagDirectory(directory) {
  const tags = new Map();
  for (const page of directory) {
    for (const tag of page.tags ?? []) {
      const key = tag.name.toLocaleLowerCase('en-US');
      const current = tags.get(key) ?? { ...tag, count:0 };
      current.count += 1;
      tags.set(key,current);
    }
  }
  return [...tags.values()].sort((a,b) => a.name.localeCompare(b.name,'en-US',{sensitivity:'base',numeric:true}));
}

function navigationItems(directory,currentPageId,{includeHome=true,homeCurrent=false}={}) {
  const home = includeHome ? `<li><a class="dndwiki-primary-nav-link" href="#/"${homeCurrent?' aria-current="page"':''}>Home</a></li>` : '';
  const pages = directory.map((page)=>`<li><a class="dndwiki-primary-nav-link" href="${escapeHtml(page.route)}"${page.pageId===currentPageId?' aria-current="page"':''}>${escapeHtml(page.title)}</a></li>`).join('');
  return `${home}${pages}`;
}

function tagNavigationItems(tags,currentTag) {
  return tags.map((tag)=>`<li><a class="dndwiki-primary-nav-link" href="${escapeHtml(tagRoute(tag.name))}"${currentTag?.toLocaleLowerCase('en-US')===tag.name.toLocaleLowerCase('en-US')?' aria-current="page"':''}><span>#${escapeHtml(tag.name)}</span></a></li>`).join('');
}

export function renderWikiHomeHtml({ campaignTitle, directory }) {
  const count = directory.length;
  const pages = count===0 ? '<div class="dndwiki-home-empty">Nothing here yet.</div>' : `<ul class="dndwiki-home-pages">${directory.map((page)=>`<li><a href="${escapeHtml(page.route)}">${escapeHtml(page.title)}</a></li>`).join('')}</ul>`;
  return `<section class="dndwiki-home" data-dndwiki-home>
    <div class="dndwiki-home-hero">
      <p class="dndwiki-home-kicker">Campaign wiki</p>
      <h1>${escapeHtml(campaignTitle)}</h1>
      <p class="dndwiki-home-intro">Search the campaign or browse its people, places, events, lore, and other notes.</p>
      <div class="dndwiki-home-actions">
        <button type="button" class="dndwiki-home-search" data-dndwiki-home-search>Search</button>
        <span class="dndwiki-home-stat">${count} page${count===1?'':'s'}</span>
      </div>
    </div>
    <section class="dndwiki-home-section" aria-labelledby="dndwiki-home-pages-heading">
      <div class="dndwiki-home-section-head"><h2 id="dndwiki-home-pages-heading">Browse pages</h2><span>Alphabetical</span></div>
      ${pages}
    </section>
  </section>`;
}

function renderTagPageHtml(tag,directory) {
  const pages = directory.filter((page)=>(page.tags??[]).some((record)=>record.name.toLocaleLowerCase('en-US')===tag.toLocaleLowerCase('en-US')));
  const tagRecord = tagDirectory(directory).find((record)=>record.name.toLocaleLowerCase('en-US')===tag.toLocaleLowerCase('en-US')) ?? {name:tag};
  const pills = renderTagPills([tagRecord]);
  return `<section class="dndwiki-tag-page" data-dndwiki-tag-page>
    <div class="dndwiki-tag-hero"><p class="dndwiki-tag-kicker">Category</p><h1>${escapeHtml(tagRecord.name)}</h1>${pills}</div>
    <section class="dndwiki-tag-section"><ul class="dndwiki-tag-pages">${pages.map((page)=>`<li><a href="${escapeHtml(page.route)}">${escapeHtml(page.title)}</a></li>`).join('')}</ul></section>
  </section>`;
}

function renderTagPills(tags) {
  if (!Array.isArray(tags) || tags.length===0) return '';
  return `<div class="dndwiki-page-tags">${tags.map((tag)=>{
    const fg=safeColor(tag.color); const bg=safeColor(tag.backgroundColor); const border=safeColor(tag.borderColor);
    const style=[fg&&`--tag-fg:${fg}`,bg&&`--tag-bg:${bg}`,border&&`--tag-border:${border}`].filter(Boolean).join(';');
    return `<a class="dndwiki-tag" href="${escapeHtml(tagRoute(tag.name))}"${style?` style="${escapeHtml(style)}"`:''}>#${escapeHtml(tag.name)}</a>`;
  }).join('')}</div>`;
}

function ensureChromeStyles(document) {
  if (document?.getElementById?.(CHROME_STYLE_ID)!=null) return;
  const style=document?.createElement?.('style'); if(style==null)return; style.id=CHROME_STYLE_ID; style.textContent=CHROME_CSS; document.head?.append?.(style);
}

function primaryNavigationHtml(directory,currentPageId,currentTag,routeKind) {
  const tags=tagDirectory(directory);
  return `<nav class="dndwiki-primary-nav" data-dndwiki-primary-nav aria-label="Wiki navigation">
    <section class="dndwiki-primary-nav-section"><ul class="dndwiki-primary-nav-list">${navigationItems([],currentPageId,{includeHome:true,homeCurrent:routeKind==='home'})}</ul></section>
    <section class="dndwiki-primary-nav-section"><p class="dndwiki-primary-nav-heading">Pages</p><ul class="dndwiki-primary-nav-list">${navigationItems(directory,currentPageId,{includeHome:false})}</ul><p class="dndwiki-primary-nav-count">${directory.length} pages</p></section>
    ${tags.length?`<section class="dndwiki-primary-nav-section"><p class="dndwiki-primary-nav-heading">Categories</p><ul class="dndwiki-primary-nav-list">${tagNavigationItems(tags,currentTag)}</ul></section>`:''}
  </nav>`;
}

function mobileNavigationHtml(directory,currentPageId,currentTag,routeKind) {
  const tags=tagDirectory(directory);
  return `<details class="dndwiki-mobile-browse" data-dndwiki-mobile-browse><summary>Browse</summary><div class="dndwiki-mobile-browse-body"><p class="dndwiki-primary-nav-heading">Pages</p><ul class="dndwiki-primary-nav-list">${navigationItems(directory,currentPageId,{includeHome:true,homeCurrent:routeKind==='home'})}</ul>${tags.length?`<p class="dndwiki-primary-nav-heading" style="margin-top:1rem">Categories</p><ul class="dndwiki-primary-nav-list">${tagNavigationItems(tags,currentTag)}</ul>`:''}</div></details>`;
}

function repairTagSearchResults(root,snapshot) {
  for (const link of root.querySelectorAll?.('[data-dndwiki-search-result][data-dndwiki-search-occurrence="null"]') ?? []) {
    const pageId=link.getAttribute('data-dndwiki-search-page');
    const query=(link.getAttribute('data-dndwiki-search-query')??'').trim().toLocaleLowerCase('en-US');
    const page=snapshot.pages?.find((record)=>record.pageId===pageId);
    const tag=(page?.tags??[]).find((record)=>`#${record.name}`.toLocaleLowerCase('en-US').includes(query));
    if(!tag) continue;
    link.setAttribute('data-dndwiki-search-match','title');
    link.removeAttribute('data-dndwiki-search-occurrence');
    link.innerHTML=`<strong>#${escapeHtml(tag.name)}</strong><span>Tag · ${escapeHtml(page.title??'Page')}</span>`;
  }
}

function polishSidebar(shell) {
  const headings=shell?.querySelectorAll?.('.dndwiki-sidebar .dndwiki-card h2')??[];
  for(const heading of headings){
    if(heading.textContent==='Links') heading.textContent='Related';
    else if(heading.textContent==='Backlinks') heading.textContent='Mentioned in';
    else if(heading.textContent==='Access') heading.textContent='Player access';
  }
}

function enhanceWikiChrome({root,browserWindow,snapshot,session}) {
  const shell=root?.querySelector?.('.dndwiki-shell'); const layout=shell?.querySelector?.('.dndwiki-layout'); const main=shell?.querySelector?.('.dndwiki-main');
  if(shell==null||layout==null||main==null)return;
  const tag=parseTagHash(browserWindow.location?.hash??'');
  const parsed=parseWikiRoute(browserWindow.location?.hash??'');
  const routeKind=tag!==null?'tag':parsed.kind;
  const currentPageId=routeKind==='page'?parsed.pageId:null;
  const directory=visiblePageDirectory(snapshot,session.perspective);
  shell.setAttribute('data-dndwiki-route-kind',routeKind);
  layout.classList.add('dndwiki-modern-layout');

  if(layout.querySelector?.('[data-dndwiki-primary-nav]')==null) main.insertAdjacentHTML?.('beforebegin',primaryNavigationHtml(directory,currentPageId,tag,routeKind));
  if(layout.querySelector?.('[data-dndwiki-mobile-browse]')==null) main.insertAdjacentHTML?.('beforebegin',mobileNavigationHtml(directory,currentPageId,tag,routeKind));

  if(routeKind==='home'&&main.querySelector?.('[data-dndwiki-home]')==null){
    main.innerHTML=renderWikiHomeHtml({campaignTitle:snapshot.campaign.title,directory});
    if(browserWindow.document) browserWindow.document.title=snapshot.campaign.title;
    main.querySelector?.('[data-dndwiki-home-search]')?.addEventListener?.('click',()=>root.querySelector?.('[data-dndwiki-search-form] input[name="query"]')?.focus?.());
  } else if(routeKind==='tag'&&main.querySelector?.('[data-dndwiki-tag-page]')==null){
    main.innerHTML=renderTagPageHtml(tag,directory);
    if(browserWindow.document) browserWindow.document.title=`${tag} · ${snapshot.campaign.title}`;
  } else if(routeKind==='page') {
    const model=session.currentModel;
    const article=main.querySelector?.('[data-dndwiki-page]');
    if(article!=null&&main.querySelector?.('[data-dndwiki-page-header]')==null&&model.page?.status==='visible'){
      const title=model.page.title??snapshot.pages?.find((record)=>record.pageId===currentPageId)?.title??'Page';
      article.insertAdjacentHTML?.('beforebegin',`<header class="dndwiki-page-header" data-dndwiki-page-header><h1>${escapeHtml(title)}</h1>${renderTagPills(model.page.tags??[])}</header>`);
    }
  }
  polishSidebar(shell);
  repairTagSearchResults(root,snapshot);
}

export async function mountModernWikiChrome({root,window:browserWindow,fetchImpl=browserWindow?.fetch?.bind(browserWindow),snapshotUrl='./dndwiki.snapshot.json'}={}) {
  if(root==null||browserWindow==null||typeof fetchImpl!=='function') throw new Error('dndwiki reader requires root, window, and fetch.');
  ensureChromeStyles(browserWindow.document);
  const response=await fetchImpl(snapshotUrl,{cache:'no-store'}); if(response==null||response.ok!==true||typeof response.json!=='function') throw new Error('Could not load campaign data.');
  const snapshot=await response.json();
  const shellFetch=async(url,options)=>url===snapshotUrl?{ok:true,json:async()=>structuredClone(snapshot)}:fetchImpl(url,options);
  const mounted=await mountWikiShell({root,window:browserWindow,fetchImpl:shellFetch,snapshotUrl});

  const resetScroll=()=>{ if(typeof browserWindow.scrollTo==='function') browserWindow.scrollTo({top:0,left:0,behavior:'auto'}); };
  browserWindow.addEventListener?.('hashchange',resetScroll,true);
  if(parseWikiRoute(browserWindow.location?.hash??'').kind==='page'&&parseWikiRoute(browserWindow.location?.hash??'').heading==null) resetScroll();

  let enhanceQueued=false;
  const enhance=()=>{ if(enhanceQueued)return; enhanceQueued=true; queueMicrotask(()=>{enhanceQueued=false; enhanceWikiChrome({root,browserWindow,snapshot,session:mounted.session});}); };
  enhance();
  const observer=typeof browserWindow.MutationObserver==='function'?new browserWindow.MutationObserver(enhance):null;
  observer?.observe?.(root,{childList:true,subtree:true});
  return {...mounted,snapshot,destroy(){observer?.disconnect?.();browserWindow.removeEventListener?.('hashchange',resetScroll,true);mounted.destroy?.();}};
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const root=document.getElementById('dndwiki-app');
  try{await mountModernWikiChrome({root,window});}catch(error){console.error('dndwiki failed to start.',error);if(root){root.className='dndwiki-error';root.textContent='This wiki could not be loaded. Reload the page or try again later.';}}
}
