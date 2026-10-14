import { createPermissions } from '@/services/permissions';

export const PROFILES = {
  Admin_c: { label: 'Admin', isDefault: false, isPublic: false, canManageTeam: true, reportsTo: null },
  Player_c: { label: 'Player', isDefault: true, isPublic: false, canManageTeam: false, reportsTo: 'Admin_c' },
};

const TABLE_PERMISSIONS = {
  "Admin_c": {
    "games_c": {
      "access": "Full"
    },
    "puzzles_c": {
      "access": "Full"
    },
    "player_progress_c": {
      "access": "Full"
    },
    "player_lives_c": {
      "access": "Full"
    },
    "reward_events_c": {
      "access": "Full"
    },
    "daily_challenges_c": {
      "access": "Full"
    },
    "support_tickets_c": {
      "access": "Full"
    }
  },
  "Player_c": {
    "games_c": {
      "access": "Read"
    },
    "puzzles_c": {
      "access": "Inaccessible"
    },
    "player_progress_c": {
      "access": "Read"
    },
    "player_lives_c": {
      "access": "Read"
    },
    "reward_events_c": {
      "access": "Read"
    },
    "daily_challenges_c": {
      "access": "Read"
    },
    "support_tickets_c": {
      "access": "Read,Create"
    }
  }
};

export const { getProfileMeta, getTableAccess, getFieldAccess } = createPermissions(PROFILES, TABLE_PERMISSIONS);
