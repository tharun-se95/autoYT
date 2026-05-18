/** Dedicated route for the channel desk (videos queue + upcoming brainstorm). */
export const CHANNEL_DESK_PATH = "/channel-desk" as const;

/** Channel desk with the Videos tab selected (production queue). */
export const CHANNEL_DESK_VIDEOS_HREF = `${CHANNEL_DESK_PATH}?tab=videos` as const;

/** Channel desk with the Upcoming tab (idea generation + thumbnails). */
export const CHANNEL_DESK_UPCOMING_HREF = `${CHANNEL_DESK_PATH}?tab=upcoming` as const;
