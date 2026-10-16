import en from "./en.json";

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof en>;

export function t(key: string, fallback?: string): string {
  const parts = key.split(".");
  let current: any = en;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return fallback || key;
    }
  }

  return typeof current === "string" ? current : fallback || key;
}

export default en;
