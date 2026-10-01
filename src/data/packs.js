// Add a JSON file in wordpacks/ and it is automatically listed in the library.
const modules = import.meta.glob('./wordpacks/*.json', {eager:true, import:'default'});
export const builtInPacks = Object.values(modules).sort((a,b)=>a.id==='classic'?-1:b.id==='classic'?1:a.name.localeCompare(b.name));
