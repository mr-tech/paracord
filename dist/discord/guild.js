"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildMemberFlags = exports.SystemChannelFlags = void 0;
// ========================================================================
var SystemChannelFlags;
(function (SystemChannelFlags) {
    SystemChannelFlags[SystemChannelFlags["SUPPRESS_JOIN_NOTIFICATIONS"] = 1] = "SUPPRESS_JOIN_NOTIFICATIONS";
    SystemChannelFlags[SystemChannelFlags["SUPPRESS_PREMIUM_SUBSCRIPTIONS"] = 2] = "SUPPRESS_PREMIUM_SUBSCRIPTIONS";
    SystemChannelFlags[SystemChannelFlags["SUPPRESS_GUILD_REMINDER_NOTIFICATIONS"] = 4] = "SUPPRESS_GUILD_REMINDER_NOTIFICATIONS";
    SystemChannelFlags[SystemChannelFlags["SUPPRESS_JOIN_NOTIFICATION_REPLIES"] = 8] = "SUPPRESS_JOIN_NOTIFICATION_REPLIES";
    SystemChannelFlags[SystemChannelFlags["SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS"] = 16] = "SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATIONS";
    SystemChannelFlags[SystemChannelFlags["SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES"] = 32] = "SUPPRESS_ROLE_SUBSCRIPTION_PURCHASE_NOTIFICATION_REPLIES";
})(SystemChannelFlags = exports.SystemChannelFlags || (exports.SystemChannelFlags = {}));
// ========================================================================
var GuildMemberFlags;
(function (GuildMemberFlags) {
    GuildMemberFlags[GuildMemberFlags["DID_REJOIN"] = 1] = "DID_REJOIN";
    GuildMemberFlags[GuildMemberFlags["COMPLETED_ONBOARDING"] = 2] = "COMPLETED_ONBOARDING";
    GuildMemberFlags[GuildMemberFlags["BYPASSES_VERIFICATION"] = 4] = "BYPASSES_VERIFICATION";
    GuildMemberFlags[GuildMemberFlags["STARTED_ONBOARDING"] = 8] = "STARTED_ONBOARDING";
})(GuildMemberFlags = exports.GuildMemberFlags || (exports.GuildMemberFlags = {}));
