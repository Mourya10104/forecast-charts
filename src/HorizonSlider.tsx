import { CSSProperties, useId } from "react";
import type { HorizonSliderProps } from "./types";
import { warnOnce } from "./warn";

/** `count` evenly spaced values from min to max, e.g. 0, 12, 24, 36, 48. */
function evenTicks(min: number, max: number, count: number): number[] {
  if (max <= min) return [min];
  return Array.from({ length: count }, (_, i) => min + ((max - min) * i) / (count - 1));
}

const defaultFormatValue = (value: number) => `${value} hours`;

/**
 * A native `<input type="range">`, so keyboard (arrows, PageUp/PageDown, Home/End),
 * touch and screen reader behaviour all come from the browser. We add the wiring:
 * a label linked with htmlFor and a human-readable aria-valuetext.
 */
export function HorizonSlider(props: HorizonSliderProps) {
  const {
    value,
    onChange,
    min = 0,
    max = 48,
    step = 1,
    label = "Forecast horizon",
    formatValue,
    ticks,
    disabled = false,
    id,
    className,
  } = props;
  const ariaLabel = props["aria-label"];

  const generatedId = useId();
  const inputId = id ?? generatedId;

  const hasVisibleLabel = label !== null && label !== undefined && label !== false && label !== "";
  if (!hasVisibleLabel && !ariaLabel) {
    warnOnce("HorizonSlider has no visible `label` and no `aria-label`, so it has no accessible name.");
  }

  const format = formatValue ?? defaultFormatValue;
  const valueText = format(value);
  const tickValues = ticks ?? evenTicks(min, max, 5);
  const tickText = (tick: number) => (formatValue ? formatValue(tick) : `${tick}h`);
  const percent = (v: number) => (max > min ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0);

  const rootClass = ["fc-slider", disabled ? "fc-slider--disabled" : "", className ?? ""].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="fc-slider__header">
        {hasVisibleLabel && (
          <label className="fc-slider__label" htmlFor={inputId}>
            {label}
          </label>
        )}
        {/* Decorative: screen readers already get the value from aria-valuetext. An <output> here would be
            a live region and announce every change twice. */}
        <span className="fc-slider__value" aria-hidden="true">
          {valueText}
        </span>
      </div>
      <input
        id={inputId}
        className="fc-slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        aria-label={hasVisibleLabel ? undefined : ariaLabel}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
      <div className="fc-slider__ticks" aria-hidden="true">
        {tickValues.map((tick) => (
          <span key={tick} className="fc-slider__tick" style={{ "--fc-p": percent(tick) } as CSSProperties}>
            {tickText(tick)}
          </span>
        ))}
      </div>
    </div>
  );
}
