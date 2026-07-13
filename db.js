const DB_NAME='AlGhasraMembershipDB';
const DB_VERSION=1;
let db;

function openDB(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=(event)=>{
      db=event.target.result;
      if(!db.objectStoreNames.contains('members')){
        const store=db.createObjectStore('members',{keyPath:'id',autoIncrement:true});
        store.createIndex('name','name',{unique:false});
        store.createIndex('status','status',{unique:false});
      }
      if(!db.objectStoreNames.contains('timings')){
        const store=db.createObjectStore('timings',{keyPath:'id',autoIncrement:true});
        store.createIndex('date','date',{unique:false});
      }
      if(!db.objectStoreNames.contains('settings')){
        db.createObjectStore('settings',{keyPath:'key'});
      }
    };
    request.onsuccess=()=>{db=request.result;resolve(db)};
    request.onerror=()=>reject(request.error);
  });
}

function storeAction(storeName,mode,action){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(storeName,mode);
    const store=tx.objectStore(storeName);
    const req=action(store);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
const getAll=(s)=>storeAction(s,'readonly',x=>x.getAll());
const getOne=(s,k)=>storeAction(s,'readonly',x=>x.get(k));
const putOne=(s,v)=>storeAction(s,'readwrite',x=>x.put(v));
const addOne=(s,v)=>storeAction(s,'readwrite',x=>x.add(v));
const deleteOne=(s,k)=>storeAction(s,'readwrite',x=>x.delete(k));
const clearStore=(s)=>storeAction(s,'readwrite',x=>x.clear());
