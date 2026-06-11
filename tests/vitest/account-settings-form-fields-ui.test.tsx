import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  ProfileSettingsFields,
  WorkspaceSettingsFields,
} from "@/components/workshop/AccountSettingsFormFields";

function formDataEntries(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries());
}

describe("ProfileSettingsFields", () => {
  it("serializes the same FormData keys and values as the native selects", () => {
    render(
      <form data-testid="profile-form">
        <ProfileSettingsFields
          initial={{
            display_name: "Philip Lewis",
            user_category: "architect",
            country_region: "Philippines",
            primary_use: null,
            student_educator_detail: null,
          }}
        />
      </form>,
    );

    const form = screen.getByTestId("profile-form") as HTMLFormElement;
    expect(formDataEntries(form)).toEqual({
      display_name: "Philip Lewis",
      user_category: "architect",
      country_region: "Philippines",
      primary_use: "",
      student_educator_detail: "",
    });

    fireEvent.click(screen.getByLabelText("User category"));
    fireEvent.click(screen.getByRole("option", { name: "Contractor" }));
    expect(screen.getByLabelText("User category")).toHaveTextContent("Contractor");

    fireEvent.click(screen.getByLabelText("Primary use"));
    fireEvent.click(screen.getByRole("option", { name: "Learning" }));
    expect(screen.getByLabelText("Primary use")).toHaveTextContent("Learning");

    expect(formDataEntries(form)).toMatchObject({
      user_category: "contractor",
      primary_use: "learning",
    });

    // Optional selects must still serialize the cleared empty value.
    fireEvent.click(screen.getByLabelText("Primary use"));
    fireEvent.click(screen.getByRole("option", { name: "Not set" }));
    expect(new FormData(form).get("primary_use")).toBe("");
  });

  it("applies the namePrefix to every select like the native version", () => {
    render(
      <form data-testid="prefixed-form">
        <ProfileSettingsFields
          namePrefix="profile."
          initial={{ display_name: "Philip", user_category: "engineer", country_region: "PH" }}
        />
      </form>,
    );

    const form = screen.getByTestId("prefixed-form") as HTMLFormElement;
    expect(new FormData(form).get("profile.user_category")).toBe("engineer");
    expect(new FormData(form).get("profile.primary_use")).toBe("");
  });

  it("blocks submit on an empty required category, focuses the trigger, and shows invalid state", () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form data-testid="profile-form" onSubmit={onSubmit}>
        {/* Text inputs are pre-filled so the only invalid control is the select. */}
        <ProfileSettingsFields initial={{ display_name: "Philip Lewis", country_region: "Philippines" }} />
        <button type="submit">Save profile</button>
      </form>,
    );

    const trigger = screen.getByLabelText("User category");
    expect(trigger).toHaveTextContent("Select category");
    expect(trigger).toHaveAttribute("aria-required", "true");

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger.className).toContain("border-danger");

    // Picking a value clears the invalid state and unblocks submission.
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("option", { name: "Architect" }));
    expect(trigger).not.toHaveAttribute("aria-invalid");

    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("WorkspaceSettingsFields", () => {
  const workspaceInitial = {
    organization_name: "Lewis Studio",
    organization_type: "architecture_design" as const,
    country_region: "Philippines",
    company_size: null,
    default_currency: "PHP",
    primary_use: null,
  };

  it("serializes the same FormData keys and values as the native selects", () => {
    render(
      <form data-testid="workspace-form">
        <WorkspaceSettingsFields initial={workspaceInitial} />
      </form>,
    );

    const form = screen.getByTestId("workspace-form") as HTMLFormElement;
    expect(formDataEntries(form)).toEqual({
      organization_name: "Lewis Studio",
      organization_type: "architecture_design",
      country_region: "Philippines",
      company_size: "",
      default_currency: "PHP",
      primary_use: "",
    });

    fireEvent.click(screen.getByLabelText("Organization type"));
    fireEvent.click(screen.getByRole("option", { name: "Quantity surveying" }));

    fireEvent.click(screen.getByLabelText("Company size"));
    fireEvent.click(screen.getByRole("option", { name: "11-50" }));

    expect(formDataEntries(form)).toMatchObject({
      organization_type: "quantity_surveying",
      company_size: "11_50",
    });
  });

  it("propagates the whole-form disabled flag to every select trigger", () => {
    render(
      <form>
        <WorkspaceSettingsFields initial={workspaceInitial} disabled />
      </form>,
    );

    const organizationType = screen.getByLabelText("Organization type");
    const companySize = screen.getByLabelText("Company size");
    const primaryUse = screen.getByLabelText("Primary use");

    expect(organizationType).toBeDisabled();
    expect(companySize).toBeDisabled();
    expect(primaryUse).toBeDisabled();

    fireEvent.click(organizationType);
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
