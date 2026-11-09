function createDayNightSwitch(container, { dark = false, onChange = () => {}, size = 52 } = {}) {
  const root = container.shadowRoot || container.attachShadow({mode:'open'});
  root.innerHTML = `<style>
:host{display:inline-flex;width:${size}px;height:${size*100/196}px;flex:none;vertical-align:middle;-webkit-app-region:no-drag}
*{box-sizing:border-box}button{appearance:none;position:relative;width:196px;height:100px;flex:none;border:0;padding:0;border-radius:31px;cursor:pointer;transform:scale(${size/196});transform-origin:top left;background:linear-gradient(145deg,#e4e3dd,#faf9f3);box-shadow:inset 1px 2px 4px #0002,0 2px 5px #0001,inset 0 -1px 1px #fff7;transition:background .65s,box-shadow .65s;color:#383733}
button:focus-visible{outline:4px solid #987ae0;outline-offset:7px}button[aria-checked=true]{background:linear-gradient(145deg,#090b0f,#181a20);box-shadow:inset 1px 2px 4px #0008,0 2px 5px #0002;color:#fbfaff}
.thumb{position:absolute;left:8px;top:8px;width:84px;height:84px;border-radius:24px;transform:translateX(96px);background:linear-gradient(135deg,#fffffa,#e9e6da);box-shadow:0 3px 6px #0003,inset 1px 1px 2px #fff;transition:background .65s,box-shadow .65s;will-change:transform;z-index:2}
[aria-checked=true] .thumb{background:linear-gradient(135deg,#474950,#202129);box-shadow:0 4px 8px #0009,inset 1px 1px 2px #fff5}
button{isolation:isolate;touch-action:none;--reflection:rgba(255,193,54,.1)}
button[aria-checked=true]{--reflection:rgba(157,149,255,.12)}
button::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(180deg,var(--topspill,transparent),transparent 35%,transparent 65%,var(--bottomspill,transparent));box-shadow:inset 0 1px 2px var(--topspill,transparent),inset 0 -1px 2px var(--bottomspill,transparent)}
.thumb::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 8px 18px var(--topglow,transparent),inset 0 -8px 18px var(--bottomglow,transparent);background:linear-gradient(180deg,var(--topglow,transparent),transparent 46%,var(--bottomglow,transparent));mix-blend-mode:screen}
.bounce{position:absolute;inset:-2px;width:calc(100% + 4px);height:88px;overflow:visible;pointer-events:none;filter:blur(5px);opacity:.36;transition:opacity .2s;z-index:1}.bounce path{fill:none;stroke:var(--light-color,#ffca4a);stroke-width:8;stroke-linecap:round;stroke-dasharray:40 60;transition:stroke .65s}[aria-checked=true] .bounce path{stroke:var(--light-color,#b9b2ff)}
canvas{position:absolute;top:0;left:50%;transform:translateX(-50%);width:84px;height:84px}.edge{position:absolute;inset:-2px;width:calc(100% + 4px);height:88px;overflow:visible;pointer-events:none}.edge path{fill:none;stroke:var(--core-color,#ffdf74);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:40 60;filter:drop-shadow(0 0 2px var(--light-color,#ffb700)) drop-shadow(0 0 5px var(--light-color,#ffba00))}[aria-checked=true] .edge path{stroke:var(--core-color,#efedff)}
button:hover .bounce,button:focus-visible .bounce{opacity:.75}button::before{content:"";position:absolute;inset:-12px;border-radius:inherit;background:transparent}
@keyframes orbit{to{stroke-dashoffset:-100}}button:active .thumb{filter:brightness(1.06)}.paused .edge path{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){*{transition:none!important}.edge path{animation:none}}
</style><button type="button" role="switch"><div class="thumb"><svg class="bounce" viewBox="0 0 88 88" preserveAspectRatio="none" aria-hidden="true"><path d="M44 3H61Q85 3 85 27V61Q85 85 61 85H27Q3 85 3 61V27Q3 3 27 3Z" pathLength="100"/></svg><canvas width="168" height="168" aria-hidden="true"></canvas><svg class="edge" preserveAspectRatio="none" viewBox="0 0 88 88" aria-hidden="true"><path d="M44 3H61Q85 3 85 27V61Q85 85 61 85H27Q3 85 3 61V27Q3 3 27 3Z" pathLength="100"/></svg></div></button>`;
  const button=root.querySelector('button'),canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let current=dark?1:0,from=current,to=current,start=0,frame=0,disposed=false;
  const thumb=root.querySelector('.thumb'),edge=root.querySelector('.edge path');
  let x=dark?0:96,last=0;
  let left=x,right=x+84,vl=0,vr=0,direction=0,drag=null,dragTarget=x,suppressClick=false;
  // 描边流光只沿顺时针走：wanted 由滑块的移动方向决定，shown 按速率追过去，永不回退。
  let lightNight=null,lightForward=!dark,lightShown=null;
  const bounce=root.querySelector('.bounce path');
  let seed=1921;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  function shape(night){const pts=[];for(let y=-25;y<=25;y+=2.25)for(let x=-25;x<=25;x+=2.25){const r=Math.hypot(x,y);let inside=night?Math.hypot(x+4,y-3)<18&&Math.hypot(x-4,y+3)>16:r<11;if(!night&&r>16&&r<23){const angle=Math.atan2(y,x);inside=Math.abs(Math.sin(angle*4))<.23;}if(inside)pts.push({x,y});}return pts;}
  const sun=shape(false),moon=shape(true);
  const particles=Array.from({length:210},(_,i)=>({sun:sun[i%sun.length],moon:moon[i%moon.length],dx:(random()-.5)*55,dy:(random()-.5)*55,size:.9+random()*.7,phase:random()}));
  function paint(progress,burst=0,now=0){ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,84,84);ctx.fillStyle=progress>.5?'#f7f6ff':'#555347';for(const p of particles){const x=p.sun.x+(p.moon.x-p.sun.x)*progress+p.dx*burst;const y=p.sun.y+(p.moon.y-p.sun.y)*progress+p.dy*burst;ctx.globalAlpha=1-burst*.25;ctx.fillRect(42+x,42+y,p.size,p.size);}ctx.globalAlpha=1;
    if(progress>0){const stars=[{x:54,y:19,r:2.5},{x:65,y:29,r:1.7},{x:60,y:11,r:1}];stars.forEach((s,i)=>{ctx.globalAlpha=progress*(.65+.35*Math.sin(now/650+i*2));ctx.fillStyle='#fffaff';ctx.shadowColor='#c4bcff';ctx.shadowBlur=3;ctx.beginPath();ctx.moveTo(s.x,s.y-s.r);ctx.quadraticCurveTo(s.x+.4,s.y-.4,s.x+s.r,s.y);ctx.quadraticCurveTo(s.x+.4,s.y+.4,s.x,s.y+s.r);ctx.quadraticCurveTo(s.x-.4,s.y+.4,s.x-s.r,s.y);ctx.quadraticCurveTo(s.x-.4,s.y-.4,s.x,s.y-s.r);ctx.fill();});ctx.shadowBlur=0;ctx.globalAlpha=1;}
  }
  function presentation(now,dt){
    const destination=drag?dragTarget:(dark?0:96);
    if(Math.abs(destination-x)>.15)direction=Math.sign(destination-x);
    if(motion.matches){left=destination;right=destination+84;vl=vr=0;}
    else {
      // The leading edge follows the finger; the rear edge follows on a softer spring.
      const kl=direction<0?570:185,kr=direction>0?570:185;
      vl+=(kl*(destination-left)-2*Math.sqrt(kl)*.83*vl)*dt;
      vr+=(kr*(destination+84-right)-2*Math.sqrt(kr)*.83*vr)*dt;
      left+=vl*dt;right+=vr*dt;
    }
    x=(left+right-84)/2;
    const width=Math.max(72,Math.min(121,right-left));
    thumb.style.width=`${width}px`;
    thumb.style.transform=`translateX(${left}px)`;
    const strain=Math.min(1,Math.abs(width-84)/28);
    thumb.style.borderRadius=direction<0?`${24-strain*5}px ${24+strain*6}px ${24+strain*6}px ${24-strain*5}px`:`${24+strain*6}px ${24-strain*5}px ${24-strain*5}px ${24+strain*6}px`;
    button.dataset.travel=x.toFixed(2);button.dataset.jellyWidth=width.toFixed(2);
    // 白天/夜晚是物理位置；描边流光另走一条只减不增的相位：
    // 朝夜里 20→-30，朝白天接着 -30→-80（≡20，正好补完整一圈），所以点按、拖动、折返，光都只往顺时针走。
    // 折返时目标会往回跳，这里取顺时针方向的同位相、按速率追上去，避免闪跳；停稳后落点始终是白天/夜晚的固定位置。
    const night=Math.max(0,Math.min(1,1-x/96));
    if(lightNight!==null){const travel=night-lightNight;if(Math.abs(travel)>2e-4)lightForward=travel>0;}
    lightNight=night;
    const wanted=(lightForward?20-night*50:-80+night*50)%100;
    if(lightShown===null||motion.matches)lightShown=wanted;
    else{const gap=(((lightShown-wanted)%100)+100)%100;if(gap<98)lightShown-=Math.min(gap,420*dt);}
    if(lightShown<-100)lightShown+=100;
    const offset=lightShown;
    edge.style.strokeDashoffset=bounce.style.strokeDashoffset=String(offset);
    const r=Math.round(255-69*night),g=Math.round(202-23*night),b=Math.round(66+189*night);
    button.style.setProperty('--light-color',`rgb(${r},${g},${b})`);
    button.style.setProperty('--core-color',`rgb(255,${Math.round(243+9*night)},${Math.round(185+70*night)})`);
    button.style.setProperty('--topglow',`rgba(255,207,70,${.42*(1-night)})`);
    button.style.setProperty('--bottomglow',`rgba(155,151,255,${.48*night})`);
    button.style.setProperty('--topspill',`rgba(255,196,54,${.14*(1-night)})`);
    button.style.setProperty('--bottomspill',`rgba(151,143,255,${.18*night})`);
    button.dataset.sunset=night.toFixed(3);button.dataset.lightOffset=offset.toFixed(2);
  }
  function draw(now){frame=0;if(disposed||document.hidden)return;const dt=last?Math.min(.032,(now-last)/1000):1/60;last=now;
    const t=Math.min(1,(now-start)/850),e=t*t*(3-2*t);current=from+(to-from)*e;paint(current,Math.sin(t*Math.PI)*Math.abs(to-from),now);presentation(now,dt);
    if(!motion.matches)frame=requestAnimationFrame(draw);
  }
  function sync(value,animate=true){dark=!!value;button.setAttribute('aria-checked',String(dark));button.setAttribute('aria-label',dark?'切换为日间模式':'切换为夜间模式');button.title=dark?'夜间模式 · 点击切换日间':'日间模式 · 点击切换夜间';cancelAnimationFrame(frame);from=current;to=dark?1:0;if(!animate||motion.matches||document.hidden){current=to;paint(current);presentation(performance.now(),0);if(!motion.matches&&!document.hidden){from=to;start=performance.now()-850;last=0;frame=requestAnimationFrame(draw);}}else{start=performance.now();last=0;frame=requestAnimationFrame(draw);}}
  const commit=value=>{try{onChange(value);}catch(error){console.error('日夜模式切换失败',error);}};
  button.onpointerdown=event=>{
    if(event.button!==0)return;
    drag={id:event.pointerId,start:event.clientX,origin:dark?0:96,moved:false};dragTarget=drag.origin;
    button.setPointerCapture(event.pointerId);
  };
  button.onpointermove=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const delta=(event.clientX-drag.start)/(size/196);
    if(Math.abs(delta)>4)drag.moved=true;
    dragTarget=Math.max(0,Math.min(96,drag.origin+delta));
  };
  button.onpointerup=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const moved=drag.moved,value=moved?dragTarget<48:!dark;drag=null;
    suppressClick=true;button.releasePointerCapture(event.pointerId);commit(value);
  };
  button.onpointercancel=button.onlostpointercapture=()=>{drag=null;};
  button.onclick=event=>{event.stopPropagation();if(suppressClick&&event.detail!==0){suppressClick=false;return;}suppressClick=false;commit(!dark);};
  function visibility(){button.classList.toggle('paused',document.hidden);if(document.hidden)cancelAnimationFrame(frame);else sync(dark,!motion.matches);}
  const reduced=()=>sync(dark,false);document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',reduced);sync(dark,false);
  return {setDark:sync,destroy(){disposed=true;cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',reduced);button.onclick=button.onpointerdown=button.onpointermove=button.onpointerup=button.onpointercancel=button.onlostpointercapture=null;root.replaceChildren();}};
}


    function mountDayNightControl(ctx) {
      function DayNightSeat({wide}) {
        const ref = React.useRef(null);
        React.useEffect(() => {
          if (!wide || !ref.current) return;
          const host = ref.current;
          const footer = host.closest(".kB3qhq_footArea");
          const previous = footer?.style.position;
          if (footer) footer.style.position = "relative";
          const settings = footer?.querySelector(".kB3qhq_settingsArea");
          const sidebar = footer?.closest(".kB3qhq_root");
          const align = () => {
            if (!footer || !settings) return;
            const f=footer.getBoundingClientRect(),s=settings.getBoundingClientRect();
            host.style.bottom="auto";
            host.style.top=`${s.top-f.top+(s.height-52*100/196)/2}px`;
            if (sidebar) host.style.right=`${Math.max(0,f.right-sidebar.getBoundingClientRect().right+16)}px`;
          };
          const observer = new ResizeObserver(align);
          if (footer) observer.observe(footer);
          if (settings) observer.observe(settings);
          if (sidebar) observer.observe(sidebar);
          align();
          const read = () => ctx.theme.getTheme().active.colorScheme === "dark";
          const control = createDayNightSwitch(host, {dark:read(),size:52,onChange:dark => ctx.theme.setTheme(dark ? "dark" : "light")});
          const off = ctx.on("theme/change", () => control.setDark(read()));
          return () => { observer.disconnect(); if (typeof off === "function") off(); control.destroy(); if (footer) footer.style.position = previous; };
        }, [wide]);
        return wide ? h("span", {ref, "data-dune-day-night":"",style:{position:"absolute",right:0,bottom:4,width:52,height:52*100/196,zIndex:2,display:"inline-flex"}}) : null;
      }
      const fiber = ctx.inject(["slots","theme"], scope => scope.slots.inject("sidebar.footer.action", () => scope.slots.register({name:"sidebar.footer.action",id:"dune-day-night",order:100}, DayNightSeat)));
      return () => { try { Promise.resolve(fiber.dispose()).catch(() => {}); } catch {} };
    }
