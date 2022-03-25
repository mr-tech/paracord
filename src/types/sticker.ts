import type { Snowflake, User } from '.';

export type Sticker = {
  /** id of the sticker */
  id: Snowflake;
  /** for standard stickers, id of the pack the sticker is from */
  pack_id?: Snowflake;
  /** name of the sticker */
  name: string;
  /** description of the sticker */
  description: string | null;
  /** autocomplete/suggestion tags for the sticker (max 200 characters) */
  tags: string;
  /** **Deprecated** previously the sticker asset hash, now an empty string */
  asset?: string;
  /** type of sticker */
  type: StickerType;
  /** type of sticker format */
  format_type: number;
  /** whether this guild sticker can be used, may be false due to loss of Server Boosts */
  available?: boolean;
  /** id of the guild that owns this sticker */
  guild_id?: Snowflake;
  /** the user that uploaded the guild sticker */
  user?: User;
  /** the standard sticker's sort order within its pack */
  sort_value?: number;
};

// ========================================================================

export type StickerType =
  /** STANDARD */
  1 |
  /** GUILD */
  2;

// ========================================================================

export type StickerFormatType =
  /** PNG */
  1 |
  /** APNG */
  2 |
  /** LOTTIE */
  3;

// ========================================================================

export type StickerItem = {
  /** id of the sticker */
  id: Snowflake;
  /** name of the sticker */
  name: string;
  /** type of sticker format */
  format_type: number;
};

// ========================================================================

export type StickerPack = {
  /** id of the sticker pack */
  id: Snowflake;
  /** the stickers in the pack */
  stickers: Sticker[];
  /** name of the sticker pack */
  name: string;
  /** id of the pack's SKU */
  sku_id: Snowflake;
  /** id of a sticker in the pack which is shown as the pack's icon */
  cover_sticker_id?: Snowflake;
  /** description of the sticker pack */
  description: string;
  /** id of the sticker pack's banner image */
  banner_asset_id?: Snowflake;
};
