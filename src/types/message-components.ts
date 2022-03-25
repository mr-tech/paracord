import type { Emoji } from '.';

export type ComponentType =
  /** Action Row */
  1 |
  /** Button */
  2 |
  /** Select Menu */
  3 |
  /** Text Input */
  4;

// ========================================================================

export type Button = {
  /** `2` for a button */
  type: 2;
  /** one of button styles */
  style: ButtonStyleType;
  /** text that appears on the button, max 80 characters */
  label?: string;
  /** `name`, `id`, and `animated` */
  emoji?: Partial<Emoji>;
  /** a developer-defined identifier for the button, max 100 characters */
  custom_id?: string;
  /** a url for link-style buttons */
  url?: string;
  /** whether the button is disabled (default `false`) */
  disabled?: boolean;
};

// ========================================================================

export type ButtonStyleType =
  /** Primary */
  1 |
  /** Secondary */
  2 |
  /** Success */
  3 |
  /** Danger */
  4 |
  /** Link */
  5;

// ========================================================================

export type SelectMenu = {
  /** `3` for a select menu */
  type: 3;
  /** a developer-defined identifier for the select menu, max 100 characters */
  custom_id: string;
  /** the choices in the select, max 25 */
  options: SelectOption[];
  /** custom placeholder text if nothing is selected, max 150 characters */
  placeholder?: string;
  /** the minimum number of items that must be chosen; default 1, min 0, max 25 */
  min_values?: number;
  /** the maximum number of items that can be chosen; default 1, max 25 */
  max_values?: number;
  /** disable the select, default false */
  disabled?: boolean;
};

// ========================================================================

export type SelectOption = {
  /** the user-facing name of the option, max 100 characters */
  label: string;
  /** the dev-define value of the option, max 100 characters */
  value: string;
  /** an additional description of the option, max 100 characters */
  description?: string;
  /** `id`, `name`, and `animated` */
  emoji?: Partial<Emoji>;
  /** will render this option as selected by default */
  default?: boolean;
};

// ========================================================================

export type TextInput = {
  /** `4` for a text input */
  type: 4;
  /** a developer-defined identifier for the input, max 100 characters */
  custom_id: string;
  /** the Text Input Style */
  style: number;
  /** the label for this component, max 45 characters */
  label: string;
  /** the minimum input length for a text input, min 0, max 4000 */
  min_length?: number;
  /** the maximum input length for a text input, min 1, max 4000 */
  max_length?: number;
  /** whether this component is required to be filled, default true */
  required?: boolean;
  /** a pre-filled value for this component, max 4000 characters */
  value?: string;
  /** custom placeholder text if the input is empty, max 100 characters */
  placeholder?: string;
};

// ========================================================================

export type TextInputStyleType =
  /** Short */
  1 |
  /** Paragraph */
  2;
