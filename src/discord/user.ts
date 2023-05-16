import type { Integration, Snowflake } from '.';

export type User = {
  /** the user's id */
  id: Snowflake; // identify
  /** the user's username, not unique across the platform */
  username: string; // identify
  /** the user's 4-digit discord-tag */
  discriminator: string; // identify
  /** the user's avatar hash */
  avatar: string | null; // identify
  /** whether the user belongs to an OAuth2 application */
  bot?: boolean; // identify
  /** whether the user is an Official Discord System user (part of the urgent message system) */
  system?: boolean; // identify
  /** whether the user has two factor enabled on their account */
  mfa_enabled?: boolean; // identify
  /** the user's banner hash */
  banner?: string | null; // identify
  /** the user's banner color encoded as an integer representation of hexadecimal color code */
  accent_color?: number | null; // identify
  /** the user's chosen language option */
  locale?: string; // identify
  /** whether the email on this account has been verified */
  verified?: boolean; // email
  /** the user's email */
  email?: string | null; // email
  /** the flags on a user's account */
  flags?: UserFlags; // identify
  /** the type of Nitro subscription on a user's account */
  premium_type?: number; // identify
  /** the public flags on a user's account */
  public_flags?: number; // identify
  global_name?: string; // identify
};

// ========================================================================

export enum UserFlags {
  STAFF = 1 << 0,
  PARTNER = 1 << 1,
  HYPESQUAD = 1 << 2,
  BUG_HUNTER_LEVEL_1 = 1 << 3,
  HYPESQUAD_ONLINE_HOUSE_1 = 1 << 6,
  HYPESQUAD_ONLINE_HOUSE_2 = 1 << 7,
  HYPESQUAD_ONLINE_HOUSE_3 = 1 << 8,
  PREMIUM_EARLY_SUPPORTER = 1 << 9,
  TEAM_PSEUDO_USER = 1 << 10,
  BUG_HUNTER_LEVEL_2 = 1 << 14,
  VERIFIED_BOT = 1 << 16,
  VERIFIED_DEVELOPER = 1 << 17,
  CERTIFIED_MODERATOR = 1 << 18,
  BOT_HTTP_INTERACTIONS = 1 << 19,
  ACTIVE_DEVELOPER = 1 << 22
}

// ========================================================================

export type PremiumType =
  /** None */
  0 |
  /** Nitro Classic */
  1 |
  /** Nitro */
  2 |
  /** Nitro Basic */
  3;

// ========================================================================

export type Connection = {
  /** id of the connection account */
  id: string;
  /** the username of the connection account */
  name: string;
  /** the service of this connection */
  type: string;
  /** whether the connection is revoked */
  revoked?: boolean;
  /** an array of partial server integrations */
  integrations?: Partial<Integration>[];
  /** whether the connection is verified */
  verified: boolean;
  /** whether friend sync is enabled for this connection */
  friend_sync: boolean;
  /** whether activities related to this connection will be shown in presence updates */
  show_activity: boolean;
  /** whether this connection has a corresponding third party OAuth2 token */
  two_way_link: boolean;
  /** visibility of this connection */
  visibility: number;
};

// ========================================================================

export type Service = [
  /** Battle.net */
  'battlenet' |
  /** eBay */
  'ebay' |
  /** Epic Games */
  'epicgames' |
  /** Facebook */
  'facebook' |
  /** GitHub */
  'github' |
  /** Instagram */
  'instagram' |
  /** League of Legends */
  'leagueoflegends' |
  /** PayPal */
  'paypal' |
  /** PlayStation Network */
  'playstation' |
  /** Reddit */
  'reddit' |
  /** Riot Games */
  'riotgames' |
  /** Spotify */
  'spotify' |
  /** Skype */
  'skype' |
  /** Steam */
  'steam' |
  /** TikTok */
  'tiktok' |
  /** Twitch */
  'twitch' |
  /** Twitter */
  'twitter' |
  /** Xbox */
  'xbox' |
  /** YouTube */
  'youtube'
];

// ========================================================================

export type VisibilityType =
  /** None */
  0 |
  /** Everyone */
  1;

// ========================================================================

export type ApplicationRoleConnection = {
  /** the vanity name of the platform a bot has connected (max 50 characters) */
  platform_name: string | null;
  /** the username on the platform a bot has connected (max 100 characters) */
  platform_username: string | null;
  /** object mapping application role connection metadata keys to their `string`-ified value (max 100 characters) for the user on the platform a bot has connected */
  metadata: object;
};
