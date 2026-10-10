import { constructGuildIcon } from '../../src/utils';

import type { APIGuild } from 'discord-api-types/v10';

declare const rawGuild: APIGuild;
declare const iconOnly: Pick<APIGuild, 'id' | 'icon'>;
declare const consumerGuild: { id: string; icon_hash: string | null };
declare const consumerGuildNoIcon: { id: string; icon_hash: string };

export const fromRawGuild: string | undefined = constructGuildIcon(rawGuild);
export const fromIconPick: string | undefined = constructGuildIcon(iconOnly, 'png');
export const fromConsumerNullable: string | undefined = constructGuildIcon(consumerGuild);
export const fromConsumerString: string | undefined = constructGuildIcon(consumerGuildNoIcon, 'webp');
export const fromLiteral: string | undefined = constructGuildIcon({ id: '1', icon_hash: null });
export const fromBothFields: string | undefined = constructGuildIcon({ id: '1', icon_hash: 'a', icon: 'b' });

// @ts-expect-error a guild with no id cannot name an icon url
export const missingId: string | undefined = constructGuildIcon({ icon: 'abc' });

// @ts-expect-error icon is a hash string or null, not a number
export const wrongIconType: string | undefined = constructGuildIcon({ id: '1', icon: 5 });
