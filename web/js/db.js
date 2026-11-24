// IndexedDB 저장소: 스윙 영상(blob) + 분석 결과
(function (SL) {
  const DB = 'swinglab', STORE = 'swings', VER = 1;
  let _db = null, memory = new Map(); // IndexedDB 불가 환경 대비 메모리 fallback

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((res) => {
      let req;
      try { req = indexedDB.open(DB, VER); } catch (e) { return res(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const s = db.createObjectStore(STORE, { keyPath: 'id' });
          s.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = () => { _db = req.result; res(_db); };
      req.onerror = () => res(null);
    });
  }
  const tx = async (mode, fn) => {
    const db = await open();
    if (!db) return fn(null);
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode), s = t.objectStore(STORE);
      const r = fn(s);
      t.oncomplete = () => res(r && 'result' in r ? r.result : r);
      t.onerror = () => rej(t.error);
    });
  };

  SL.db = {
    async put(rec) {
      rec.updatedAt = Date.now();
      const db = await open();
      if (!db) { memory.set(rec.id, rec); return rec; }
      await tx('readwrite', s => s.put(rec));
      return rec;
    },
    async get(id) {
      const db = await open();
      if (!db) return memory.get(id) || null;
      return tx('readonly', s => s.get(id));
    },
    async all() {
      const db = await open();
      let list = db ? await tx('readonly', s => s.getAll()) : [...memory.values()];
      return (list || []).sort((a, b) => b.createdAt - a.createdAt);
    },
    async del(id) {
      const db = await open();
      if (!db) { memory.delete(id); return; }
      await tx('readwrite', s => s.delete(id));
    },
    async clear() {
      const db = await open();
      if (!db) { memory.clear(); return; }
      await tx('readwrite', s => s.clear());
    },
  };

  // 저장된 레코드에서 재생용 URL 생성 (페이지 떠날 때 revoke)
  SL.blobUrl = (rec) => rec && rec.blob ? URL.createObjectURL(rec.blob) : null;
})(window.SL);
