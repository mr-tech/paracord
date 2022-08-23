"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
    CREATE_INSTANT_INVITE: BigInt(0x1),
    KICK_MEMBERS: BigInt(0x2),
    BAN_MEMBERS: BigInt(0x4),
    ADMINISTRATOR: BigInt(0x8),
    MANAGE_CHANNELS: BigInt(0x10),
    MANAGE_GUILD: BigInt(0x20),
    ADD_REACTIONS: BigInt(0x40),
    VIEW_AUDIT_LOG: BigInt(0x80),
    PRIORITY_SPEAKER: BigInt(0x100),
    STREAM: BigInt(0x200),
    VIEW_CHANNEL: BigInt(0x400),
    SEND_MESSAGES: BigInt(0x800),
    SEND_TTS_MESSAGES: BigInt(0x1000),
    MANAGE_MESSAGES: BigInt(0x2000),
    EMBED_LINKS: BigInt(0x4000),
    ATTACH_FILES: BigInt(0x8000),
    READ_MESSAGE_HISTORY: BigInt(0x10000),
    MENTION_EVERYONE: BigInt(0x20000),
    USE_EXTERNAL_EMOJIS: BigInt(0x40000),
    VIEW_GUILD_INSIGHTS: BigInt(0x80000),
    CONNECT: BigInt(0x100000),
    SPEAK: BigInt(0x200000),
    MUTE_MEMBERS: BigInt(0x400000),
    DEAFEN_MEMBERS: BigInt(0x800000),
    MOVE_MEMBERS: BigInt(0x1000000),
    USE_VAD: BigInt(0x2000000),
    CHANGE_NICKNAME: BigInt(0x4000000),
    MANAGE_NICKNAMES: BigInt(0x8000000),
    MANAGE_ROLES: BigInt(0x10000000),
    MANAGE_WEBHOOKS: BigInt(0x20000000),
    MANAGE_EMOJIS_AND_STICKERS: BigInt(0x40000000),
    USE_APPLICATION_COMMANDS: BigInt(0x80000000),
    REQUEST_TO_SPEAK: BigInt(0x100000000),
    MANAGE_EVENTS: BigInt(0x200000000),
    MANAGE_THREADS: BigInt(0x400000000),
    CREATE_PUBLIC_THREADS: BigInt(0x800000000),
    CREATE_PRIVATE_THREADS: BigInt(0x1000000000),
    USE_EXTERNAL_STICKERS: BigInt(0x2000000000),
    SEND_MESSAGES_IN_THREADS: BigInt(0x4000000000),
    USE_EMBEDDED_ACTIVITIES: BigInt(0x8000000000),
    MODERATE_MEMBERS: BigInt(0x10000000000),
};
