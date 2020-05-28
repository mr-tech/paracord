
const { upsertCommon } = require('./common');

module.exports = (client) => {
  const { filter: { user: userFilter } } = client;

  return class User {
    constructor(properties) {
      this.id = undefined;
      this.username = undefined;
      this.discriminator = undefined;
      this.avatar = undefined;
      this.bot = undefined;
      this.system = undefined;
      this.mfaEnabled = undefined;
      this.locale = undefined;
      this.verified = undefined;
      this.email = undefined;
      this.flags = undefined;
      this.premiumTime = undefined;
      this.publicFlags = undefined;

      this.upsert = upsertCommon;
      this.upsert(this, userFilter, properties);
    }

    get tag() {
      return `${this.username}#${this.discriminator}`;
    }

    // get avatarUrl, createdOn
  };
};
