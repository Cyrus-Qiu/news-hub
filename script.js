const categories=["首页","国内","国际","科技","财经","AI","商业"];
const fallbackArticles=[
 {id:"welcome",category:"科技",title:"新闻数据正在首次更新",summary:"GitHub Actions 将从已配置的官方 RSS 来源抓取最新报道，通常几分钟内完成。",source:"讯息流",publishedAt:null,url:"https://github.com/Cyrus-Qiu/news-hub/actions"}
];
const signals=[["自动更新","系统","RSS 新闻源每 30 分钟同步一次","运行中"],["官方来源","国内","人民网、中国新闻网","已接入"],["国际来源","国际","BBC 中文、The Guardian","已接入"]];
const markets=[["纳斯达克综合指数","—","待接入",false],["上证指数","—","待接入",false],["美元指数 (DXY)","—","待接入",false],["WTI 原油 (USD)","—","待接入",false],["黄金 (USD/oz)","—","待接入",false]];
let articles=fallbackArticles,active="首页",query="",expanded=false;const saved=new Set();
const $=id=>document.getElementById(id);
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function safeUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url.href:'#';}catch{return '#';}}

function timeAgo(value){
 if(!value)return "刚刚";const d=new Date(value),seconds=Math.floor((Date.now()-d)/1000);
 if(!Number.isFinite(seconds)||seconds<60)return "刚刚";
 if(seconds<3600)return `${Math.floor(seconds/60)} 分钟前`;
 if(seconds<86400)return `${Math.floor(seconds/3600)} 小时前`;
 if(seconds<604800)return `${Math.floor(seconds/86400)} 天前`;
 return d.toLocaleDateString("zh-CN");
}
function tagOf(a){return a.category||a.tag||"综合";}
function updateHero(){
 const article=articles[0];if(!article)return;
 const title=$("hero-title"),summary=$("hero-summary"),byline=$("hero-byline"),link=$("hero-link");
 if(title)title.textContent=article.title;
 if(summary)summary.textContent=article.summary||"点击查看原始媒体的完整报道。";
 if(byline)byline.textContent=`${article.source} · ${timeAgo(article.publishedAt)}`;
 if(link){link.href=safeUrl(article.url);link.target="_blank";link.rel="noopener noreferrer";}
}
function navButtons(target){target.innerHTML=categories.map(c=>`<button data-category="${c}" class="${c===active?'active':''}">${c}</button>`).join("");target.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{active=b.dataset.category;expanded=false;renderNavs();renderNews();if(target.id==='main-nav'&&active!=="首页")$('news').scrollIntoView({behavior:'smooth'});}));}
function renderNavs(){navButtons($("main-nav"));navButtons($("filter-nav"));}
function filtered(){const q=query.trim().toLowerCase();return articles.filter(a=>(active==="首页"||tagOf(a)===active)&&(!q||`${a.title}${a.summary||''}${tagOf(a)}${a.source}`.toLowerCase().includes(q)));}
function renderNews(){const all=filtered(),list=expanded?all:all.slice(0,12);$("section-title").textContent=active==="首页"?"把重要新闻，放在同一条信息流里":`${active} · 最新资讯`;$("result-count").textContent=`${all.length} 条结果`;$("news-grid").innerHTML=list.map(a=>{const id=escapeHtml(a.id),tag=escapeHtml(tagOf(a)),source=escapeHtml(a.source),title=escapeHtml(a.title),summary=escapeHtml(a.summary||'点击阅读全文，查看原始媒体报道。'),url=escapeHtml(safeUrl(a.url));return `<article class="card"><div class="visual ${tagOf(a)==='科技'?'ai':tagOf(a)==='国际'?'world':tagOf(a)==='财经'?'market':'business'}"><span>${tag}</span></div><div class="card-body"><div class="meta"><span>${source}</span><time>${escapeHtml(timeAgo(a.publishedAt))}</time></div><h3>${title}</h3><p>${summary}</p><div class="card-actions"><a class="read" href="${url}" target="_blank" rel="noopener noreferrer">阅读全文 ↗</a><button class="save ${saved.has(a.id)?'saved':''}" data-save="${id}">${saved.has(a.id)?'已收藏':'收藏'}</button></div></div></article>`;}).join("");$("empty").hidden=all.length>0;$("load-more").hidden=expanded||all.length<=12;$("news-grid").querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>{saved.has(b.dataset.save)?saved.delete(b.dataset.save):saved.add(b.dataset.save);renderNews();}));}
async function loadNews(){
 try{const response=await fetch(`data/news.json?v=${Date.now()}`,{cache:"no-store"});if(!response.ok)throw new Error(response.status);const data=await response.json();if(data.articles?.length)articles=data.articles;const stamp=data.updatedAt?new Date(data.updatedAt).toLocaleString("zh-CN",{hour12:false}):"等待首次更新";const el=document.querySelector(".data-time");if(el)el.textContent=`新闻更新：${stamp} · ${data.sources?.length||0} 个来源`;}
 catch(error){console.warn("暂时无法读取新闻数据，显示备用内容",error);}
 updateHero();renderNews();
}
$("signals").innerHTML=signals.map(s=>`<div class="signal-row"><time>${s[0]}</time><em>${s[1]}</em><strong>${s[2]}</strong><mark>${s[3]}</mark></div>`).join("");
$("markets").innerHTML=markets.map(m=>`<div class="market-row"><span>${m[0]}</span><strong>${m[1]}</strong><span class="spark"></span><b>${m[2]}</b></div>`).join("");
$("search-toggle").addEventListener("click",()=>{const p=$("search-panel"),opening=p.hidden;p.hidden=!opening;$("search-toggle").setAttribute("aria-expanded",String(opening));if(opening)$("search-input").focus();});
$("search-close").addEventListener("click",()=>{$("search-panel").hidden=true;$("search-toggle").setAttribute("aria-expanded","false");});
$("search-input").addEventListener("input",e=>{query=e.target.value;expanded=false;renderNews();});
$("load-more").addEventListener("click",()=>{expanded=true;renderNews();});
$("reset-filter").addEventListener("click",()=>{active="首页";query="";$("search-input").value="";renderNavs();renderNews();});
$("subscribe-form").addEventListener("submit",e=>{e.preventDefault();$("subscribe-note").textContent="订阅已记录（演示模式，暂未接入邮件服务）。";e.target.reset();});
renderNavs();renderNews();loadNews();
