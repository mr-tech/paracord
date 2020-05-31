import { RawRole, Snowflake, User } from '.';
export declare type RawEmoji = {
    id: Snowflake | null;
    name: string | null;
    roles?: RawRole[];
    user?: User;
    requireColons?: boolean;
    managed?: boolean;
    animated?: boolean;
    available?: boolean;
};
