import { describe, it, expect } from 'vitest';

import { constructGuildIcon } from '../../src/utils';

const GUILD_ID = '123456789012345678';
const STATIC_HASH = 'abc123def456abc123def456abc123de';
const ANIMATED_HASH = 'a_abc123def456abc123def456abc123';
const OTHER_HASH = 'ffff0000ffff0000ffff0000ffff0000';

const FILE_TYPES: Array<string | undefined> = [undefined, '', 'png'];

function iconUrl(hash: string, fileType: string | undefined): string {
  return `https://cdn.discordapp.com/icons/${GUILD_ID}/${hash}${fileType ? `.${fileType}` : ''}`;
}

describe('constructGuildIcon · the icon_hash form every existing caller passes (AC-1.1)', () => {
  const present = [STATIC_HASH, ANIMATED_HASH];

  describe.each(FILE_TYPES)('fileType %s', (fileType) => {
    it.each(present)('icon_hash %s returns the documented CDN url', (hash) => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: hash }, fileType)).toBe(iconUrl(hash, fileType));
    });

    it("icon_hash '' returns undefined", () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: '' }, fileType)).toBeUndefined();
    });

    it('icon_hash null returns undefined', () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: null }, fileType)).toBeUndefined();
    });

    it('icon_hash absent returns undefined', () => {
      expect(constructGuildIcon({ id: GUILD_ID }, fileType)).toBeUndefined();
    });
  });

  it('an absent fileType and an empty fileType give the same bare url', () => {
    expect(constructGuildIcon({ id: GUILD_ID, icon_hash: STATIC_HASH })).toBe(iconUrl(STATIC_HASH, undefined));
    expect(constructGuildIcon({ id: GUILD_ID, icon_hash: STATIC_HASH }, '')).toBe(iconUrl(STATIC_HASH, ''));
  });
});

describe("constructGuildIcon · a raw guild's own icon field (AC-1.2)", () => {
  describe.each(FILE_TYPES)('fileType %s', (fileType) => {
    it.each([STATIC_HASH, ANIMATED_HASH])('icon %s returns the same url the equal icon_hash returns', (hash) => {
      const viaIcon = constructGuildIcon({ id: GUILD_ID, icon: hash }, fileType);
      expect(viaIcon).toBe(iconUrl(hash, fileType));
      expect(viaIcon).toBe(constructGuildIcon({ id: GUILD_ID, icon_hash: hash }, fileType));
    });

    it('icon null returns undefined', () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon: null }, fileType)).toBeUndefined();
    });

    it('icon absent with no icon_hash returns undefined', () => {
      expect(constructGuildIcon({ id: GUILD_ID }, fileType)).toBeUndefined();
    });
  });

  it('an animated icon keeps the extensionless form it has under icon_hash, with no .gif default', () => {
    expect(constructGuildIcon({ id: GUILD_ID, icon: ANIMATED_HASH })).toBe(iconUrl(ANIMATED_HASH, undefined));
  });
});

describe('constructGuildIcon · precedence when both fields are set (AC-1.3, PD-1)', () => {
  describe.each(FILE_TYPES)('fileType %s', (fileType) => {
    it('both non-empty and different: icon_hash decides', () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: STATIC_HASH, icon: OTHER_HASH }, fileType)).toBe(iconUrl(STATIC_HASH, fileType));
    });

    it("icon_hash '' with icon non-empty: icon decides", () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: '', icon: OTHER_HASH }, fileType)).toBe(iconUrl(OTHER_HASH, fileType));
    });

    it('icon_hash null with icon non-empty: icon decides', () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: null, icon: OTHER_HASH }, fileType)).toBe(iconUrl(OTHER_HASH, fileType));
    });

    it('icon_hash non-empty with icon null: icon_hash decides', () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: STATIC_HASH, icon: null }, fileType)).toBe(iconUrl(STATIC_HASH, fileType));
    });

    it("both empty ('' and null): undefined", () => {
      expect(constructGuildIcon({ id: GUILD_ID, icon_hash: '', icon: null }, fileType)).toBeUndefined();
    });
  });
});
