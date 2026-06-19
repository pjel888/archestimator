export type ProjectLocationActionState = {
  readonly status: "idle" | "success" | "error";
  readonly message: string;
  readonly fieldErrors?: {
    readonly latitude?: string;
    readonly longitude?: string;
    readonly accuracyMeters?: string;
  };
};

export const initialProjectLocationActionState: ProjectLocationActionState = {
  status: "idle",
  message: "",
};
