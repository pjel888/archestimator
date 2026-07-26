import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button, ButtonLink, buttonVariants, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button";

const variantClasses: Record<ButtonVariant, string[]> = {
  primary: ["bg-primary", "text-white"],
  brand: ["bg-brand-orange", "text-white"],
  secondary: ["border", "bg-surface", "text-ink"],
  soft: ["border", "bg-accent-soft", "text-accent-dark"],
  outline: ["border", "bg-transparent", "text-ink"],
  ghost: ["text-muted", "hover:bg-surfaceMuted"],
  plain: ["bg-transparent", "text-secondary"],
  danger: ["border", "bg-white", "text-danger"],
  success: ["bg-success", "text-white"],
  warning: ["bg-warning", "text-white"],
  overlay: ["bg-white/[0.10]", "text-white/78"],
  scrim: ["bg-black/12"],
};

const sizeClasses: Record<ButtonSize, string[]> = {
  xs: ["min-h-7", "min-w-[96px]", "px-1.5", "py-1"],
  sm: ["min-h-8", "min-w-[96px]", "px-2", "py-1.5"],
  md: ["min-h-9", "min-w-[96px]", "px-2.5", "py-2"],
  lg: ["min-h-10", "min-w-[96px]", "px-3", "py-2"],
  "icon-xs": ["size-7", "p-0"],
  "icon-sm": ["size-8", "p-0"],
  icon: ["size-9", "p-0"],
  "icon-lg": ["size-10", "p-0"],
  scrim: ["fixed", "inset-0", "p-0"],
};

describe("shared Button primitive", () => {
  it("uses a pointer cursor for actionable buttons, including scrim buttons", () => {
    render(
      <div>
        <Button>Action</Button>
        <Button size="scrim" aria-label="Dismiss overlay" />
      </div>,
    );

    expect(screen.getByRole("button", { name: "Action" })).toHaveClass("cursor-pointer");
    expect(screen.getByRole("button", { name: "Dismiss overlay" })).toHaveClass("cursor-pointer");
  });

  it("exposes stable slot, variant, and size hooks", () => {
    render(<Button variant="primary" size="lg">Publish</Button>);

    expect(screen.getByRole("button", { name: "Publish" })).toHaveAttribute("data-slot", "button");
    expect(screen.getByRole("button", { name: "Publish" })).toHaveAttribute("data-variant", "primary");
    expect(screen.getByRole("button", { name: "Publish" })).toHaveAttribute("data-size", "lg");
  });

  it("exports the same compatibility-preserving styling recipe", () => {
    const className = buttonVariants({ variant: "primary", size: "sm", className: "min-w-0" });

    expect(className).toContain("bg-primary");
    expect(className).toContain("min-h-8");
    expect(className).toContain("min-w-0");
    expect(className).not.toContain("min-w-[96px]");
  });

  it("renders ButtonLink as one typed anchor with shared styling and native link activation", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLAnchorElement>();
    const onClick = vi.fn();
    render(
      <ButtonLink
        ref={ref}
        href="/workshop/projects"
        size="xs"
        className="min-w-0"
        onClick={(event) => {
          event.preventDefault();
          onClick();
        }}
      >
        Open projects
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "Open projects" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/workshop/projects");
    expect(link).not.toHaveAttribute("type");
    expect(link).toHaveAttribute("data-slot", "button-link");
    expect(link).toHaveAttribute("data-size", "xs");
    expect(link).toHaveClass("min-h-7", "min-w-0");
    expect(ref.current).toBe(link);

    link.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supports the compact xs-lg text size scale", () => {
    render(
      <div>
        <Button size="xs">Extra small</Button>
        <Button size="lg">Large</Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Extra small" })).toHaveClass("min-h-7", "px-1.5", "py-1");
    expect(screen.getByRole("button", { name: "Large" })).toHaveClass("min-h-10", "px-3", "py-2");
  });

  it("separates solid background variants from quiet no-background variants", () => {
    render(
      <div>
        <Button variant="success">Approve</Button>
        <Button variant="warning">Flag</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="plain">Plain</Button>
      </div>,
    );

    expect(screen.getByRole("button", { name: "Approve" })).toHaveClass("bg-success", "text-white");
    expect(screen.getByRole("button", { name: "Flag" })).toHaveClass("bg-warning", "text-white");
    expect(screen.getByRole("button", { name: "Outline" })).toHaveClass("border", "bg-transparent");
    expect(screen.getByRole("button", { name: "Plain" })).toHaveClass("bg-transparent", "text-secondary");
  });

  it("keeps mode buttons visible through aria-pressed styling", () => {
    render(
      <Button variant="ghost" aria-pressed="true">
        Mode
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Mode" })).toHaveClass("aria-pressed:bg-surfaceMuted", "aria-pressed:text-ink");
  });

  it("preserves native button defaults, refs, attributes, and click delivery", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <Button ref={ref} onClick={onClick} aria-describedby="button-help" data-test-action="save">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-describedby", "button-help");
    expect(button).toHaveAttribute("data-test-action", "save");
    expect(ref.current).toBe(button);

    await user.click(screen.getByText("Save"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("forwards an explicit submit type", () => {
    render(<Button type="submit">Submit estimate</Button>);

    expect(screen.getByRole("button", { name: "Submit estimate" })).toHaveAttribute("type", "submit");
  });

  it("activates through native Enter and Space keyboard behavior", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Keyboard action</Button>);

    const button = screen.getByRole("button", { name: "Keyboard action" });
    button.focus();
    await user.keyboard("{Enter} ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("prevents activation when disabled while preserving its accessible name", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled aria-busy="true" onClick={onClick}>
        Saving estimate
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving estimate" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(Object.entries(variantClasses) as Array<[ButtonVariant, string[]]>) (
    "preserves the %s variant class contract",
    (variant, expectedClasses) => {
      render(<Button variant={variant}>{variant}</Button>);
      expect(screen.getByRole("button", { name: variant })).toHaveClass(...expectedClasses);
    },
  );

  it.each(Object.entries(sizeClasses) as Array<[ButtonSize, string[]]>) (
    "preserves the %s size class contract",
    (size, expectedClasses) => {
      render(<Button size={size}>{size}</Button>);
      expect(screen.getByRole("button", { name: size })).toHaveClass(...expectedClasses);
    },
  );

  it("keeps caller class overrides last", () => {
    render(
      <Button className="min-h-11 min-w-0 bg-fuchsia-500">
        Override geometry
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Override geometry" });
    expect(button).toHaveClass("min-h-11", "min-w-0", "bg-fuchsia-500");
    expect(button).not.toHaveClass("min-h-9", "min-w-[96px]", "bg-surface");
  });

  it("requires IconButton to expose its label as the accessible name", () => {
    render(<IconButton icon={<span aria-hidden="true">+</span>} label="Add estimate" />);

    expect(screen.getByRole("button", { name: "Add estimate" })).toHaveAttribute("title", "Add estimate");
  });

  it("keeps ToolbarIconButton native click activation single-delivery", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ToolbarIconButton label="Filter estimates" onClick={onClick}>
        <span aria-hidden="true">F</span>
      </ToolbarIconButton>,
    );

    const button = screen.getByRole("button", { name: "Filter estimates" });
    fireEvent.pointerDown(button, { button: 0, pointerType: "mouse" });
    fireEvent.pointerCancel(button, { pointerType: "mouse" });
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.focus(button);
    expect(button).toHaveAttribute("aria-describedby");
    fireEvent.blur(button);

    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0]).toMatchObject({ type: "click" });
  });

  it("keeps ToolbarIconButton keyboard activation and disabled denial native", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <ToolbarIconButton label="Filter estimates" onClick={onClick}>
        <span aria-hidden="true">F</span>
      </ToolbarIconButton>,
    );

    const button = screen.getByRole("button", { name: "Filter estimates" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <ToolbarIconButton label="Filter estimates" onClick={onClick} disabled>
        <span aria-hidden="true">F</span>
      </ToolbarIconButton>,
    );
    await user.click(screen.getByRole("button", { name: "Filter estimates" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
