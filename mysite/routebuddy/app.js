const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const demoUsers = [
  // People without vehicle - visible to vehicle owners
  {id:1,name:"Amit Patel",initial:"A",hasVehicle:false,jobStatus:"working",home:"Kalawad Road",job:"Raiya Circle",budget:1800,match:96,nearby:true,time:"9:20 AM"},
  {id:2,name:"Neha Shah",initial:"N",hasVehicle:false,jobStatus:"working",home:"Mota Mava",job:"150 Feet Ring Road",budget:2200,match:91,nearby:true,time:"9:35 AM"},
  {id:3,name:"Kunal Joshi",initial:"K",hasVehicle:false,jobStatus:"looking",home:"Kalawad Road",job:"",budget:1500,match:88,nearby:true,time:"Flexible"},
  {id:4,name:"Riya Mehta",initial:"R",hasVehicle:false,jobStatus:"working",home:"University Road",job:"Raiya Circle",budget:2000,match:82,nearby:false,time:"9:10 AM"},

  // Vehicle owners - visible to users without vehicle
  {id:5,name:"Jay Desai",initial:"J",hasVehicle:true,jobStatus:"working",home:"Kalawad Road",job:"Raiya Circle",vehicle:"Honda Shine",offer:"route",match:95,nearby:true,time:"9:25 AM"},
  {id:6,name:"Pooja Trivedi",initial:"P",hasVehicle:true,jobStatus:"working",home:"Mota Mava",job:"150 Feet Ring Road",vehicle:"Activa 6G",offer:"route",match:90,nearby:true,time:"9:30 AM"},
  {id:7,name:"Vishal Parmar",initial:"V",hasVehicle:true,jobStatus:"looking",home:"Kalawad Road",job:"",vehicle:"Splendor",offer:"pickup",match:92,nearby:true,time:"Flexible"},
  {id:8,name:"Mira Joshi",initial:"M",hasVehicle:true,jobStatus:"looking",home:"University Road",job:"",vehicle:"Baleno",offer:"pickup",match:84,nearby:false,time:"Flexible"}
];

const initialState = {
  hasVehicle:null,
  name:"",
  jobStatus:"working",
  home:"",
  job:"",
  budget:1800,
  offer:"route",
  selected:null
};

let state = {...initialState};
let filter = "all";

function showScreen(name){
  $$(".screen").forEach(s=>s.classList.toggle("active",s.dataset.screen===name));
  $("#resetTopBtn").classList.toggle("hidden",name!=="results");
  window.scrollTo({top:0,behavior:"smooth"});
}

function toast(msg){
  const t=$("#toast"); t.textContent=msg; t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),2000);
}

function setVehicle(hasVehicle){
  state.hasVehicle=hasVehicle;
  updateRouteUI();
  showScreen("name");
  setTimeout(()=>$("#nameInput").focus(),180);
}

function updateRouteUI(){
  const vehicle=state.hasVehicle===true;
  $("#budgetBlock").classList.toggle("hidden",vehicle);
  $("#vehicleOfferBlock").classList.toggle("hidden",!vehicle);

  if(vehicle){
    $("#routeTitle").textContent="What's your daily plan?";
    $("#routeSub").textContent="Tell us your starting area and whether you already have a job.";
  }else{
    $("#routeTitle").textContent="Where do you need to travel?";
    $("#routeSub").textContent="We'll show vehicle owners who travel on the same route or can provide daily pickup/drop.";
  }
  updateJobUI();
}

function updateJobUI(){
  const looking=state.jobStatus==="looking";
  $("#jobLocationField").classList.toggle("hidden",looking);
  $("#lookingInfo").classList.toggle("hidden",!looking);

  if(state.hasVehicle){
    // If vehicle + looking for job, pickup/drop should be the default intent.
    if(looking){
      state.offer="pickup";
      $$("[data-offer]").forEach(b=>b.classList.toggle("active",b.dataset.offer==="pickup"));
    }
  }
}

function validateName(){
  const name=$("#nameInput").value.trim();
  if(!name){toast("Please enter your name");return;}
  state.name=name;
  showScreen("route");
}

function validateRoute(){
  state.home=$("#homeInput").value.trim();
  state.job=$("#jobInput").value.trim();
  state.budget=Number($("#budgetInput").value)||0;

  if(!state.home){toast("Please enter your home / starting area");return;}
  if(state.jobStatus==="working" && !state.job){
    toast("Please enter your office / job location");return;
  }
  if(!state.hasVehicle && state.budget<=0){
    toast("Please enter a monthly budget");return;
  }

  renderResults();
  showScreen("results");
}

function getMatches(){
  // Main rule:
  // vehicle owner -> sees users without vehicle
  // no vehicle -> sees vehicle owners
  let list=demoUsers.filter(u=>u.hasVehicle !== state.hasVehicle);

  if(filter==="best") list=list.filter(u=>u.match>=90);
  if(filter==="nearby") list=list.filter(u=>u.nearby);

  // Prioritize nearby + matching routes / flexible pickup providers.
  return list.sort((a,b)=>{
    const aPickup=a.hasVehicle && a.jobStatus==="looking" && a.offer==="pickup";
    const bPickup=b.hasVehicle && b.jobStatus==="looking" && b.offer==="pickup";
    const aSameHome=a.home.toLowerCase().includes(state.home.toLowerCase()) || state.home.toLowerCase().includes(a.home.toLowerCase());
    const bSameHome=b.home.toLowerCase().includes(state.home.toLowerCase()) || state.home.toLowerCase().includes(b.home.toLowerCase());
    const aScore=(aSameHome?20:0)+(a.nearby?10:0)+(aPickup?8:0)+a.match;
    const bScore=(bSameHome?20:0)+(b.nearby?10:0)+(bPickup?8:0)+b.match;
    return bScore-aScore;
  });
}

function renderResults(){
  const vehicle=state.hasVehicle;

  if(vehicle){
    $("#resultHeading").textContent="People who need a ride";
    $("#resultSub").textContent=state.jobStatus==="looking"
      ? "You have a vehicle and are looking for work. These nearby users may need regular daily pickup/drop."
      : "These users don't have a vehicle and need to travel on a similar daily route.";
  }else{
    $("#resultHeading").textContent="Vehicle owners near you";
    $("#resultSub").textContent="See office-going vehicle owners and people with vehicles who are available for daily pickup/drop.";
  }

  const jobText=state.jobStatus==="working" ? `Working · ${state.job}` : "Looking for job";
  const roleText=vehicle ? "🚘 Has vehicle" : "🎒 Needs ride";
  const priceText=!vehicle ? `Can pay ₹${state.budget.toLocaleString("en-IN")}/month` : (state.jobStatus==="looking" ? "Available for pickup/drop" : "Can share office route");

  $("#mySummary").innerHTML=`
    <div class="summary-top">
      <strong>${escapeHtml(state.name)}</strong>
      <span>${roleText}</span>
    </div>
    <div class="summary-route"><b>${escapeHtml(state.home)}</b>${state.jobStatus==="working" ? ` → <b>${escapeHtml(state.job)}</b>` : ""}</div>
    <div class="summary-bottom">
      <span>${jobText}</span>
      <span>${priceText}</span>
    </div>`;

  const list=getMatches();
  $("#matchList").innerHTML=list.length ? list.map(matchCard).join("") : `
    <div class="empty">
      <div>🧭</div>
      <strong>No matching users yet</strong>
      <p>Try another area or switch the filter.</p>
    </div>`;

  $$("[data-user]").forEach(b=>b.onclick=()=>openDetail(Number(b.dataset.user)));
}

function matchCard(u){
  const isVehicle=u.hasVehicle;
  const mainMeta=isVehicle
    ? (u.jobStatus==="working" ? `${u.vehicle} · Office-going` : `${u.vehicle} · Available pickup/drop`)
    : (u.jobStatus==="working" ? "Needs daily office ride" : "Looking for job · Needs transport");

  const route=u.jobStatus==="working"
    ? `<b>${escapeHtml(u.home)}</b> → <b>${escapeHtml(u.job)}</b>`
    : `<b>${escapeHtml(u.home)}</b> · Destination flexible`;

  let tags=[];
  tags.push(`<span class="tag">${u.time}</span>`);
  if(u.hasVehicle && u.jobStatus==="looking") tags.push(`<span class="tag job">Daily pickup/drop available</span>`);
  if(!u.hasVehicle) tags.push(`<span class="tag price">Can pay ₹${u.budget.toLocaleString("en-IN")}/mo</span>`);
  if(u.hasVehicle && u.jobStatus==="working") tags.push(`<span class="tag">${u.vehicle}</span>`);

  return `
    <button class="match-card" data-user="${u.id}">
      <div class="match-head">
        <div class="avatar">${u.initial}</div>
        <div class="match-main">
          <strong>${u.name}</strong>
          <small>${mainMeta}</small>
        </div>
        <div class="match-score">
          <strong>${u.match}%</strong>
          <small>match</small>
        </div>
      </div>
      <div class="match-route">${route}</div>
      <div class="tags">${tags.join("")}</div>
    </button>`;
}

function openDetail(id){
  const u=demoUsers.find(x=>x.id===id);
  if(!u)return;
  state.selected=id;

  $("#detailAvatar").textContent=u.initial;
  $("#detailName").textContent=u.name;
  $("#detailFrom").textContent=u.home;

  const working=u.jobStatus==="working";
  $("#detailToWrap").classList.toggle("hidden",!working);
  $("#detailTo").textContent=u.job || "";

  if(u.hasVehicle){
    $("#detailBadge").textContent=u.jobStatus==="working" ? "Vehicle owner · Office-going" : "Vehicle owner · Job seeker";
    $("#detailMeta").textContent=u.jobStatus==="working"
      ? `${u.vehicle} · Can share daily route`
      : `${u.vehicle} · Available for daily pickup/drop`;

    $("#detailPriceCard").classList.add("hidden");
    $("#requestBtn").textContent=u.jobStatus==="working" ? "Ask for a ride" : "Request daily pickup/drop";
  }else{
    $("#detailBadge").textContent=u.jobStatus==="working" ? "Ride seeker" : "Ride seeker · Job seeker";
    $("#detailMeta").textContent=u.jobStatus==="working" ? "Needs regular office commute" : "Needs transport from home area";
    $("#detailPriceCard").classList.remove("hidden");
    $("#detailPrice").textContent=`₹${u.budget.toLocaleString("en-IN")} / month`;
    $("#detailPriceHint").textContent="This user is ready to pay approximately this amount every month.";
    $("#requestBtn").textContent="Offer a ride";
  }

  $("#detailModal").classList.remove("hidden");
}

function openRequest(){
  const u=demoUsers.find(x=>x.id===state.selected);
  if(!u)return;
  $("#detailModal").classList.add("hidden");

  $("#requestTitle").textContent=u.hasVehicle ? `Connect with ${u.name}` : `Offer ride to ${u.name}`;
  $("#pickupInput").value=u.home;
  $("#dropField").classList.toggle("hidden",u.jobStatus!=="working");
  $("#dropInput").value=u.job || "";

  if(u.hasVehicle){
    $("#messageInput").value=u.jobStatus==="working"
      ? `Hi ${u.name}, I also travel from ${state.home}${state.job ? " to "+state.job : ""}. Can we discuss a regular ride?`
      : `Hi ${u.name}, I need regular pickup/drop from ${state.home}. Can we discuss timing and monthly amount?`;
  }else{
    $("#messageInput").value=`Hi ${u.name}, I have a vehicle and can help with your daily route. We can discuss pickup point, timing and monthly amount.`;
  }

  $("#requestModal").classList.remove("hidden");
}

function escapeHtml(str){
  return String(str||"").replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[s]));
}

function resetAll(){
  state={...initialState};
  filter="all";
  $("#nameInput").value="";
  $("#homeInput").value="";
  $("#jobInput").value="";
  $("#budgetInput").value="1800";
  $$(".segment").forEach(b=>b.classList.toggle("active",b.dataset.job==="working"));
  $$(".filter-chip").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));
  showScreen("vehicle");
}

function init(){
  $$("[data-vehicle]").forEach(b=>b.onclick=()=>setVehicle(b.dataset.vehicle==="yes"));

  $("#nameNextBtn").onclick=validateName;
  $("#nameInput").addEventListener("keydown",e=>{if(e.key==="Enter") validateName();});

  $$("[data-back]").forEach(b=>b.onclick=()=>showScreen(b.dataset.back));

  $$("[data-job]").forEach(b=>b.onclick=()=>{
    state.jobStatus=b.dataset.job;
    $$("[data-job]").forEach(x=>x.classList.toggle("active",x===b));
    updateJobUI();
  });

  $$("[data-offer]").forEach(b=>b.onclick=()=>{
    state.offer=b.dataset.offer;
    $$("[data-offer]").forEach(x=>x.classList.toggle("active",x===b));
  });

  $$("[data-budget]").forEach(b=>b.onclick=()=>{
    $("#budgetInput").value=b.dataset.budget;
    $$(".quick-prices button").forEach(x=>x.classList.toggle("active",x===b));
  });

  $("#routeNextBtn").onclick=validateRoute;

  $$(".filter-chip").forEach(b=>b.onclick=()=>{
    filter=b.dataset.filter;
    $$(".filter-chip").forEach(x=>x.classList.toggle("active",x===b));
    renderResults();
  });

  $("#editBtn").onclick=()=>showScreen("route");
  $("#resetTopBtn").onclick=resetAll;

  $$("[data-close]").forEach(b=>b.onclick=()=>$("#"+b.dataset.close).classList.add("hidden"));
  $$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden")}));

  $("#requestBtn").onclick=openRequest;
  $("#confirmRequestBtn").onclick=()=>{
    $("#requestModal").classList.add("hidden");
    toast("Request sent successfully");
  };
}

init();
