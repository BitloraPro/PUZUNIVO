/* MegaRush WebGL2 low-poly city/forest/coast renderer and frame-based controller.
   No external CDNs or libraries. Coordinates/physics are game-local, not GPS.
   Handles all gameplay physics in one module, no duplicated game loops. */
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
// An exponential follow factor produces the same third-person camera position
// at 30/60/90 Hz for an equal amount of simulated time.
export function cameraFollowFactor(seconds,rate=10){
 const dt=Number.isFinite(seconds)?Math.max(0,Math.min(.1,seconds)):0;
 return 1-Math.exp(-Math.max(0,rate)*dt);
}
const rgb=c=>c.startsWith('#')?[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255):c;
function seeded(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296}};
// Vertex-lit two-source sunlight: warm sunset, cool sky fill and a directional
// horizon light. Geometry stays on the GPU; no fake 2D character or city image.
const vs=`#version 300 es
precision highp float;
in vec3 aPos;in vec3 aNormal;in vec3 aColor;
uniform mat4 uProj;uniform mat4 uView;
uniform vec3 uSunDir;uniform vec3 uSunColor;
uniform float uAmbient;uniform float uNight;
out vec3 vColor;out float vDepth;
void main(){vec4 view=uView*vec4(aPos,1.0);gl_Position=uProj*view;
 vec3 normal=normalize(aNormal);
 float sun=max(dot(normal,normalize(uSunDir)),0.0);
 float bounce=max(dot(normal,normalize(vec3(-0.6,0.35,-0.65))),0.0);
 vec3 irradiance=vec3(uAmbient)+uSunColor*sun*(1.0-uNight*0.18)+vec3(0.11,0.19,0.26)*bounce;
 vColor=aColor*irradiance;vDepth=max(0.0,-view.z);}`;
const fs=`#version 300 es
precision mediump float;
in vec3 vColor;in float vDepth;out vec4 frag;
uniform vec3 uFog;uniform float uFogDensity;
void main(){float amt=1.0-exp(-vDepth*vDepth*uFogDensity);
 vec3 exposed=1.4*vColor/(vec3(1.0)+0.34*vColor);
 vec3 col=mix(exposed,uFog,clamp(amt,0.0,0.9));
 frag=vec4(clamp(col,0.0,1.0),1.0);}`;
const matPerspective=(fov,aspect,near,far)=>{let f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0])};
function lookAt(e,t){let zx=e[0]-t[0],zy=e[1]-t[1],zz=e[2]-t[2],l=Math.hypot(zx,zy,zz)||1;zx/=l;zy/=l;zz/=l;
 let xx=zz,xz=-zx,lx=Math.hypot(xx,xz)||1;xx/=lx;xz/=lx;
 const yx=zy*xz,yy=zz*xx-zx*xz,yz=-zy*xx;
 return new Float32Array([xx,yx,zx,0,0,yy,zy,0,xz,yz,zz,0,-(xx*e[0]+xz*e[2]),-(yx*e[0]+yy*e[1]+yz*e[2]),-(zx*e[0]+zy*e[1]+zz*e[2]),1]);}
export class MeshBuilder{
 constructor(){this.vertices=[];}
 tri(a,b,c,color){let e=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],f=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
 let n=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]],m=Math.hypot(...n);
 if(m<1e-9)return this; // Degenerate poles produce undefined normals and waste mobile GPU work.
 let col=rgb(color);for(const p of [a,b,c])this.vertices.push(...p,...n.map(x=>x/m),...col);}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col);}
 box(x,y,z,w,h,d,col){let x0=x-w/2,x1=x+w/2,y0=y,y1=y+h,z0=z-d/2,z1=z+d/2;
 let p=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
 this.quad(p[0],p[3],p[2],p[1],col);this.quad(p[5],p[6],p[7],p[4],col);this.quad(p[4],p[7],p[3],p[0],col);this.quad(p[1],p[2],p[6],p[5],col);this.quad(p[3],p[7],p[6],p[2],col);this.quad(p[4],p[0],p[1],p[5],col);
 return this;}
 orientedBox(x,y,z,w,h,d,col,angle){
  const start=this.vertices.length;this.box(x,y,z,w,h,d,col);
  const ca=Math.cos(angle),sa=Math.sin(angle);
  for(let i=start;i<this.vertices.length;i+=9){const lx=this.vertices[i]-x,lz=this.vertices[i+2]-z;
   this.vertices[i]=x+ca*lx+sa*lz;this.vertices[i+2]=z-sa*lx+ca*lz;
   const nx=this.vertices[i+3],nz=this.vertices[i+5];this.vertices[i+3]=ca*nx+sa*nz;this.vertices[i+5]=-sa*nx+ca*nz;
  }
  return this;
 }
 beam(a,c,width,col){
  const dx=c[0]-a[0],dy=c[1]-a[1],dz=c[2]-a[2],len=Math.hypot(dx,dy,dz)||1;
  const ax=dx/len,ay=dy/len,az=dz/len;
  let ux=az,uy=0,uz=-ax;let ul=Math.hypot(ux,uz);
  if(ul<.01){ux=1;uz=0;ul=1;}ux/=ul;uz/=ul;
  const vx=ay*uz-az*uy,vy=az*ux-ax*uz,vz=ax*uy-ay*ux;
  const point=(p,u,v)=>[p[0]+(ux*u+vx*v)*width,p[1]+(uy*u+vy*v)*width,p[2]+(uz*u+vz*v)*width];
  for(let q=0;q<4;q++){
   const ang=q*Math.PI/2,nang=(q+1)*Math.PI/2;
   this.quad(point(a,Math.cos(ang),Math.sin(ang)),point(a,Math.cos(nang),Math.sin(nang)),point(c,Math.cos(nang),Math.sin(nang)),point(c,Math.cos(ang),Math.sin(ang)),col);
  }
  return this;
 }
 // Rotate only meshes in this range (e.g. a physical skateboard kickflip).
 // The axis is in world coordinates; vertices and normals rotate together.
 rotateRange(first,pivot,axis,angle){
  const mag=Math.hypot(...axis);
  if(!Number.isInteger(first)||first<0||first>this.vertices.length||first%9!==0||!Number.isFinite(angle)||mag<1e-6)throw Error('Invalid mesh rotation');
  const [ux,uy,uz]=axis.map(v=>v/mag),c=Math.cos(angle),sn=Math.sin(angle);
  const rot=(x,y,z)=>{
   const dot=ux*x+uy*y+uz*z;
   return [x*c+(uy*z-uz*y)*sn+ux*dot*(1-c),y*c+(uz*x-ux*z)*sn+uy*dot*(1-c),z*c+(ux*y-uy*x)*sn+uz*dot*(1-c)];
  };
  for(let i=first;i<this.vertices.length;i+=9){
   const pos=rot(this.vertices[i]-pivot[0],this.vertices[i+1]-pivot[1],this.vertices[i+2]-pivot[2]);
   const n=rot(this.vertices[i+3],this.vertices[i+4],this.vertices[i+5]);
   this.vertices[i]=pos[0]+pivot[0];this.vertices[i+1]=pos[1]+pivot[1];this.vertices[i+2]=pos[2]+pivot[2];
   this.vertices[i+3]=n[0];this.vertices[i+4]=n[1];this.vertices[i+5]=n[2];
  }
  return this;
 }
 roof(x,y,z,r,h,col){let base=[];for(let i=0;i<4;i++){let a=(i+.5)*Math.PI/2;base.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);}
 let tip=[x,y+h,z];for(let i=0;i<4;i++)this.tri(base[i],base[(i+1)%4],tip,col);return this;}
 // Fully triangulated rounded mesh primitives; no image sprite, external model CDN or hidden dependencies.
 sphere(x,y,z,rx,ry,rz,col,rings=8,slices=12){
  const point=(a,b)=>[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];
  for(let i=0;i<rings;i++)for(let j=0;j<slices;j++){
   const a=i*Math.PI/rings,c=(i+1)*Math.PI/rings,b=j*TAU/slices,d=(j+1)*TAU/slices;
   const p=point(a,b),q=point(c,b),r=point(c,d),v=point(a,d);
   if(i>0)this.tri(p,q,v,col);if(i<rings-1)this.tri(v,q,r,col);
  }
  return this;
 }
 cylinder(a,b,radius,col,sides=10){
  const dir=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],length=Math.hypot(...dir)||1;
  const n=dir.map(v=>v/length),side=[n[2],0,-n[0]],mag=Math.hypot(...side)||1;
  if(mag<.01){side[0]=1;side[1]=0;side[2]=0;}else for(let i=0;i<3;i++)side[i]/=mag;
  const up=[n[1]*side[2]-n[2]*side[1],n[2]*side[0]-n[0]*side[2],n[0]*side[1]-n[1]*side[0]];
  const ring=(c,i)=>{let t=i*TAU/sides;return c.map((v,k)=>v+radius*(Math.cos(t)*side[k]+Math.sin(t)*up[k]))};
  for(let i=0;i<sides;i++){
   const x=ring(a,i),y=ring(a,i+1),z=ring(b,i+1),w=ring(b,i);
   this.quad(x,y,z,w,col);this.tri(a,y,x,col);this.tri(b,w,z,col);
  }
  return this;
 }
 disc(x,y,z,rx,rz,col,segments=16){
  const center=[x,y,z];for(let i=0;i<segments;i++){
   const a=i*TAU/segments,b=(i+1)*TAU/segments;
   this.tri(center,[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],[x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],col);
  }return this;
 }
 ramp(x,z,w,d,h,col){let a=[x-w/2,0,z-d/2],b=[x+w/2,0,z-d/2],c=[x+w/2,h,z+d/2],e=[x-w/2,h,z+d/2];this.quad(a,b,c,e,col);this.tri(a,e,[a[0],0,e[2]],col);this.tri(b,[b[0],0,c[2]],c,col);return this;}
}

// Character mesh is animated every frame from actual movement state. Rounded head,
// articulated joints, hair, clothes and board are original generated 3D geometry.
export function buildCharacterMesh(mesh,player,t){
 const palette={rylee:['#1286fc','#182039','#202a43'],zara:['#f864c2','#34304d','#37435c'],leo:['#f5ae50','#212d43','#3d4965']}[player.character]||['#1286fc','#182039','#202a43'];
 const x=player.x,z=player.z,y=player.y,a=player.angle||0,ca=Math.cos(a),sa=Math.sin(a),speed=Math.hypot(player.vx||0,player.vz||0);
 const skate=player.vehicle==='skate',airborne=!player.onGround;
 const trick=skate&&player.trickTimer>0?Math.min(1,Math.max(0,1-player.trickTimer/.72)):0;
 const trickArc=Math.sin(trick*Math.PI);
 const gait=Math.sin(t*(skate?8:11))*Math.min(1,speed/3),crouch=skate?.24+.22*trickArc:.0;
 const bob=(airborne?0:Math.abs(Math.sin(t*8))*.055)*(speed>1?1:0.3);
 const at=(xx,yy,zz)=>[x+ca*xx+sa*zz,y+yy,z-sa*xx+ca*zz];
 const box=(xx,yy,zz,w,h,d,color)=>{const p=at(xx,yy,zz);mesh.orientedBox(p[0],p[1],p[2],w,h,d,color,a)};
 const ball=(xx,yy,zz,rx,ry,rz,color)=>{const p=at(xx,yy,zz);mesh.sphere(...p,rx,ry,rz,color,7,10)};
 const limb=(x1,y1,z1,x2,y2,z2,r,col)=>mesh.cylinder(at(x1,y1,z1),at(x2,y2,z2),r,col,8);
 const jacket=player.skin==='violet_hoodie'?'#8031ba':palette[1];
 mesh.disc(x,.008,z,.68,.54,'#14364d');
 // Skate deck, paired axles, dark wheels and neon accents under boots.
 if(skate){
  const boardStart=mesh.vertices.length;
  box(0,.12+.13*trickArc,0,.78,.12,1.62,player.skin==='sunset_board'?'#fbb04d':'#31eaa1');
  box(0,.22,0,.53,.035,1.37,'#12385b');
  for(const zz of [-.55,.55]){limb(-.38,.11,zz,.38,.11,zz,.08,'#c4d4de');for(const xx of [-.38,.38])ball(xx,.1,zz,.15,.15,.15,'#14253b');}
  if(player.skin==='cyan_trail')for(let j=1;j<=3;j++)box(0,.045,-.9-j*.43,.14,.02,.25,j%2?'#18f1e8':'#60aaff');
  // One genuine 360-degree kickflip of the board around its long local axis.
  // Halfway through, its underside and wheels are visibly inverted.
  if(trick>0)mesh.rotateRange(boardStart,at(0,.16,0),[sa,0,ca],trick*TAU);
 }
 // Independent upper/lower leg segments avoid the old rigid rectangular animation.
 const hips=1.05-crouch+bob,shoulder=1.73-crouch+bob;
 box(0,hips-.17,0,.63,.45,.43,'#29354c');
 for(const side of [-1,1]){
  const step=skate?side*.13:gait*.35*side;
  const knee=[side*.22,.63-crouch*.5+bob,.10+step],ankle=[side*.24,.24+bob,.13-step*.45];
  limb(side*.19,hips,0,...knee,.18,'#3c4c67');
  limb(...knee,...ankle,.16,palette[2]);ball(...knee,.18,.18,.18,'#314057');
  box(side*.24,.10+bob,.29,.31,.19,.56,side===1?'#f4f7ff':'#bec8e6');
  // Shoulder / elbow / wrist move differently during skating, jogging and jumps.
  const swing=skate?-.23:(gait*side*.22);const elbow=[side*.59,shoulder-.46,.04+swing];
  const wrist=[side*(airborne?1.05:.65),shoulder-.81,airborne?.22:-.09+swing];
  limb(side*.43,shoulder-.10,0,...elbow,.15,jacket);
  limb(...elbow,...wrist,.12,'#222e43');ball(...wrist,.13,.13,.13,'#1a2336');
 }
 // Layered jacket (front zipper + raised hood), pouch, graffiti marks and shoulder badges.
 box(0,shoulder-.40,0,.86,.94,.53,jacket);
 box(0,shoulder-.38,.282,.10,.7,.018,'#72ead1');
 box(-.17,shoulder-.49,.294,.23,.13,.019,'#c6ef56');
 box(.18,shoulder-.32,.294,.26,.07,.02,'#f0a2df');
 box(0,shoulder-.78,.29,.51,.16,.06,'#27314a');
 ball(0,shoulder-.03,-.13,.44,.28,.32,jacket);
 limb(0,shoulder+.05,0,0,shoulder+.29,0,.145,'#d1a47d');
 ball(0,shoulder+.44,0,.38,.39,.34,'#e7b18b');
 ball(-.345,shoulder+.40,0,.09,.16,.11,'#df9d76');ball(.345,shoulder+.40,0,.09,.16,.11,'#df9d76');
 // Face points toward the travel direction. Eye/hair geometry belongs to 3D avatar.
 for(const side of [-1,1]){
  ball(side*.145,shoulder+.50,.315,.065,.07,.04,'#19273d');
  ball(side*.146-.018,shoulder+.52,.351,.023,.024,.018,'#f3fbff');
 }
 box(0,shoulder+.27,.352,.14,.026,.025,'#a85b6a');
 ball(0,shoulder+.71,-.08,.39,.23,.36,palette[0]);
 for(let j=0;j<7;j++){
  const xx=(j-3)*.105;const p=at(xx,shoulder+.73+Math.abs(Math.sin(j*2.2))*.08,.23);
  mesh.cylinder(p,at(xx+.05,shoulder+.53,.30),.074,j%2?'#1a79d9':palette[0],6);
 }
 if(player.skin==='gold_glasses')for(const sx of [-.15,.15])box(sx,shoulder+.48,.338,.27,.12,.04,'#ffc957');
 // Little backpack depth makes the in-game third-person silhouette readable.
 box(0,shoulder-.38,-.39,.53,.62,.2,'#111a2d');
 box(0,shoulder-.22,-.50,.28,.17,.04,'#59dfc4');
 return mesh;
}
export const HARBOR_FINISH=Object.freeze({x:0,z:112});
export function onHarborRoad(x,z){return Math.abs(x)<=6.2&&z>=60&&z<=123;}
export function atHarbor(x,z){return Math.hypot(x-HARBOR_FINISH.x,z-HARBOR_FINISH.z)<9;}
export function trafficPosition(vehicle,t){return -95+((vehicle.position+t*vehicle.speed)%188+188)%188;}
export function buildVehicleMesh(mesh,{x,y=0,z,angle=0,color='#e99a4b',police=false,flash=false}){
 const ca=Math.cos(angle),sa=Math.sin(angle);
 const at=(lx,ly,lz)=>[x+ca*lx+sa*lz,y+ly,z-sa*lx+ca*lz];
 const box=(lx,ly,lz,w,h,d,c)=>{const p=at(lx,ly,lz);mesh.orientedBox(p[0],p[1],p[2],w,h,d,c,angle)};
 const ball=(lx,ly,lz,rx,ry,rz,c)=>mesh.sphere(...at(lx,ly,lz),rx,ry,rz,c,6,9);
 mesh.disc(x,y+.007,z,1.35,2.2,'#132b3c');
 box(0,.36,0,2.25,.60,4.2,police?'#192033':color);
 box(0,.89,-.18,1.89,.76,2.13,police?'#e2f4ff':'#3d5d87');
 box(0,.91,.88,1.78,.66,.20,'#96c9e2');
 box(0,.91,-1.23,1.78,.62,.16,'#2c4259');
 box(0,.25,1.99,2.34,.18,.22,'#cbd4e2');box(0,.25,-2.04,2.34,.18,.21,'#263047');
 for(const side of [-1,1]){
  for(const zz of [-1.27,1.28])ball(side*1.07,.24,zz,.27,.38,.38,'#141b28');
  box(side*.8,.53,2.08,.42,.18,.06,police?'#d9ecfc':'#fff2b0');
  box(side*.8,.53,-2.12,.4,.17,.06,'#fc5464');
  box(side*1.13,.65,-.1,.047,.13,.42,'#aab7cc');
 }
 if(police){box(0,.37,-.2,2.25,.19,3.6,'#f7f8fc');box(0,1.73,-.18,1.13,.16,.45,flash?'#fd365b':'#42ddff');}
 return mesh;
}

function makeShader(gl,type,source){const o=gl.createShader(type);gl.shaderSource(o,source);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o;}
// Keeps a third-person camera from passing through opaque building geometry.
// Segment-vs-expanded-AABB (including height) prevents unwanted building interiors
// appearing onscreen; near clips move the camera smoothly toward the hero.
export function cameraSafePosition(target,desired,obstacles=[],padding=.42){
 const vec=desired.map((v,i)=>v-target[i]);let nearest=1;
 for(const b of obstacles){
  const low=[b.x-b.w/2-padding,-padding,b.z-b.d/2-padding];
  const high=[b.x+b.w/2+padding,b.h+padding,b.z+b.d/2+padding];
  let enter=0,exit=1,hit=true;
  for(let axis=0;axis<3;axis++){
   const dir=vec[axis],origin=target[axis];
   if(Math.abs(dir)<1e-7){if(origin<low[axis]||origin>high[axis]){hit=false;break;}continue;}
   let a=(low[axis]-origin)/dir,bound=(high[axis]-origin)/dir;
   if(a>bound)[a,bound]=[bound,a];
   enter=Math.max(enter,a);exit=Math.min(exit,bound);
   if(exit<enter){hit=false;break;}
  }
  if(hit&&enter<nearest)nearest=Math.max(.08,enter-.04);
 }
 return target.map((v,i)=>v+vec[i]*nearest);
}
export class WebGLWorld{
 constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl2',{antialias:true,alpha:true});if(!gl)throw Error('WebGL2 unavailable on this device');this.gl=gl;
 const prog=gl.createProgram();gl.attachShader(prog,makeShader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(prog,makeShader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));this.program=prog;gl.useProgram(prog);
 this.uProj=gl.getUniformLocation(prog,'uProj');this.uView=gl.getUniformLocation(prog,'uView');this.uFog=gl.getUniformLocation(prog,'uFog');this.uFogDensity=gl.getUniformLocation(prog,'uFogDensity');this.uNight=gl.getUniformLocation(prog,'uNight');this.uSunDir=gl.getUniformLocation(prog,'uSunDir');this.uSunColor=gl.getUniformLocation(prog,'uSunColor');this.uAmbient=gl.getUniformLocation(prog,'uAmbient');
 this.vao=gl.createVertexArray();this.vbo=gl.createBuffer();
 this.dynamicVAO=gl.createVertexArray();this.dynamicVbo=gl.createBuffer();
 for(const [vao,vbo] of [[this.vao,this.vbo],[this.dynamicVAO,this.dynamicVbo]]){
  gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
  for(let i=0;i<3;i++){const loc=gl.getAttribLocation(prog,['aPos','aNormal','aColor'][i]);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12)}
 }
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);this.camera=[0,12,-22];this.targets=[0,1,0];this.cameraYaw=0;this.cameraPitch=.08;this.lastCameraTime=null;this.staticVertices=new Float32Array(0);this.staticCount=0;this.scene=[];this.obstacles=[];this.ramps=[];this.collectibles=[];this.traffic=[];this.walkers=[];this.t=0;this.timeOfDay=0.4;this.renderScale=1;this.contextLost=false;
 this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);this.resize();}
 dispose(){window.removeEventListener?.('resize',this.onResize);if(this.contextLost)return;const gl=this.gl;for(const obj of [this.vbo,this.dynamicVbo])gl.deleteBuffer?.(obj);for(const vao of [this.vao,this.dynamicVAO])gl.deleteVertexArray?.(vao);gl.deleteProgram?.(this.program);}
 setRenderScale(scale){this.renderScale=clamp(Number(scale)||1,.62,1);this.resize();return this.renderScale;}
 resize(){const d=Math.min(devicePixelRatio||1,1.45)*this.renderScale,w=Math.max(1,Math.round(this.canvas.clientWidth*d)),h=Math.max(1,Math.round(this.canvas.clientHeight*d));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h)}
 generate(level=1){const random=seeded(31415+level*13),b=new MeshBuilder();this.obstacles=[];this.ramps=[];this.traffic=[];this.walkers=[];this.lastCameraTime=null;
 b.box(0,-.9,0,290,.75,290,'#16344e');
 b.box(0,-.4,0,250,.28,250,'#25566b');
 // Roads, pedestrian sidewalks, markings and bike lane.
 for(const x of [-32,0,32]){
  b.box(x,-.13,0,13,.13,190,'#25334e');for(const zz of [-85,-63,-41,-19,3,25,47,69])b.box(x,-.045,zz,.18,.015,8,'#e0cd7b');
  b.box(x-8,-.14,0,2,.1,190,'#7c8296');b.box(x+8,-.14,0,2,.1,190,'#7c8296');
 }
 b.box(0,-.11,-30,185,.13,12,'#25334e');for(let x=-85;x<90;x+=19)b.box(x,-.02,-30,9,.017,.14,'#e2deac');
 // Overhead parking lot, rooftops, arcade ramps and neon alley.
 b.box(-59,.1,-12,20,5,22,'#3a5578');b.box(-59,5.1,-12,22,.42,24,'#6684a7');
 for(let i=0;i<5;i++){b.box(-59,5.4,-23+i*5,21,.18,.2,'#c0cad3')}
 for(const [x,z] of [[-23,14],[17,-9],[-57,35]]){
  b.ramp(x,z,8,14,3,'#c46bc4');this.ramps.push({x,z,w:8,d:14,h:3});
 }
 for(let bx=-94;bx<95;bx+=19)for(let bz=-89;bz<43;bz+=18){
  if(Math.abs(bx+32)<14||Math.abs(bx)<13||Math.abs(bx-32)<14||Math.abs(bz+30)<15)continue;
  if(random()<.25)continue;
  const h=6+random()*31,w=8+random()*5,d=8+random()*6;
  const col=['#465679','#6573a1','#4c779b','#60518d','#466385','#8b669e'][Math.floor(random()*6)];
  b.box(bx,0,bz,w,h,d,col);b.box(bx,h,bz,w+1,.45,d+1,'#9aa7c2');
  this.obstacles.push({x:bx,z:bz,w,d,h});
  // Small lit facade panels: real 3D quads, not a 2D fake skyline.
  for(let yy=2.5;yy<h-1;yy+=3.3){
   for(let xx=bx-w/2+1.7;xx<bx+w/2-1;xx+=2.8){
    const color=random()<.25?'#142f50':random()<.35?'#e2ca8e':'#80d9f1';
    b.quad([xx,yy,bz-d/2-.04],[xx+1.4,yy,bz-d/2-.04],[xx+1.4,yy+1.6,bz-d/2-.04],[xx,yy+1.6,bz-d/2-.04],color);
   }
   for(let zz=bz-d/2+1.7;zz<bz+d/2-1;zz+=3){
    b.quad([bx+w/2+.04,yy,zz],[bx+w/2+.04,yy+1.6,zz],[bx+w/2+.04,yy+1.6,zz+1.3],[bx+w/2+.04,yy,zz+1.3],random()<.3?'#193454':'#73b9da');
   }
  }
 }
 // Neon-lit boulevard details: lamps, crossings, palms, parked cars, rooftop neon strips.
 for(const lane of [-32,0,32])for(let z=-85;z<60;z+=24){
  for(const side of [-1,1]){
   const sx=lane+side*8.5;b.box(sx,0,z,.25,7.1,.25,'#657590');
   b.box(sx-side*.8,7,z,.95,.18,1.1,'#fdf2b1');b.box(sx,.05,z+2,.8,.2,.8,'#557f8e');
  }
 }
 for(let z of [-54,-7,38])for(let x of [-32,0,32])for(let k=-5;k<=5;k++)b.box(x+k*.95,-.018,z,0.58,.02,2.1,'#bfcadd');
 for(let i=0;i<22;i++){const z=-88+i*7,x=-52+(i%2)*98;
  b.box(x,0,z,.52,5.5,.52,'#98715b');b.roof(x,4.2,z,3.3,2.8,i%2?'#1fbb90':'#1695a4');
 }
 // Harbor highway and skyline framing the drive toward the coastline.
 b.box(-46,4.5,53,26,.55,8,'#5c6e8c');for(let x of [-57,-46,-35])b.box(x,0,53,.8,4.5,.8,'#8c90a8');
 for(let i=0;i<14;i++){let x=-110+i*16;b.box(x,0,61,.45,4.3,.45,'#627a9b');b.box(x,4.3,61,8,.16,.25,'#7edce7')}
 // Coastal highway is a physically traversable, elevated 3D causeway.
 // Cars can now genuinely drive to the harbor instead of hitting an invisible
 // shoreline at z=64. The remaining coast is still water for swimming.
 b.box(0,-.32,66,280,.22,22,'#c5b079');b.box(0,-.28,79,280,.14,9,'#ead399');b.box(0,-.25,111,300,.19,58,'#086998');
 b.ramp(0,57,12,20,1.55,'#33445b');this.ramps.push({x:0,z:57,w:12,d:20,h:1.55});
 b.box(0,1.55,95,12,.28,57,'#344359');
 for(let zz=72;zz<=119;zz+=9)b.box(0,1.85,zz,.21,.025,3.4,'#f4d59b');
 for(let side of [-1,1]){
  b.box(side*6.5,1.58,93,.35,.3,62,'#a8c0c7');
  for(let zz=69;zz<=120;zz+=6)b.box(side*6.5,1.92,zz,.22,.85,.22,'#c2e5ef');
 }
 b.box(0,1.83,114,10,.035,4,'#66d4da');
 // Harbor arrival gate is geometry, not a floating HUD illustration.
 for(let side of [-1,1])b.box(side*5.0,1.85,114,.45,6,.5,'#697b9b');
 b.beam([-5,7.5,114],[5,7.5,114],.34,'#67f5e7');
 for(let i=0;i<29;i++){const x=-120+random()*245,z=73+random()*6;b.box(x,0,z,.24,4,.24,'#765c3c');b.roof(x,3.7,z,2+random()*2,2,'#13b6a6')}
 // Sunset Harbor landmark: a lit Ferris wheel and suspended coastal bridge.
 const wheelX=-86,wheelZ=87,wheelY=17,rad=13,segments=28;
 b.beam([wheelX,0,wheelZ],[wheelX,wheelY,wheelZ],.37,'#7593af');
 for(let i=0;i<segments;i++){
  const a=i*TAU/segments,c=(i+1)*TAU/segments;
  const point=t=>[wheelX+Math.cos(t)*rad,wheelY+Math.sin(t)*rad,wheelZ];
  b.beam(point(a),point(c),.21,i%3===0?'#ff75bb':'#6defff');
  if(i%4===0){b.beam([wheelX,wheelY,wheelZ],point(a),.095,'#b7d6e7');b.box(point(a)[0],point(a)[1]-1.3,wheelZ,1.8,1.6,1.4,'#f7a9b4');}
 }
 const bridgeZ=118;
 for(let xx=-95;xx<=95;xx+=5){
  b.box(xx,1.2,bridgeZ,5.15,.34,7,'#667893');
  if(xx%10===0){b.box(xx,1.1,bridgeZ-4,.15,2.5,.15,'#aac9d7');b.box(xx,1.1,bridgeZ+4,.15,2.5,.15,'#aac9d7')}
 }
 for(const towerX of [-55,55]){
  b.box(towerX,0,bridgeZ-3,.9,23,.9,'#9eabbd');b.box(towerX,0,bridgeZ+3,.9,23,.9,'#9eabbd');b.beam([towerX,23,bridgeZ-3],[towerX,23,bridgeZ+3],.3,'#e9cba8');
  for(let offset=-50;offset<=50;offset+=10){
   const x=towerX+offset;if(x>95||x< -95)continue;
   b.beam([towerX,23,bridgeZ-3],[x,3,bridgeZ-3],.055,'#c4d3e8');
   b.beam([towerX,23,bridgeZ+3],[x,3,bridgeZ+3],.055,'#c4d3e8');
  }
 }
 // Highway arrows, futuristic rooftop signs and sidewalk planters.
 for(let n=0;n<13;n++){
  const xx=-86+n*14;b.box(xx,.04,-30,1.7,.018,1.1,'#6fddff');
 }
 for(const [xx,zz,height,color] of [[-43,22,17,'#fb68bb'],[45,-44,20,'#4be9eb'],[-74,-58,13,'#f1ce77']]){
  b.box(xx,height,zz,5,.27,.6,color);b.box(xx,height-1,zz,4.3,1.2,.35,color);
 }
 // Alpine/woodland. Low-poly evergreen firs, peaks.
 for(let i=0;i<65;i++){const x=47+random()*76,z=-113+random()*106;if(Math.abs(x-64)<9)continue;
  b.box(x,0,z,.8,3,.8,'#805a47');b.roof(x,3,z,3.2,7,'#157767');b.roof(x,5,z,2.4,5,'#20a08a');
 }
 for(let i=0;i<18;i++){const x=65+random()*55,z=1+random()*48,h=4+random()*14;b.roof(x,0,z,6+random()*10,h,'#657d85')}
 // Skate-park / rails & track.
 b.box(-74,-.03,60,35,.2,25,'#4e628c');
 for(let i=0;i<5;i++){const x=-89+i*7;b.ramp(x,60,5,10,1.5+i*.35,'#ed8f6d');this.ramps.push({x,z:60,w:5,d:10,h:1.5+i*.35})}
 for(let i=0;i<13;i++){const x=-90+i*3.8;b.box(x,1.2,46,.22,.18,5,'#3afad7')}
 // Functional traffic and moving people are rendered per frame.
 this.traffic=Array.from({length:14},(_,i)=>({lane:[-33,0,32][i%3]+(i%2?3:-3),position:-90+i*12,speed:2.4+random()*3.5,color:['#e99a4b','#43caca','#cc569a','#f6cf67'][i%4]}));
 this.walkers=Array.from({length:32},(_,i)=>({x:-92+random()*172,z:-83+random()*134,phase:random()*TAU,walk:0.6+random()*1.2}));
 this.staticVertices=new Float32Array(b.vertices);this.staticCount=this.staticVertices.length/9;
 const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.vbo);gl.bufferData(gl.ARRAY_BUFFER,this.staticVertices,gl.STATIC_DRAW);
 }
 draw(player,config,pickups,t){if(this.contextLost)return {weather:config.weather||'clear',night:0,daylight:true};this.resize();const gl=this.gl;gl.useProgram(this.program);gl.bindVertexArray(this.vao);
 this.t=t;const mins=Number(config.dayCycleMinutes)||12;this.timeOfDay=(t/(mins*60))%1;
 const night=Math.sin(this.timeOfDay*TAU)<-0.18?0.68:0.04;
 const weather=config.weather==='cycle'?(['clear','clear','rain','fog'][Math.floor(t/50)%4]):config.weather;
 const sky=weather==='fog'?[.37,.32,.43]:night>.3?[.025,.035,.10]:[.43,.32,.49];
 if(this.canvas.dataset)this.canvas.dataset.sky=night>.3?'night':weather==='rain'?'rain':weather==='fog'?'fog':'sunset';
 gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const yaw=this.cameraYaw;const forward=[Math.sin(yaw),Math.cos(yaw)];
 const range=player.vehicle==='car'?18:13.8;
 const target=[player.x,player.y+1.8,player.z];
 const unoccluded=[player.x-forward[0]*range,player.y+7.4+range*Math.sin(this.cameraPitch),player.z-forward[1]*range];
 const desired=cameraSafePosition(target,unoccluded,this.obstacles);
 // Avoid smoothing through a wall: interpolate, then recheck the interpolated segment.
 const cameraDt=this.lastCameraTime===null?1/60:Math.max(0,t-this.lastCameraTime);
 this.lastCameraTime=t;
 const follow=cameraFollowFactor(cameraDt);
 const eased=this.camera.map((v,i)=>lerp(v,desired[i],follow));
 const visible=cameraSafePosition(target,eased,this.obstacles);
 this.camera=visible;
 gl.uniformMatrix4fv(this.uProj,false,matPerspective(69*Math.PI/180,this.canvas.width/this.canvas.height,.1,310));gl.uniformMatrix4fv(this.uView,false,lookAt(this.camera,target));
 const sunAngle=this.timeOfDay*TAU;
 // Sunrise/sunset warmth moves as the in-world clock advances, night uses a dim cool key.
 const daylight=Math.max(0,Math.cos(sunAngle));
 const warm=0.52+0.48*Math.max(0,Math.sin(sunAngle));
 gl.uniform3fv(this.uSunDir,[.55*Math.cos(sunAngle),.3+Math.max(0,daylight),.55*Math.sin(sunAngle)]);
 gl.uniform3fv(this.uSunColor,night>.3?[.13,.23,.46]:[1.13,.73+.18*warm,.50+.20*warm]);
 gl.uniform1f(this.uAmbient,night>.3?.34:weather==='rain'?.54:.64);
 gl.uniform3fv(this.uFog,sky);gl.uniform1f(this.uFogDensity,weather==='fog'?.00038:.000095);gl.uniform1f(this.uNight,night);
 const dynamic=new MeshBuilder();const px=player.x,py=player.y,pz=player.z;
  // All avatar limbs, face, cosmetics and skateboard are actual animated 3D meshes.
  if(player.vehicle==='foot'||player.vehicle==='skate')buildCharacterMesh(dynamic,player,t);
  else buildVehicleMesh(dynamic,{x:player.x,y:player.y,z:player.z,angle:player.angle||0,color:player.vehicle==='car'?'#fa5770':'#f9ac3c'});
 // Road traffic and chase police.
 for(const [i,v] of this.traffic.slice(0,Math.round(this.traffic.length*(config.trafficDensity??.65))).entries()){
  if(v.occupied)continue; // A stolen car is rendered once as the driver's 3D vehicle.
  const z=trafficPosition(v,t);const dist=Math.hypot(v.lane-px,z-pz);
  if(dist<42)buildVehicleMesh(dynamic,{x:v.lane,z,angle:0,color:v.color});
  else if(dist<135){dynamic.box(v.lane,.12,z,2.2,.72,3.65,v.color);dynamic.box(v.lane,.84,z,1.7,.67,1.68,'#6c9db8');}
 }
 if(player.heat>.02){const policeX=player.policeX,policeZ=player.policeZ;
  buildVehicleMesh(dynamic,{x:policeX,y:this.elevation(policeX,policeZ),z:policeZ,angle:Math.atan2(player.x-policeX,player.z-policeZ),police:true,flash:Math.floor(t*7)%2===0});}
 for(let i=0;i<Math.round(this.walkers.length*(config.pedestrianDensity??.7));i++){
  const ped=this.walkers[i],zx=ped.x+Math.sin(t*ped.walk+ped.phase)*2.2,zz=ped.z+Math.cos(t*ped.walk+ped.phase)*2.4;
  // CPU meshing is expensive on mobile; do not tessellate people beyond draw range.
  const distSq=(zx-px)**2+(zz-pz)**2;
  if(distSq>90*90)continue;
  if(distSq<33*33){
   dynamic.cylinder([zx,.18,zz],[zx+Math.sin(t*ped.walk)*.12,1.42,zz],.24,i%2?'#8cead5':'#eb99c7',7);
   dynamic.sphere(zx,1.59,zz,.27,.28,.26,'#dfae87',6,8);
  }else{
   dynamic.box(zx,.16,zz,.43,1.20,.36,i%2?'#8cead5':'#eb99c7');
   dynamic.box(zx,1.36,zz,.41,.46,.4,'#dfae87');
  }
 }
 for(const p of pickups){if(p.collected)continue;const bob=.7+Math.sin(t*2+p.x)*.25;dynamic.box(p.x,bob,p.z,.8,1.1,.8,'#ffe477');dynamic.roof(p.x,bob+1.15,p.z,.62,.52,'#2cf2d8')}
 if(weather==='rain')for(let i=0;i<190;i++){
  const rx=px+(i*47%50)-25,rz=pz+(i*73%50)-25,ry=((i*17+t*24)%16);dynamic.box(rx,ry,rz,.025,.45,.025,'#73c9fa');
 }
 const buf=new Float32Array(dynamic.vertices);
 gl.bindVertexArray(this.vao);gl.drawArrays(gl.TRIANGLES,0,this.staticCount);
 gl.bindVertexArray(this.dynamicVAO);gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicVbo);gl.bufferData(gl.ARRAY_BUFFER,buf,gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,buf.length/9);
 return {weather,night,daylight:!night};
 }
 elevation(x,z){let h=0;for(const r of this.ramps)if(Math.abs(x-r.x)<r.w/2&&Math.abs(z-r.z)<r.d/2)h=Math.max(h,Math.max(0,((z-r.z)/r.d+.5)*r.h));
  for(const o of this.obstacles)if(Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2)h=Math.max(h,o.h+.48);
  if(onHarborRoad(x,z)&&z>66)return Math.max(h,1.85);
  if(z>65)return -1.4;
  return h;}
 collide(x,z,y){for(const o of this.obstacles){if(Math.abs(x-o.x)<o.w/2+.4&&Math.abs(z-o.z)<o.d/2+.4&&y<o.h-.05)return o;}return null;}
}
// Stable simulation tick independent of phone refresh rate, render-skips or adaptive GPU quality.
// A six-step catch-up cap prevents pathological stalls after WebView background/resume.
export function advanceFixedPhysics(carry,elapsed,onStep,step=1/60,maxSteps=6){
 if(!(step>0)||!(maxSteps>0)||!Number.isFinite(step)||!Number.isFinite(maxSteps))throw Error('Invalid physics timestep');
 let pending=Math.min(step*maxSteps,Math.max(0,Number(carry)||0)+Math.min(.12,Math.max(0,Number(elapsed)||0)));
 let steps=0;
 while(pending+1e-10>=step&&steps<maxSteps){
  pending-=step;steps++;
  if(onStep(step)===false){pending=0;break}
 }
 return {carry:Math.max(0,pending),steps};
}
// Camera-relative controls keep W/forward toward the current view, including after orbit.
export function cameraRelativeInput(x,z,yaw){
 const c=Math.cos(yaw),a=Math.sin(yaw);
 return {x:x*c+z*a,z:z*c-x*a};
}
export function updatePlayer(p,controls,world,dt){dt=Math.min(dt,.05);p.crashCooldown=Math.max(0,p.crashCooldown-dt);
 // Visual stunt timer belongs to the same fixed-step simulation as movement.
 p.trickTimer=Math.max(0,(p.trickTimer||0)-dt);
 p.heat=Math.max(0,p.heat-dt*(p.vehicle==='car'?.012:.055));
 const desiredX=Number(controls.x)||0,desiredZ=Number(controls.z)||0;const inputMag=Math.min(1,Math.hypot(desiredX,desiredZ));
 const dx=inputMag?desiredX/inputMag:0,dz=inputMag?desiredZ/inputMag:0;
 const speed=(p.vehicle==='foot'?5.4:p.vehicle==='skate'?7.5:p.vehicle==='swim'?3.3:12)*(controls.sprint&&p.vehicle!=='car'&&p.vehicle!=='swim'?1.42:1);
 p.moving=inputMag>.08;
 if(p.moving){const targetAngle=Math.atan2(dx,dz),angDiff=Math.atan2(Math.sin(targetAngle-p.angle),Math.cos(targetAngle-p.angle));p.angle+=clamp(angDiff,-4*dt,4*dt)}
 const friction=world.weather==='rain'?.7:1;const accel=p.vehicle==='car'?2.7:4.4;
 p.vx=lerp(p.vx,dx*speed*friction,Math.min(1,dt*accel));p.vz=lerp(p.vz,dz*speed*friction,Math.min(1,dt*accel));
 const nx=clamp(p.x+p.vx*dt,-120,120),nz=clamp(p.z+p.vz*dt,-118,121);
 const building=world.collide(nx,nz,p.y);
 const shoreline=p.vehicle==='car'&&nz>64&&!onHarborRoad(nx,nz);
 if(!building&&!shoreline){p.x=nx;p.z=nz}
 else {p.vx*=.05;p.vz*=.05;
  if(p.vehicle==='car'&&p.crashCooldown<=0){p.hp=Math.max(0,p.hp-1);p.crashCooldown=2;p.heat=Math.min(1,p.heat+.15)}
 }
 const water=p.z>66&&!onHarborRoad(p.x,p.z);
 if(water&&p.vehicle!=='car'){p.vehicle='swim';p.vy=clamp(p.vy,-2,2);p.y=lerp(p.y,-.5,.06);if(controls.jump)p.y=Math.min(1,p.y+dt*2);if(controls.dive)p.y=Math.max(-2,p.y-dt*1.9);}
 else {if(p.vehicle==='swim')p.vehicle='foot';const targetY=world.elevation(p.x,p.z);
  if(controls.jump&&p.onGround){p.vy=p.vehicle==='skate'?7.8:6.7;p.onGround=false;}
  if(controls.climb&&!p.onGround){p.vy=Math.max(p.vy,2.6)}
  p.vy-=18*dt;p.y+=p.vy*dt;
  if(p.y<=targetY){p.y=targetY;p.vy=0;p.onGround=true;}else p.onGround=false;
 }
 // Police approaches at a bounded speed while pursuit is active. Collision can take a heart.
 if(p.heat>.05){
  const chaseSpeed=dt*(p.vehicle==='car'?5.2:3.6),dist=Math.hypot(p.x-p.policeX,p.z-p.policeZ)||1;
  p.policeX+=(p.x-p.policeX)/dist*Math.min(dist,chaseSpeed);
  p.policeZ+=(p.z-p.policeZ)/dist*Math.min(dist,chaseSpeed);
  if(dist<2.25&&p.crashCooldown<=0){p.hp=Math.max(0,p.hp-1);p.crashCooldown=2.5;p.heat=Math.min(1,p.heat+.2);}
 }
 // Traffic collision belongs to the physics tick, never inside render().
 if(p.vehicle==='car'&&p.crashCooldown<=0&&Array.isArray(world.traffic)){
  const now=Number(world.t)||0;
  for(const car of world.traffic){if(car.occupied)continue;const z=trafficPosition(car,now);
   if(Math.abs(car.lane-p.x)<2.65&&Math.abs(z-p.z)<3.15){p.hp=Math.max(0,p.hp-1);p.crashCooldown=2;break;}
  }
 }
 if(p.hp<=0){p.hp=0;p.vehicle='foot';p.heat=0;p.vx=0;p.vy=0;p.vz=0;return 'crash';}
 return null;
}
