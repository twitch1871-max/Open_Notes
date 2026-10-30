export function filterNotes(notes,query){const q=query.trim().toLocaleLowerCase();return notes.filter(n=>(n.title+' '+n.body).toLocaleLowerCase().includes(q)).sort((a,b)=>b.updated-a.updated);}
export function wordCount(text){return text.trim()?text.trim().split(/\s+/u).length:0;}
export function decodeNotes(raw){const data=JSON.parse(raw);if(!Array.isArray(data)||!data.every(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.body==='string'&&Number.isFinite(n.updated)))throw new Error('Invalid notes');return data;}
