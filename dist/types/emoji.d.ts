import { RawRole, Snowflake, RawUser } from '.';
export declare type RawEmoji = {
    id: Snowflake | null;
    name: string | null;
    roles?: RawRole[];
    user?: RawUser;
    require_colons?: boolean;
    managed?: boolean;
    animated?: boolean;
    available?: boolean;
};
