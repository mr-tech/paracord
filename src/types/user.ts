import { Integration, Snowflake } from '.';

export type RawUser = {
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
  mfaEnabled?: boolean; // identify
  /** the user's chosen language option */
  locale?: string; // identify
  /** whether the email on this account has been verified */
  verified?: boolean; // email
  /** the user's email */
  email?: string | null; // email
  /** the flags on a user's account */
  flags?: number; // identify
  /** the type of Nitro subscription on a user's account */
  premiumType?: number; // identify
  /** the public flags on a user's account */
  publicFlags?: number; // identify
};

// ========================================================================

export enum UserFlags {
  None = 0,
  DiscordEmployee = 1 << 0,
  DiscordPartner = 1 << 1,
  HypeSquadEvents = 1 << 2,
  BugHunterLevel1 = 1 << 3,
  HouseBravery = 1 << 6,
  HouseBrilliance = 1 << 7,
  HouseBalance = 1 << 8,
  EarlySupporter = 1 << 9,
  TeamUser = 1 << 10,
  System = 1 << 12,
  BugHunterLevel2 = 1 << 14,
  VerifiedBot = 1 << 16,
  VerifiedBotDeveloper = 1 << 17
}

// ========================================================================

export type PremiumTypes = [
  /** None */
  0 |
  /** Nitro Classic */
  1 |
  /** Nitro */
  2
];

// ========================================================================

export type Connection = {
  /** id of the connection account */
  id: string;
  /** the username of the connection account */
  name: string;
  /** the service of the connection (twitch, youtube) */
  type: string;
  /** whether the connection is revoked */
  revoked?: boolean;
  /** an array of this user's integrations */
  integrations?: Partial<Integration>[];
  /** whether the connection is verified */
  verified: boolean;
  /** whether friend sync is enabled for this connection */
  friendSync: boolean;
  /** whether activities related to this connection will be shown in presence updates */
  showActivity: boolean;
  /** visibility of this connection */
  visibility: number;
};

// ========================================================================

export type VisibilityTypes = [
  /** None */
  0 |
  /** Everyone */
  1
];
