
const assert = require('assert');
const sinon = require('sinon');
const RateLimit = require('../RateLimit');

describe('RateLimit', () => {
  let rateLimit;

  beforeEach(() => {
    rateLimit = new RateLimit({});
  });

  describe('get isRateLimited', () => {
    let stub_hasRemainingUses;
    let stub_rateLimitHasReset;
    let stub_reset;

    beforeEach(() => {
      stub_hasRemainingUses = sinon.stub(rateLimit, 'hasRemainingUses');
      stub_rateLimitHasReset = sinon.stub(rateLimit, 'rateLimitHasReset');
      stub_reset = sinon.stub(rateLimit, 'reset');
    });

    it('hasRemainingUses=true => Returns false', () => {
      stub_hasRemainingUses.value(true);

      const got = rateLimit.isRateLimited;

      assert.strictEqual(got, false);
    });
    it('rateLimitHasReset=true => Executes reset and returns false', () => {
      stub_hasRemainingUses.value(false);
      stub_rateLimitHasReset.value(true);

      const got = rateLimit.isRateLimited;

      sinon.assert.calledOnce(stub_reset);
      assert.strictEqual(got, false);
    });
    it('All values false => Returns true', () => {
      stub_hasRemainingUses.value(false);
      stub_rateLimitHasReset.value(false);

      const got = rateLimit.isRateLimited;

      assert.strictEqual(got, true);
    });
  });
});
