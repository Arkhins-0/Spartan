export type VenueOrganizationType =
  | 'CIRCUIT'
  | 'KART_TRACK'
  | 'DRAG_STRIP'
  | 'MOTORSPORT_COMPLEX'
  | 'OTHER';

export type VenueOrganizationStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export type VenueProfileStatus = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export type VenueStaffRole =
  | 'OWNER'
  | 'MANAGER'
  | 'SCHEDULER'
  | 'CONTENT_EDITOR'
  | 'REQUEST_MANAGER'
  | 'VIEWER';

export type VenueStaffStatus = 'INVITED' | 'ACTIVE' | 'REMOVED';

export type VenueSurfaceType = 'CIRCUIT' | 'TRACK' | 'PADDOCK' | 'ROOM' | 'OTHER';

export type OperatingHourStatus = 'OPEN' | 'CLOSED' | 'RESTRICTED';

export type VenueScheduleActivityType =
  | 'OPEN_TRACK_DAY'
  | 'TEST_SESSION'
  | 'OPEN_PRACTICE'
  | 'KARTING'
  | 'SPECIALTY_EVENT'
  | 'PRIVATE_COACHING'
  | 'DRIVER_TRAINING'
  | 'TEAM_TEST'
  | 'CLUB_BOOKING'
  | 'RENTAL'
  | 'CLOSURE'
  | 'CUSTOM';

export type VenueScheduleAudience =
  | 'PUBLIC'
  | 'TEAMS'
  | 'COACHES'
  | 'ORGANIZATIONS'
  | 'INVITE_ONLY'
  | 'STAFF_ONLY';

export type VenueScheduleVisibility =
  | 'PUBLIC'
  | 'AUTHENTICATED'
  | 'RELATIONSHIP_ONLY'
  | 'PRIVATE';

export type VenueScheduleBlockStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELED' | 'ARCHIVED';

export type RegistrationMode = 'INFO_ONLY' | 'REQUEST_REQUIRED' | 'EXTERNAL_REGISTRATION';

export type SurfaceTimeRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'CANCELED'
  | 'EXPIRED';

export type LessonOfferingType = 'PRIVATE' | 'SEMI_PRIVATE' | 'GROUP' | 'CLINIC' | 'CAMP';

export type ContentPostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

export type VenueRelationshipType = 'PREFERRED' | 'HOME';

export type VenueRelationshipTargetType = 'TEAM' | 'LEAGUE' | 'COACH' | 'ORGANIZATION';

export type VenueRelationshipStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'REMOVED' | 'EXPIRED';

export type SkillLevelSource = 'FMSCI' | 'CLUB_CUSTOM' | 'OTHER';

export type SkillLevelDiscipline = 'CIRCUIT_RACING' | 'KARTING' | 'RALLY' | 'DRAG_RACING' | 'HILL_CLIMB' | 'OTHER';

export interface PublicCircuitSummary {
  id: string;
  slug: string;
  name: string;
  publicDescription: string | null;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  city: string | null;
  state: string | null;
  surfaceCount: number;
}
