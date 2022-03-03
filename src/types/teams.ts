import type { Snowflake, User } from '.';

export type Team = {
  /** a hash of the image of the team's icon */
  icon: string | null;
  /** the unique id of the team */
  id: Snowflake;
  /** the members of the team */
  members: TeamMember[];
  /** the name of the team */
  name: string;
  /** the user id of the current team owner */
  owner_user_id: Snowflake;
};

// ========================================================================

export type TeamMember = {
  /** the user's membership state on the team */
  membership_state: MembershipStateType;
  /** will always be `"*"]` */
  permissions: string[];
  /** the id of the parent team of which they are a member */
  team_id: Snowflake;
  /** the avatar, discriminator, id, and username of the user */
  user: Partial<User>;
};

// ========================================================================

export type MembershipStateType =
  /** INVITED */
  1 |
  /** ACCEPTED */
  2;
