import { pageForRoute } from './navigation.mjs';
import { mountNoteLinkPreviews } from './note-link-previews.mjs';
import { mountMapsmithReader } from './mapsmith-reader.mjs';
import './reader-ui-contracts.mjs';
import { mountCommissionedReader } from './commissioned-reader.mjs';
import { mountWikiShell, parseWikiRoute } from './wiki-shell.mjs';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function safeColor(value) {
  const color = String(value ?? '').trim();
  if (color.length === 0 || color.length > 256 || /[;{}<>"']/.test(color)) return '';

  const css = globalThis.CSS;
  if (typeof css?.supports === 'function') {
    return css.supports('color', color) ? color : '';
  }

  return /^(?:#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|(?:ok)?lch\([^)]*\)|(?:ok)?lab\([^)]*\)|color\([^)]*\)|transparent|[a-z]+)$/i.test(color) ? color : '';
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

function tagStyle(tag) {
  const fg=safeColor(tag?.color); const bg=safeColor(tag?.backgroundColor); const border=safeColor(tag?.borderColor);
  return [fg&&`--tag-fg:${fg}`,bg&&`--tag-bg:${bg}`,border&&`--tag-border:${border}`].filter(Boolean).join(';');
}

function tagNavigationStyle(tag) {
  const accent=safeColor(tag?.backgroundColor)||safeColor(tag?.borderColor)||safeColor(tag?.color);
  return accent ? `--tag-nav-color:${accent}` : '';
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
  return tags.map((tag)=>{
    const style=tagNavigationStyle(tag);
    return `<li><a class="dndwiki-primary-nav-link dndwiki-primary-nav-tag-link" href="${escapeHtml(tagRoute(tag.name))}"${currentTag?.toLocaleLowerCase('en-US')===tag.name.toLocaleLowerCase('en-US')?' aria-current="page"':''}><span class="dndwiki-primary-nav-tag-name"><span class="dndwiki-primary-nav-tag-dot"${style?` style="${escapeHtml(style)}"`:''}></span><span>#${escapeHtml(tag.name)}</span></span><span class="dndwiki-primary-nav-badge">${tag.count}</span></a></li>`;
  }).join('');
}

export function renderWikiHomeHtml({ campaignTitle, directory }) {
  const count = directory.length;
  const tags = tagDirectory(directory);
  const categories = tags.length===0 ? '' : `<section class="dndwiki-home-section" aria-labelledby="dndwiki-home-categories-heading"><div class="dndwiki-home-section-head"><h2 id="dndwiki-home-categories-heading">Browse categories</h2><span>${tags.length} categor${tags.length===1?'y':'ies'}</span></div><ul class="dndwiki-home-categories">${tags.map((tag)=>{const style=tagStyle(tag);return `<li><a class="dndwiki-home-category" href="${escapeHtml(tagRoute(tag.name))}"${style?` style="${escapeHtml(style)}"`:''}><span>#${escapeHtml(tag.name)}</span><span class="dndwiki-home-category-count">${tag.count}</span></a></li>`;}).join('')}</ul></section>`;
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
    ${categories}
    <section class="dndwiki-home-section" aria-labelledby="dndwiki-home-pages-heading">
      <div class="dndwiki-home-section-head"><h2 id="dndwiki-home-pages-heading">All pages</h2><span>Alphabetical</span></div>
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
    const style=tagStyle(tag);
    return `<a class="dndwiki-tag" href="${escapeHtml(tagRoute(tag.name))}"${style?` style="${escapeHtml(style)}"`:''}>#${escapeHtml(tag.name)}</a>`;
  }).join('')}</div>`;
}

export function primaryNavigationHtml(directory,currentPageId,currentTag,routeKind) {
  const tags=tagDirectory(directory);
  const pagesOpen=routeKind==='page'?' open':'';
  return `<nav class="dndwiki-primary-nav" data-dndwiki-primary-nav aria-label="Wiki navigation">
    <section class="dndwiki-primary-nav-section"><ul class="dndwiki-primary-nav-list">${navigationItems([],currentPageId,{includeHome:true,homeCurrent:routeKind==='home'})}</ul></section>
    ${tags.length?`<section class="dndwiki-primary-nav-section"><p class="dndwiki-primary-nav-heading">Categories</p><ul class="dndwiki-primary-nav-list">${tagNavigationItems(tags,currentTag)}</ul></section>`:''}
    <details class="dndwiki-primary-nav-details"${pagesOpen}><summary><span>All pages</span><span class="dndwiki-primary-nav-badge">${directory.length}</span></summary><ul class="dndwiki-primary-nav-list">${navigationItems(directory,currentPageId,{includeHome:false})}</ul></details>
  </nav>`;
}

function mobileNavigationHtml(directory,currentPageId,currentTag,routeKind) {
  const tags=tagDirectory(directory);
  const pagesOpen=routeKind==='page'?' open':'';
  return `<details class="dndwiki-mobile-browse" data-dndwiki-mobile-browse><summary>Browse</summary><div class="dndwiki-mobile-browse-body"><ul class="dndwiki-primary-nav-list">${navigationItems([],currentPageId,{includeHome:true,homeCurrent:routeKind==='home'})}</ul>${tags.length?`<p class="dndwiki-primary-nav-heading" style="margin-top:1rem">Categories</p><ul class="dndwiki-primary-nav-list">${tagNavigationItems(tags,currentTag)}</ul>`:''}<details class="dndwiki-primary-nav-details"${pagesOpen}><summary><span>All pages</span><span class="dndwiki-primary-nav-badge">${directory.length}</span></summary><ul class="dndwiki-primary-nav-list">${navigationItems(directory,currentPageId,{includeHome:false})}</ul></details></div></details>`;
}

function polishSidebar(shell) {
  const headings=shell?.querySelectorAll?.('.dndwiki-sidebar .dndwiki-card h2')??[];
  for(const heading of headings){
    if(heading.textContent==='Links') heading.textContent='Related';
    else if(heading.textContent==='Backlinks') heading.textContent='Mentioned in';
    else if(heading.textContent==='Access') heading.textContent='Player access';
  }
}

export async function mountModernWikiChrome({root,window:browserWindow,fetchImpl=browserWindow?.fetch?.bind(browserWindow),snapshotUrl='./dndwiki.snapshot.json'}={}) {
  if(root==null||browserWindow==null||typeof fetchImpl!=='function') throw new Error('dndwiki reader requires root, window, and fetch.');
  const response=await fetchImpl(snapshotUrl,{cache:'no-store'}); if(response==null||response.ok!==true||typeof response.json!=='function') throw new Error('Could not load campaign data.');
  const snapshot=await response.json();
  const shellFetch=async(url,options)=>url===snapshotUrl?{ok:true,json:async()=>structuredClone(snapshot)}:fetchImpl(url,options);
  const mounted=await mountWikiShell({root,window:browserWindow,fetchImpl:shellFetch,snapshotUrl});
  const previews=mountNoteLinkPreviews({root,window:browserWindow,snapshot,session:mounted.session});
  const maps=mountMapsmithReader({root,window:browserWindow,snapshot,session:mounted.session,notePreviews:previews});

  const resetScroll=()=>{ if(typeof browserWindow.scrollTo==='function') browserWindow.scrollTo({top:0,left:0,behavior:'auto'}); };
  browserWindow.addEventListener?.('hashchange',resetScroll,true);
  if(parseWikiRoute(browserWindow.location?.hash??'').kind==='page'&&parseWikiRoute(browserWindow.location?.hash??'').heading==null) resetScroll();

  const reader=mountCommissionedReader({root,window:browserWindow,snapshot,mounted});
  return {...mounted,snapshot,reader,destroy(){reader.destroy();maps.destroy();previews.destroy();browserWindow.removeEventListener?.('hashchange',resetScroll,true);mounted.destroy?.();}};
}

if(typeof document!=='undefined'&&typeof window!=='undefined'){
  const root=document.getElementById('dndwiki-app');
  try{await mountModernWikiChrome({root,window});}catch(error){console.error('dndwiki failed to start.',error);if(root){root.className='dndwiki-error';root.textContent='This wiki could not be loaded. Reload the page or try again later.';}}
}
