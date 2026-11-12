/**
 * Reusable silent Pixel Burn, extracted from the user-accepted 2026-11-11 prototype.
 * Jhey Tompkins, Segue Effect 43: https://www.jhey.dev/prototypes/2026/segue/
 * Focused source-phase adaptation; no audio, network requests or effect catalog.
 * Exact prototype and provenance: design/prototypes/key-burn/.
 */

// Exact first-ignition morphology from Jhey Tompkins, Segue Effect 43; no audio or demo catalog.
export const PIXEL_BURN_SOURCE={width:48,height:27,frames:24,seedX:12.5,seedY:24.5};
const PIXEL_BURN_PHASE=new Uint8Array([17,16,16,17,17,17,17,17,18,18,18,19,19,23,22,23,24,21,22,21,19,18,18,19,18,18,18,18,18,18,19,18,18,22,21,20,21,22,20,20,19,17,15,15,15,15,16,17,17,15,16,15,16,17,16,16,17,17,17,18,20,21,23,23,24,22,20,20,20,17,17,18,17,17,17,18,17,17,17,17,18,19,19,19,21,21,21,19,18,16,15,14,14,14,16,15,17,16,14,15,15,16,14,19,15,16,17,21,21,21,24,24,22,22,21,19,18,17,16,16,16,16,16,16,19,16,16,17,18,18,18,21,20,21,20,20,18,17,15,15,13,13,14,14,17,16,13,13,14,13,14,14,15,15,18,22,20,23,24,24,21,21,21,20,17,16,15,15,15,15,14,14,16,15,16,16,17,17,19,19,20,20,19,20,16,15,17,14,13,12,12,16,17,16,15,12,11,11,12,13,14,14,17,19,19,23,23,23,22,20,20,19,18,16,15,14,14,14,13,14,14,15,16,15,16,16,18,19,20,18,18,19,18,15,13,13,12,11,14,15,22,17,15,12,11,10,11,12,13,16,15,18,19,22,23,24,21,20,19,19,18,17,16,16,13,13,12,12,13,14,15,14,15,17,17,20,20,19,17,17,15,15,14,12,11,13,15,19,19,18,17,14,10,17,14,13,14,14,16,19,21,21,22,22,22,22,21,18,17,16,15,15,11,13,11,13,13,13,13,14,16,16,19,19,19,20,19,16,15,14,13,16,11,15,20,22,23,20,18,16,17,19,15,14,16,15,18,21,20,21,21,21,22,23,20,19,17,16,14,14,12,10,10,12,13,12,14,15,15,18,18,18,18,19,22,18,19,19,19,18,13,16,21,21,24,22,17,21,18,18,16,18,17,16,19,19,19,19,21,20,19,19,21,19,18,16,12,12,11,9,9,9,10,11,13,14,16,17,17,17,17,18,18,17,18,18,18,18,20,15,19,20,24,23,22,21,21,20,17,18,19,19,18,18,18,19,20,19,18,18,19,19,17,14,11,10,10,9,8,9,8,11,12,14,16,16,16,16,16,18,16,17,17,17,17,17,20,17,19,20,24,23,21,21,20,19,19,17,19,16,16,17,17,18,18,18,18,17,18,19,19,14,12,11,9,8,7,7,9,10,12,13,15,15,15,15,15,16,15,15,16,16,16,16,18,20,21,20,23,22,22,19,20,19,18,16,17,16,15,15,16,17,17,16,17,16,16,17,16,13,11,11,8,7,6,7,9,11,14,14,15,15,14,14,15,15,14,15,15,15,16,14,18,19,19,22,22,21,20,19,18,19,17,15,16,15,14,14,15,15,16,16,15,15,16,16,15,14,12,10,9,7,6,8,10,13,14,14,13,14,13,13,15,13,14,14,14,14,13,14,17,18,19,20,21,20,18,18,17,16,16,14,18,13,13,13,16,14,14,15,14,16,15,15,15,15,15,13,14,11,9,13,11,12,13,12,12,13,12,12,12,12,13,13,14,12,13,15,17,19,19,20,20,20,18,17,16,15,14,15,13,12,12,14,13,12,13,13,14,13,14,14,14,15,16,17,15,12,14,15,15,13,14,11,11,12,10,11,11,11,12,12,12,11,12,17,16,18,18,19,19,19,17,16,15,15,16,13,12,14,11,12,11,12,12,12,13,12,13,13,15,16,16,17,18,13,15,15,14,13,12,10,10,10,11,9,9,11,11,11,11,10,16,12,13,16,17,21,19,18,15,15,14,15,15,13,13,11,10,11,10,10,11,11,11,11,12,14,15,16,15,18,18,17,17,14,13,13,14,11,9,9,9,8,9,10,10,11,10,9,11,12,17,16,18,20,21,17,16,14,13,13,12,11,10,10,10,9,10,9,10,10,10,10,13,14,15,14,15,17,20,18,16,17,15,12,11,10,9,8,7,7,8,9,9,9,8,10,11,14,14,17,16,19,19,18,16,13,12,12,12,10,10,9,9,9,8,8,8,9,9,11,13,13,13,14,18,19,19,17,16,15,16,12,11,10,9,8,7,6,6,8,7,7,11,10,12,13,14,14,17,19,19,17,18,15,16,11,11,9,9,8,8,8,8,7,7,8,8,11,13,12,13,15,18,18,18,18,16,15,14,12,10,10,9,7,6,6,5,7,6,6,7,9,11,12,13,15,17,19,22,21,18,16,17,15,10,8,8,8,7,6,7,6,7,7,7,10,11,12,12,14,17,16,17,20,18,15,14,11,13,9,7,6,6,5,4,4,5,8,8,9,13,13,15,16,18,21,24,23,21,17,17,16,13,9,7,7,6,5,5,6,6,6,9,10,10,11,13,14,15,16,19,21,19,17,15,13,10,10,8,6,5,4,3,4,7,7,8,11,12,13,15,16,17,23,24,22,20,18,17,15,15,11,10,5,5,4,4,6,5,5,7,9,10,11,12,13,17,16,20,20,19,18,22,20,21,16,10,8,13,3,3,5,10,10,10,11,15,14,17,19,22,24,24,24,21,20,17,16,13,10,9,5,4,3,6,4,4,5,6,7,10,11,12,13,14,17,18,20,20,23,20,21,19,14,13,10,11,6,3,10,13,14,13,14,17,16,18,20,24,24,24,22,22,20,18,17,16,16,9,8,6,8,1,3,5,7,9,11,13,15,14,13,15,17,18,21,22,24,24,20,19,14,14,10,9,5,9,9,12,13,15,16,17,19,19,23,23,24,23,23,21,20,21,18,17,15,11,12,9,10,7,6,6,6,9,15,16,16,16,16,17,19,22,22,23,24,23,22,17,15,13,12,8,7,8,9,12,18,14,16,16,18,19,22,24,24,24,22,22,24,22,21,18,17,14,11,9,8,9,9,10,8,11,16,16,17,19,21,23,21,23,24,24,24,23,21,20,18,13,12,13,11,10,11,13,15,18,15,17,22,22,23,24,24]);

// Reusable local primitive. One origin-aligned binary region supplies fill,
// content clipping and opaque border for every bounded phase.
export class PixelBurn {
  constructor(options){
    Object.assign(this,options);
    this.fillContext=this.fill.getContext('2d');this.borderContext=this.border.getContext('2d');
    this.available=!!this.fillContext&&!!this.borderContext;
    this.outer=new Uint8Array(0);this.inner=new Uint8Array(0);
  }
  measure(){
    const s=this.stage.getBoundingClientRect(),a=this.anchor().getBoundingClientRect(),cell=this.settings.pixelSize;
    this.width=this.stage.clientWidth;this.height=this.stage.clientHeight;this.cell=cell;
    this.origin={x:a.left+a.width/2-s.left,y:a.top+a.height/2-s.top};
    const pad=cell*5;
    const firstX=Math.floor((-pad-this.origin.x)/cell),firstY=Math.floor((-pad-this.origin.y)/cell);
    this.left=this.origin.x+firstX*cell-cell/2;this.top=this.origin.y+firstY*cell-cell/2;
    this.cols=Math.ceil((this.width+pad-this.left)/cell);this.rows=Math.ceil((this.height+pad-this.top)/cell);
    this.seedX=-firstX;this.seedY=-firstY;
    for(const layer of [this.fill,this.border]){
      layer.width=this.cols*cell;layer.height=this.rows*cell;
      layer.style.left=this.left+'px';layer.style.top=this.top+'px';
      layer.style.width=layer.width+'px';layer.style.height=layer.height+'px';
      layer.dataset.gridLeft=this.left;layer.dataset.gridTop=this.top;layer.dataset.cell=cell;
      layer.dataset.cols=this.cols;layer.dataset.rows=this.rows;
    }
    this.outer=new Uint8Array(this.cols*this.rows);this.inner=new Uint8Array(this.outer.length);this.trail=new Uint8Array(this.outer.length);
    this.stage.dataset.originX=this.origin.x;this.stage.dataset.originY=this.origin.y;
    this.stage.dataset.seedCenterX=this.left+(this.seedX+.5)*cell;this.stage.dataset.seedCenterY=this.top+(this.seedY+.5)*cell;
    this.stage.dataset.cell=cell;
    this.fullArrival=null;
    this.clear();
  }
  clear(){
    if(!this.available)return;
    this.fillContext.clearRect(0,0,this.fill.width,this.fill.height);
    this.borderContext.clearRect(0,0,this.border.width,this.border.height);
  }
  metrics(){
    const cell=this.settings.pixelSize,border=2,margin=cell*3;
    return {cell,border,margin,desiredWave:cell*(1.2+this.settings.edgeIntensity*.6),compactMargin:cell*3.5,safety:cell*.65};
  }
  target(rect){
    this.rect=rect;
    const {margin}=this.metrics();
    this.margin=margin;
    this.center={x:rect.x+rect.w/2,y:rect.y+rect.h/2};
    this.stage.dataset.contentX=rect.x;this.stage.dataset.contentY=rect.y;
    this.stage.dataset.contentWidth=rect.w;this.stage.dataset.contentHeight=rect.h;
    this.stage.dataset.minimumMargin=this.margin;
    this.prepareTarget();
  }
  erode(radius){
    const {outer,inner,cols,rows}=this;
    inner.fill(0);
    for(let y=radius;y<rows-radius;y++)for(let x=radius;x<cols-radius;x++){
      const i=y*cols+x;if(!outer[i])continue;
      let inside=true;
      for(let dy=-radius;dy<=radius&&inside;dy++)for(let dx=-radius;dx<=radius;dx++)if(!outer[i+dy*cols+dx]){inside=false;break;}
      if(inside)inner[i]=1;
    }
  }
  connect(){
    const {outer,cols,rows}=this;
    let start=-1,best=Infinity;
    for(let i=0;i<outer.length;i++)if(outer[i]){
      const x=this.left+(i%cols+.5)*this.cell,y=this.top+(Math.floor(i/cols)+.5)*this.cell;
      const d=(x-this.currentCenter.x)**2+(y-this.currentCenter.y)**2;
      if(d<best){best=d;start=i;}
    }
    if(start<0){
      const x=Math.max(0,Math.min(cols-1,Math.round((this.currentCenter.x-this.left)/this.cell-.5)));
      const y=Math.max(0,Math.min(rows-1,Math.round((this.currentCenter.y-this.top)/this.cell-.5)));
      outer[y*cols+x]=1;return;
    }
    const seen=new Uint8Array(outer.length),queue=[start];seen[start]=1;
    for(let q=0;q<queue.length;q++){
      const i=queue[q],x=i%cols,y=Math.floor(i/cols);
      for(const n of [x>0?i-1:-1,x<cols-1?i+1:-1,y>0?i-cols:-1,y<rows-1?i+cols:-1])
        if(n>=0&&outer[n]&&!seen[n]){seen[n]=1;queue.push(n);}
    }
    for(let i=0;i<outer.length;i++)outer[i]=seen[i];
    const outside=new Uint8Array(outer.length),outsideQueue=[];
    const seed=i=>{if(!outer[i]&&!outside[i]){outside[i]=1;outsideQueue.push(i);}};
    for(let x=0;x<cols;x++){seed(x);seed((rows-1)*cols+x);}
    for(let y=0;y<rows;y++){seed(y*cols);seed(y*cols+cols-1);}
    for(let q=0;q<outsideQueue.length;q++){
      const i=outsideQueue[q],x=i%cols,y=Math.floor(i/cols);
      for(const n of [x>0?i-1:-1,x<cols-1?i+1:-1,y>0?i-cols:-1,y<rows-1?i+cols:-1])
        if(n>=0&&!outer[n]&&!outside[n]){outside[n]=1;outsideQueue.push(n);}
    }
    for(let i=0;i<outer.length;i++)if(!outside[i])outer[i]=1;
  }
  reflect(value,size){
    const period=(size-1)*2,v=((value%period)+period)%period;
    return v<=size-1?v:period-v;
  }
  sourceValue(x,y){
    if(!this.sourceDetail){
      this.sourceDetail=new Float64Array(48*27);
      for(let row=0;row<27;row++)for(let col=0;col<48;col++){
        let total=0;
        for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)total+=PIXEL_BURN_PHASE[this.reflect(row+dy,27)*48+this.reflect(col+dx,48)];
        this.sourceDetail[row*48+col]=PIXEL_BURN_PHASE[row*48+col]-total/49;
      }
    }
    const u=this.reflect(x,48),v=this.reflect(y,27),ix=Math.floor(u),iy=Math.floor(v),fx=u-ix,fy=v-iy;
    const at=(a,b)=>this.sourceDetail[Math.min(26,b)*48+Math.min(47,a)];
    return (at(ix,iy)*(1-fx)+at(ix+1,iy)*fx)*(1-fy)+(at(ix,iy+1)*(1-fx)+at(ix+1,iy+1)*fx)*fy;
  }
  edgeField(x,y,seconds){
    // A single continuously sampled source field; no row switching or reversed loop.
    const a=this.sourceValue(x*.8+seconds*1.8,y*.8-seconds*.71);
    const b=this.sourceValue(x*.39-seconds*.63+21,y*.39+seconds*.93+9);
    return Math.max(-1,Math.min(1,(a*.7+b*.3)/1.3));
  }
  arrival(domain){
    const {cols,rows}=this,n=cols*rows,dist=new Float64Array(n);dist.fill(Infinity);
    const heap=[],push=(index,cost)=>{
      let pos=heap.length;heap.push([index,cost]);
      while(pos){const parent=(pos-1)>>1;if(heap[parent][1]<=cost)break;heap[pos]=heap[parent];pos=parent;}heap[pos]=[index,cost];
    },pop=()=>{
      const first=heap[0],last=heap.pop();
      if(heap.length){let pos=0;while(true){let child=pos*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1][1]<heap[child][1])child++;if(heap[child][1]>=last[1])break;heap[pos]=heap[child];pos=child;}heap[pos]=last;}return first;
    };
    const phase=(x,y)=>PIXEL_BURN_PHASE[((y-this.seedY+24)%27+27)%27*48+((x-this.seedX+12)%48+48)%48];
    const seed=this.seedY*cols+this.seedX;dist[seed]=0;push(seed,0);
    while(heap.length){
      const [i,cost]=pop();if(cost!==dist[i])continue;
      const x=i%cols,y=Math.floor(i/cols),base=phase(x,y);
      for(const j of [x?i-1:-1,x<cols-1?i+1:-1,y?i-cols:-1,y<rows-1?i+cols:-1]){
        if(j<0||(domain&&!domain[j]))continue;
        const next=phase(j%cols,Math.floor(j/cols));
        const value=cost+.55+next/30+Math.abs(next-base)*.18;
        if(value<dist[j]){dist[j]=value;push(j,value);}
      }
    }
    return dist;
  }
  prepareTarget(){
    const r=this.rect,c=this.cell,pad=this.margin+c*(1.8+this.settings.edgeIntensity);
    const points=[[r.x-pad,r.y-pad],[r.x+r.w+pad,r.y-pad],[r.x+r.w+pad,r.y+r.h+pad],[r.x-pad,r.y+r.h+pad],
      [this.origin.x-c,this.origin.y-c],[this.origin.x+c,this.origin.y-c],[this.origin.x+c,this.origin.y+c],[this.origin.x-c,this.origin.y+c]].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const cross=(a,b,p)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
    const lower=[],upper=[];
    for(const p of points){while(lower.length>1&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);}
    for(const p of points.slice().reverse()){while(upper.length>1&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);}
    const hull=lower.slice(0,-1).concat(upper.slice(0,-1));
    const narrow=this.width<450,power=narrow?4:2.8;
    const rx=Math.min(r.w/2+c*5,this.center.x-c*.75,this.width-this.center.x-c*.75);
    const ry=Math.min(r.h/2+c*5,this.center.y-c*.75,this.height-this.center.y-c*.75);
    this.narrow=narrow;
    this.domain=new Uint8Array(this.outer.length);this.shapeDistance=new Float64Array(this.outer.length);
    this.edgeX=new Float64Array(this.outer.length);this.edgeY=new Float64Array(this.outer.length);
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const px=this.left+(x+.5)*c,py=this.top+(y+.5)*c,i=y*this.cols+x;
      const dx=Math.abs(px-this.center.x)/rx,dy=Math.abs(py-this.center.y)/ry;
      const norm=Math.pow(Math.pow(dx,power)+Math.pow(dy,power),1/power);
      this.shapeDistance[i]=(norm-1)*Math.min(rx,ry)+this.margin;
      // Sample one continuous perimeter field along each outward ray, so
      // a flare stays attached while its pixels advance and recede locally.
      this.edgeX[i]=(this.center.x+(px-this.center.x)/(norm||1)-this.left)/c-.5;
      this.edgeY[i]=(this.center.y+(py-this.center.y)/(norm||1)-this.top)/c-.5;
      const fits=px-c/2>=0&&px+c/2<=this.width&&py-c/2>=0&&py+c/2<=this.height;
      this.domain[i]=fits&&hull.every((a,k)=>cross(a,hull[(k+1)%hull.length],[px,py])>=-.001)?1:0;
    }
    this.domain[this.seedY*this.cols+this.seedX]=1;
    this.birth=this.arrival(this.domain);this.birthMax=0;
    for(let i=0;i<this.birth.length;i++)if(this.domain[i]&&Number.isFinite(this.birth[i]))this.birthMax=Math.max(this.birthMax,this.birth[i]);
    this.birthMax/= .82;
  }
  targetRegion(seconds,inset=0){
    const result=new Uint8Array(this.outer.length),c=this.cell;
    const positive=c*(this.narrow?.8:2.0+this.settings.edgeIntensity*.8);
    for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++){
      const i=y*this.cols+x;if(!this.domain[i])continue;
      const n=this.edgeField(this.edgeX[i],this.edgeY[i],seconds),variation=n<0?n*c*(this.narrow?.35:.55):n*positive;
      if(this.shapeDistance[i]<=this.margin+variation-inset)result[i]=1;
    }
    return result;
  }
  nested(lead,trail){
    this.outer=lead;this.connect();lead=this.outer;
    for(let i=0;i<trail.length;i++)trail[i]=trail[i]&&lead[i]?1:0;
    this.outer=trail;this.connect();trail=this.outer;
    for(let i=0;i<trail.length;i++)trail[i]=trail[i]&&lead[i]?1:0;
    this.trail=trail;
    this.outer=this.trail;this.erode(1);this.outer=lead;
  }
  bounded(amount,seconds,frame){
    if(!this.available)return;
    const p=Math.max(0,Math.min(1,amount));
    const held=this.targetRegion(seconds),heldTrail=this.targetRegion(seconds,this.cell*(this.narrow?.4:.7)),lead=new Uint8Array(this.outer.length),trail=new Uint8Array(this.outer.length);
    this.currentCenter=p<.15?this.origin:this.center;
    for(let i=0;i<lead.length;i++)if(this.domain[i]){
      const born=this.birth[i]/this.birthMax;
      // Fixed cells ignite in geodesic order. The short travel tail burns away
      // behind the front; held content remains inside the irregular boundary.
      const expires=Math.min(.98,born+.23);
      if(born<=p&&(held[i]||p<expires))lead[i]=1;
      if(born<=Math.max(0,p-.045)&&(heldTrail[i]||p<expires-.015))trail[i]=1;
    }
    if(p===0){lead.fill(0);trail.fill(0);lead[this.seedY*this.cols+this.seedX]=1;}
    this.nested(lead,trail);
    this.paint(frame,true);this.mask(this.content,this.inner,this.rect);
  }
  full(amount,frame,oldLayer){
    if(!this.available)return;
    if(!this.fullArrival){this.fullArrival=this.arrival();this.fullMax=0;for(const value of this.fullArrival)this.fullMax=Math.max(this.fullMax,value);}
    const lead=new Uint8Array(this.outer.length),trail=new Uint8Array(this.outer.length);
    for(let i=0;i<lead.length;i++){
      lead[i]=this.fullArrival[i]<=amount*this.fullMax?1:0;
      trail[i]=this.fullArrival[i]<=Math.max(0,(amount-.065)/.935)*this.fullMax?1:0;
    }
    this.currentCenter=this.origin;this.nested(lead,trail);this.paint(frame,false);
    this.mask(oldLayer,Uint8Array.from(this.inner,value=>value?0:1),{x:0,y:0,w:this.width,h:this.height});
  }
  paint(frame,paintFill){
    this.clear();
    const cell=this.cell,f=this.fillContext,b=this.borderContext;
    f.globalAlpha=1;b.globalAlpha=1;
    let inside=0,border=0;
    for(let i=0;i<this.outer.length;i++)if(this.outer[i]){
      const x=i%this.cols,y=Math.floor(i/this.cols);
      if(this.inner[i]){
        inside++;if(paintFill){f.fillStyle='#25282d';f.fillRect(x*cell,y*cell,cell,cell);}
      } else {
        border++;b.fillStyle=this.trail[i]?'#eb5757':'#f2c94c';
        b.fillRect(x*cell,y*cell,cell,cell);
      }
    }
    this.border.dataset.outerCount=inside+border;this.border.dataset.borderCount=border;this.fill.dataset.innerCount=inside;
    this.border.dataset.frame=frame;this.fill.dataset.frame=frame;
  }
  mask(element,bits,rect){
    let path='';
    for(let y=0;y<this.rows;y++){
      let start=-1;
      for(let x=0;x<=this.cols;x++){
        const on=x<this.cols&&bits[y*this.cols+x];
        if(on&&start<0)start=x;
        if(!on&&start>=0){path+='M'+start*this.cell+' '+y*this.cell+'h'+(x-start)*this.cell+'v'+this.cell+'h-'+(x-start)*this.cell+'z';start=-1;}
      }
    }
    const view=[rect.x-this.left,rect.y-this.top,rect.w,rect.h].join(' ');
    const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+view+'" preserveAspectRatio="none" shape-rendering="crispEdges"><path fill="white" d="'+(path||'M0 0')+'"/></svg>';
    const value='url("data:image/svg+xml,'+encodeURIComponent(svg)+'")';
    element.style.maskImage=value;element.style.webkitMaskImage=value;
    element.style.maskSize=rect.w+'px '+rect.h+'px';element.style.webkitMaskSize=rect.w+'px '+rect.h+'px';
    element.dataset.maskOriginX=rect.x-this.left;element.dataset.maskOriginY=rect.y-this.top;
    element.dataset.maskWidth=rect.w;element.dataset.maskHeight=rect.h;
  }
  unmask(element){element.style.maskImage='none';element.style.webkitMaskImage='none';}
}

export const PIXEL_BURN_DEFAULTS = Object.freeze({
  duration: 600,
  pixelSize: 18,
  edgeIntensity: 0.4,
  fps: 24,
});

// Preserve every tuning control from the accepted prototype. These describe
// consumer controls; mounting this primitive does not add a settings UI.
export const PIXEL_BURN_CONTROLS = Object.freeze({
  duration: Object.freeze({ label: 'Burn duration', min: 600, max: 2200, step: 100, unit: 'ms' }),
  pixelSize: Object.freeze({ label: 'Pixel size', min: 6, max: 18, step: 1, unit: 'px' }),
  edgeIntensity: Object.freeze({ label: 'Edge fire', min: 0.4, max: 1.8, step: 0.1 }),
  fps: Object.freeze({ label: 'Framerate', min: 4, max: 60, step: 1, unit: 'fps' }),
});

function applySettings(settings, changes) {
  for (const [key, range] of Object.entries(PIXEL_BURN_CONTROLS)) {
    if (changes[key] === undefined) continue;
    if (typeof changes[key] !== 'number' || !Number.isFinite(changes[key])) {
      throw new TypeError(`Pixel Burn ${key} must be a finite number.`);
    }
    const value = Math.max(range.min, Math.min(range.max, changes[key]));
    settings[key] = key === 'pixelSize' || key === 'fps' ? Math.round(value) : value;
  }
}

/**
 * Mount one effect owner. All target rectangles use stage-relative CSS pixels.
 * `anchor()` returns the visible SVG/image/art element, not its larger button.
 * The consumer owns focus, dismissal, placement, identity and snapshot creation.
 *
 * open() makes content usable synchronously; its promise reports completion.
 * An interrupted transition resolves { phase, cancelled: true }. reveal() calls
 * its synchronous update after measuring the old icon, then withdraws the
 * caller-mounted snapshot. No private/player data is read by this module.
 */
export function mountPixelBurn({
  stage,
  anchor,
  content,
  fillLayer,
  borderLayer,
  settings: initialSettings = {},
  reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  onPhaseChange = () => {},
  requestFrame,
  cancelFrame,
  now,
}) {
  if (!stage || !content || typeof anchor !== 'function') {
    throw new TypeError('Pixel Burn requires stage, content and an anchor function.');
  }
  const view = stage.ownerDocument?.defaultView ?? globalThis;
  const request = requestFrame ?? view.requestAnimationFrame?.bind(view);
  const cancel = cancelFrame ?? view.cancelAnimationFrame?.bind(view);
  const clock = now ?? (() => view.performance.now());
  const settings = { ...PIXEL_BURN_DEFAULTS };
  applySettings(settings, initialSettings);
  const ownedLayers = [];
  function layer(provided, name) {
    const element = provided ?? stage.ownerDocument.createElement('canvas');
    element.classList.add(`dndwiki-burn-${name}`);
    element.setAttribute('aria-hidden', 'true');
    element.style.position = 'absolute';
    element.style.pointerEvents = 'none';
    element.style.imageRendering = 'pixelated';
    if (!provided) {
      stage.append(element);
      ownedLayers.push(element);
    }
    return element;
  }
  const fill = layer(fillLayer, 'fill');
  const border = layer(borderLayer, 'border');
  const renderer = new PixelBurn({ stage, anchor, content, fill, border, settings });
  const canAnimate = () => renderer.available && typeof request === 'function' && typeof cancel === 'function' && !reducedMotion();
  let phase = 'closed';
  let progress = 0;
  let phaseStart = 0;
  let phaseFrom = 0;
  let lastFrame = -1;
  let raf = null;
  let snapshot = null;
  let pending = null;
  let disposed = false;
  let target = null;

  stage.dataset.burnAvailable = String(renderer.available);
  function publish(next = phase) {
    const changed = phase !== next;
    phase = next;
    stage.dataset.burnPhase = phase;
    stage.dataset.burnProgress = String(progress);
    if (changed) onPhaseChange(phase, { progress });
  }
  publish();
  function cancelTick() {
    if (raf !== null) cancel?.(raf);
    raf = null;
  }
  function settle(cancelled = false) {
    if (!pending) return;
    const resolve = pending;
    pending = null;
    resolve({ phase, cancelled });
  }
  function transitionPromise() {
    settle(true);
    return new Promise(resolve => { pending = resolve; });
  }
  function sample(time) {
    const frame = Math.floor(time * settings.fps / 1000);
    return { frame, seconds: frame / settings.fps };
  }
  function contentRect(rect) {
    if (rect) {
      for (const key of ['x', 'y', 'w', 'h']) {
        if (!Number.isFinite(rect[key])) throw new TypeError(`Pixel Burn target.${key} must be finite.`);
      }
      if (rect.w <= 0 || rect.h <= 0) throw new RangeError('Pixel Burn target dimensions must be positive.');
      return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
    }
    const s = stage.getBoundingClientRect();
    const r = content.getBoundingClientRect();
    return contentRect({ x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height });
  }
  function measure(rect) {
    target = contentRect(rect);
    renderer.measure();
    renderer.target(target);
  }
  function schedule() {
    if (raf === null && phase !== 'closed' && canAnimate()) raf = request(tick);
  }
  function finishClosed() {
    cancelTick();
    snapshot?.remove();
    snapshot = null;
    progress = 0;
    content.hidden = true;
    renderer.unmask(content);
    renderer.clear();
    publish('closed');
    settle();
  }
  function showHeld() {
    progress = 1;
    if (renderer.available) renderer.bounded(1, 0, 0);
    else renderer.unmask(content);
    publish('open');
    settle();
  }
  function tick(time) {
    raf = null;
    if (disposed || phase === 'closed') return;
    if (!canAnimate()) {
      refreshMotion();
      return;
    }
    const { frame, seconds } = sample(time);
    // Native RAF drives advancing/receding cells. FPS only holds edge detail.
    if (phase === 'open') {
      if (frame !== lastFrame) renderer.bounded(1, seconds, frame);
    } else if (phase === 'opening' || phase === 'closing') {
      const duration = settings.duration * (phase === 'opening' ? 0.65 : 0.5);
      const elapsed = Math.max(0, Math.min(1, (time - phaseStart) / duration));
      progress = phase === 'opening' ? phaseFrom + (1 - phaseFrom) * elapsed : phaseFrom * (1 - elapsed);
      renderer.bounded(progress, seconds, frame);
      if (elapsed >= 1) {
        if (phase === 'closing') {
          finishClosed();
          return;
        }
        progress = 1;
        publish('open');
        settle();
      }
    } else if (phase === 'full') {
      progress = Math.max(0, Math.min(1, (time - phaseStart) / settings.duration));
      renderer.full(progress, frame, snapshot);
      if (progress >= 1) {
        finishClosed();
        return;
      }
    }
    lastFrame = frame;
    publish();
    schedule();
  }
  function assertMounted() {
    if (disposed) throw new Error('Pixel Burn has been disposed.');
  }
  function open(rect) {
    assertMounted();
    if (phase === 'full') return Promise.resolve({ phase, cancelled: true });
    if (phase === 'open' || phase === 'opening') {
      refresh(rect);
      return pending ? new Promise(resolve => {
        const previous = pending;
        pending = result => { previous(result); resolve(result); };
      }) : Promise.resolve({ phase, cancelled: false });
    }
    const from = phase === 'closing' ? progress : 0;
    const result = transitionPromise();
    content.hidden = false;
    measure(rect);
    phaseFrom = from;
    progress = from;
    phaseStart = clock();
    lastFrame = -1;
    if (!canAnimate()) showHeld();
    else {
      publish('opening');
      const { frame, seconds } = sample(phaseStart);
      renderer.bounded(progress, seconds, frame);
      schedule();
    }
    return result;
  }
  function close() {
    assertMounted();
    if (phase === 'closed' || phase === 'full') return Promise.resolve({ phase, cancelled: phase === 'full' });
    if (phase === 'closing') return pending ? new Promise(resolve => {
      const previous = pending;
      pending = result => { previous(result); resolve(result); };
    }) : Promise.resolve({ phase, cancelled: false });
    const result = transitionPromise();
    phaseFrom = progress;
    phaseStart = clock();
    lastFrame = -1;
    if (!canAnimate()) finishClosed();
    else {
      publish('closing');
      schedule();
    }
    return result;
  }
  function reveal({ snapshot: oldLayer, update = () => {} } = {}) {
    assertMounted();
    if (phase === 'full') return Promise.resolve({ phase, cancelled: true });
    const result = transitionPromise();
    cancelTick();
    // This capture happens before the player icon or layout can change.
    renderer.measure();
    snapshot = oldLayer ?? null;
    content.hidden = true;
    renderer.unmask(content);
    renderer.clear();
    try {
      update();
    } catch (error) {
      finishClosed();
      throw error;
    }
    if (!snapshot || !canAnimate()) finishClosed();
    else {
      snapshot.inert = true;
      snapshot.setAttribute('aria-hidden', 'true');
      progress = 0;
      phaseStart = clock();
      lastFrame = -1;
      publish('full');
      renderer.full(0, sample(phaseStart).frame, snapshot);
      schedule();
    }
    return result;
  }
  function refresh(rect) {
    assertMounted();
    // Full-screen reveal retains its pre-update origin/grid for its short life.
    if (phase === 'closed' || phase === 'full') return;
    measure(rect);
    const { frame, seconds } = sample(clock());
    renderer.bounded(progress, canAnimate() ? seconds : 0, frame);
    lastFrame = frame;
    schedule();
  }
  function refreshMotion() {
    assertMounted();
    if (!canAnimate()) {
      cancelTick();
      if (phase === 'full' || phase === 'closing') finishClosed();
      else if (phase !== 'closed') showHeld();
    } else if (phase !== 'closed') {
      lastFrame = -1;
      schedule();
    }
  }
  function configure(changes) {
    assertMounted();
    // Settle a captured full-page reveal before changing its cell grid.
    if (phase === 'full') finishClosed();
    applySettings(settings, changes);
    if (phase !== 'closed') refresh(target);
    return { ...settings };
  }
  function dispose() {
    if (disposed) return;
    settle(true);
    finishClosed();
    for (const element of ownedLayers) element.remove();
    disposed = true;
  }
  return {
    open, close, reveal, configure, refresh, refreshMotion, dispose,
    metrics: () => renderer.metrics(),
    get phase() { return phase; },
    get progress() { return progress; },
    get settings() { return { ...settings }; },
    get available() { return renderer.available; },
    // Geometry is inspectable for deterministic tests; consumers use lifecycle.
    renderer,
  };
}

