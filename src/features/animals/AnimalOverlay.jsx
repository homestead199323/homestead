import React from "react";
import { C, SX } from "../../lib/theme";
import { LDB } from "../../data/livestock";
import { BREEDS } from "../../data/breeds";
import { Btn, Card, Overlay, Pill } from "../../components/ui";
import FarmIcon from "../../components/FarmIcon";

/* ═══════════════════════════════════════════
   ANIMAL OVERLAY — shared popup used from Livestock, TaskQueue, Dashboard
   ═══════════════════════════════════════════ */
function AnimalOverlay({animal, data, setData, onClose}) {
  const db = LDB[animal.type];
  if (!db) {
    return (
      <Overlay title={`${animal.name || animal.type}`} onClose={onClose} wide>
        <div style={{padding:"24px 12px",color:C.t2,fontSize:13}}>No livestock data for this species.</div>
      </Overlay>
    );
  }
  const del = id => {
    setData({...data, livestock: {animals: data.livestock.animals.filter(a => a.id !== id)}});
    onClose();
  };
  const breedInfo = animal.breed ? (BREEDS[animal.type] || []).find(b => b.name === animal.breed) : null;

  return (
    <Overlay title={<span style={{display:"inline-flex",alignItems:"center",gap:8}}><FarmIcon name={animal.type} emoji={db.e} size={24}/>{(animal.name || animal.type) + " Care Guide"}</span>} onClose={onClose} wide>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        <Pill>×{animal.count} head</Pill>
        {animal.breed && <Pill c={C.blue} bg={C.tBlue}>{animal.breed}</Pill>}
        {db.prod.map(p => <Pill key={p} c={C.green} bg={C.gp}>{p}</Pill>)}
      </div>
      {breedInfo && (
        <Card style={{marginBottom:8,background:C.tBlue}}>
          <div style={{fontSize:12,fontWeight:700,color:C.blue}}>🧬 Breed: {breedInfo.name}</div>
          <div style={SX.s13mt4}>{breedInfo.note}</div>
          {breedInfo.eggs && <div style={{fontSize:12,color:C.green,marginTop:2}}>Egg production: ~{breedInfo.eggs} eggs/day per hen</div>}
        </Card>
      )}
      {[
        {i:"🍽",t:"Feeding",v:db.feed},
        {i:"🏠",t:"Housing",v:db.house},
        {i:"😴",t:"Sleeping",v:db.sleep},
        {i:"💕",t:"Breeding",v:db.breed},
      ].map(s => (
        <Card key={s.t} style={{marginBottom:8}}>
          <div style={SX.lblGreen}>{s.i} {s.t}</div>
          <div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div>
        </Card>
      ))}
      <Card style={{background:C.tPink,marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries & Treatment</div>
        {db.inj.map((j,i) => (
          <div key={i} style={{marginTop:8}}>
            <strong style={SX.s13}>{j.n}</strong>
            <div style={SX.t2_12mt2}>{j.t}</div>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:8,background:C.tGreen}}>
        <div style={SX.lblGreen}>📦 Produce & Storage</div>
        {Object.entries(db.out).map(([k,v]) => (
          <div key={k} style={{marginTop:6}}>
            <strong style={{fontSize:12}}>{k}</strong>: ~{v.p} {v.u}
            <div style={SX.t2_11}>{v.s}</div>
          </div>
        ))}
      </Card>
      <Btn v="danger" sm onClick={()=>del(animal.id)}>Remove</Btn>
    </Overlay>
  );
}

export default AnimalOverlay;
