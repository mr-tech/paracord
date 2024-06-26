"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserFlags = void 0;
// ========================================================================
var UserFlags;
(function (UserFlags) {
    UserFlags[UserFlags["STAFF"] = 1] = "STAFF";
    UserFlags[UserFlags["PARTNER"] = 2] = "PARTNER";
    UserFlags[UserFlags["HYPESQUAD"] = 4] = "HYPESQUAD";
    UserFlags[UserFlags["BUG_HUNTER_LEVEL_1"] = 8] = "BUG_HUNTER_LEVEL_1";
    UserFlags[UserFlags["HYPESQUAD_ONLINE_HOUSE_1"] = 64] = "HYPESQUAD_ONLINE_HOUSE_1";
    UserFlags[UserFlags["HYPESQUAD_ONLINE_HOUSE_2"] = 128] = "HYPESQUAD_ONLINE_HOUSE_2";
    UserFlags[UserFlags["HYPESQUAD_ONLINE_HOUSE_3"] = 256] = "HYPESQUAD_ONLINE_HOUSE_3";
    UserFlags[UserFlags["PREMIUM_EARLY_SUPPORTER"] = 512] = "PREMIUM_EARLY_SUPPORTER";
    UserFlags[UserFlags["TEAM_PSEUDO_USER"] = 1024] = "TEAM_PSEUDO_USER";
    UserFlags[UserFlags["BUG_HUNTER_LEVEL_2"] = 16384] = "BUG_HUNTER_LEVEL_2";
    UserFlags[UserFlags["VERIFIED_BOT"] = 65536] = "VERIFIED_BOT";
    UserFlags[UserFlags["VERIFIED_DEVELOPER"] = 131072] = "VERIFIED_DEVELOPER";
    UserFlags[UserFlags["CERTIFIED_MODERATOR"] = 262144] = "CERTIFIED_MODERATOR";
    UserFlags[UserFlags["BOT_HTTP_INTERACTIONS"] = 524288] = "BOT_HTTP_INTERACTIONS";
    UserFlags[UserFlags["ACTIVE_DEVELOPER"] = 4194304] = "ACTIVE_DEVELOPER";
})(UserFlags || (exports.UserFlags = UserFlags = {}));
