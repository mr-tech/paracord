import type { ChannelType, Emoji } from '.';

export type ComponentType =
  /** Action Row */
  1 |
  /** Button */
  2 |
  /** String Select */
  3 |
  /** Text Input */
  4 |
  /** User Select */
  5 |
  /** Role Select */
  6 |
  /** Mentionable Select */
  7 |
  /** Channel Select */
  8;

// ========================================================================

export type Button = {
  /** `2` for a button */
  type: 2;
  /** A button style */
  style: ButtonStyleType;
  /** Text that appears on the button; max 80 characters */
  label?: string;
  /** `name`, `id`, and `animated` */
  emoji?: Partial<Emoji>;
  /** Developer-defined identifier for the button; max 100 characters */
  custom_id?: string;
  /** URL for link-style buttons */
  url?: string;
  /** Whether the button is disabled (defaults to `false`) */
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
  /** Type of select menu component (text: `3`, user: `5`, role: `6`, mentionable: `7`, channels: `8`) */
  type: ComponentType;
  /** ID for the select menu; max 100 characters */
  custom_id: string;
  /** Specified choices in a select menu (only required and available for string selects (type `3`); max 25 */
  options?: SelectOption[];
  /** List of channel types to include in the channel select component (type `8`) */
  channel_types?: ChannelType[];
  /** Placeholder text if nothing is selected; max 150 characters */
  placeholder?: string;
  /** Minimum number of items that must be chosen (defaults to 1); min 0, max 25 */
  min_values?: number;
  /** Maximum number of items that can be chosen (defaults to 1); max 25 */
  max_values?: number;
  /** Whether select menu is disabled (defaults to `false`) */
  disabled?: boolean;
};

// ========================================================================

export type SelectOption = {
  /** User-facing name of the option; max 100 characters */
  label: string;
  /** Dev-defined value of the option; max 100 characters */
  value: string;
  /** Additional description of the option; max 100 characters */
  description?: string;
  /** `id`, `name`, and `animated` */
  emoji?: Partial<Emoji>;
  /** Will show this option as selected by default */
  default?: boolean;
};

// ========================================================================

export type TextInput = {
  /** `4` for a text input */
  type: 4;
  /** Developer-defined identifier for the input; max 100 characters */
  custom_id: string;
  /** The Text Input Style */
  style: number;
  /** Label for this component; max 45 characters */
  label: string;
  /** Minimum input length for a text input; min 0, max 4000 */
  min_length?: number;
  /** Maximum input length for a text input; min 1, max 4000 */
  max_length?: number;
  /** Whether this component is required to be filled (defaults to `true`) */
  required?: boolean;
  /** Pre-filled value for this component; max 4000 characters */
  value?: string;
  /** Custom placeholder text if the input is empty; max 100 characters */
  placeholder?: string;
};

// ========================================================================

export type TextInputStyleType =
  /** Short */
  1 |
  /** Paragraph */
  2;
