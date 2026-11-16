const fs=require('fs'),vm=require('vm');const ctx={console,Math,JSON,Set,Map,Array,Object};vm.createContext(ctx);
for(const f of ['engine-common','game-cards','game-okey'])vm.runInContext(fs.readFileSync(__dirname+'/../src/'+f+'.js','utf8')+'\nthis.GAMES=GAMES;this.validGroup=validGroup;this.okeyCtx=okeyCtx;this.solveGroups=solveGroups;',ctx);
const G=ctx.GAMES;const stats={};
for(const g of process.argv.slice(3).length?process.argv.slice(3):Object.keys(G)){
  const E=G[g];const N=+process.argv[2]||20;let steps=0,errs=0,t0=Date.now(),wins=[0,0,0,0],extra={};
  for(let k=0;k<N;k++){const n=E.players[E.players.length-1];const s=E.create({},n);let guard=0;
    while(!s.over&&guard++<20000){const d=E.auto(s);if(d!=null){E.advance(s);continue}
      const t=E.turnSeat(s);const a=E.bot(s,t);const e=E.act(s,t,a);steps++;
      if(e){errs++;if(errs<5)console.log(g,'ERR',e,JSON.stringify(a),s.phase);
        // fallback
        if(g==='okey101'){const h=s.hands[t];let ok=false;if(s.mustUse!=null)ok=!E.act(s,t,{type:'giveBack'});
          if(!ok&&s.phase==='discard')for(const tt of h){if(!E.act(s,t,{type:'discard',tile:tt})){ok=true;break}}
          if(!ok&&s.phase==='draw')E.act(s,t,{type:'draw',from:'pile'});}
        else break;}
      if(g==='okey101'&&s.ev&&s.ev.type==='lay')extra.lays=(extra.lays||0)+1;
    }
    if(guard>=20000)console.log(g,'STUCK',s.phase);
    wins[s.winner]++; if(g==='okey101')extra.opens=(extra.opens||0)+s.opened.filter(Boolean).length;
    if(g.startsWith('okey'))extra.finishes=(extra.finishes||0)+s.log.filter(l=>/BİTİRDİ/.test(l)).length;
  }
  console.log(g,'games',N,'steps',steps,'errs',errs,'ms',Date.now()-t0,'wins',wins,JSON.stringify(extra));
}
