export interface Field {
  label: string;
  value: number;
  min?: number;
  max?: number;
  type?: "date";
  options?: readonly string[];
  step?: number;
}
export function field(
  label: string,
  value: number,
  min?: number,
  max?: number,
): Field {
  return { label, value, min, max };
}
export interface Calculator {
  id: string;
  title: string;
  description: string;
  fields: Field[];
  modes?: (Pick<Calculator, "title" | "fields" | "calculate"> &
    Partial<
      Pick<Calculator, "repeatFields" | "schedule" | "source" | "presetChanges">
    >)[];
  calculate: (values: number[]) => Record<string, number | string>;
  source?: string;
  presetChanges?: (
    changedIndex: number,
    values: number[],
  ) => Record<number, number>;
  sourceFor?: (values: number[]) => string | undefined;
  repeatFields?: { size: number; label: string };
  schedule?: (values: number[]) => {
    columns: string[];
    rows: (string | number)[][];
  };
}
export function tool(
  id: string,
  title: string,
  description: string,
  fields: Field[],
  calculate: Calculator["calculate"],
  source?: string,
): Calculator {
  return { id, title, description, fields, calculate, source };
}
