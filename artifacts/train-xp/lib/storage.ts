import AsyncStorage from "@react-native-async-storage/async-storage";

let writes: Promise<unknown> = Promise.resolve();
export function queueStorageWrite(
  operation: () => Promise<unknown>,
): Promise<void> {
  const next = writes.catch(() => undefined).then(operation);
  writes = next.catch(() => undefined);
  return next.then(() => undefined);
}
export const writeJson = (key: string, value: unknown) =>
  queueStorageWrite(() => AsyncStorage.setItem(key, JSON.stringify(value)));
export const removeStored = (key: string) =>
  queueStorageWrite(() => AsyncStorage.removeItem(key));
export const flushStorage = () => writes.then(() => undefined);
