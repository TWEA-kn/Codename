let context;
export function playSound(type,settings){
 if(!settings.sound||settings.volume<=0)return;
 try{
 context ||= new (window.AudioContext||window.webkitAudioContext)();
 if(context.state==='suspended')context.resume();
 const notes={click:[440],clue:[523,659],correct:[523,659,784],wrong:[294,220],turn:[392,523],win:[523,659,784,1047],lose:[330,262,196,131]};
 (notes[type]||notes.click).forEach((f,i)=>{const o=context.createOscillator(),g=context.createGain(),t=context.currentTime+i*.10;o.type='square';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(settings.volume/100*.07,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+.13);o.connect(g);g.connect(context.destination);o.start(t);o.stop(t+.15);});
 }catch{/* Sound is optional when unavailable. */}
}
