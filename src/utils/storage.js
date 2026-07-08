const STORAGE_KEY = 'vsm_builder_flows';

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStorage(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function saveFlow(name, content) {
  const data = readStorage();
  data[name] = { ...content, savedAt: new Date().toISOString() };
  writeStorage(data);
}

export function loadFlow(name) {
  const data = readStorage();
  return data[name] || null;
}

export function listFlows() {
  return Object.keys(readStorage());
}

export function deleteFlow(name) {
  const data = readStorage();
  delete data[name];
  writeStorage(data);
}
