import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { HorizonSlider } from "./HorizonSlider";
import type { HorizonSliderProps } from "./types";

/** The slider is controlled, so tests need a parent that holds the value like a real app would. */
function Controlled({
  initial = 24,
  onValue,
  ...rest
}: Partial<Omit<HorizonSliderProps, "value" | "onChange">> & { initial?: number; onValue?: (v: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <HorizonSlider
      {...rest}
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

const slider = () => page.getByRole("slider");

describe("HorizonSlider: accessible name and value text", () => {
  it("is a native range input named by its label (linked with htmlFor)", async () => {
    await render(<Controlled />);
    await expect.element(page.getByRole("slider", { name: "Forecast horizon" })).toBeVisible();
    const input = slider().element() as HTMLInputElement;
    expect(input.type).toBe("range");
    expect(input.labels?.[0]?.textContent).toBe("Forecast horizon");
  });

  it("clicking the label focuses the slider", async () => {
    await render(<Controlled />);
    await page.getByText("Forecast horizon").click();
    await expect.element(slider()).toHaveFocus();
  });

  it("uses a custom label", async () => {
    await render(<Controlled label="Lead time" />);
    await expect.element(page.getByRole("slider", { name: "Lead time" })).toBeVisible();
  });

  it("aria-valuetext defaults to '<n> hours'", async () => {
    await render(<Controlled initial={24} />);
    await expect.element(slider()).toHaveAttribute("aria-valuetext", "24 hours");
  });

  it("aria-valuetext uses formatValue and follows the value", async () => {
    const formatValue = vi.fn((v: number) => `${v}h ahead`);
    const screen = await render(<HorizonSlider value={6} onChange={() => {}} formatValue={formatValue} />);
    await expect.element(slider()).toHaveAttribute("aria-valuetext", "6h ahead");
    await screen.rerender(<HorizonSlider value={30} onChange={() => {}} formatValue={formatValue} />);
    await expect.element(slider()).toHaveAttribute("aria-valuetext", "30h ahead");
  });

  it("falls back to aria-label, with no <label> element, when the label is empty", async () => {
    const { container } = await render(<Controlled label="" aria-label="Lead time" />);
    await expect.element(page.getByRole("slider", { name: "Lead time" })).toBeVisible();
    expect(container.querySelector("label")).toBeNull();
  });

  it("warns in development when the slider has no accessible name at all", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await render(<Controlled label="" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no accessible name"));
    warn.mockRestore();
  });

  it("hides the visible value text and the tick labels from assistive technology", async () => {
    const { container } = await render(<Controlled initial={24} />);
    expect(container.querySelector(".fc-slider__value")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".fc-slider__ticks")?.getAttribute("aria-hidden")).toBe("true");
    // The value is still shown for sighted users.
    expect(container.querySelector(".fc-slider__value")?.textContent).toBe("24 hours");
  });
});

describe("HorizonSlider: props", () => {
  it("uses 0..48 step 1 by default and honours custom min, max and step", async () => {
    await render(<Controlled />);
    const defaults = slider().element() as HTMLInputElement;
    expect([defaults.min, defaults.max, defaults.step]).toEqual(["0", "48", "1"]);

    await render(<Controlled min={6} max={72} step={6} initial={12} />);
    const custom = page.getByRole("slider").nth(1).element() as HTMLInputElement;
    expect([custom.min, custom.max, custom.step]).toEqual(["6", "72", "6"]);
  });

  it("renders the five default ticks as 0h, 12h, 24h, 36h, 48h", async () => {
    const { container } = await render(<Controlled />);
    const ticks = [...container.querySelectorAll(".fc-slider__tick")].map((el) => el.textContent);
    expect(ticks).toEqual(["0h", "12h", "24h", "36h", "48h"]);
  });

  it("renders custom ticks, using formatValue for their text", async () => {
    const { container } = await render(<Controlled ticks={[0, 24]} formatValue={(v) => `T+${v}`} />);
    const ticks = [...container.querySelectorAll(".fc-slider__tick")].map((el) => el.textContent);
    expect(ticks).toEqual(["T+0", "T+24"]);
  });

  it("places ticks under the thumb's real travel, so 0h and 48h line up with the ends", async () => {
    const { container } = await render(<Controlled />);
    const input = slider().element() as HTMLInputElement;
    const box = input.getBoundingClientRect();
    const thumb = parseFloat(getComputedStyle(input).getPropertyValue("--fc-thumb"));
    const ticks = [...container.querySelectorAll<HTMLElement>(".fc-slider__tick")];
    const center = (el: HTMLElement) => el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2;

    expect(thumb).toBeGreaterThan(0);
    expect(center(ticks[0] as HTMLElement)).toBeCloseTo(box.left + thumb / 2, 0);
    expect(center(ticks[ticks.length - 1] as HTMLElement)).toBeCloseTo(box.right - thumb / 2, 0);
  });

  it("uses the id you pass", async () => {
    await render(<Controlled id="my-slider" />);
    expect(slider().element().id).toBe("my-slider");
  });

  it("is disabled when asked, and ignores the keyboard", async () => {
    const onValue = vi.fn();
    await render(<Controlled disabled onValue={onValue} />);
    await expect.element(slider()).toBeDisabled();
    await userEvent.keyboard("{ArrowRight}");
    expect(onValue).not.toHaveBeenCalled();
  });
});

describe("HorizonSlider: real keyboard use (Chromium's native range behaviour)", () => {
  async function focused(initial = 24, extra: Parameters<typeof Controlled>[0] = {}) {
    const onValue = vi.fn();
    await render(<Controlled initial={initial} onValue={onValue} {...extra} />);
    (slider().element() as HTMLInputElement).focus();
    await expect.element(slider()).toHaveFocus();
    return onValue;
  }

  it("ArrowRight and ArrowUp add one step", async () => {
    const onValue = await focused(24);
    await userEvent.keyboard("{ArrowRight}");
    expect(onValue).toHaveBeenLastCalledWith(25);
    await userEvent.keyboard("{ArrowUp}");
    expect(onValue).toHaveBeenLastCalledWith(26);
    await expect.element(slider()).toHaveAttribute("aria-valuetext", "26 hours");
  });

  it("ArrowLeft and ArrowDown subtract one step", async () => {
    const onValue = await focused(24);
    await userEvent.keyboard("{ArrowLeft}");
    expect(onValue).toHaveBeenLastCalledWith(23);
    await userEvent.keyboard("{ArrowDown}");
    expect(onValue).toHaveBeenLastCalledWith(22);
  });

  it("Home jumps to the minimum and End to the maximum", async () => {
    const onValue = await focused(24);
    await userEvent.keyboard("{Home}");
    expect(onValue).toHaveBeenLastCalledWith(0);
    await userEvent.keyboard("{End}");
    expect(onValue).toHaveBeenLastCalledWith(48);
  });

  it("does not go past the ends", async () => {
    const onValue = await focused(48);
    await userEvent.keyboard("{ArrowRight}");
    expect(onValue).not.toHaveBeenCalled(); // already at max: no change event
    await expect.element(slider()).toHaveAttribute("aria-valuetext", "48 hours");
  });

  it("moves by the custom step", async () => {
    const onValue = await focused(12, { min: 0, max: 72, step: 6 });
    await userEvent.keyboard("{ArrowRight}");
    expect(onValue).toHaveBeenLastCalledWith(18);
  });

  it("PageUp increases and PageDown decreases by more than one step", async () => {
    // The size of a page step is browser-defined, so only direction and size > 1 are asserted.
    const onValue = await focused(24);
    await userEvent.keyboard("{PageUp}");
    expect(onValue.mock.lastCall?.[0]).toBeGreaterThan(25);
    await userEvent.keyboard("{PageDown}");
    expect(onValue.mock.lastCall?.[0]).toBeLessThan(onValue.mock.calls[0]?.[0] as number);
  });

  it("passes onChange a number, not a string", async () => {
    const onValue = await focused(24);
    await userEvent.keyboard("{ArrowRight}");
    expect(typeof onValue.mock.lastCall?.[0]).toBe("number");
  });
});
