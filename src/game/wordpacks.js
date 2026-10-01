const normalize = words => [...new Map(words.map(w=>{const s=w.normalize('NFKC').trim();return [s.toLocaleLowerCase(),s];})).values()].filter(Boolean);
export function parseWordPack(raw,fallback='我的词库'){
 if(typeof raw!=='string'||raw.length>500000)throw new Error('词库文件需小于 500 KB');
 let data;if(/^[\s]*[\[{]/.test(raw)){try{data=JSON.parse(raw);}catch{throw new Error('JSON 格式有误，请检查括号和引号');}}
 else data={name:fallback,words:raw.split(/[\n,，、;；\r]+/)};
 if(Array.isArray(data))data={name:fallback,words:data};
 if(!data||!Array.isArray(data.words)||data.words.some(w=>typeof w!=='string'))throw new Error('words 必须是由词语字符串组成的数组');
 if(data.words.length>10000)throw new Error('单个词库最多支持 10,000 条词语');
 const words=normalize(data.words);
 if(words.some(w=>w.length>24))throw new Error('每条词语请保持在 24 字符以内');
 if(words.length<25)throw new Error(`去重后只有 ${words.length} 个词，至少需要 25 个`);
 return {id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:typeof data.name==='string'?data.name.trim().slice(0,40)||fallback:fallback,description:typeof data.description==='string'?data.description.slice(0,120):'本地导入的自定义词库',category:typeof data.category==='string'?data.category.slice(0,20):'自定义',language:typeof data.language==='string'?data.language:'zh-CN',words,custom:true};
}
export const mergeWords = packs => normalize(packs.flatMap(p=>p.words));
