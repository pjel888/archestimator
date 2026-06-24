import type { CreatableComboboxOption } from "@/components/ui/creatable-combobox";

// Non-component export kept out of NewProjectFormSections.tsx so that file can
// ship only components and stay inside a Vite/react-refresh Fast Refresh
// boundary. Importing this constant into a component file is safe — it is a
// stable module-scope value, not something HMR needs to preserve state for.
export const CREATE_PROJECT_CURRENCY_OPTIONS: CreatableComboboxOption[] = [
  { id: "PHP", label: "PHP", description: "Philippine peso" },
  { id: "USD", label: "USD", description: "US dollar" },
  { id: "EUR", label: "EUR", description: "Euro" },
  { id: "GBP", label: "GBP", description: "British pound" },
  { id: "JPY", label: "JPY", description: "Japanese yen" },
  { id: "SGD", label: "SGD", description: "Singapore dollar" },
  { id: "AUD", label: "AUD", description: "Australian dollar" },
  { id: "CAD", label: "CAD", description: "Canadian dollar" },
  { id: "HKD", label: "HKD", description: "Hong Kong dollar" },
  { id: "CNY", label: "CNY", description: "Chinese yuan" },
  { id: "KRW", label: "KRW", description: "South Korean won" },
  { id: "THB", label: "THB", description: "Thai baht" },
  { id: "IDR", label: "IDR", description: "Indonesian rupiah" },
  { id: "MYR", label: "MYR", description: "Malaysian ringgit" },
  { id: "VND", label: "VND", description: "Vietnamese dong" },
  { id: "INR", label: "INR", description: "Indian rupee" },
  { id: "AED", label: "AED", description: "UAE dirham" },
  { id: "SAR", label: "SAR", description: "Saudi riyal" },
  { id: "CHF", label: "CHF", description: "Swiss franc" },
  { id: "NZD", label: "NZD", description: "New Zealand dollar" },
];
