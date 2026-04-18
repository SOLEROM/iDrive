package i.drive.kids.domain.recurrence

import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RecurrenceFrequency
import i.drive.kids.domain.model.RecurrenceRule
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Expands a recurring [Event] into concrete occurrences within a [windowStart, windowEnd] range.
 *
 * V1 supports WEEKLY only (single weekday from startDateTime or explicit daysOfWeek, with
 * `intervalWeeks` gap). Non-recurring events emit a single occurrence if they fall in the window.
 */
object RecurrenceExpander {

    private const val MAX_OCCURRENCES = 520 // ~10 years of weekly events — hard cap

    fun expand(
        event: Event,
        windowStart: Long,
        windowEnd: Long,
        zone: ZoneId = ZoneId.systemDefault()
    ): List<Event> {
        require(windowEnd >= windowStart) { "windowEnd must be >= windowStart" }

        if (!event.isRecurring || event.recurrenceRule == null) {
            return if (event.startDateTime in windowStart..windowEnd) listOf(event) else emptyList()
        }

        val rule = event.recurrenceRule
        return when (rule.frequency) {
            RecurrenceFrequency.WEEKLY -> expandWeekly(event, rule, windowStart, windowEnd, zone)
        }
    }

    private fun expandWeekly(
        event: Event,
        rule: RecurrenceRule,
        windowStart: Long,
        windowEnd: Long,
        zone: ZoneId
    ): List<Event> {
        val duration = (event.endDateTime - event.startDateTime).coerceAtLeast(0L)
        val effectiveEnd = rule.endDate?.let { minOf(it, windowEnd) } ?: windowEnd
        if (effectiveEnd < windowStart) return emptyList()

        val baseInstant = Instant.ofEpochMilli(event.startDateTime).atZone(zone)
        val baseDay = baseInstant.toLocalDate()
        val time = baseInstant.toLocalTime()
        val days: List<DayOfWeek> = rule.daysOfWeek?.takeIf { it.isNotEmpty() }
            ?: listOf(baseDay.dayOfWeek)
        val interval = rule.intervalWeeks.coerceAtLeast(1)

        val results = mutableListOf<Event>()
        // Anchor at the start of baseDay's week (Monday) so intervalWeeks is deterministic.
        val anchorMonday = baseDay.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        var weekMonday = anchorMonday
        var weekIndex = 0

        while (results.size < MAX_OCCURRENCES) {
            val weekStartMs = weekMonday.atStartOfDay(zone).toInstant().toEpochMilli()
            val weekEndMs = weekMonday.plusDays(7).atStartOfDay(zone).toInstant().toEpochMilli() - 1
            if (weekStartMs > effectiveEnd) break

            if (weekIndex % interval == 0) {
                for (day in days) {
                    val occurrenceDate = weekMonday.with(java.time.temporal.TemporalAdjusters.nextOrSame(day))
                    // Guard: nextOrSame jumps into the following week if day < MONDAY; cap to this week.
                    if (occurrenceDate.isAfter(weekMonday.plusDays(6))) continue
                    if (occurrenceDate.isBefore(baseDay)) continue

                    val startMs = occurrenceDate.atTime(time).atZone(zone).toInstant().toEpochMilli()
                    if (startMs > effectiveEnd) continue
                    if (startMs + duration < windowStart) continue

                    results += event.copy(
                        eventId = "${event.eventId}:${occurrenceDate}",
                        startDateTime = startMs,
                        endDateTime = startMs + duration,
                        isRecurring = false,
                        recurrenceRule = null
                    )
                }
            }
            weekMonday = weekMonday.plusWeeks(1)
            weekIndex++
            // Safety: bound by ~20 years of iteration even without endDate.
            if (ChronoUnit.WEEKS.between(anchorMonday, weekMonday) > 20 * 52) break
        }

        return results.sortedBy { it.startDateTime }
    }
}
