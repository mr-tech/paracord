"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageFlags = exports.ForumLayoutTypes = exports.ChannelFlags = void 0;
// ========================================================================
var ChannelFlags;
(function (ChannelFlags) {
    ChannelFlags[ChannelFlags["PINNED"] = 2] = "PINNED";
    ChannelFlags[ChannelFlags["REQUIRE_TAG"] = 16] = "REQUIRE_TAG";
})(ChannelFlags = exports.ChannelFlags || (exports.ChannelFlags = {}));
// ========================================================================
var ForumLayoutTypes;
(function (ForumLayoutTypes) {
    ForumLayoutTypes[ForumLayoutTypes["NOT_SET"] = 0] = "NOT_SET";
    ForumLayoutTypes[ForumLayoutTypes["LIST_VIEW"] = 1] = "LIST_VIEW";
    ForumLayoutTypes[ForumLayoutTypes["GALLERY_VIEW"] = 2] = "GALLERY_VIEW";
})(ForumLayoutTypes = exports.ForumLayoutTypes || (exports.ForumLayoutTypes = {}));
// ========================================================================
var MessageFlags;
(function (MessageFlags) {
    MessageFlags[MessageFlags["CROSSPOSTED"] = 1] = "CROSSPOSTED";
    MessageFlags[MessageFlags["IS_CROSSPOST"] = 2] = "IS_CROSSPOST";
    MessageFlags[MessageFlags["SUPPRESS_EMBEDS"] = 4] = "SUPPRESS_EMBEDS";
    MessageFlags[MessageFlags["SOURCE_MESSAGE_DELETED"] = 8] = "SOURCE_MESSAGE_DELETED";
    MessageFlags[MessageFlags["URGENT"] = 16] = "URGENT";
    MessageFlags[MessageFlags["HAS_THREAD"] = 32] = "HAS_THREAD";
    MessageFlags[MessageFlags["EPHEMERAL"] = 64] = "EPHEMERAL";
    MessageFlags[MessageFlags["LOADING"] = 128] = "LOADING";
    MessageFlags[MessageFlags["FAILED_TO_MENTION_SOME_ROLES_IN_THREAD"] = 256] = "FAILED_TO_MENTION_SOME_ROLES_IN_THREAD";
    MessageFlags[MessageFlags["SUPPRESS_NOTIFICATIONS"] = 4096] = "SUPPRESS_NOTIFICATIONS";
    MessageFlags[MessageFlags["IS_VOICE_MESSAGE"] = 8192] = "IS_VOICE_MESSAGE";
})(MessageFlags = exports.MessageFlags || (exports.MessageFlags = {}));
