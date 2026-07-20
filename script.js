const categories=["首页","科技","财经","国际","AI","商业"];
const articles=[
 {id:"chip",tag:"科技",title:"先进制程竞争进入关键窗口",summary:"设备、材料与人才正在成为下一轮半导体竞争的共同变量。",source:"科技前线",time:"18 分钟前",visual:""},
 {id:"rates",tag:"财经",title:"全球市场在利率信号中重新定价",summary:"资金正在成长与防御资产之间快速切换，波动率短期仍将维持高位。",source:"市场观察",time:"31 分钟前",visual:"market"},
 {id:"agent",tag:"AI",title:"AI 应用从效率工具走向决策系统",summary:"企业级智能体开始进入核心业务流程，可靠性成为规模化落地的门槛。",source:"AI 内参",time:"45 分钟前",visual:"ai"},
 {id:"supply",tag:"商业",title:"供应链重构，制造业寻找新平衡",summary:"区域化、自动化与库存策略共同重塑全球生产网络。",source:"商业周刊",time:"1 小时前",visual:"business"},
 {id:"energy",tag:"国际",title:"能源转型投资迈入基础设施阶段",summary:"电网、储能与充电网络成为各国绿色投资的新重点。",source:"环球视野",time:"1 小时前",visual:"world"},
 {id:"memory",tag:"科技",title:"存储周期回暖，扩产节奏仍然克制",summary:"高带宽存储需求强劲，厂商更关注产品结构而非单纯追求产能。",source:"芯片产业报",time:"2 小时前",visual:""},
 {id:"consumer",tag:"商业",title:"消费品牌重新争夺线下体验",summary:"旗舰门店和社区店同时升温，渠道效率成为增长分水岭。",source:"品牌研究所",time:"2 小时前",visual:"business"},
 {id:"trade",tag:"国际",title:"区域贸易网络迎来新一轮调整",summary:"产业政策与物流成本共同改变企业的全球布局选择。",source:"国际参考",time:"3 小时前",visual:"world"}
];
const signals=[["2 分钟前","科技","先进制程扩产计划获批","重要"],["7 分钟前","财经","美联储官员：通胀风险仍需警惕","关注"],["15 分钟前","国际","欧盟通过新一轮数字治理方案","更新"],["28 分钟前","商业","头部车企上半年盈利显著改善","更新"]];
const markets=[["纳斯达克综合指数","20,412.52","+1.35%",false],["上证指数","3,582.30","+0.68%",false],["美元指数 (DXY)","97.82","−0.42%",true],["WTI 原油 (USD)","76.48","+1.12%",false],["黄金 (USD/oz)","2,401.30","+0.63%",false]];
let active="首页",query="",expanded=false;const saved=new Set();
const $=id=>document.getElementById(id);
function navButtons(target){target.innerHTML=categories.map(c=>`<button data-category="${c}" class="${c===active?'active':''}">${c}</button>`).join("");target.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{active=b.dataset.category;expanded=false;renderNavs();renderNews();if(target.id==='main-nav'&&active!=="首页")$('news').scrollIntoView({behavior:'smooth'});}));}
function renderNavs(){navButtons($("main-nav"));navButtons($("filter-nav"));}
function filtered(){const q=query.trim().toLowerCase();return articles.filter(a=>(active==="首页"||a.tag===active)&&(!q||`${a.title}${a.summary}${a.tag}`.toLowerCase().includes(q)));}
function renderNews(){const all=filtered(),list=expanded?all:all.slice(0,4);$("section-title").textContent=active==="首页"?"把重要新闻，放在同一条信息流里":`${active} · 最新资讯`;$("result-count").textContent=`${all.length} 条结果`;$("news-grid").innerHTML=list.map(a=>`<article class="card"><div class="visual ${a.visual}"><span>${a.tag}</span></div><div class="card-body"><div class="meta"><span>${a.source}</span><time>${a.time}</time></div><h3>${a.title}</h3><p>${a.summary}</p><div class="card-actions"><button class="read">阅读全文 ↗</button><button class="save ${saved.has(a.id)?'saved':''}" data-save="${a.id}">${saved.has(a.id)?'已收藏':'收藏'}</button></div></div></article>`).join("");$("empty").hidden=all.length>0;$("load-more").hidden=expanded||all.length<=4;$("news-grid").querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>{saved.has(b.dataset.save)?saved.delete(b.dataset.save):saved.add(b.dataset.save);renderNews();}));}
$("signals").innerHTML=signals.map(s=>`<div class="signal-row"><time>${s[0]}</time><em>${s[1]}</em><strong>${s[2]}</strong><mark>${s[3]}</mark></div>`).join("");
$("markets").innerHTML=markets.map((m,n)=>`<div class="market-row ${m[3]?'down':''}"><span>${m[0]}</span><strong>${m[1]}</strong><span class="spark">${[26,48,37,69,54,82,71,94].map(h=>`<i style="--h:${Math.max(12,h-n*3)}%"></i>`).join('')}</span><b>${m[2]}</b></div>`).join("");
$("search-toggle").addEventListener("click",()=>{const p=$("search-panel"),opening=p.hidden;p.hidden=!opening;$("search-toggle").setAttribute("aria-expanded",String(opening));if(opening)$("search-input").focus();});
$("search-close").addEventListener("click",()=>{$("search-panel").hidden=true;$("search-toggle").setAttribute("aria-expanded","false");});
$("search-input").addEventListener("input",e=>{query=e.target.value;expanded=false;renderNews();});
$("load-more").addEventListener("click",()=>{expanded=true;renderNews();});
$("reset-filter").addEventListener("click",()=>{active="首页";query="";$("search-input").value="";renderNavs();renderNews();});
$("subscribe-form").addEventListener("submit",e=>{e.preventDefault();$("subscribe-note").textContent="订阅已记录（演示模式，暂未接入邮件服务）。";e.target.reset();});
renderNavs();renderNews();
