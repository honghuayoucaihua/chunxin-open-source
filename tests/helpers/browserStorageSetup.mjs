const createMemoryStorage = () => {
  const store = new Map();

  return {
    get length() {
      return store.size;
    },
    key(index) {
      return Array.from(store.keys())[Number(index)] ?? null;
    },
    getItem(key) {
      const normalizedKey = String(key);
      return store.has(normalizedKey) ? store.get(normalizedKey) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
    clear() {
      store.clear();
    }
  };
};

const installStorage = (name) => {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: createMemoryStorage()
  });
};

installStorage('localStorage');
installStorage('sessionStorage');
