import { Integration, Snowflake } from '.';
export declare type RawUser = {
    id: Snowflake;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot?: boolean;
    system?: boolean;
    mfaEnabled?: boolean;
    locale?: string;
    verified?: boolean;
    email?: string | null;
    flags?: number;
    premiumType?: number;
    publicFlags?: number;
};
export declare enum UserFlags {
    None = 0,
    DiscordEmployee = 1,
    DiscordPartner = 2,
    HypeSquadEvents = 4,
    BugHunterLevel1 = 8,
    HouseBravery = 64,
    HouseBrilliance = 128,
    HouseBalance = 256,
    EarlySupporter = 512,
    TeamUser = 1024,
    System = 4096,
    BugHunterLevel2 = 16384,
    VerifiedBot = 65536,
    VerifiedBotDeveloper = 131072
}
export declare type PremiumTypes = [0 | 1 | 2];
export declare type Connection = {
    id: string;
    name: string;
    type: string;
    revoked?: boolean;
    integrations?: Partial<Integration>[];
    verified: boolean;
    friendSync: boolean;
    showActivity: boolean;
    visibility: number;
};
export declare type VisibilityTypes = [0 | 1];
