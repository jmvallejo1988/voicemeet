/**
 * Google Calendar API — fetch upcoming events with Google Meet links
 * Scope: https://www.googleapis.com/auth/calendar.readonly
 */

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  meetLink?: string;
  attendees: string[];
  description?: string;
  minutesUntilStart: number;
}

export async function getUpcomingMeetEvents(
  accessToken: string,
  hoursAhead = 48
): Promise<CalendarEvent[]> {
  const now   = new Date();
  const until = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const params = new URLSearchParams({
    calendarId:   'primary',
    timeMin:      now.toISOString(),
    timeMax:      until.toISOString(),
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '20',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    console.error('Calendar API error:', res.status, await res.text());
    return [];
  }

  const data = await res.json();
  const items: any[] = data.items ?? [];

  const events: CalendarEvent[] = [];

  for (const item of items) {
    // Extract Meet link from conferenceData or hangoutLink
    let meetLink: string | undefined;

    if (item.hangoutLink) {
      meetLink = item.hangoutLink;
    } else if (item.conferenceData?.entryPoints) {
      const videoEntry = item.conferenceData.entryPoints.find(
        (e: any) => e.entryPointType === 'video'
      );
      meetLink = videoEntry?.uri;
    }

    // Only include events with a Meet link
    if (!meetLink) continue;

    const startTime = item.start?.dateTime ?? item.start?.date;
    const endTime   = item.end?.dateTime   ?? item.end?.date;

    if (!startTime) continue;

    const startDate = new Date(startTime);
    const minutesUntilStart = Math.round((startDate.getTime() - now.getTime()) / 60000);

    events.push({
      id:   item.id,
      title: item.summary ?? 'Reunión sin título',
      startTime,
      endTime: endTime ?? startTime,
      meetLink,
      attendees: (item.attendees ?? []).map((a: any) => a.displayName ?? a.email ?? 'Participante'),
      description: item.description,
      minutesUntilStart,
    });
  }

  return events;
}
